import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; // 1. IMPORTAR useAuth
import '../../styles/addCategoria.css';
import { toast } from 'react-toastify';
import { getProductos } from '../../api/productos';
import { API_BASE_URL } from '../../api/baseUrl';

/* ── Iconos (sin cambios) ── */
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconClose = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconTag = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconWarn = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconFolder = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;

/* ── API ── */
const API_CATEGORIAS = `${API_BASE_URL}/api/categorias`;
const COLOR_MAP_KEY = 'inventario_colores_map';
const VARIANT_STOCK_MAP_KEY = 'inventario_stock_variantes_map';
const DELETE_UNDO_MS = 7000;

const COLOR_KEYWORDS = [
  'negro', 'negra', 'blanco', 'blanca', 'azul', 'rojo', 'roja', 'verde', 'amarillo', 'amarilla',
  'gris', 'cafe', 'marron', 'morado', 'beige', 'rosa', 'nude', 'vino', 'dorado', 'plateado',
];

const isPlaceholderColor = (value = '') => {
  const txt = String(value || '').trim().toLowerCase();
  return txt === 'sin color' || txt === 'sin colores';
};

const detectColor = (modelo = '') => {
  const limpio = String(modelo || '').toLowerCase();
  const encontrado = COLOR_KEYWORDS.find((c) => limpio.includes(c));
  return encontrado ? encontrado[0].toUpperCase() + encontrado.slice(1) : '';
};

