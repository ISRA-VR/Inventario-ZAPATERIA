import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const ALLOWED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

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

const isAllowedEmployeeEmail = (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  const validStructure = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized);
  if (!validStructure) return false;

  const domain = normalized.split("@")[1] || "";
  return ALLOWED_EMAIL_DOMAINS.has(domain);
};

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

let presenceColumnsReady = false;

const ensurePresenceColumns = async () => {
  if (presenceColumnsReady) return;

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios'
       AND COLUMN_NAME IN ('last_seen_at', 'last_login_at', 'last_logout_at', 'activo')`
  );

  const existing = new Set(rows.map((r) => r.COLUMN_NAME));

  if (!existing.has('last_seen_at')) {
    await pool.query('ALTER TABLE usuarios ADD COLUMN last_seen_at DATETIME NULL');
  }

  if (!existing.has('last_login_at')) {
    await pool.query('ALTER TABLE usuarios ADD COLUMN last_login_at DATETIME NULL');
  }

  if (!existing.has('last_logout_at')) {
    await pool.query('ALTER TABLE usuarios ADD COLUMN last_logout_at DATETIME NULL');
  }

  if (!existing.has('activo')) {
    await pool.query('ALTER TABLE usuarios ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1');
  }

  presenceColumnsReady = true;
};

const touchUserPresence = async (userId, { login = false } = {}) => {
  await ensurePresenceColumns();

  if (login) {
    await pool.query('UPDATE usuarios SET last_seen_at = NOW(), last_login_at = NOW(), last_logout_at = NULL WHERE id = ?', [userId]);
    return;
  }

  await pool.query(
    `UPDATE usuarios
     SET last_seen_at = NOW()
     WHERE id = ?
       AND (
         last_logout_at IS NULL
         OR TIMESTAMPDIFF(SECOND, last_logout_at, NOW()) > 5
       )`,
    [userId]
  );
};

const markUserLogout = async (userId) => {
  await ensurePresenceColumns();
  await pool.query('UPDATE usuarios SET last_seen_at = NOW(), last_logout_at = NOW() WHERE id = ?', [userId]);
};

export const login = async (req, res) => {
  try {
    await ensurePresenceColumns();

    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña son obligatorios", errorCode: "MISSING_CREDENTIALS" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas", errorCode: "INVALID_CREDENTIALS" });
    }

    const user = rows[0];

    if (Number(user?.activo) === 0) {
      return res.status(403).json({ message: "Tu cuenta está desactivada. Contacta al administrador.", errorCode: "ACCOUNT_DISABLED" });
    }

    const match = await verifyPassword(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Credenciales inválidas", errorCode: "INVALID_CREDENTIALS" });
    }

    if (!isBcryptHash(user.password)) {
      const migratedPasswordHash = await hashPassword(password);
      await pool.query("UPDATE usuarios SET password = ? WHERE id = ?", [migratedPasswordHash, user.id]);
    }

    await touchUserPresence(user.id, { login: true });

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
    res.status(500).json({ message: "Error del servidor", errorCode: "SERVER_ERROR" });
  }
};

export const register = async (req, res) => {
  try {
    await ensurePresenceColumns();

    const nombre = String(req.body?.nombre || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const rol = String(req.body?.rol || "").trim();

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Nombre, correo y contraseña son obligatorios." });
    }

    if (!isAllowedEmployeeEmail(email)) {
      return res.status(400).json({ message: "Correo inválido. Usa un proveedor permitido (gmail, hotmail, outlook, etc.)." });
    }

    const [existingUser] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "El correo electrónico ya está en uso." });
    }

    const hashedPassword = await hashPassword(password);

    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, role, activo) VALUES (?, ?, ?, ?, 1)",
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
    await ensurePresenceColumns();
    if (req.user?.id) {
      await touchUserPresence(req.user.id, { login: false });
    }

    const [rows] = await pool.query(
      `SELECT
        id,
        nombre,
        email,
        role,
        activo,
        created_at,
        last_login_at,
        last_seen_at,
        last_logout_at,
        CASE
          WHEN last_seen_at IS NOT NULL
            AND activo = 1
            AND TIMESTAMPDIFF(SECOND, last_seen_at, NOW()) <= 120
            AND (last_logout_at IS NULL OR last_seen_at > last_logout_at)
          THEN 1
          ELSE 0
        END AS en_linea
      FROM usuarios`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en getEmpleados:", err.message);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const pingPresence = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    await touchUserPresence(userId, { login: false });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en pingPresence:', err.message);
    return res.status(500).json({ message: 'No se pudo actualizar presencia' });
  }
};

export const logoutPresence = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    await markUserLogout(userId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en logoutPresence:', err.message);
    return res.status(500).json({ message: 'No se pudo registrar la ultima conexion' });
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
      return res.status(400).json({ message: "El correo es requerido.", errorCode: "MISSING_EMAIL" });
    }

    const [rows] = await pool.query(
      "SELECT id, nombre, email FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "El correo no está registrado en el sistema.", errorCode: "EMAIL_NOT_REGISTERED" });
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
      return res.status(400).json({ message: "El proveedor de correo rechazó el destinatario. Verifica que el correo exista.", errorCode: "MAIL_RECIPIENT_REJECTED" });
    }

    return res.json({ message: "Te enviamos un correo para confirmar tu solicitud de recuperación." });
  } catch (err) {
    if (err?.responseCode === 535 || String(err?.message || "").includes("BadCredentials")) {
      return res.status(500).json({
        message: "No se pudo autenticar el servicio de correo. Verifica usuario y contraseña SMTP/Gmail.",
        errorCode: "MAIL_AUTH_FAILED",
      });
    }
    if (err?.responseCode === 550 || String(err?.message || "").includes("5.1.1")) {
      return res.status(400).json({ message: "El correo no existe o no puede recibir correos.", errorCode: "MAIL_RECIPIENT_INVALID" });
    }
    console.error("Error en forgotPassword:", err.message);
    return res.status(500).json({ message: "Error del servidor", errorCode: "SERVER_ERROR" });
  }
};

export const confirmResetRequest = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();

    if (!token) {
      return res.status(400).json({ message: "Token de confirmación requerido.", errorCode: "MISSING_TOKEN" });
    }

    const transporter = getMailTransporter();
    if (!transporter) {
      return res.status(500).json({
        message: "El servicio de correo no está disponible en este momento. Intenta nuevamente más tarde.",
        errorCode: "MAIL_SERVICE_UNAVAILABLE",
      });
    }

    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6";
    const payload = jwt.verify(token, resetSecret);

    if (!payload?.id || payload.purpose !== "password-reset-confirm") {
      return res.status(400).json({ message: "Token de confirmación inválido.", errorCode: "INVALID_TOKEN" });
    }

    const [users] = await pool.query(
      "SELECT id, nombre, email FROM usuarios WHERE id = ? AND email = ? LIMIT 1",
      [payload.id, payload.email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado.", errorCode: "USER_NOT_FOUND" });
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
      return res.status(400).json({ message: "El proveedor de correo rechazó el destinatario. Verifica que el correo exista.", errorCode: "MAIL_RECIPIENT_REJECTED" });
    }

    return res.json({ message: "Confirmación exitosa. Te enviamos el correo para restablecer la contraseña." });
  } catch (err) {
    if (err?.responseCode === 535 || String(err?.message || "").includes("BadCredentials")) {
      return res.status(500).json({
        message: "No se pudo autenticar el servicio de correo. Verifica usuario y contraseña SMTP/Gmail.",
        errorCode: "MAIL_AUTH_FAILED",
      });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "El enlace de confirmación expiró. Solicita uno nuevo.", errorCode: "TOKEN_EXPIRED" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token de confirmación inválido.", errorCode: "INVALID_TOKEN" });
    }

    console.error("Error en confirmResetRequest:", err.message);
    return res.status(500).json({ message: "Error del servidor", errorCode: "SERVER_ERROR" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.password || "");

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token y nueva contraseña son requeridos.", errorCode: "MISSING_TOKEN_OR_PASSWORD" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres.", errorCode: "PASSWORD_TOO_SHORT" });
    }

    const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6";
    const payload = jwt.verify(token, resetSecret);

    if (!payload?.id || payload.purpose !== "password-reset") {
      return res.status(400).json({ message: "Token inválido.", errorCode: "INVALID_TOKEN" });
    }

    const [users] = await pool.query("SELECT id FROM usuarios WHERE id = ? LIMIT 1", [payload.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado.", errorCode: "USER_NOT_FOUND" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query("UPDATE usuarios SET password = ? WHERE id = ?", [hashedPassword, payload.id]);

    return res.json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "El enlace expiró. Solicita uno nuevo.", errorCode: "TOKEN_EXPIRED" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token inválido.", errorCode: "INVALID_TOKEN" });
    }

    console.error("Error en resetPassword:", err.message);
    return res.status(500).json({ message: "Error del servidor", errorCode: "SERVER_ERROR" });
  }
};

export const updateEmpleadoEstado = async (req, res) => {
  try {
    await ensurePresenceColumns();

    const { id } = req.params;
    const { activo } = req.body || {};
    const activoNum = Number(activo) === 1 ? 1 : 0;

    if (!id) {
      return res.status(400).json({ message: "ID de empleado inválido." });
    }

    if (Number(req.user?.id) === Number(id) && activoNum === 0) {
      return res.status(400).json({ message: "No puedes desactivar tu propia cuenta." });
    }

    const [result] = await pool.query(
      `UPDATE usuarios
       SET activo = ?,
           last_seen_at = CASE WHEN ? = 0 THEN NOW() ELSE last_seen_at END,
           last_logout_at = CASE WHEN ? = 0 THEN NOW() ELSE last_logout_at END
       WHERE id = ?`,
      [activoNum, activoNum, activoNum, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Empleado no encontrado." });
    }

    return res.json({
      message: activoNum === 1 ? "Empleado activado correctamente." : "Empleado desactivado correctamente.",
      activo: activoNum,
    });
  } catch (err) {
    console.error("Error en updateEmpleadoEstado:", err.message);
    return res.status(500).json({ message: "Error del servidor" });
  }
};

// Verificar si existe un administrador en el sistema
export const checkFirstAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id FROM usuarios WHERE role = 'admin' LIMIT 1"
    );

    const adminExists = rows.length > 0;
    res.json({ adminExists });
  } catch (err) {
    console.error("Error en checkFirstAdmin:", err.message);
    res.status(500).json({ message: "Error del servidor", errorCode: "SERVER_ERROR" });
  }
};

// Crear el primer administrador (solo se puede hacer una vez)
export const setupFirstAdmin = async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Nombre, correo y contraseña son obligatorios." });
    }

    // Verificar que no existe ya un administrador
    const [existingAdmin] = await pool.query(
      "SELECT id FROM usuarios WHERE role = 'admin' LIMIT 1"
    );

    if (existingAdmin.length > 0) {
      return res.status(400).json({ message: "Ya existe un administrador en el sistema." });
    }

    if (!isAllowedEmployeeEmail(email)) {
      return res.status(400).json({ message: "Correo inválido. Usa un proveedor permitido (gmail, hotmail, outlook, etc.)." });
    }

    const [existingUser] = await pool.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "El correo electrónico ya está en uso." });
    }

    const hashedPassword = await hashPassword(password);

    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, role, activo) VALUES (?, ?, ?, 'admin', 1)",
      [nombre, email, hashedPassword]
    );

    // Generar token JWT para login automático
    const token = jwt.sign(
      { id: result.insertId, role: 'admin', nombre },
      process.env.JWT_SECRET || "84c0c491bdc299bd803327fcf3019f0e6f4b35165e7aeb9d58c596e6c4eb78b6",
      { expiresIn: "8h" }
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      role: "admin",
      token,
    });
  } catch (err) {
    console.error("Error en setupFirstAdmin:", err.message);
    res.status(500).json({ message: "Error del servidor", errorCode: "SERVER_ERROR" });
  }
};