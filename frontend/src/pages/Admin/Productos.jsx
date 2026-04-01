import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getProductos, createProducto, updateProducto, deleteProducto, getCategorias } from '../../api/productos';
import { toast } from 'react-toastify';
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
  modelo:           '',
  id_categoria:     '',
  stock:            '',
  precio:           '',
  tallas:           '',
  cantidad_inicial: '',
  estado:           'activo',
};

/* ── Helpers ── */
const estadoBadge = (estado, stock) => {
  if (estado === 'inactivo') return { cls: 'badge-inactivo', label: 'Inactivo' };
  // Ajuste: Ahora detecta stock bajo cuando es menor o igual a 40
  if (Number(stock) <= 40)   return { cls: 'badge-bajo',      label: 'Stock Bajo' };
  return { cls: 'badge-activo', label: 'Activo' };
};

const formatPrecio = (v) =>
  v != null ? `$${Number(v).toLocaleString('es-MX')}` : '—';

/* ══════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════ */
const ProductosPage = () => {
  const [productos,    setProductos]    = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroCat,   setFiltroCat]   = useState('');

  /* Modales */
  const [modalCrear,    setModalCrear]    = useState(false);
  const [modalEditar,   setModalEditar]   = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  /* Formularios */
  const [formCrear,   setFormCrear]   = useState(FORM_EMPTY);
  const [formEditar,  setFormEditar]  = useState(FORM_EMPTY);
  const [productoActual, setProductoActual] = useState(null);

  /* ── Fetch Data ── */
  const fetchProductos = useCallback(async () => {
    try {
      const { data } = await getProductos();
      setProductos(data);
    } catch (err) { 
      console.error('Error al obtener productos:', err);
      toast.error("No se pudo cargar la lista de productos");
    }
  }, []);

  const fetchCategorias = useCallback(async () => {
    try {
      const { data } = await getCategorias();
      setCategorias(data);
    } catch (err) { 
      console.error('Error al obtener categorías:', err);
      toast.error("No se pudo cargar la lista de categorías");
    }
  }, []);

  useEffect(() => { 
    fetchProductos(); 
    fetchCategorias(); 
  }, [fetchProductos, fetchCategorias]);

  /* ── Filtro local ── */
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusq = String(p.modelo).toLowerCase().includes(busqueda.toLowerCase());
      const matchCat  = filtroCat === '' || String(p.id_categoria) === filtroCat;
      return matchBusq && matchCat;
    });
  }, [productos, busqueda, filtroCat]);

  /* ── VALIDACIÓN ── */
  const validarFormulario = (form) => {
    const camposRequeridos = {
      modelo: 'Modelo',
      id_categoria: 'Categoría',
      stock: 'Stock',
      precio: 'Precio',
      tallas: 'Tallas',
      cantidad_inicial: 'Cantidad Inicial'
    };

    for (const [key, label] of Object.entries(camposRequeridos)) {
      if (form[key] === '' || form[key] === null || form[key] === undefined) {
        toast.warn(`El campo "${label}" no puede estar vacío.`);
        return false;
      }
    }
    return true;
  };

  /* ── CREAR ── */
  const handleCrear = async (e) => {
    e.preventDefault();
    if (!validarFormulario(formCrear)) return;

    try {
      // Conversión estricta a números para prevenir desfases en BD
      const payload = {
        ...formCrear,
        stock: Number(formCrear.stock),
        precio: Number(formCrear.precio),
        cantidad_inicial: Number(formCrear.cantidad_inicial)
      };

      await createProducto(payload);
      toast.success('¡Producto creado con éxito!');
      setFormCrear(FORM_EMPTY);
      setModalCrear(false);
      fetchProductos();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al crear el producto';
      toast.error(errorMsg);
    }
  };

  /* ── EDITAR ── */
  const abrirEditar = (p) => {
    setProductoActual(p);
    setFormEditar({
      modelo:           p.modelo           ?? '',
      id_categoria:     p.id_categoria     ?? '',
      stock:            p.stock            ?? '',
      precio:           p.precio           ?? '',
      tallas:           p.tallas           ?? '',
      cantidad_inicial: p.cantidad_inicial ?? '',
      estado:           p.estado           ?? 'activo',
    });
    setModalEditar(true);
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!validarFormulario(formEditar)) return;

    try {
      // Conversión estricta a números para prevenir el error de "resta 1" o truncamiento
      const payload = {
        ...formEditar,
        stock: Number(formEditar.stock),
        precio: Number(formEditar.precio),
        cantidad_inicial: Number(formEditar.cantidad_inicial)
      };

      await updateProducto(productoActual.id_producto, payload);
      toast.info('¡Producto actualizado correctamente!');
      setModalEditar(false);
      fetchProductos();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al editar el producto';
      toast.error(errorMsg);
    }
  };

  /* ── ELIMINAR ── */
  const abrirEliminar = (p) => { 
    setProductoActual(p); 
    setModalEliminar(true); 
  };

  const handleEliminar = async () => {
    try {
      await deleteProducto(productoActual.id_producto);
      toast.warn('Producto eliminado del sistema');
      setModalEliminar(false);
      fetchProductos();
    } catch { 
      toast.error('Error al eliminar el producto'); 
    }
  };

  /* ── RENDER ── */
  return (
    <div className="productos-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestión de Productos</h1>
          <p>Administra y Crea los Modelos de Productos</p>
        </div>
        <button className="btn-primary" onClick={() => setModalCrear(true)}>
          <IconPlus /> Registrar Modelo
        </button>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-top">
          <div className="card-top-title">Catálogo de Modelos</div>
          <div className="card-top-sub">{productosFiltrados.length} modelo{productosFiltrados.length !== 1 ? 's' : ''} en total</div>
        </div>

        {/* Filtros */}
        <div className="filtros-bar">
          <div className="search-wrapper">
            <IconSearch />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por modelo (Ej. 1100)..."
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

        {/* Tabla ajustada a requerimientos */}
        <table className="productos-table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Categoría</th>
              <th>Stock Total</th>
              <th>Precio</th>
              <th>Tallas Disp.</th>
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
                    <p>No hay modelos registrados</p>
                  </div>
                </td>
              </tr>
            ) : (
              productosFiltrados.map((p) => {
                const { cls, label } = estadoBadge(p.estado, p.stock);
                const catNombre = categorias.find(c => c.id_categoria === p.id_categoria)?.nombre_categoria ?? '—';
                return (
                  <tr key={p.id_producto}>
                    <td className="td-desc"><strong>{p.modelo}</strong></td>
                    <td className="td-muted">{catNombre}</td>
                    <td className="td-muted">{p.stock}</td>
                    <td className="td-precio">{formatPrecio(p.precio)}</td>
                    <td className="td-muted">{p.tallas || 'N/A'}</td>
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
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Registrar Modelo</h2>
              <button className="modal-close" onClick={() => setModalCrear(false)}><IconClose /></button>
            </div>
            <div className="modal-body">
              <FormularioProducto
                form={formCrear}
                setForm={setFormCrear}
                categorias={categorias}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalCrear(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleCrear}
              >
                Registrar
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
              <h2>Editar Modelo {formEditar.modelo}</h2>
              <button className="modal-close" onClick={() => setModalEditar(false)}><IconClose /></button>
            </div>
            <div className="modal-body">
              <FormularioProducto
                form={formEditar}
                setForm={setFormEditar}
                categorias={categorias}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEditar(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleEditar}
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
              <h2>Eliminar Modelo</h2>
              <button className="modal-close" onClick={() => setModalEliminar(false)}><IconClose /></button>
            </div>
            <div className="modal-body modal-delete-body">
              <div className="modal-delete-icon"><IconWarn /></div>
              <p>¿Estás seguro de que deseas eliminar este modelo de inventario?</p>
              <strong>Modelo: "{productoActual?.modelo}"</strong>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEliminar(false)}>Cancelar</button>
              <button className="btn-danger" onClick={handleEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ══════════════════════════════════════
   SUB-COMPONENTE: Formulario de producto
   ══════════════════════════════════════ */
const FormularioProducto = ({ form, setForm, categorias }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;

    // 1. Validación para modelo, stock y cantidad inicial (Solo números enteros positivos)
    if (['modelo', 'stock', 'cantidad_inicial'].includes(name)) {
      if (value === '' || /^\d*$/.test(value)) {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    // 2. Validación para precio (Números positivos con punto decimal)
    if (name === 'precio') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    // 3. Validación para tallas (Solo números, comas, puntos y espacios, bloqueando letras)
    if (name === 'tallas') {
      if (value === '' || /^[\d\s,.]*$/.test(value)) {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    // 4. Para el resto de los campos (estado, id_categoria)
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Prevenir teclas inválidas en inputs numéricos
  const handleKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <form className="form-producto">
      <div className="form-group span-2">
        <label>Modelo *</label>
        <input
          type="text"
          name="modelo"
          value={form.modelo}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ej. 1100"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>Categoría *</label>
        <select name="id_categoria" value={form.id_categoria} onChange={handleChange}>
          <option value="">Seleccionar...</option>
          {categorias.map((cat) => (
            <option key={cat.id_categoria} value={cat.id_categoria}>
              {cat.nombre_categoria}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Stock Total *</label>
        <input
          type="number"
          name="stock"
          min="0"
          step="1"
          value={form.stock}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="0"
        />
      </div>

      <div className="form-group">
        <label>Precio Unitario *</label>
        <input
          type="number"
          name="precio"
          min="0"
          step="0.01"
          value={form.precio}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="0.00"
        />
      </div>

      <div className="form-group">
        <label>Tallas disponibles *</label>
        <input
          type="text"
          name="tallas"
          value={form.tallas}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ej: 25, 26, 27.5"
        />
      </div>

      <div className="form-group">
        <label>Cantidad Inicial por Talla *</label>
        <input
          type="number"
          name="cantidad_inicial"
          value={form.cantidad_inicial}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          min="0"
          step="1"
          placeholder="Ej: 5"
        />
      </div>

      <div className="form-group span-2">
        <label>Estado en Inventario</label>
        <select name="estado" value={form.estado} onChange={handleChange}>
          <option value="activo">Activo (En exhibición/bodega)</option>
          <option value="inactivo">Inactivo (Descontinuado)</option>
        </select>
      </div>
    </form>
  );
};

export default ProductosPage;