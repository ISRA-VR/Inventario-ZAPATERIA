import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const hasConfiguredEnvValue = (value) => {
  const normalized = String(value || "").trim();
  return normalized.length > 0 && !normalized.includes("PEGA_AQUI");
};

const buildResetToken = (user) => {
  const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6";
  return jwt.sign(
    { id: user.id, email: user.email, purpose: "password-reset" },
    resetSecret,
    { expiresIn: "15m" }
  );
};

const buildResetConfirmationToken = (user) => {
  const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6";
  return jwt.sign(
    { id: user.id, email: user.email, purpose: "password-reset-confirm" },
    resetSecret,
    { expiresIn: "15m" }
  );
};

const hasSmtpConfig = () => {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  return required.every((key) => hasConfiguredEnvValue(process.env[key]));
};

const hasGmailConfig = () => {
  return hasConfiguredEnvValue(process.env.GMAIL_USER) && hasConfiguredEnvValue(process.env.GMAIL_APP_PASSWORD);
};

const parseBoolean = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const getMailTransporter = () => {
  if (hasSmtpConfig()) {
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const secure = hasConfiguredEnvValue(process.env.SMTP_SECURE)
      ? parseBoolean(process.env.SMTP_SECURE)
      : smtpPort === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (hasGmailConfig()) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return null;
};

const getMissingMailEnvVars = () => {
  const smtpVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const gmailVars = ["GMAIL_USER", "GMAIL_APP_PASSWORD"];

  const smtpProvided = smtpVars.some((key) => hasConfiguredEnvValue(process.env[key]));
  const gmailProvided = gmailVars.some((key) => hasConfiguredEnvValue(process.env[key]));

  if (smtpProvided) {
    return smtpVars.filter((key) => !hasConfiguredEnvValue(process.env[key]));
  }

  if (gmailProvided) {
    return gmailVars.filter((key) => !hasConfiguredEnvValue(process.env[key]));
  }

  return ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS (o GMAIL_USER/GMAIL_APP_PASSWORD)"];
};

const isProduction = () => String(process.env.NODE_ENV || "").toLowerCase() === "production";
const getFrontendUrl = (req) => {
  const frontendUrl = String(process.env.FRONTEND_URL || "").trim();
  const origin = String(req?.headers?.origin || "").trim();

  const baseUrl = frontendUrl || origin || "http://localhost:5173";
  return baseUrl.replace(/\/$/, "");
};

const isBcryptHash = (value) => /^\$2[aby]\$\d{2}\$/.test(String(value || ""));

const verifyPassword = async (plainPassword, storedPassword) => {
  if (!storedPassword) return false;

  if (isBcryptHash(storedPassword)) {
    try {
      return await bcrypt.compare(plainPassword, storedPassword);
    } catch {
      return false;
    }
  }

  return plainPassword === storedPassword;
};

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

export const login = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const user = rows[0];

    const match = await verifyPassword(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (!isBcryptHash(user.password)) {
      const migratedPasswordHash = await hashPassword(password);
      await pool.query("UPDATE usuarios SET password = ? WHERE id = ?", [migratedPasswordHash, user.id]);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, nombre: user.nombre },
      process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6",
      { expiresIn: "8h" }
    );

    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error("Error en login:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const register = async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const rol = String(req.body?.rol || "").trim();

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Nombre, correo y contraseña son obligatorios." });
    }

    const [existingUser] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "El correo electrónico ya está en uso." });
    }

    const hashedPassword = await hashPassword(password);

    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)",
      [nombre, email, hashedPassword, rol || 'empleado']
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      role: rol || "empleado",
    });
  } catch (err) {
    console.error("Error en register:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const getEmpleados = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, email, role, created_at FROM usuarios");
    res.json(rows);
  } catch (err) {
    console.error("Error en getEmpleados:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const updateEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body;

    const [existingUser] = await pool.query("SELECT id FROM usuarios WHERE email = ? AND id != ?", [email, id]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "El correo electrónico ya está en uso por otro usuario." });
    }

    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const fields = [];
    const params = [];

    if (nombre) { fields.push("nombre = ?"); params.push(nombre); }
    if (email) { fields.push("email = ?"); params.push(email); }
    if (rol) { fields.push("role = ?"); params.push(rol); }
    if (hashedPassword) { fields.push("password = ?"); params.push(hashedPassword); }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No se proporcionaron datos para actualizar." });
    }

    params.push(id);

    const [result] = await pool.query(
      `UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Empleado no encontrado." });
    }

    res.json({ message: "Empleado actualizado correctamente." });

  } catch (err) {
    console.error("Error en updateEmpleado:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const deleteEmpleado = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM usuarios WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Empleado no encontrado." });
    }

    res.json({ message: "Empleado eliminado permanentemente." });
  } catch (err) {
    console.error("Error en deleteEmpleado:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "El correo es requerido." });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, email FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "El correo no está registrado en el sistema." });
    }

    const transporter = getMailTransporter();
    if (!transporter) {
      const missing = getMissingMailEnvVars();
      console.error(`Proveedor de correo no configurado: ${missing.join(", ")}`);
      return res.json({
        message: "Si el correo está registrado, te enviaremos instrucciones para restablecer tu acceso.",
      });
    }

    const user = rows[0];
    const frontendUrl = getFrontendUrl(req);
    const confirmToken = buildResetConfirmationToken(user);
    const confirmationLink = `${frontendUrl}/confirm-reset-request?token=${confirmToken}`;
    const mailFrom =
      process.env.MAIL_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      process.env.GMAIL_USER;

    const info = await transporter.sendMail({
      from: `"Zapatería Beni Van" <${mailFrom}>`,
      to: user.email,
      subject: "Confirmación de solicitud de recuperación",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2 style="margin-bottom: 8px;">Solicitud recibida</h2>
          <p>Hola ${user.nombre || "usuario"}, recibimos una solicitud para recuperar tu contraseña.</p>
          <p>Para continuar, confirma que fuiste tú con este botón:</p>
          <p>
            <a href="${confirmationLink}" style="display:inline-block;padding:10px 16px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px;">
              Confirmar solicitud
            </a>
          </p>
          <p>Después de confirmar, te enviaremos otro correo con el enlace para restablecer tu contraseña.</p>
          <p>Este enlace de confirmación caduca en 15 minutos.</p>
        </div>
      `,
    });

    if (Array.isArray(info?.rejected) && info.rejected.length > 0) {
      return res.status(400).json({ message: "El proveedor de correo rechazó el destinatario. Verifica que el correo exista." });
    }

    return res.json({ message: "Te enviamos un correo para confirmar tu solicitud de recuperación." });
  } catch (err) {
    if (err?.responseCode === 535 || String(err?.message || "").includes("BadCredentials")) {
      return res.status(500).json({
        message: "No se pudo autenticar el servicio de correo. Verifica usuario y contraseña SMTP/Gmail.",
      });
    }
    if (err?.responseCode === 550 || String(err?.message || "").includes("5.1.1")) {
      return res.status(400).json({ message: "El correo no existe o no puede recibir correos." });
    }
    console.error("Error en forgotPassword:", err.message);
    return res.status(500).json({ message: "Error del servidor" });
  }
};

