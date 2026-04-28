import { Router } from "express";
import {
	login,
	register,
	getEmpleados,
	updateEmpleado,
	updateEmpleadoEstado,
	deleteEmpleado,
	pingPresence,
	logoutPresence,
	forgotPassword,
	confirmResetRequest,
	resetPassword,
	checkFirstAdmin,
	setupFirstAdmin,
} from "../controllers/authController.js";
import { authAdmin, protect } from "../middleware/authMiddleware.js"; 

const router = Router();

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/confirm-reset-request", confirmResetRequest);
router.post("/reset-password", resetPassword);
router.get("/check-first-admin", checkFirstAdmin);
router.post("/setup-first-admin", setupFirstAdmin);

router.post("/register", authAdmin, register); 
router.post('/presence/ping', protect, pingPresence);
router.post('/presence/logout', protect, logoutPresence);

router.get("/empleados", authAdmin, getEmpleados);
router.put("/empleados/:id", authAdmin, updateEmpleado);
router.patch("/empleados/:id/estado", authAdmin, updateEmpleadoEstado);
router.delete("/empleados/:id", authAdmin, deleteEmpleado);

export default router;