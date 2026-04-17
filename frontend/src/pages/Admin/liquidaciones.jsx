import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getCategorias, getProductos } from '../../api/productos';
import '../../styles/liquidaciones.css';

const LIQUIDACIONES_STORAGE_KEY = 'inventario_liquidaciones_ids';
const LIQUIDACIONES_DISCOUNT_KEY = 'inventario_liquidaciones_descuentos';
const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

const readLiquidaciones = () => {
  try {
    const raw = localStorage.getItem(LIQUIDACIONES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];
  } catch {
    return [];
  }
};

const saveLiquidaciones = (ids) => {
  localStorage.setItem(LIQUIDACIONES_STORAGE_KEY, JSON.stringify(ids));
};

const readLiquidacionesDescuentos = () => {
  try {
    const raw = localStorage.getItem(LIQUIDACIONES_DISCOUNT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.entries(parsed).reduce((acc, [id, descuento]) => {
      const idNum = Number(id);
      const dNum = Number(descuento);
      if (!Number.isFinite(idNum)) return acc;
      if (!Number.isFinite(dNum)) return acc;
      acc[idNum] = Math.max(0, Math.min(90, Math.round(dNum)));
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const saveLiquidacionesDescuentos = (descuentos) => {
  localStorage.setItem(LIQUIDACIONES_DISCOUNT_KEY, JSON.stringify(descuentos));
};

export default function LiquidacionesPage() {
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [modoSeleccionLiquidacion, setModoSeleccionLiquidacion] = useState(false);
  const [liquidados, setLiquidados] = useState(() => readLiquidaciones());
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState('20');
  const [descuentosPorProducto, setDescuentosPorProducto] = useState(() => readLiquidacionesDescuentos());

  const categoriasById = useMemo(
    () => categorias.reduce((acc, cat) => ({ ...acc, [Number(cat.id_categoria)]: cat.nombre_categoria }), {}),
    [categorias]
  );

  const productosEnLiquidacion = useMemo(() => {
    const setLiquidados = new Set(liquidados);
    return productos
      .filter((producto) => setLiquidados.has(Number(producto.id_producto)))
      .map((producto) => {
        const idProducto = Number(producto.id_producto);
        const precioBase = Number(producto.precio || 0);
        const descuento = Number(descuentosPorProducto[idProducto] || 0);
        const precioLiquidacion = precioBase * (1 - (descuento / 100));

        return {
          ...producto,
          descuento,
          precioBase,
          precioLiquidacion,
          categoriaNombre: categoriasById[Number(producto.id_categoria)] || producto.nombre_categoria || 'Sin categoría',
        };
      })
      .sort((a, b) => String(a.modelo || '').localeCompare(String(b.modelo || ''), 'es', { sensitivity: 'base' }));
  }, [productos, liquidados, descuentosPorProducto, categoriasById]);

  const seleccionadosEnLiquidacionCount = useMemo(() => {
    const idsLiquidacion = new Set(productosEnLiquidacion.map((p) => Number(p.id_producto)));
    return seleccionados.filter((id) => idsLiquidacion.has(id)).length;
  }, [seleccionados, productosEnLiquidacion]);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [resCategorias, resProductos] = await Promise.all([getCategorias(), getProductos()]);
        setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
        setProductos(Array.isArray(resProductos.data) ? resProductos.data : []);
      } catch (error) {
        console.error('Error cargando datos de liquidaciones:', error);
        toast.error('No se pudieron cargar categorías o productos');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const productosFiltrados = useMemo(() => {
    if (!categoriaSeleccionada) return [];

    const q = busqueda.trim().toLowerCase();
    return productos.filter((producto) => {
      const deCategoria = String(producto.id_categoria || '') === String(categoriaSeleccionada);
      if (!deCategoria) return false;
      if (!q) return true;
      const modelo = String(producto.modelo || '').toLowerCase();
      return modelo.includes(q);
    });
  }, [productos, categoriaSeleccionada, busqueda]);

  const todosVisiblesSeleccionados = productosFiltrados.length > 0
    && productosFiltrados.every((p) => seleccionados.includes(Number(p.id_producto)));

  const toggleProducto = (idProducto) => {
    const id = Number(idProducto);
    setSeleccionados((prev) => (
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    ));
  };

  const seleccionarTodosVisibles = () => {
    const idsVisibles = productosFiltrados.map((p) => Number(p.id_producto));
    setSeleccionados((prev) => {
      if (todosVisiblesSeleccionados) {
        return prev.filter((id) => !idsVisibles.includes(id));
      }
      return Array.from(new Set([...prev, ...idsVisibles]));
    });
  };

  const toggleModoSeleccionLiquidacion = () => {
    const idsLiquidacion = new Set(productosEnLiquidacion.map((p) => Number(p.id_producto)));
    setModoSeleccionLiquidacion((prev) => {
      const next = !prev;
      if (!next) {
        setSeleccionados((prevSel) => prevSel.filter((id) => !idsLiquidacion.has(id)));
      }
      return next;
    });
  };

  const aplicarLiquidacion = () => {
    if (seleccionados.length === 0) {
      toast.info('Selecciona al menos un producto');
      return;
    }

    const descuento = Number(descuentoSeleccionado);
    if (!Number.isFinite(descuento) || descuento < 0 || descuento > 90) {
      toast.error('Selecciona un descuento válido');
      return;
    }

    const next = Array.from(new Set([...liquidados, ...seleccionados]));
    const nextDescuentos = { ...descuentosPorProducto };
    seleccionados.forEach((id) => {
      nextDescuentos[id] = descuento;
    });

    setLiquidados(next);
    setDescuentosPorProducto(nextDescuentos);
    saveLiquidaciones(next);
    saveLiquidacionesDescuentos(nextDescuentos);
    window.dispatchEvent(new Event('liquidaciones-updated'));
    toast.success(`Productos marcados en liquidación (${descuento}% de descuento)`);
  };

  const quitarLiquidacion = () => {
    if (seleccionados.length === 0) {
      toast.info('Selecciona al menos un producto');
      return;
    }

    const idsARetirar = seleccionados.filter((id) => liquidados.includes(id));
    if (idsARetirar.length === 0) {
      toast.info('Selecciona productos que ya estén en liquidación');
      return;
    }

    const next = liquidados.filter((id) => !idsARetirar.includes(id));
    const nextDescuentos = { ...descuentosPorProducto };
    idsARetirar.forEach((id) => {
      delete nextDescuentos[id];
    });

    setLiquidados(next);
    setDescuentosPorProducto(nextDescuentos);
    saveLiquidaciones(next);
    saveLiquidacionesDescuentos(nextDescuentos);
    setModoSeleccionLiquidacion(false);
    setSeleccionados((prev) => prev.filter((id) => !idsARetirar.includes(id)));
    window.dispatchEvent(new Event('liquidaciones-updated'));
    toast.success('Productos retirados de liquidación');
  };

  return (
    <div className="liq-page">
      <div className="liq-header">
        <div className="liq-header-texto">
          <h1>Liquidaciones</h1>
          <p>Selecciona una categoría y marca los productos que entrarán en liquidación.</p>
        </div>
        <span className="liq-counter">En liquidación: {productosEnLiquidacion.length}</span>
      </div>

      <div className="liq-card">
        <div className="liq-card-head">
          <h2 className="liq-card-title">Productos actualmente en liquidación</h2>
          {productosEnLiquidacion.length > 0 && (
            <div className="liq-card-actions">
              {modoSeleccionLiquidacion && (
                <span className="liq-selection-hint">
                  Seleccionados: {seleccionadosEnLiquidacionCount}
                </span>
              )}
              <button
                type="button"
                className={`liq-btn liq-btn-select-liquidacion ${modoSeleccionLiquidacion ? 'is-active' : ''}`}
                onClick={toggleModoSeleccionLiquidacion}
              >
                {modoSeleccionLiquidacion ? 'Finalizar selección' : 'Seleccionar en liquidación'}
              </button>
            </div>
          )}
        </div>
        {loading ? (
          <p className="liq-empty">Cargando estado de liquidaciones...</p>
        ) : productosEnLiquidacion.length === 0 ? (
          <p className="liq-empty">Todavía no tienes productos en liquidación. Selecciona algunos y aplica el descuento para verlos aquí.</p>
        ) : (
          <table className="liq-table">
            <thead>
              <tr>
                {modoSeleccionLiquidacion && <th>Seleccionar</th>}
                <th>Modelo</th>
                <th>Categoría</th>
                <th>Precio base</th>
                <th>Descuento</th>
                <th>Precio liquidación</th>
              </tr>
            </thead>
            <tbody>
              {productosEnLiquidacion.map((producto) => (
                <tr key={`actual-${producto.id_producto}`} className="liq-row-marked">
                  {modoSeleccionLiquidacion && (
                    <td>
                      <input
                        type="checkbox"
                        checked={seleccionados.includes(Number(producto.id_producto))}
                        onChange={() => toggleProducto(producto.id_producto)}
                      />
                    </td>
                  )}
                  <td>{producto.modelo}</td>
                  <td>{producto.categoriaNombre}</td>
                  <td>${producto.precioBase.toFixed(2)}</td>
                  <td>{producto.descuento}%</td>
                  <td>${producto.precioLiquidacion.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="liq-toolbar-card">
        <div className="liq-controls">
          <div className="liq-control">
            <label>Categoría</label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => {
                setCategoriaSeleccionada(e.target.value);
                setSeleccionados([]);
              }}
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre_categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="liq-control">
            <label>Buscar modelo</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej. 1100"
              disabled={!categoriaSeleccionada}
            />
          </div>

          <div className="liq-control">
            <label>Descuento a aplicar</label>
            <select
              value={descuentoSeleccionado}
              onChange={(e) => setDescuentoSeleccionado(e.target.value)}
              disabled={!categoriaSeleccionada}
            >
              {DISCOUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}%
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="liq-actions">
          <button type="button" className="liq-btn liq-btn-muted" onClick={seleccionarTodosVisibles} disabled={!categoriaSeleccionada || productosFiltrados.length === 0}>
            {todosVisiblesSeleccionados ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
          </button>
          <button
            type="button"
            className="liq-btn liq-btn-primary"
            onClick={aplicarLiquidacion}
            disabled={modoSeleccionLiquidacion || seleccionados.length === 0}
            title={modoSeleccionLiquidacion ? 'Desactiva "Seleccionar en liquidación" para volver a poner productos en liquidación' : ''}
          >
            Poner en liquidación
          </button>
          <button type="button" className="liq-btn liq-btn-danger" onClick={quitarLiquidacion} disabled={seleccionados.length === 0}>
            Quitar de liquidación
          </button>
        </div>
      </div>

      <div className="liq-card">
        <div className="liq-card-head">
          <h2 className="liq-card-title">Listado de productos por categoría</h2>
        </div>
        {loading ? (
          <p className="liq-empty">Cargando productos...</p>
        ) : !categoriaSeleccionada ? (
          <p className="liq-empty">Elige una categoría para mostrar los productos y empezar a seleccionarlos.</p>
        ) : productosFiltrados.length === 0 ? (
          <p className="liq-empty">No hay productos para esa categoría.</p>
        ) : (
          <table className="liq-table">
            <thead>
              <tr>
                <th>Seleccionar</th>
                <th>Modelo</th>
                <th>Precio</th>
                <th>Descuento</th>
                <th>Precio liquidación</th>
                <th>Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) => {
                const idProducto = Number(producto.id_producto);
                const marcado = liquidados.includes(idProducto);
                const seleccionado = seleccionados.includes(idProducto);
                const precioBase = Number(producto.precio || 0);
                const descuentoProducto = marcado ? Number(descuentosPorProducto[idProducto] || 0) : 0;
                const precioLiquidacion = precioBase * (1 - (descuentoProducto / 100));

                return (
                  <tr key={producto.id_producto} className={marcado ? 'liq-row-marked' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={() => toggleProducto(idProducto)}
                      />
                    </td>
                    <td>{producto.modelo}</td>
                    <td>${precioBase.toFixed(2)}</td>
                    <td>{marcado ? `${descuentoProducto}%` : '—'}</td>
                    <td>{marcado ? `$${precioLiquidacion.toFixed(2)}` : '—'}</td>
                    <td>{Number(producto.stock || 0)}</td>
                    <td>
                      <span className={`liq-badge ${marcado ? 'in-liquidacion' : 'normal'}`}>
                        {marcado ? 'En liquidación' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
