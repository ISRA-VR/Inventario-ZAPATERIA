import React, { useState, useEffect } from 'react';
import {
    Eye, EyeOff, FilePenLine, Trash2, Search, PlusCircle,
    UserPlus, UserCog, AlertTriangle, Save, CheckCircle, X
} from 'lucide-react';
import { register, getEmpleados, updateEmpleado, deleteEmpleado } from '../../api/auth';
import { toast } from 'react-toastify';
import '../../styles/Empleados.css';

const IconPlus   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash  = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

const EmpleadosPage = () => {
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
        rol: 'empleado'
    });

    const [error, setError] = useState('');

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
            rol: empleado.role
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
            rol: 'empleado'
        });
        setError('');
    };

    const fetchEmpleados = async () => {
        try {
            const res = await getEmpleados();
            console.log("Datos recibidos:", res.data); // <-- AGREGA ESTO para ver qué llega

            // Si el backend envía un objeto con una propiedad, ajusta aquí
            const data = Array.isArray(res) ? res : res.data;
            setEmpleados(data || []);
        } catch (error) {
            console.error("Error al obtener empleados:", error);
            toast.error("No se pudo cargar la lista de empleados");
        }
    };

    useEffect(() => {
        fetchEmpleados();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
            toast.warning("¡Checa las contraseñas, no coinciden!"); // Aviso preventivo
            return;
        }
        try {
            await register(formData);
            // 2. ÉXITO AL CREAR
            toast.success("¡Empleado creado con éxito!");
            closeModal();
            fetchEmpleados();
        } catch (error) {
            const msg = error.response?.data?.message || "Error al crear el empleado";
            setError(msg);
            toast.error(msg); // Error del servidor
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
            toast.warning("Las nuevas contraseñas no coinciden");
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
            // 3. ÉXITO AL EDITAR
            toast.info("¡Datos actualizados correctamente!");
            closeEditModal();
            fetchEmpleados();
        } catch (error) {
            const msg = error.response?.data?.message || "Error al actualizar el empleado";
            setError(msg);
            toast.error(msg);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteEmpleado(selectedEmpleado.id);
            // 4. ÉXITO AL ELIMINAR
            toast.warn("Empleado eliminado del sistema");
            closeDeleteModal();
            fetchEmpleados();
        } catch (error) {
            console.error("Error al eliminar empleado:", error);
            toast.error("Hubo un fallo al intentar eliminar el empleado");
        }
    };

    const filteredEmpleados = empleados.filter(empleado =>
        empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="empleados-container">
            <h2>Gestión de Empleados</h2>
            <p>Administra Cuentas para los Empleados</p>
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
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Fecha de Creación</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmpleados.length > 0 ? (
                            filteredEmpleados.map(empleado => (
                                <tr key={empleado.id}>
                                    <td>{empleado.id}</td>
                                    <td>{empleado.nombre}</td>
                                    <td>{empleado.email}</td>
                                    <td>
                                        <span className={`badge-rol ${empleado.role}`}>
                                            {empleado.role}
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