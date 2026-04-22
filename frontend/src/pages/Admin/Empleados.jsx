import React, { useState, useEffect, useRef } from 'react';
import {
    Eye, EyeOff, FilePenLine, Trash2, Search, PlusCircle,
    UserPlus, UserCog, AlertTriangle, Save, CheckCircle, X
} from 'lucide-react';
import { register, getEmpleados, updateEmpleado, updateEmpleadoEstado, deleteEmpleado } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import '../../styles/empleados.css';

const LOCAL_LAST_LOGOUT_KEY = 'presence_last_logout_local';
const DELETE_UNDO_MS = 3000;
const DOMINIOS_EMAIL_PERMITIDOS = [
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'yahoo.com',
    'icloud.com',
    'proton.me',
    'protonmail.com',
];

const IconPlus   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash  = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

const formatDateTime = (value) => {
    if (!value) return 'Sin registro';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin registro';
    return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatLastSeenWhatsApp = (value) => {
    if (!value) return 'Sin registro';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin registro';

    const now = new Date();
    const isSameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate();

    const hora = date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    if (isSameDay) return `hoy a las ${hora}`;
    if (isYesterday) return `ayer a las ${hora}`;

    const fecha = date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    return `${fecha} ${hora}`;
};

const getUltimaConexion = (empleado) => {
    const candidatos = [empleado?.last_logout_at, empleado?.last_seen_at, empleado?.last_login_at]
        .map((v) => ({ raw: v, ts: v ? new Date(v).getTime() : NaN }))
        .filter((item) => Number.isFinite(item.ts));

    if (!candidatos.length) return null;
    candidatos.sort((a, b) => b.ts - a.ts);
    return candidatos[0].raw;
};

const readLocalLastLogoutMap = () => {
    try {
        const raw = localStorage.getItem(LOCAL_LAST_LOGOUT_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const EmpleadosPage = () => {
    const { user } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [empleados, setEmpleados] = useState([]);
    const [selectedEmpleado, setSelectedEmpleado] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        rol: 'empleado',
        activo: '1',
    });

    const [error, setError] = useState('');
    const deleteEmpleadoTimeoutRef = useRef(null);

    // Expresión regular corregida y más permisiva con los caracteres especiales
    const validarPassword = (password) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return regex.test(password);
    };

    // Función para evaluar el nivel de seguridad y cambiar colores
    const evaluarSeguridad = (password) => {
        let score = 0;
        if (!password) return { score: 0, color: 'transparent', width: '0%' };
        if (password.length >= 8) score += 1;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[\W_]/.test(password)) score += 1;

        if (score <= 2) return { score, color: '#ff4d4f', width: '33%' }; // Rojo - Débil
        if (score === 3) return { score, color: '#faad14', width: '66%' }; // Amarillo - Medio
        return { score, color: '#52c41a', width: '100%' }; // Verde - Fuerte
    };

    const msgPasswordInsegura = "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";
    const msgEmailInvalido = "Ingresa un correo válido de proveedor permitido (gmail, hotmail, outlook, etc.).";

    const validarEmailEmpleado = (email) => {
        const correo = String(email || '').trim().toLowerCase();
        const estructuraValida = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(correo);
        if (!estructuraValida) return false;

        const dominio = correo.split('@')[1] || '';
        return DOMINIOS_EMAIL_PERMITIDOS.includes(dominio);
    };

    const openModal = () => setModalOpen(true);
    const closeModal = () => {
        setModalOpen(false);
        resetForm();
    };

    const openEditModal = (empleado) => {
        setSelectedEmpleado(empleado);
        setFormData({
            nombre: empleado.nombre,
            email: empleado.email,
            password: '',
            confirmPassword: '',
            rol: empleado.role,
            activo: String(Number(empleado.activo ?? 1)),
        });
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setSelectedEmpleado(null);
        resetForm();
    };

    const openDeleteModal = (empleado) => {
        setSelectedEmpleado(empleado);
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setSelectedEmpleado(null);
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            email: '',
            password: '',
            confirmPassword: '',
            rol: 'empleado',
            activo: '1',
        });
        setError('');
    };

    const fetchEmpleados = async () => {
        try {
            const res = await getEmpleados();
            const data = Array.isArray(res) ? res : res.data;
            setEmpleados(data || []);
        } catch (error) {
            console.error("Error al obtener empleados:", error);
            toast.error("No se pudo cargar la lista de empleados");
        }
    };

    useEffect(() => {
        fetchEmpleados();

        const intervalId = setInterval(fetchEmpleados, 5000);
        const onFocus = () => fetchEmpleados();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchEmpleados();
            }
        };
        const onPresenceUpdated = () => fetchEmpleados();
        const onStorage = () => fetchEmpleados();

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('presence-updated', onPresenceUpdated);
        window.addEventListener('storage', onStorage);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('presence-updated', onPresenceUpdated);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (deleteEmpleadoTimeoutRef.current) {
                clearTimeout(deleteEmpleadoTimeoutRef.current);
                deleteEmpleadoTimeoutRef.current = null;
            }
        };
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validarEmailEmpleado(formData.email)) {
            setError(msgEmailInvalido);
            toast.warning(msgEmailInvalido);
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
            toast.warning("Las contraseñas no coinciden.");
            return;
        }

        if (!validarPassword(formData.password)) {
            setError(msgPasswordInsegura);
            toast.warning(msgPasswordInsegura);
            return;
        }

        try {
            await register(formData);
            toast.success("¡Empleado creado con éxito!");
            closeModal();
            fetchEmpleados();
        } catch (error) {
            const msg = error.response?.data?.message || "Error al crear el empleado";
            setError(msg);
            toast.error(msg);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
            toast.warning("Las nuevas contraseñas no coinciden");
            return;
        }

        if (formData.password && !validarPassword(formData.password)) {
            setError(msgPasswordInsegura);
            toast.warning(msgPasswordInsegura);
            return;
        }

        try {
            const dataToUpdate = {
                nombre: formData.nombre,
                email: formData.email,
                rol: formData.rol,
            };
            
            if (formData.password) {
                dataToUpdate.password = formData.password;
            }
            
            await updateEmpleado(selectedEmpleado.id, dataToUpdate);

            const estadoActual = Number(selectedEmpleado?.activo ?? 1);
            const estadoNuevo = Number(formData.activo) === 1 ? 1 : 0;
            if (estadoNuevo !== estadoActual) {
                if (Number(selectedEmpleado?.id) === Number(user?.id) && estadoNuevo === 0) {
                    toast.warning("No puedes desactivar tu propia cuenta.");
                    return;
                }
                await updateEmpleadoEstado(selectedEmpleado.id, estadoNuevo);
            }

            toast.info("¡Datos actualizados correctamente!");
            closeEditModal();
            fetchEmpleados();
        } catch (error) {
            const msg = error.response?.data?.message || "Error al actualizar el empleado";
            setError(msg);
            toast.error(msg);
        }
    };

    const handleDelete = () => {
        if (!selectedEmpleado?.id) return;

        const empleadoObjetivo = { ...selectedEmpleado };
        closeDeleteModal();

        if (deleteEmpleadoTimeoutRef.current) {
            clearTimeout(deleteEmpleadoTimeoutRef.current);
            deleteEmpleadoTimeoutRef.current = null;
        }

        const timeoutId = setTimeout(async () => {
            deleteEmpleadoTimeoutRef.current = null;
            try {
                await deleteEmpleado(empleadoObjetivo.id);
                toast.warn("Empleado eliminado del sistema");
                fetchEmpleados();
            } catch (error) {
                console.error("Error al eliminar empleado:", error);
                toast.error("Hubo un fallo al intentar eliminar el empleado");
            }
        }, DELETE_UNDO_MS);

        deleteEmpleadoTimeoutRef.current = timeoutId;

        toast.warning(
            ({ closeToast }) => (
                <div className="undo-toast-row">
                    <span className="undo-toast-text">
                        {empleadoObjetivo.nombre || 'Empleado'} se eliminará en 3s.
                    </span>
                    <button
                        type="button"
                        className="undo-toast-btn"
                        onClick={() => {
                            if (deleteEmpleadoTimeoutRef.current === timeoutId) {
                                clearTimeout(timeoutId);
                                deleteEmpleadoTimeoutRef.current = null;
                                toast.info("Eliminación cancelada.");
                            }
                            closeToast?.();
                        }}
                    >
                        Deshacer
                    </button>
                </div>
            ),
            { autoClose: DELETE_UNDO_MS }
        );
    };


    const filteredEmpleados = empleados.filter(empleado =>
        empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const localLastLogoutMap = readLocalLastLogoutMap();

    const passStrength = evaluarSeguridad(formData.password);

    return (
        <div className="empleados-container">
            <div className="empleados-heading">
                <h1 className="empleados-title">Gestión de Empleados</h1>
                <p className="empleados-subtitle">Administra Cuentas para los Empleados</p>
            </div>
            <header className="empleados-header">
                <div className="header-actions">
                    <div className="search-container">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={openModal} className="btn-crear">
                        <IconPlus size={18} />
                        Crear Empleado
                    </button>
                </div>
            </header>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header">
                            <h2>Crear Nuevo Empleado</h2>
                            <button onClick={closeModal} className="close-button">&times;</button>
                        </header>
                        <form className="empleado-form" onSubmit={handleSubmit}>
                            {error && <p className="error-message">{error}</p>}
                            <div className="form-group">
                                <label htmlFor="nombre">Nombre Completo</label>
                                <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Correo Electrónico</label>
                                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Contraseña</label>
                                <div className="password-input-container">
                                    <input type={showPassword ? "text" : "password"} id="password" name="password" value={formData.password} onChange={handleChange} required />
                                    <span onClick={() => setShowPassword(!showPassword)} className="password-toggle-icon">
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </span>
                                </div>
                                {/* Barra de seguridad */}
                                <div style={{ height: '6px', width: '100%', backgroundColor: '#e5e7eb', marginTop: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: passStrength.width, backgroundColor: passStrength.color, transition: 'all 0.3s ease' }}></div>
                                </div>
                                <small className="helper-text">Mínimo 8 caracteres, mayúscula, número y carácter especial.</small>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                                <div className="password-input-container">
                                    <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle-icon">
                                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                                    </span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="rol">Rol</label>
                                <select id="rol" name="rol" value={formData.rol} onChange={handleChange}>
                                    <option value="empleado">Empleado</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-guardar">Guardar</button>
                                <button type="button" onClick={closeModal} className="btn-cancelar">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header">
                            <h2>Editar Empleado</h2>
                            <button onClick={closeEditModal} className="close-button">&times;</button>
                        </header>
                        <form className="empleado-form" onSubmit={handleUpdate}>
                            {error && <p className="error-message">{error}</p>}
                            <div className="form-group">
                                <label htmlFor="nombre">Nombre Completo</label>
                                <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Correo Electrónico</label>
                                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Nueva Contraseña (opcional)</label>
                                <div className="password-input-container">
                                    <input type={showPassword ? "text" : "password"} id="password" name="password" value={formData.password} onChange={handleChange} />
                                    <span onClick={() => setShowPassword(!showPassword)} className="password-toggle-icon">
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </span>
                                </div>
                                {/* Barra de seguridad */}
                                {formData.password && (
                                    <div style={{ height: '6px', width: '100%', backgroundColor: '#e5e7eb', marginTop: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: passStrength.width, backgroundColor: passStrength.color, transition: 'all 0.3s ease' }}></div>
                                    </div>
                                )}
                                <small className="helper-text">Mínimo 8 caracteres, mayúscula, número y carácter especial.</small>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
                                <div className="password-input-container">
                                    <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
                                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle-icon">
                                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                                    </span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="rol">Rol</label>
                                <select id="rol" name="rol" value={formData.rol} onChange={handleChange}>
                                    <option value="empleado">Empleado</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="activo">Estado de cuenta</label>
                                <select
                                    id="activo"
                                    name="activo"
                                    value={formData.activo}
                                    onChange={handleChange}
                                    disabled={Number(selectedEmpleado?.id) === Number(user?.id)}
                                >
                                    <option value="1">Activa</option>
                                    <option value="0">Desactivada</option>
                                </select>
                                {Number(selectedEmpleado?.id) === Number(user?.id) && (
                                    <small className="helper-text">No puedes desactivar tu propia cuenta.</small>
                                )}
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-guardar">Actualizar</button>
                                <button type="button" onClick={closeEditModal} className="btn-cancelar">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content modal-sm">
                        <header className="modal-header">
                            <h2>Confirmar Eliminación</h2>
                            <button onClick={closeDeleteModal} className="close-button">&times;</button>
                        </header>
                        <div className="modal-body">
                            <p>¿Estás seguro de que quieres eliminar a <strong>{selectedEmpleado?.nombre}</strong>?</p>
                        </div>
                        <div className="form-actions">
                            <button onClick={handleDelete} className="btn-eliminar">Eliminar</button>
                            <button onClick={closeDeleteModal} className="btn-cancelar">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="empleados-list">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Fecha de Creación</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmpleados.length > 0 ? (
                            filteredEmpleados.map(empleado => (
                                (() => {
                                    const cuentaActiva = Number(empleado.activo ?? 1) === 1;
                                    const localLogoutRaw = localLastLogoutMap[String(empleado.id)] || null;
                                    const localLogoutTs = localLogoutRaw ? new Date(localLogoutRaw).getTime() : NaN;
                                    const backendSeenTs = empleado?.last_seen_at ? new Date(empleado.last_seen_at).getTime() : NaN;
                                    const forceOfflineByLocal = Number.isFinite(localLogoutTs)
                                        && (!Number.isFinite(backendSeenTs) || localLogoutTs >= backendSeenTs);

                                    const enLinea = cuentaActiva && !forceOfflineByLocal && Number(empleado.en_linea) === 1;
                                    const ultimaConexion = forceOfflineByLocal
                                        ? localLogoutRaw
                                        : getUltimaConexion(empleado);
                                    return (
                                <tr key={empleado.id}>
                                    <td>{empleado.nombre}</td>
                                    <td>{empleado.email}</td>
                                    <td>
                                        <span className={`badge-rol ${empleado.role}`}>
                                            {empleado.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge-status ${enLinea ? 'online' : 'offline'}`}>
                                            {cuentaActiva
                                                ? (enLinea ? 'En línea' : `Últ. vez ${formatLastSeenWhatsApp(ultimaConexion)}`)
                                                : 'Cuenta desactivada'}
                                        </span>
                                    </td>
                                    <td>{new Date(empleado.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button
                                                className="btn-action edit"
                                                onClick={() => openEditModal(empleado)}
                                                title="Editar"
                                            >
                                                <IconEdit />
                                            </button>
                                            <button
                                                className="btn-action delete"
                                                onClick={() => openDeleteModal(empleado)}
                                                title="Eliminar"
                                            >
                                                <IconTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                    );
                                })()
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6">No se encontraron empleados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmpleadosPage;