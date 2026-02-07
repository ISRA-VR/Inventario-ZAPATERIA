import jwt from "jsonwebtoken";

const SECRET = "inventario_secret";

export const authAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  const decoded = jwt.verify(token, SECRET);
  if (decoded.role !== "admin") return res.sendStatus(403);

  next();
};
