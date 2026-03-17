import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getProductos, createProducto, updateProducto, deleteProducto, getCategorias } from '../../api/productos';
import '../../styles/addproducto.css';

/* ── Iconos ── */
const IconPlus   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconSearch = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconEdit   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconClose  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconWarn   = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconBox    = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;



/* ── Formulario vacío ── */
const FORM_EMPTY = {
  descripcion:  '',
  modelo:       '',
  id_categoria: '',
  stock:        '',
  precio:       '',
  estado:       'activo',
};

/* ── Helpers ── */
const estadoBadge = (estado, stock) => {
  if (estado === 'inactivo') return { cls: 'badge-inactivo', label: 'Inactivo' };
  if (Number(stock) <= 10)   return { cls: 'badge-bajo',     label: 'Stock Bajo' };
  return { cls: 'badge-activo', label: 'Activo' };
};

const formatPrecio = (v) =>
  v != null ? `$${Number(v).toLocaleString('es-MX')}` : '—';

/* ══════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════ */
const ProductosPage = () => {
  const [productos,   setProductos]   = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroCat,   setFiltroCat]   = useState('');
  const [toast,       setToast]       = useState(null);

  /* Modales */
  const [modalCrear,    setModalCrear]    = useState(false);
  const [modalEditar,   setModalEditar]   = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  /* Formularios */
  const [formCrear,   setFormCrear]   = useState(FORM_EMPTY);
  const [formEditar,  setFormEditar]  = useState(FORM_EMPTY);
  const [productoActual, setProductoActual] = useState(null);

  /* ── Helpers ── */
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchProductos = useCallback(async () => {
    try {
      const { data } = await getProductos();
      setProductos(data);
    } catch (err) { console.error('Error al obtener productos:', err); }
  }, []);

  const fetchCategorias = useCallback(async () => {
    try {
      const { data } = await getCategorias();
      setCategorias(data);
    } catch (err) { console.error('Error al obtener categorías:', err); }
  }, []);

  useEffect(() => { fetchProductos(); fetchCategorias(); }, [fetchProductos, fetchCategorias]);

  /* ── Filtro local ── */
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusq = p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
                        String(p.modelo).includes(busqueda);
      const matchCat  = filtroCat === '' || String(p.id_categoria) === filtroCat;
      return matchBusq && matchCat;
    });
  }, [productos, busqueda, filtroCat]);

  /* ── CREAR ── */
  const handleCrear = async () => {
    if (!formCrear.descripcion.trim() || !formCrear.modelo.trim()) return;
    try {
      const { data } = await createProducto(formCrear);
      showToast(data.message || 'Producto creado');
      setFormCrear(FORM_EMPTY);
      setModalCrear(false);
      fetchProductos();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al crear el producto';
      showToast(errorMsg);
    }
  };

  /* ── EDITAR ── */
  const abrirEditar = (p) => {
    setProductoActual(p);
    setFormEditar({
      descripcion:  p.descripcion  ?? '',
      modelo:       p.modelo       ?? '',
      id_categoria: p.id_categoria ?? '',
      stock:        p.stock        ?? '',
      precio:       p.precio       ?? '',
      estado:       p.estado       ?? 'activo',
    });
    setModalEditar(true);
  };

  const handleEditar = async () => {
    if (!formEditar.descripcion.trim()) return;
    try {
      const { data } = await updateProducto(productoActual.id_producto, formEditar);
      showToast(data.message || 'Producto actualizado');
      setModalEditar(false);
      fetchProductos();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al editar el producto';
      showToast(errorMsg);
    }
  };

  /* ── ELIMINAR ── */
  const abrirEliminar = (p) => { setProductoActual(p); setModalEliminar(true); };

  const handleEliminar = async () => {
    try {
      const { data } = await deleteProducto(productoActual.id_producto);
      showToast(data.message || 'Producto eliminado');
      setModalEliminar(false);
      fetchProductos();
    } catch { showToast('Error al eliminar el producto'); }
  };

  /* ── RENDER ── */
  return (
    <div className="productos-page">

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestión de Productos</h1>
          <p>Administra el catálogo completo de productos</p>
        </div>
        <button className="btn-primary" onClick={() => setModalCrear(true)}>
          <IconPlus /> Nuevo Producto
        </button>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-top">
          <div className="card-top-title">Lista de Productos</div>
          <div className="card-top-sub">{productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} en total</div>
        </div>

        {/* Filtros */}
        <div className="filtros-bar">
          <div className="search-wrapper">
            <IconSearch />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="select-categoria"
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={String(cat.id_categoria)}>
                {cat.nombre_categoria}
              </option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        <table className="productos-table">
          <thead>
            <tr>
              <th>Descripcion</th>
              <th>Modelo</th>
              <th>Categoria</th>
              <th>Stock</th>
              <th>Precio</th>
              <th>Estado</th>
              <th className="col-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div><IconBox /></div>
                    <p>No hay productos registrados</p>
                  </div>
                </td>
              </tr>
            ) : (
              productosFiltrados.map((p) => {
                const { cls, label } = estadoBadge(p.estado, p.stock);
                const catNombre = categorias.find(c => c.id_categoria === p.id_categoria)?.nombre_categoria ?? '—';
                return (
                  <tr key={p.id_producto}>
                    <td className="td-desc">{p.descripcion}</td>
                    <td className="td-muted">{p.modelo}</td>
                    <td className="td-muted">{catNombre}</td>
                    <td className="td-muted">{p.stock}</td>
                    <td className="td-precio">{formatPrecio(p.precio)}</td>
                    <td><span className={`badge ${cls}`}>{label}</span></td>
                    <td className="col-acciones">
                      <div className="acciones-cell">
                        <button className="btn-icon btn-icon-edit" title="Editar" onClick={() => abrirEditar(p)}>
                          <IconEdit />
                        </button>
                        <button className="btn-icon btn-icon-delete" title="Eliminar" onClick={() => abrirEliminar(p)}>
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: Crear ── */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Producto</h2>
              <button className="modal-close" onClick={() => setModalCrear(false)}><IconClose /></button>
            </div>

            <FormProducto
              form={formCrear}
              setForm={setFormCrear}
              categorias={categorias}
            />

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalCrear(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleCrear}
                disabled={!formCrear.descripcion.trim() || !formCrear.modelo.trim()}
              >
                Crear Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar ── */}
      {modalEditar && (
        <div className="modal-overlay" onClick={() => setModalEditar(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Producto</h2>
              <button className="modal-close" onClick={() => setModalEditar(false)}><IconClose /></button>
            </div>

            <FormProducto
              form={formEditar}
              setForm={setFormEditar}
              categorias={categorias}
            />

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEditar(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleEditar}
                disabled={!formEditar.descripcion.trim()}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Eliminar ── */}
      {modalEliminar && (
        <div className="modal-overlay" onClick={() => setModalEliminar(false)}>
          <div className="modal-box modal-box-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar Producto</h2>
              <button className="modal-close" onClick={() => setModalEliminar(false)}><IconClose /></button>
            </div>
            <div className="modal-delete-body">
              <div className="modal-delete-icon"><IconWarn /></div>
              <p>¿Estás seguro de que deseas eliminar el producto?</p>
              <strong>"{productoActual?.descripcion}"</strong>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEliminar(false)}>Cancelar</button>
              <button className="btn-danger" onClick={handleEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

/* ══════════════════════════════════════
   SUB-COMPONENTE: Formulario de producto
   (reutilizado en Crear y Editar)
   ══════════════════════════════════════ */
const FormProducto = ({ form, setForm, categorias }) => {
  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="form-grid">
      {/* Descripción */}
      <div className="form-group span-2">
        <label>Descripción *</label>
        <input
          type="text"
          value={form.descripcion}
          onChange={update('descripcion')}
          placeholder="Ej. Tenis para niño"
          autoFocus
        />
      </div>

      {/* Modelo */}
      <div className="form-group">
        <label>Modelo *</label>
        <input
          type="text"
          value={form.modelo}
          onChange={update('modelo')}
          placeholder="Ej. 1000"
        />
      </div>

      {/* Categoría */}
      <div className="form-group">
        <label>Categoría</label>
        <select value={form.id_categoria} onChange={update('id_categoria')}>
          <option value="">Sin categoría</option>
          {categorias.map((cat) => (
            <option key={cat.id_categoria} value={cat.id_categoria}>
              {cat.nombre_categoria}
            </option>
          ))}
        </select>
      </div>

      {/* Stock */}
      <div className="form-group">
        <label>Stock</label>
        <input
          type="number"
          min="0"
          value={form.stock}
          onChange={update('stock')}
          placeholder="0"
        />
      </div>

      {/* Precio */}
      <div className="form-group">
        <label>Precio</label>
        <input
          type="number"
          min="0"
          value={form.precio}
          onChange={update('precio')}
          placeholder="0.00"
        />
      </div>

      {/* Estado */}
      <div className="form-group span-2">
        <label>Estado</label>
        <select value={form.estado} onChange={update('estado')}>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>
    </div>
  );
};

export default ProductosPage;
