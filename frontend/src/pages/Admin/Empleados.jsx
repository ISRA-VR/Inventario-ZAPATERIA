import React, { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaEdit, FaTrash } from 'react-icons/fa';
import { register, getEmpleados, updateEmpleado, deleteEmpleado } from '../../api/auth';
import '../../styles/Empleados.css';

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
            setEmpleados(res.data);
        } catch (error) {
            console.error("Error al obtener empleados:", error);
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
            return;
        }
        try {
            await register(formData);
            closeModal();
            fetchEmpleados();
        } catch (error) {
            setError(error.response?.data?.message || "Error al crear el empleado");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
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
            closeEditModal();
            fetchEmpleados();
        } catch (error) {
            setError(error.response?.data?.message || "Error al actualizar el empleado");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteEmpleado(selectedEmpleado.id);
            closeDeleteModal();
            fetchEmpleados();
        } catch (error) {
            console.error("Error al eliminar empleado:", error);
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
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button onClick={openModal} className="btn-crear">Crear Empleado</button>
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
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                                <div className="password-input-container">
                                    <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle-icon">
                                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
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
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
                                <div className="password-input-container">
                                    <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
                                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle-icon">
                                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
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
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="btn-action delete"
                                                onClick={() => openDeleteModal(empleado)}
                                                title="Eliminar"
                                            >
                                                <FaTrash />
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