import { Router } from "express";
import {
	login,
	register,
	getEmpleados,
	updateEmpleado,
	deleteEmpleado,
	forgotPassword,
	confirmResetRequest,
	resetPassword,
} from "../controllers/authController.js";
// 1. IMPORTA TU GUARDIÁN
import { authAdmin } from "../middleware/authMiddleware.js"; 

const router = Router();

// Esta es pública, cualquiera puede intentar loguearse
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/confirm-reset-request", confirmResetRequest);
router.post("/reset-password", resetPassword);

// El registro debe ser privado para que un extraño no se cree una cuenta
router.post("/register", authAdmin, register); 

// Solo el admin debería ver la lista completa, editar o borrar
router.get("/empleados", authAdmin, getEmpleados);
router.put("/empleados/:id", authAdmin, updateEmpleado);
router.delete("/empleados/:id", authAdmin, deleteEmpleado);

export default router;