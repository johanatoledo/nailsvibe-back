import { Router } from "express";

import {
  cancelarCita,
  confirmarPagoCita,
  crearCita,
  marcarCitaAtendida,
  obtenerCitaPorId,
  obtenerCitas,
} from "../controllers/citasController.js";

const router = Router();

/* ============================================================
   CITAS
============================================================ */

// Obtener todas las citas
router.get("/", obtenerCitas);

// Crear una nueva cita
router.post("/", crearCita);

// Obtener una cita por ID
router.get("/:id", obtenerCitaPorId);

/* ============================================================
   ACCIONES SOBRE LA CITA
============================================================ */

// Confirmar/verificar el pago de la reserva
router.patch("/:id/pago", confirmarPagoCita);

// Marcar cita como atendida
router.patch("/:id/atender", marcarCitaAtendida);

// Cancelar cita
router.patch("/:id/cancelar", cancelarCita);

export default router;