export const confirmResetRequest = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();

    if (!token) {
      return res.status(400).json({ message: "Token de confirmación requerido." });
    }

    const transporter = getMailTransporter();
    if (!transporter) {
      return res.status(500).json({
        message: "El servicio de correo no está disponible en este momento. Intenta nuevamente más tarde.",
      });
    }

    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6";
    const payload = jwt.verify(token, resetSecret);

    if (!payload?.id || payload.purpose !== "password-reset-confirm") {
      return res.status(400).json({ message: "Token de confirmación inválido." });
    }

    const [users] = await pool.query(
      "SELECT id, nombre, email FROM usuarios WHERE id = ? AND email = ? LIMIT 1",
      [payload.id, payload.email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const user = users[0];
    const resetToken = buildResetToken(user);
    const frontendUrl = getFrontendUrl(req);
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const mailFrom =
      process.env.MAIL_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      process.env.GMAIL_USER;

    const info = await transporter.sendMail({
      from: `"Zapatería Beni Van" <${mailFrom}>`,
      to: user.email,
      subject: "Recuperación de contraseña",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2 style="margin-bottom: 8px;">Recuperar contraseña</h2>
          <p>Hola ${user.nombre || "usuario"}, ya confirmaste la solicitud.</p>
          <p>Ahora sí, usa este enlace para restablecer tu contraseña:</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px;">
              Restablecer contraseña
            </a>
          </p>
          <p>Este enlace caduca en 15 minutos.</p>
          <p>Si no fuiste tú, ignora este correo.</p>
        </div>
      `,
    });

    if (Array.isArray(info?.rejected) && info.rejected.length > 0) {
      return res.status(400).json({ message: "El proveedor de correo rechazó el destinatario. Verifica que el correo exista." });
    }

    return res.json({ message: "Confirmación exitosa. Te enviamos el correo para restablecer la contraseña." });
  } catch (err) {
    if (err?.responseCode === 535 || String(err?.message || "").includes("BadCredentials")) {
      return res.status(500).json({
        message: "No se pudo autenticar el servicio de correo. Verifica usuario y contraseña SMTP/Gmail.",
      });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "El enlace de confirmación expiró. Solicita uno nuevo." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token de confirmación inválido." });
    }

    console.error("Error en confirmResetRequest:", err.message);
    return res.status(500).json({ message: "Error del servidor" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.password || "");

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token y nueva contraseña son requeridos." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6";
    const payload = jwt.verify(token, resetSecret);

    if (!payload?.id || payload.purpose !== "password-reset") {
      return res.status(400).json({ message: "Token inválido." });
    }

    const [users] = await pool.query("SELECT id FROM usuarios WHERE id = ? LIMIT 1", [payload.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query("UPDATE usuarios SET password = ? WHERE id = ?", [hashedPassword, payload.id]);

    return res.json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "El enlace expiró. Solicita uno nuevo." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token inválido." });
    }

    console.error("Error en resetPassword:", err.message);
    return res.status(500).json({ message: "Error del servidor" });
  }
};