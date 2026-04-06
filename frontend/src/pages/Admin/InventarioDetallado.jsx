import { useCallback, useEffect, useMemo, useState } from "react";
import { createProducto, deleteProducto, getCategorias, getProductos, updateProducto } from "../../api/productos";
import { toast } from "react-toastify";
import "../../styles/inventarioDetallado.css";
import "../../styles/addproducto.css";
import React from "react";

const COLOR_MAP_KEY = 'inventario_colores_map';
const VARIANT_STOCK_MAP_KEY = 'inventario_stock_variantes_map';
const ENTRADAS_LS_KEY = 'entradas_inventario';
const VARIANT_LOW_STOCK_LIMIT = 30;
const TALLAS_OPCIONES = Array.from({ length: 21 }, (_, i) => String(i + 20));
const COLORES_OPCIONES = ['Negro', 'Blanco', 'Cafe', 'Azul', 'Rojo', 'Verde', 'Gris', 'Beige', 'Rosa', 'Vino'];

const FORM_EMPTY = {
  modelo: '',
  id_categoria: '',
  stock: '',
  precio: '',
  tallas: '',
  colores: '',
  stock_variantes: {},
  estado: 'activo',
};

const COLOR_KEYWORDS = [
  "negro", "negra", "blanco", "blanca", "azul", "rojo", "roja", "verde", "amarillo", "amarilla",
  "gris", "cafe", "marron", "morado", "beige", "rosa", "nude", "vino", "dorado", "plateado",
];

const detectColor = (modelo = "") => {
  const limpio = String(modelo).toLowerCase();
  const encontrado = COLOR_KEYWORDS.find((c) => limpio.includes(c));
  return encontrado ? encontrado[0].toUpperCase() + encontrado.slice(1) : "Sin color";
};

const parseTallas = (texto = "") => {
  const lista = String(texto)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return lista.length ? lista : ["Sin talla"];
};

const parseColores = (texto = "") => {
  const lista = String(texto)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return lista.length ? lista : [];
};

const toCsv = (arr = []) => arr.join(', ');

