/* ============================================================
   BASE DE DATOS
   NAILS VIBE
   ============================================================ */

CREATE DATABASE IF NOT EXISTS nail_vibes
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE nail_vibes;


/* ============================================================
   TABLA: clientes
   ============================================================ */

CREATE TABLE IF NOT EXISTS clientes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(120) NOT NULL,

    telefono VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_clientes_telefono (telefono),

    INDEX idx_clientes_nombre (nombre)

) ENGINE=InnoDB;


/* ============================================================
   TABLA: citas
   ============================================================ */

CREATE TABLE IF NOT EXISTS citas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    cliente_id BIGINT UNSIGNED NOT NULL,

    fecha_cita DATE NOT NULL,

    hora_cita TIME NOT NULL,

    /*
       Duración total de todos los servicios.
       Será útil posteriormente para controlar disponibilidad.
    */
    duracion_total_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    /*
       Valores monetarios.
       Siempre DECIMAL para dinero.
    */
    total DECIMAL(10,2) NOT NULL,

    monto_reserva DECIMAL(10,2) NOT NULL,

    monto_restante DECIMAL(10,2) NOT NULL,

    /*
       Método utilizado para pagar la reserva.
    */
    metodo_pago ENUM(
        'yape',
        'plin',
        'transferencia'
    ) NOT NULL,

    /*
       Código / número recibido después del pago.
    */
    numero_operacion VARCHAR(100) NOT NULL,

    /*
       0 = todavía no revisado por administrador
       1 = pago validado
    */
    pago_verificado BOOLEAN NOT NULL DEFAULT FALSE,

    pago_confirmado_en DATETIME NULL,

    /*
       Flujo general de la cita.
    */
    estado ENUM(
        'pendiente',
        'confirmada',
        'en_proceso',
        'atendida',
        'cancelada',
        'no_asistio'
    ) NOT NULL DEFAULT 'pendiente',

    observaciones VARCHAR(500) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,


    /* ==============================
       RELACIONES
       ============================== */

    CONSTRAINT fk_citas_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,


    /* ==============================
       ÍNDICES
       ============================== */

    INDEX idx_citas_fecha (
        fecha_cita
    ),

    INDEX idx_citas_fecha_hora (
        fecha_cita,
        hora_cita
    ),

    INDEX idx_citas_cliente (
        cliente_id
    ),

    INDEX idx_citas_estado (
        estado
    ),

    INDEX idx_citas_pago_verificado (
        pago_verificado
    ),

    INDEX idx_citas_fecha_estado (
        fecha_cita,
        estado
    ),

    INDEX idx_citas_metodo_pago (
        metodo_pago
    ),

    UNIQUE KEY uq_citas_operacion (
        metodo_pago,
        numero_operacion
    )

) ENGINE=InnoDB;


/* ============================================================
   TABLA: cita_servicios

   Guarda una copia de los datos que tenía el servicio cuando
   la clienta realizó la reserva.
   ============================================================ */

CREATE TABLE IF NOT EXISTS cita_servicios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    cita_id BIGINT UNSIGNED NOT NULL,

    /*
       ID proveniente de servicios.js.
       No es FK porque servicios.js no vive en MySQL.
    */
    servicio_id INT UNSIGNED NOT NULL,

    nombre VARCHAR(150) NOT NULL,

    precio DECIMAL(10,2) NOT NULL,

    cantidad SMALLINT UNSIGNED NOT NULL DEFAULT 1,

    duracion_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,


    /* ==============================
       RELACIÓN CON CITA
       ============================== */

    CONSTRAINT fk_cita_servicios_cita
        FOREIGN KEY (cita_id)
        REFERENCES citas(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,


    /* ==============================
       ÍNDICES
       ============================== */

    INDEX idx_cita_servicios_cita (
        cita_id
    ),

    INDEX idx_cita_servicios_servicio (
        servicio_id
    )

) ENGINE=InnoDB;