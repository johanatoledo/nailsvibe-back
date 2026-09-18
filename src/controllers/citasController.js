import {
  crearCitaModel,
  obtenerCitasModel,
  obtenerCitaPorIdModel,
  confirmarPagoCitaModel,
  marcarCitaAtendidaModel,
  cancelarCitaModel,
} from "../models/citasModel.js";

/* ============================================================
   CREAR CITA
============================================================ */

export async function crearCita(req, res) {
  try {
    const {
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
    } = req.body;

    /* =========================
       VALIDAR CLIENTE
    ========================= */

    if (!cliente_nombre || cliente_nombre.trim() === "" ) {
      return res.status(400).json({
        message:
          "El nombre del cliente es obligatorio",
      });
    }

    if (!cliente_telefono || cliente_telefono.trim() === "" ) {
      return res.status(400).json({
        message:
          "El teléfono del cliente es obligatorio",
      });
    }

    const telefonoLimpio = cliente_telefono.replace(/\D/g, "");

    if (!/^9\d{8}$/.test(telefonoLimpio)) {
      return res.status(400).json({
        message:
          "El número de celular no es válido",
      });
    }

    /* =========================
       VALIDAR FECHA / HORA
    ========================= */

    if (!fecha_cita) {
      return res.status(400).json({
        message:
          "La fecha de la cita es obligatoria",
      });
    }

    if (!hora_cita) {
      return res.status(400).json({
        message:
          "La hora de la cita es obligatoria",
      });
    }

    /* =========================
       VALIDAR SERVICIOS
    ========================= */

    if ( !Array.isArray(servicio) || servicio.length === 0) {
      return res.status(400).json({
        message:
          "Debe seleccionar al menos un servicio",
      });
    }

    for (const item of servicio) {
      if (
        !item.id ||
        !item.nombre ||
        Number(item.precio) <= 0
      ) {
        return res.status(400).json({
          message:
            "Uno de los servicios no es válido",
        });
      }
    }

    /* =========================
       VALIDAR MONTOS
    ========================= */

    const totalLimpio = Number(total);
    const reservaLimpia = Number(monto_reserva);
    const restanteLimpio = Number(monto_restante);

    if ( !Number.isFinite(totalLimpio) || totalLimpio <= 0 ) {
      return res.status(400).json({
        message:
          "El total de la cita no es válido",
      });
    }

    if ( !Number.isFinite(reservaLimpia) || reservaLimpia < 0 ) {
      return res.status(400).json({
        message:
          "El monto de reserva no es válido",
      });
    }

    if ( !Number.isFinite(restanteLimpio) || restanteLimpio < 0 ) {
      return res.status(400).json({
        message:
          "El monto restante no es válido",
      });
    }

    /* =========================
       VALIDAR PAGO
    ========================= */

    const metodosPermitidos = [ "yape", "plin", "transferencia", ];

    if ( !metodo_pago || !metodosPermitidos.includes( metodo_pago ) ) {
      return res.status(400).json({
        message:
          "El método de pago no es válido",
      });
    }

    if ( !numero_operacion || numero_operacion.trim() === "") {
      return res.status(400).json({
        message:
          "El número de operación es obligatorio",
      });
    }

    /* =========================
       DURACIÓN TOTAL
    ========================= */

    const duracionTotalMinutos = servicio.reduce( (totalDuracion, item) => totalDuracion + Number( item.duracionMinutos || 0 ) * Number( item.cantidad || 1 ), 0 );

    /* =========================
       CREAR CITA
    ========================= */

    const citaId = await crearCitaModel({
        cliente_nombre: cliente_nombre.trim(),
        cliente_telefono: telefonoLimpio,
        fecha_cita,
        hora_cita,
        servicio,
        total: totalLimpio,
        monto_reserva: reservaLimpia,
        monto_restante: restanteLimpio,
        metodo_pago,
        numero_operacion: numero_operacion.trim(),
        duracion_total_minutos: duracionTotalMinutos,
      });

    return res.status(201).json({
      message:
        "Cita creada correctamente",

      citaId,
    });
  } catch (error) {
    console.error(
      "Error al crear cita:",
      error
    );

    /*
      ER_DUP_ENTRY

      Puede ocurrir si el número de
      operación ya fue registrado.
    */
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "El número de operación ya fue registrado",
      });
    }

    return res.status(500).json({
      message:
        "Error interno al crear la cita",
    });
  }
}

/* ============================================================
   OBTENER TODAS LAS CITAS
============================================================ */

export async function obtenerCitas( req, res ) {
  try {
    const citas = await obtenerCitasModel();

    return res
      .status(200)
      .json(citas);
  } catch (error) {
    console.error(
      "Error al obtener citas:",
      error
    );

    return res.status(500).json({
      message:
        "Error interno al obtener las citas",
    });
  }
}

/* ============================================================
   OBTENER CITA POR ID
============================================================ */

export async function obtenerCitaPorId( req, res ) {
  try {
    const { id } = req.params;

    const cita = await obtenerCitaPorIdModel(id);

    if (!cita) {
      return res.status(404).json({
        message: "Cita no encontrada",
      });
    }

    return res
      .status(200)
      .json(cita);
  } catch (error) {
    console.error(
      "Error al obtener cita:", error
    );

    return res.status(500).json({
      message: "Error interno al obtener la cita",
    });
  }
}

/* ============================================================
   CONFIRMAR PAGO
============================================================ */

export async function confirmarPagoCita( req, res ) {
  try {
    const { id } = req.params;

    const citaActualizada = await confirmarPagoCitaModel(id);

    if (!citaActualizada) {
      return res.status(404).json({
        message: "Cita no encontrada",
      });
    }

    return res.status(200).json({
      message: "Pago verificado correctamente",
      citaId: Number(id),
      pago_verificado: Boolean( citaActualizada.pago_verificado ),
      pago_confirmado_en: citaActualizada.pago_confirmado_en,
      estado: citaActualizada.estado,
    });
  } catch (error) {
    console.error("Error al confirmar pago:", error );

    return res.status(500).json({ message: "Error interno al confirmar el pago", });
  }
}

/* ============================================================
   MARCAR CITA COMO ATENDIDA
============================================================ */

export async function marcarCitaAtendida( req, res ) {
  try {
    const { id } = req.params;

    const affectedRows = await marcarCitaAtendidaModel( id );

    if (affectedRows === 0) {
      return res.status(404).json({
        message: "Cita no encontrada",
      });
    }

    return res.status(200).json({
      message: "Cita marcada como atendida",
      citaId: Number(id),
      estado: "atendida",
    });
  } catch (error) {
    console.error( "Error al marcar cita como atendida:", error );

    return res.status(500).json({
      message: "Error interno al actualizar la cita",
    });
  }
}

/* ============================================================
   CANCELAR CITA
============================================================ */

export async function cancelarCita( req, res ) {
  try {
    const { id } = req.params;

    const affectedRows = await cancelarCitaModel(id);

    if (affectedRows === 0) {
      return res.status(404).json({
        message: "Cita no encontrada",
      });
    }

    return res.status(200).json({
      message: "Cita cancelada correctamente",
      citaId: Number(id),
      estado: "cancelada",
    });
  } catch (error) {
    console.error(
      "Error al cancelar cita:",
      error
    );

    return res.status(500).json({
      message:
        "Error interno al cancelar la cita",
    });
  }
}