const readVariantStockMap = () => {
  try {
    const raw = localStorage.getItem(VARIANT_STOCK_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const readColorMap = () => {
  try {
    const raw = localStorage.getItem(COLOR_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const parseCsvList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && !isPlaceholderColor(item));

const hasVariantEntries = (variantStocks) =>
  Boolean(variantStocks && typeof variantStocks === 'object' && Object.keys(variantStocks).length > 0);

const sumVariantStockActual = (producto, variantStocks, colorMap) => {
  if (!hasVariantEntries(variantStocks)) return null;

  const tallas = parseCsvList(producto?.tallas);
  const coloresProducto = parseCsvList(producto?.colores);
  const coloresMap = Array.isArray(colorMap?.[producto?.id_producto])
    ? colorMap[producto.id_producto]
        .map((c) => String(c || '').trim())
        .filter((c) => c && !isPlaceholderColor(c))
    : [];
  const colorDetectado = detectColor(producto?.modelo);
  const colores = coloresProducto.length
    ? coloresProducto
    : (coloresMap.length ? coloresMap : (colorDetectado ? [colorDetectado] : []));

  if (!tallas.length || !colores.length) return null;

  let suma = 0;
  let encontroKeyVigente = false;

  tallas.forEach((talla) => {
    colores.forEach((color) => {
      const key = `${talla}__${color}`;
      if (Object.prototype.hasOwnProperty.call(variantStocks, key)) {
        suma += Math.max(0, Number(variantStocks[key]) || 0);
        encontroKeyVigente = true;
      }
    });
  });

  return encontroKeyVigente ? suma : null;
};

const getProductoStockTotal = (producto, variantStocks, colorMap) => {
  const stockActualVariantes = sumVariantStockActual(producto, variantStocks, colorMap);
  if (stockActualVariantes != null) {
    return stockActualVariantes;
  }
  return Math.max(0, Number(producto?.stock) || 0);
};

const CategoriasPage = () => {
  const { user } = useAuth(); // 2. OBTENER DATOS DE AUTH
  const esEmpleado = user?.role === 'empleado';
  const [categorias, setCategorias] = useState([]);
  const [stockPorCategoria, setStockPorCategoria] = useState({});

  /* Modales */
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  /* Formularios */
  const [formCrear, setFormCrear] = useState({ nombre: '', descripcion: '' });
  const [formEditar, setFormEditar] = useState({ nombre: '', descripcion: '' });
  const [categoriaActual, setCategoriaActual] = useState(null);
  const deleteCategoriaTimeoutRef = useRef(null);

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

  const fetchStockCategorias = useCallback(async () => {
    if (!user?.token) return;
    try {
      const { data } = await getProductos();
      const productos = Array.isArray(data) ? data : [];
      const variantMap = readVariantStockMap();
      const colorMap = readColorMap();

      const acumulado = productos.reduce((acc, producto) => {
        const idCategoria = Number(producto?.id_categoria);
        if (!idCategoria) return acc;

        const variantes = variantMap?.[producto?.id_producto];
        const stockFinal = getProductoStockTotal(producto, variantes, colorMap);
        acc[idCategoria] = (acc[idCategoria] || 0) + stockFinal;
        return acc;
      }, {});

      setStockPorCategoria(acumulado);
    } catch (err) {
      console.error('Error al calcular stock por categoría:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchCategorias();
    fetchStockCategorias();

    const refrescar = () => {
      fetchCategorias();
      fetchStockCategorias();
    };

    window.addEventListener('storage', refrescar);
    window.addEventListener('focus', refrescar);
    window.addEventListener('inventario-updated', refrescar);

    return () => {
      window.removeEventListener('storage', refrescar);
      window.removeEventListener('focus', refrescar);
      window.removeEventListener('inventario-updated', refrescar);
    };
  }, [fetchCategorias, fetchStockCategorias]);

  useEffect(() => {
    return () => {
      if (deleteCategoriaTimeoutRef.current) {
        clearTimeout(deleteCategoriaTimeoutRef.current);
        deleteCategoriaTimeoutRef.current = null;
      }
    };
  }, []);

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

  const handleEliminar = () => {
    if (!categoriaActual) return;

    const categoriaObjetivo = { ...categoriaActual };
    setModalEliminar(false);
    setCategoriaActual(null);

    if (deleteCategoriaTimeoutRef.current) {
      clearTimeout(deleteCategoriaTimeoutRef.current);
      deleteCategoriaTimeoutRef.current = null;
    }

    const timeoutId = setTimeout(async () => {
      deleteCategoriaTimeoutRef.current = null;
      try {
        await axios.delete(
          `${API_CATEGORIAS}/${categoriaObjetivo.id_categoria}`,
          getAuthConfig()
        );
        toast.warn('Categoría eliminada');
        fetchCategorias();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error al eliminar la categoría');
      }
    }, DELETE_UNDO_MS);

    deleteCategoriaTimeoutRef.current = timeoutId;

    toast.warning(
      ({ closeToast }) => (
        <div className="undo-toast-row">
          <span className="undo-toast-text">
            {categoriaObjetivo.nombre_categoria || 'Categoría'} se eliminará en 7s.
          </span>
          <button
            type="button"
            className="undo-toast-btn"
            onClick={() => {
              if (deleteCategoriaTimeoutRef.current === timeoutId) {
                clearTimeout(timeoutId);
                deleteCategoriaTimeoutRef.current = null;
                toast.info('Eliminación cancelada.');
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

  return (
    <div className="categorias-page">
      <header className="categorias-topbar">
        <div className="categorias-heading">
          <h1 className="categorias-title">Gestión de Categorías</h1>
          <p className="categorias-subtitle">Administra las categorías de productos</p>
        </div>

        <div className="categorias-header">
          <button className="btn-crear-categoria" onClick={() => setModalCrear(true)}>
            <IconPlus /> Nueva Categoría
          </button>
        </div>
      </header>

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
              {!esEmpleado && <th className="col-productos">Stock Total</th>}
              <th className="col-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.length === 0 ? (
              <tr>
                <td colSpan={esEmpleado ? 3 : 4}>
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
                  {!esEmpleado && (
                    <td className="col-productos">
                      <span className="badge-productos">{stockPorCategoria[Number(cat.id_categoria)] ?? 0}</span>
                    </td>
                  )}
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
    </div>
  );
};

export default CategoriasPage;