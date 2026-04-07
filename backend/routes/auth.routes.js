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
import { authAdmin } from "../middleware/authMiddleware.js"; 

const router = Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/confirm-reset-request", confirmResetRequest);
router.post("/reset-password", resetPassword);

router.post("/register", authAdmin, register); 

router.get("/empleados", authAdmin, getEmpleados);
router.put("/empleados/:id", authAdmin, updateEmpleado);
router.delete("/empleados/:id", authAdmin, deleteEmpleado);

export default router;