// authMiddleware.js
import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No hay token, autorización denegada" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6");
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token no es válido" });
  }
};

export const authAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No hay token" });

  try {
    // USA EL MISMO SECRET QUE EN EL CONTROLLER
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6");
    
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "No tienes permisos de admin" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};