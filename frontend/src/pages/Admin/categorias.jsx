import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; // 1. IMPORTAR useAuth
import '../../styles/addCategoria.css';
import { toast } from 'react-toastify';

/* ── Iconos (sin cambios) ── */
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconClose = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconTag = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconWarn = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconFolder = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;

/* ── API ── */
const API_CATEGORIAS = 'http://localhost:3001/api/categorias';

const CategoriasPage = () => {
  const { user } = useAuth(); // 2. OBTENER DATOS DE AUTH
  const [categorias, setCategorias] = useState([]);

  /* Modales */
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  /* Formularios */
  const [formCrear, setFormCrear] = useState({ nombre: '', descripcion: '' });
  const [formEditar, setFormEditar] = useState({ nombre: '', descripcion: '' });
  const [categoriaActual, setCategoriaActual] = useState(null);

  const fetchCategorias = useCallback(async () => {
    if (!user?.token) return;
    try {
      const { data } = await axios.get(API_CATEGORIAS, getAuthConfig());
      setCategorias(data);
    } catch (err) {
      console.error('Error al obtener categorías:', err);
      toast.error('Error al cargar las categorías');
    }
  }, [user]);

  useEffect(() => { fetchCategorias(); }, [fetchCategorias]);

  /* ── OPERACIONES CRUD (CON TOKEN) ── */

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  });

  const handleCrear = async () => {
    if (!formCrear.nombre.trim()) return;
    try {
      await axios.post(
        API_CATEGORIAS,
        {
          nombre_categoria: formCrear.nombre.trim(),
          descripcion: formCrear.descripcion.trim(),
        },
        getAuthConfig() // 3. USAR TOKEN
      );
      toast.success('Categoría creada con éxito');
      setFormCrear({ nombre: '', descripcion: '' });
      setModalCrear(false);
      fetchCategorias();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la categoría');
    }
  };

  const abrirEditar = (cat) => {
    setCategoriaActual(cat);
    setFormEditar({
      nombre: cat.nombre_categoria,
      descripcion: cat.descripcion || '',
    });
    setModalEditar(true);
  };

  const handleEditar = async () => {
    if (!formEditar.nombre.trim() || !categoriaActual) return;
    try {
      await axios.put(
        `${API_CATEGORIAS}/${categoriaActual.id_categoria}`,
        {
          nombre_categoria: formEditar.nombre.trim(),
          descripcion: formEditar.descripcion.trim(),
        },
        getAuthConfig() // 3. USAR TOKEN
      );
      toast.info('Categoría actualizada correctamente');
      setModalEditar(false);
      fetchCategorias();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al editar la categoría');
    }
  };

  const abrirEliminar = (cat) => {
    setCategoriaActual(cat);
    setModalEliminar(true);
  };

  const handleEliminar = async () => {
    if (!categoriaActual) return;
    try {
      await axios.delete(
        `${API_CATEGORIAS}/${categoriaActual.id_categoria}`,
        getAuthConfig() // 3. USAR TOKEN
      );
      toast.warn('Categoría eliminada');
      setModalEliminar(false);
      fetchCategorias();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar la categoría');
    }
  };

  return (
    <div className="categorias-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestión de Categorías</h1>
          <p>Administra las categorías de productos</p>
        </div>
        <button className="btn-primary" onClick={() => setModalCrear(true)}>
          <IconPlus /> Nueva Categoría
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <IconTag />
          <span>Categorías Registradas</span>
        </div>

        <table className="categorias-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th className="col-productos">Productos</th>
              <th className="col-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <div><IconFolder /></div>
                    <p>No hay categorías registradas</p>
                  </div>
                </td>
              </tr>
            ) : (
              categorias.map((cat) => (
                <tr key={cat.id_categoria}>
                  <td className="td-nombre">{cat.nombre_categoria}</td>
                  <td className="td-desc">{cat.descripcion || '—'}</td>
                  <td className="col-productos">
                    <span className="badge-productos">{cat.cantidad_productos ?? 0}</span>
                  </td>
                  <td className="col-acciones">
                    <div className="acciones-cell">
                      <button className="btn-icon btn-icon-edit" title="Editar" onClick={() => abrirEditar(cat)}>
                        <IconEdit />
                      </button>
                      <button className="btn-icon btn-icon-delete" title="Eliminar" onClick={() => abrirEliminar(cat)}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALES (Lógica de Renderizado) */}
      
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Categoría</h2>
              <button className="modal-close" onClick={() => setModalCrear(false)}><IconClose /></button>
            </div>
            <div className="form-group">
              <label>Nombre *</label>
              <input 
                type="text" 
                value={formCrear.nombre} 
                onChange={(e) => setFormCrear({ ...formCrear, nombre: e.target.value })} 
                autoFocus 
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea 
                value={formCrear.descripcion} 
                onChange={(e) => setFormCrear({ ...formCrear, descripcion: e.target.value })} 
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalCrear(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCrear} disabled={!formCrear.nombre.trim()}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {modalEditar && (
        <div className="modal-overlay" onClick={() => setModalEditar(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Categoría</h2>
              <button className="modal-close" onClick={() => setModalEditar(false)}><IconClose /></button>
            </div>
            <div className="form-group">
              <label>Nombre *</label>
              <input 
                type="text" 
                value={formEditar.nombre} 
                onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })} 
                autoFocus 
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea 
                value={formEditar.descripcion} 
                onChange={(e) => setFormEditar({ ...formEditar, descripcion: e.target.value })} 
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEditar(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleEditar} disabled={!formEditar.nombre.trim()}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {modalEliminar && (
        <div className="modal-overlay" onClick={() => setModalEliminar(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar Categoría</h2>
              <button className="modal-close" onClick={() => setModalEliminar(false)}><IconClose /></button>
            </div>
            <div className="modal-delete-body">
              <div className="modal-delete-icon"><IconWarn /></div>
              <p>¿Estás seguro de que deseas eliminar la categoría?</p>
              <strong>"{categoriaActual?.nombre_categoria}"</strong>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEliminar(false)}>Cancelar</button>
              <button className="btn-danger" onClick={handleEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
{toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default CategoriasPage;