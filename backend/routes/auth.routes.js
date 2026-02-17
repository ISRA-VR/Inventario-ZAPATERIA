import { Router } from "express";
import { login, register, getEmpleados, updateEmpleado, deleteEmpleado } from "../controllers/authController.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.get("/empleados", getEmpleados);
router.put("/empleados/:id", updateEmpleado);
router.delete("/empleados/:id", deleteEmpleado);

export default router;
