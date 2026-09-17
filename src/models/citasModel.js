import { db } from "../config/db.js";

/* ============================================================
   CREAR CITA
============================================================ */

export async function crearCitaModel({
  cliente_nombre,
  cliente_telefono,
  fecha_cita,
  hora_cita,
  servicio,
  total,
  monto_reserva,
  monto_restante,
  metodo_pago,
  numero_operacion,
  duracion_total_minutos,
}) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /* ========================================================
       1. BUSCAR CLIENTE POR TELÉFONO
    ======================================================== */

    const [clientes] = await connection.query(
      `
        SELECT id
        FROM clientes
        WHERE telefono = ?
        ORDER BY id ASC
        LIMIT 1
      `,
      [cliente_telefono]
    );

    let clienteId;

    /* ========================================================
       2. CREAR O ACTUALIZAR CLIENTE
    ======================================================== */

    if (clientes.length > 0) {
      clienteId = clientes[0].id;

      await connection.query(
        `
          UPDATE clientes
          SET nombre = ?
          WHERE id = ?
        `,
        [cliente_nombre, clienteId]
      );
    } else {
      const [clienteResult] = await connection.query(
        ` INSERT INTO clientes ( nombre, telefono ) VALUES (?, ?) `,
        [cliente_nombre, cliente_telefono]
      );

      clienteId = clienteResult.insertId;
    }

    /* ========================================================
       3. CREAR CITA
    ======================================================== */

    const [citaResult] = await connection.query(
      `
        INSERT INTO citas (
          cliente_id,
          fecha_cita,
          hora_cita,
          duracion_total_minutos,
          total,
          monto_reserva,
          monto_restante,
          metodo_pago,
          numero_operacion,
          pago_verificado,
          pago_confirmado_en,
          estado
        )
        VALUES ( ?, ?,  ?,  ?, ?,  ?, ?,  ?, ?, FALSE, NULL, 'pendiente')
      `,
      [
        clienteId,
        fecha_cita,
        hora_cita,
        duracion_total_minutos,
        total,
        monto_reserva,
        monto_restante,
        metodo_pago,
        numero_operacion,
      ]
    );

    const citaId = citaResult.insertId;

    /* ========================================================
       4. GUARDAR SERVICIOS DE LA CITA
    ======================================================== */

    for (const item of servicio) {
      await connection.query(
        `
          INSERT INTO cita_servicios (
            cita_id,
            servicio_id,
            nombre,
            precio,
            cantidad,
            duracion_minutos
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          citaId,
          Number(item.id),
          item.nombre,
          Number(item.precio),
          Number(item.cantidad || 1),
          Number(item.duracionMinutos || 0),
        ]
      );
    }

    /* ========================================================
       5. CONFIRMAR TRANSACCIÓN
    ======================================================== */

    await connection.commit();

    return citaId;
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

/* ============================================================
   OBTENER TODAS LAS CITAS
============================================================ */

export async function obtenerCitasModel() {
  const [rows] = await db.query(
    `
      SELECT
        c.id,
        cl.nombre AS cliente_nombre,
        cl.telefono AS cliente_telefono,
        c.fecha_cita,
        c.hora_cita,
        c.duracion_total_minutos,
        c.total,
        c.monto_reserva,
        c.monto_restante,
        c.metodo_pago,
        c.numero_operacion,
        c.pago_verificado,
        c.pago_confirmado_en,
        c.estado,
        c.observaciones,
        c.created_at,
        c.updated_at
      FROM citas c
      INNER JOIN clientes cl
        ON cl.id = c.cliente_id
      WHERE c.estado != 'cancelada'
      ORDER BY
        c.fecha_cita ASC,
        c.hora_cita ASC
    `
  );

  for (const cita of rows) {
    const [servicios] = await db.query(
      `
        SELECT
          servicio_id AS id,
          nombre,
          precio,
          cantidad,
          duracion_minutos AS duracionMinutos
        FROM cita_servicios
        WHERE cita_id = ?
        ORDER BY id ASC
      `,
      [cita.id]
    );

    cita.servicio = servicios;
  }

  return rows;
}

/* ============================================================
   OBTENER CITA POR ID
============================================================ */

export async function obtenerCitaPorIdModel(id) {
  const [rows] = await db.query(
    `
      SELECT
        c.id,
        cl.nombre AS cliente_nombre,
        cl.telefono AS cliente_telefono,
        c.fecha_cita,
        c.hora_cita,
        c.duracion_total_minutos,
        c.total,
        c.monto_reserva,
        c.monto_restante,
        c.metodo_pago,
        c.numero_operacion,
        c.pago_verificado,
        c.pago_confirmado_en,
        c.estado,
        c.observaciones,
        c.created_at,
        c.updated_at
      FROM citas c
      INNER JOIN clientes cl
        ON cl.id = c.cliente_id
      WHERE c.id = ?
      LIMIT 1
    `,
    [id]
  );

  if (!rows.length) {
    return null;
  }

  const cita = rows[0];

  const [servicios] = await db.query(
    `
      SELECT
        servicio_id AS id,
        nombre,
        precio,
        cantidad,
        duracion_minutos AS duracionMinutos
      FROM cita_servicios
      WHERE cita_id = ?
      ORDER BY id ASC
    `,
    [id]
  );

  cita.servicio = servicios;

  return cita;
}

/* ============================================================
   CONFIRMAR PAGO DE LA CITA
============================================================ */

export async function confirmarPagoCitaModel(id) {
  const [result] = await db.query(
    `
      UPDATE citas
      SET
        pago_verificado = TRUE,
        pago_confirmado_en = COALESCE(
          pago_confirmado_en,
          NOW()
        ),
        estado = CASE
          WHEN estado = 'pendiente'
          THEN 'confirmada'
          ELSE estado
        END
      WHERE id = ?
    `,
    [id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        pago_verificado,
        pago_confirmado_en,
        estado
      FROM citas
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

/* ============================================================
   MARCAR CITA COMO ATENDIDA
============================================================ */

export async function marcarCitaAtendidaModel(id) {
  const [result] = await db.query(
    `
      UPDATE citas
      SET estado = 'atendida'
      WHERE id = ?
        AND estado != 'cancelada'
    `,
    [id]
  );

  return result.affectedRows;
}

/* ============================================================
   CANCELAR CITA
============================================================ */

export async function cancelarCitaModel(id) {
  const [result] = await db.query(
    `
      UPDATE citas
      SET estado = 'cancelada'
      WHERE id = ?
        AND estado != 'cancelada'
    `,
    [id]
  );

  return result.affectedRows;
}