const toggleValueInCsv = (csv, value) => {
  const current = parseColores(csv);
  const exists = current.includes(value);
  const next = exists ? current.filter((x) => x !== value) : [...current, value];
  return toCsv(next);
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

const readVariantStockMap = () => {
  try {
    const raw = localStorage.getItem(VARIANT_STOCK_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const buildVariantPairs = (tallas = [], colores = []) =>
  tallas.flatMap((talla) => colores.map((color) => ({
    key: `${talla}__${color}`,
    talla,
    color,
  })));

const normalizeVariantStocks = (pairs, currentStocks = {}) => {
  const out = {};

  pairs.forEach((pair) => {
    const raw = Number(currentStocks[pair.key]);
    out[pair.key] = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  });

  return out;
};

const sumVariantStocks = (variantStocks = {}) =>
  Object.values(variantStocks).reduce((acc, n) => acc + (Number(n) || 0), 0);

const getSessionUserName = () => {
  try {
    const raw = localStorage.getItem('user');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.nombre || parsed?.email || 'Administrador';
  } catch {
    return 'Administrador';
  }
};

const pushEntradasToStorage = (entradasNuevas = []) => {
  if (!entradasNuevas.length) return;

  try {
    const raw = localStorage.getItem(ENTRADAS_LS_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const prevList = Array.isArray(prev) ? prev : [];
    localStorage.setItem(ENTRADAS_LS_KEY, JSON.stringify([...entradasNuevas, ...prevList]));
    window.dispatchEvent(new Event('entradas-updated'));
  } catch (error) {
    console.error('No se pudo sincronizar entradas en localStorage:', error);
  }
};

const buildEntradaRecord = ({
  idProducto,
  modelo,
  idCategoria,
  precio,
  cantidad,
  talla,
  color,
  registradoPor,
}) => {
  const nowIso = new Date().toISOString();
  return {
    id_producto: idProducto,
    modelo,
    id_categoria: idCategoria,
    precio: Number(precio) || 0,
    cantidad: Math.max(0, Math.round(Number(cantidad) || 0)),
    stock: Math.max(0, Math.round(Number(cantidad) || 0)),
    talla: talla || 'N/A',
    color: color || 'N/A',
    registroId: `${idProducto || 'producto'}-${talla || 'na'}-${color || 'na'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fecha_creacion: nowIso,
    registrado_por: registradoPor || 'Administrador',
  };
};

const estadoBadge = (estado, tieneVariantesBajas) => {
  if (estado === "inactivo") return { cls: "id-badge-inactivo", label: "Inactivo" };
  if (tieneVariantesBajas) return { cls: "id-badge-bajo", label: "Stock Bajo" };
  return { cls: "id-badge-activo", label: "Activo" };
};

const isPlaceholderVariant = (talla, color) => {
  const t = String(talla || '').trim().toLowerCase();
  const c = String(color || '').trim().toLowerCase();
  return t === 'sin talla' || c === 'sin color';
};

const formatPrecio = (v) =>
  v != null ? `$${Number(v).toLocaleString("es-MX")}` : "-";

export default function InventarioDetalladoPage() {
  const [productos, setProductos] = useState([]);
  const [categoriasOptions, setCategoriasOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorMap, setColorMap] = useState(() => readColorMap());
  const [variantStockMap, setVariantStockMap] = useState(() => readVariantStockMap());
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [formCrear, setFormCrear] = useState(FORM_EMPTY);
  const [formEditar, setFormEditar] = useState(FORM_EMPTY);
  const [productoActual, setProductoActual] = useState(null);
  const [productoEliminar, setProductoEliminar] = useState(null);
  const [busquedaModelo, setBusquedaModelo] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroColor, setFiltroColor] = useState("");
  const [expandedModelId, setExpandedModelId] = useState(null);
  const [stockVariantesPrevios, setStockVariantesPrevios] = useState({});

  const cargarInventario = useCallback(async () => {
    try {
      setLoading(true);
      setColorMap(readColorMap());
      setVariantStockMap(readVariantStockMap());
      const [{ data: productosData }, { data: categoriasData }] = await Promise.all([
        getProductos(),
        getCategorias(),
      ]);
      setProductos(Array.isArray(productosData) ? productosData : []);
      setCategoriasOptions(Array.isArray(categoriasData) ? categoriasData : []);
    } catch (error) {
      console.error("Error cargando inventario detallado:", error);
      toast.error("No se pudo cargar el inventario detallado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarInventario();
  }, [cargarInventario]);

  const validarFormulario = (form) => {
    const camposRequeridos = {
      modelo: 'Modelo',
      id_categoria: 'Categoría',
      precio: 'Precio',
      tallas: 'Tallas',
      colores: 'Color',
    };

    for (const [key, label] of Object.entries(camposRequeridos)) {
      if (form[key] === '' || form[key] === null || form[key] === undefined) {
        toast.warn(`El campo "${label}" no puede estar vacío.`);
        return false;
      }
    }

    return true;
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!validarFormulario(formCrear)) return;

    try {
      const pairs = buildVariantPairs(parseTallas(formCrear.tallas), parseColores(formCrear.colores));
      const stockVariantes = normalizeVariantStocks(pairs, formCrear.stock_variantes);
      const stockNorm = sumVariantStocks(stockVariantes);

      const payload = {
        ...formCrear,
        stock: stockNorm,
        precio: Number(formCrear.precio) || 0,
        stock_variantes: stockVariantes,
      };

      const { data: productoCreado } = await createProducto(payload);
      const registradoPor = getSessionUserName();

      const entradasNuevas = pairs
        .map((pair) => ({ pair, cantidad: Number(stockVariantes[pair.key] || 0) }))
        .filter((item) => item.cantidad > 0)
        .map((item) =>
          buildEntradaRecord({
            idProducto: productoCreado?.id_producto,
            modelo: payload.modelo,
            idCategoria: payload.id_categoria,
            precio: payload.precio,
            cantidad: item.cantidad,
            talla: item.pair.talla,
            color: item.pair.color,
            registradoPor,
          })
        );

      pushEntradasToStorage(entradasNuevas);

      if (productoCreado?.id_producto) {
        const siguiente = {
          ...colorMap,
          [productoCreado.id_producto]: parseColores(payload.colores),
        };
        setColorMap(siguiente);
        localStorage.setItem(COLOR_MAP_KEY, JSON.stringify(siguiente));

        const siguienteStocks = {
          ...variantStockMap,
          [productoCreado.id_producto]: stockVariantes,
        };
        setVariantStockMap(siguienteStocks);
        localStorage.setItem(VARIANT_STOCK_MAP_KEY, JSON.stringify(siguienteStocks));
      }

      toast.success('¡Producto creado con éxito!');
      setFormCrear(FORM_EMPTY);
      setModalCrear(false);
      window.dispatchEvent(new Event('inventario-updated'));
      await cargarInventario();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al crear el producto';
      toast.error(errorMsg);
    }
  };

  const abrirEditar = (row) => {
    const productoBase = productos.find((p) => Number(p.id_producto) === Number(row.idProducto));
    if (!productoBase) {
      toast.error("No se encontró el producto para editar.");
      return;
    }

    setProductoActual(productoBase);
    setFormEditar({
      modelo: row.modelo || "",
      id_categoria: String(productoBase.id_categoria || ""),
      stock: row.stockTotal || 0,
      precio: Number(productoBase.precio) || 0,
      tallas: toCsv(row.tallas || []),
      colores: toCsv(row.colores || []),
      stock_variantes: row.varianteMap || {},
      estado: productoBase.estado || "activo",
    });
    setStockVariantesPrevios(row.varianteMap || {});
    setModalEditar(true);
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    if (!validarFormulario(formEditar)) return;
    if (!productoActual?.id_producto) return;

    try {
      const pairs = buildVariantPairs(parseTallas(formEditar.tallas), parseColores(formEditar.colores));
      const stockVariantes = normalizeVariantStocks(pairs, formEditar.stock_variantes);
      const stockNorm = sumVariantStocks(stockVariantes);

      const payload = {
        ...formEditar,
        stock: stockNorm,
        precio: Number(formEditar.precio) || 0,
        stock_variantes: stockVariantes,
      };

      await updateProducto(productoActual.id_producto, payload);

      const registradoPor = getSessionUserName();
      const previousMap = stockVariantesPrevios || {};
      const allKeys = Array.from(new Set([...Object.keys(previousMap), ...Object.keys(stockVariantes)]));

      const entradasNuevas = allKeys
        .map((key) => {
          const before = Math.max(0, Math.round(Number(previousMap[key]) || 0));
          const after = Math.max(0, Math.round(Number(stockVariantes[key]) || 0));
          const delta = after - before;
          if (delta <= 0) return null;

          const [tallaRaw, colorRaw] = String(key).split('__');
          return buildEntradaRecord({
            idProducto: productoActual.id_producto,
            modelo: payload.modelo,
            idCategoria: payload.id_categoria,
            precio: payload.precio,
            cantidad: delta,
            talla: tallaRaw || 'N/A',
            color: colorRaw || 'N/A',
            registradoPor,
          });
        })
        .filter(Boolean);

      pushEntradasToStorage(entradasNuevas);

      const siguiente = {
        ...colorMap,
        [productoActual.id_producto]: parseColores(payload.colores),
      };
      setColorMap(siguiente);
      localStorage.setItem(COLOR_MAP_KEY, JSON.stringify(siguiente));

      const siguienteStocks = {
        ...variantStockMap,
        [productoActual.id_producto]: stockVariantes,
      };
      setVariantStockMap(siguienteStocks);
      localStorage.setItem(VARIANT_STOCK_MAP_KEY, JSON.stringify(siguienteStocks));

      toast.success('Modelo actualizado correctamente.');
      setModalEditar(false);
      setProductoActual(null);
      setStockVariantesPrevios({});
      window.dispatchEvent(new Event('inventario-updated'));
      await cargarInventario();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al editar el modelo';
      toast.error(errorMsg);
    }
  };

  const handleEliminar = (row) => {
    const productoBase = productos.find((p) => Number(p.id_producto) === Number(row.idProducto));
    if (!productoBase) {
      toast.error("No se encontró el producto para eliminar.");
      return;
    }

    setProductoEliminar({
      idProducto: productoBase.id_producto,
      modelo: row.modelo,
    });
    setModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    if (!productoEliminar?.idProducto) return;

    try {
      await deleteProducto(productoEliminar.idProducto);
      toast.success("Modelo eliminado correctamente.");
      if (expandedModelId === productoEliminar.idProducto) {
        setExpandedModelId(null);
      }
      setModalEliminar(false);
      setProductoEliminar(null);
      window.dispatchEvent(new Event('inventario-updated'));
      await cargarInventario();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "No se pudo eliminar el modelo.";
      toast.error(errorMsg);
    }
  };

  const inventario = useMemo(() => {
    return productos.flatMap((p) => {
      const colorDesdeMapa = Array.isArray(colorMap[p.id_producto]) ? colorMap[p.id_producto] : [];
      const colorDesdeCampo = parseColores(p?.colores);
      const colores = colorDesdeCampo.length
        ? colorDesdeCampo
        : (colorDesdeMapa.length ? colorDesdeMapa : [detectColor(p?.modelo)]);

      const tallas = parseTallas(p?.tallas);
      const pairs = buildVariantPairs(tallas, colores);
      const totalPairs = pairs.length || 1;
      const fallback = Math.max(0, Math.floor((Number(p.stock) || 0) / totalPairs));
      const varianteStock = variantStockMap[p.id_producto] || {};

      return pairs.map((pair, i) => ({
        id: `${p.id_producto}-${pair.key}-${i}`,
        idProducto: p.id_producto,
        modelo: p.modelo || "Sin modelo",
        categoria: p.nombre_categoria || "Sin categoría",
        precio: Number(p.precio) || 0,
        estado: p.estado || "activo",
        color: pair.color,
        talla: pair.talla,
        stock: Object.prototype.hasOwnProperty.call(varianteStock, pair.key)
          ? Math.max(0, Number(varianteStock[pair.key]) || 0)
          : fallback,
      }));
    });
  }, [productos, colorMap, variantStockMap]);

  const categoriasFiltro = useMemo(() => {
    return [...new Set(inventario.map((v) => v.categoria))].sort((a, b) => a.localeCompare(b));
  }, [inventario]);

  const colores = useMemo(() => {
    return [...new Set(inventario.map((v) => v.color))].sort((a, b) => a.localeCompare(b));
  }, [inventario]);

  const filtradas = useMemo(() => {
    return inventario.filter((v) => {
      const porModelo = !busquedaModelo || v.modelo.toLowerCase().includes(busquedaModelo.toLowerCase());
      const porCategoria = !filtroCategoria || v.categoria === filtroCategoria;
      const porColor = !filtroColor || v.color === filtroColor;
      return porModelo && porCategoria && porColor;
    });
  }, [inventario, busquedaModelo, filtroCategoria, filtroColor]);

  const resumenModelos = useMemo(() => {
    const map = new Map();

    filtradas.forEach((item) => {
      const key = item.idProducto;
      const curr = map.get(key) || {
        idProducto: item.idProducto,
        categoria: item.categoria,
        modelo: item.modelo,
        precio: item.precio,
        estado: item.estado,
        colores: new Set(),
        tallas: new Set(),
        stockTotal: 0,
        variantes: [],
        varianteMap: {},
      };

      curr.colores.add(item.color);
      curr.tallas.add(item.talla);
      curr.stockTotal += Number(item.stock) || 0;
      curr.variantes.push({ talla: item.talla, color: item.color, stock: item.stock });
      curr.varianteMap[`${item.talla}__${item.color}`] = Number(item.stock) || 0;

      map.set(key, curr);
    });

    return Array.from(map.values())
      .map((m) => ({
        ...m,
        colores: Array.from(m.colores).sort((a, b) => a.localeCompare(b)),
        tallas: Array.from(m.tallas).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        variantes: [...m.variantes].sort((a, b) => {
          const porTalla = a.talla.localeCompare(b.talla, undefined, { numeric: true });
          if (porTalla !== 0) return porTalla;
          return a.color.localeCompare(b.color);
        }),
        varianteMap: m.varianteMap,
        variantesBajas: m.variantes
          .filter((v) => Number(v.stock || 0) <= VARIANT_LOW_STOCK_LIMIT && !isPlaceholderVariant(v.talla, v.color))
          .map((v) => ({ ...v, stock: Number(v.stock || 0) })),
      }))
      .sort((a, b) => a.modelo.localeCompare(b.modelo));
  }, [filtradas]);

  const totalStockVista = resumenModelos.reduce((acc, item) => acc + item.stockTotal, 0);

  const renderCompactChips = (items, prefix) => {
    const max = 3;
    const visibles = items.slice(0, max);
    const restantes = items.length - visibles.length;

    return (
      <div className="id-tallas-wrap">
        {visibles.map((item) => (
          <span key={`${prefix}-${item}`} className="id-talla-chip">{item}</span>
        ))}
        {restantes > 0 && (
          <span className="id-more-chip">+{restantes}</span>
        )}
      </div>
    );
  };

  return (
    <div className="id-wrapper">
      <header className="id-header">
        <div>
          <h1>Inventario Detallado</h1>
          <p>
            Consulta el stock por modelo y revisa su detalle por talla y color.
          </p>
        </div>
        <button
          type="button"
          className="id-primary-btn"
          onClick={() => setModalCrear(true)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Registrar modelo
        </button>
      </header>

      <section className="id-kpis">
        <article className="id-kpi">
          <span>Modelos visibles</span>
          <strong>{resumenModelos.length}</strong>
        </article>
        <article className="id-kpi">
          <span>Stock en vista</span>
          <strong>{totalStockVista.toLocaleString("es-MX")}</strong>
        </article>
      </section>

      <section className="id-filtros">
        <input
          type="text"
          placeholder="Buscar modelo..."
          value={busquedaModelo}
          onChange={(e) => setBusquedaModelo(e.target.value)}
        />

        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categoriasFiltro.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={filtroColor} onChange={(e) => setFiltroColor(e.target.value)}>
          <option value="">Todos los colores</option>
          {colores.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setBusquedaModelo("");
            setFiltroCategoria("");
            setFiltroColor("");
          }}
        >
          Limpiar filtros
        </button>
      </section>

      <section className="id-card">
        {loading ? (
          <p className="id-estado">Cargando inventario...</p>
        ) : resumenModelos.length === 0 ? (
          <p className="id-estado">No hay datos para mostrar con los filtros actuales.</p>
        ) : (
          <div className="id-table-wrap">
            <table className="id-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Modelo</th>
                  <th>Colores</th>
                  <th>Tallas</th>
                  <th>Stock total</th>
                  <th>Precio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resumenModelos.map((row) => (
                  <React.Fragment key={row.idProducto}>
                    <tr>
                      <td>{row.categoria}</td>
                      <td>{row.modelo}</td>
                      <td>{renderCompactChips(row.colores, `${row.idProducto}-c`)}</td>
                      <td>{renderCompactChips(row.tallas, `${row.idProducto}-t`)}</td>
                      <td>{row.stockTotal}</td>
                      <td>{formatPrecio(row.precio)}</td>
                      <td>
                        <div className="id-actions">
                          <button
                            type="button"
                            className="id-edit-btn"
                            onClick={() => abrirEditar(row)}
                            title="Modificar modelo"
                            aria-label="Modificar modelo"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="id-delete-btn"
                            onClick={() => handleEliminar(row)}
                            title="Eliminar modelo"
                            aria-label="Eliminar modelo"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            className="id-toggle-btn"
                            onClick={() => setExpandedModelId((prev) => (prev === row.idProducto ? null : row.idProducto))}
                          >
                            {expandedModelId === row.idProducto ? 'Ocultar' : 'Ver detalle'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedModelId === row.idProducto && (
                      <tr className="id-expand-row">
                        <td colSpan={7}>
                          <div className="id-expand-card">
                            <div className="id-matrix-wrap">
                              <table className="id-matrix-table">
                                <thead>
                                  <tr>
                                    <th>Talla</th>
                                    <th>Color</th>
                                    <th>Stock</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const variantesValidas = row.variantes.filter((v) => !isPlaceholderVariant(v.talla, v.color));
                                    const gruposPorColor = variantesValidas.reduce((acc, v) => {
                                      const key = String(v.color || 'Sin color');
                                      if (!acc[key]) acc[key] = [];
                                      acc[key].push(v);
                                      return acc;
                                    }, {});

                                    return Object.entries(gruposPorColor).flatMap(([color, items]) =>
                                      items.map((v, idx) => {
                                        const stock = Number(v.stock || 0);
                                        const agotado = stock === 0;
                                        const bajo = stock < VARIANT_LOW_STOCK_LIMIT;
                                        return (
                                          <tr key={`${row.idProducto}-mx-${v.talla}-${color}-${idx}`}>
                                            <td className="id-matrix-talla">{v.talla}</td>
                                            {idx === 0 && (
                                              <td rowSpan={items.length} className="id-matrix-color-group">{color}</td>
                                            )}
                                            <td className={bajo ? 'id-stock-bajo-cell' : ''}>{stock}</td>
                                            <td>
                                              <span className={`id-variant-status ${agotado ? 'is-out' : (bajo ? 'is-low' : 'is-ok')}`}>
                                                {agotado ? 'Agotado' : (bajo ? 'Stock bajo' : 'Disponible')}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="id-note">
        Nota: el stock se muestra por cada combinación de talla y color registrada en el inventario.
      </p>

      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Modelo</h2>
              <button className="modal-close" onClick={() => setModalCrear(false)}>x</button>
            </div>
            <div className="modal-body">
              <FormularioProducto
                form={formCrear}
                setForm={setFormCrear}
                categorias={categoriasOptions}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalCrear(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCrear}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {modalEditar && (
        <div className="modal-overlay" onClick={() => setModalEditar(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modificar Modelo</h2>
              <button className="modal-close" onClick={() => setModalEditar(false)}>x</button>
            </div>
            <div className="modal-body">
              <FormularioProducto
                form={formEditar}
                setForm={setFormEditar}
                categorias={categoriasOptions}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEditar(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleEditar}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {modalEliminar && (
        <div className="modal-overlay" onClick={() => setModalEliminar(false)}>
          <div className="modal-box modal-box-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar modelo</h2>
              <button className="modal-close" onClick={() => setModalEliminar(false)}>x</button>
            </div>
            <div className="modal-body">
              <p>¿Seguro que quieres eliminar este modelo?</p>
              <p><strong>{productoEliminar?.modelo || 'Modelo'}</strong></p>
              <p>Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEliminar(false)}>Cancelar</button>
              <button className="id-delete-confirm-btn" onClick={confirmarEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FormularioProducto = ({ form, setForm, categorias }) => {
  const tallasSeleccionadas = useMemo(() => parseTallas(form.tallas), [form.tallas]);
  const coloresSeleccionados = useMemo(() => parseColores(form.colores), [form.colores]);
  const combinaciones = useMemo(() => buildVariantPairs(tallasSeleccionadas, coloresSeleccionados), [tallasSeleccionadas, coloresSeleccionados]);
  const stockVariantes = useMemo(() => normalizeVariantStocks(combinaciones, form.stock_variantes), [combinaciones, form.stock_variantes]);
  const stockTotalCalculado = useMemo(() => sumVariantStocks(stockVariantes), [stockVariantes]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'modelo') {
      if (value === '' || /^\d*$/.test(value)) {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    if (name === 'precio') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleTalla = (talla) => {
    setForm((prev) => ({ ...prev, tallas: toggleValueInCsv(prev.tallas, talla) }));
  };

  const toggleColor = (color) => {
    setForm((prev) => ({ ...prev, colores: toggleValueInCsv(prev.colores, color) }));
  };

  const setStockVariante = (key, value) => {
    if (value !== '' && !/^\d*$/.test(value)) return;
    const n = value === '' ? 0 : Math.max(0, Math.round(Number(value)));
    setForm((prev) => ({
      ...prev,
      stock_variantes: {
        ...(prev.stock_variantes || {}),
        [key]: n,
      },
    }));
  };

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
        <label>Precio Unitario *</label>
        <input
          type="number"
          name="precio"
          min="0"
          step="0.01"
          value={form.precio}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onWheel={(e) => e.target.blur()}
          placeholder="0.00"
        />
      </div>

      <div className="form-group">
        <label>Tallas disponibles *</label>
        <div className="selector-grid">
          {TALLAS_OPCIONES.map((talla) => (
            <button
              key={talla}
              type="button"
              className={`selector-chip ${tallasSeleccionadas.includes(talla) ? 'active' : ''}`}
              onClick={() => toggleTalla(talla)}
            >
              {talla}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Color *</label>
        <div className="selector-grid selector-grid-colores">
          {COLORES_OPCIONES.map((color) => (
            <button
              key={color}
              type="button"
              className={`selector-chip ${coloresSeleccionados.includes(color) ? 'active' : ''}`}
              onClick={() => toggleColor(color)}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group span-2">
        <label>Stock por talla y color *</label>
        {combinaciones.length === 0 ? (
          <p className="selector-empty">Selecciona al menos una talla y un color.</p>
        ) : (
          <div className="stock-variantes-list">
            {combinaciones.map((pair) => (
              <div key={pair.key} className="stock-variante-item">
                <span>{pair.talla} / {pair.color}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockVariantes[pair.key] ?? 0}
                  onChange={(e) => setStockVariante(pair.key, e.target.value)}
                  onKeyDown={handleKeyDown}
                  onWheel={(e) => e.target.blur()}
                />
              </div>
            ))}
          </div>
        )}
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
