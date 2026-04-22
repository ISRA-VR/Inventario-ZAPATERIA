import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createProducto, deleteProducto, getCategorias, getProductos, updateProducto } from "../../api/productos";
import { registrarMovimientoEntrada } from "../../api/movimientos";
import { toast } from "react-toastify";
import "../../styles/inventarioDetallado.css";
import "../../styles/addproducto.css";
import React from "react";

const COLOR_MAP_KEY = 'inventario_colores_map';
const VARIANT_STOCK_MAP_KEY = 'inventario_stock_variantes_map';
const ENTRADAS_LS_KEY = 'entradas_inventario';
const VARIANT_LOW_STOCK_LIMIT = 30;
const DELETE_UNDO_MS = 3000;

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();
const normalizeCategoryId = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const modeloEsValido = (value = '') => {
  const limpio = String(value || '').trim();
  if (!limpio) return false;
  if (/^-+$/.test(limpio)) return false;
  return /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/.test(limpio);
};

const tallaEsValida = (value = '') => {
  const limpio = String(value || '').trim();
  if (!limpio) return false;
  if (limpio.includes('-')) return false;
  return /[A-Za-z0-9]/.test(limpio);
};

const colorEsValido = (value = '') => {
  const limpio = String(value || '').trim();
  if (!limpio) return false;
  if (/^-+$/.test(limpio)) return false;
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(limpio);
};

const includesIgnoreCase = (arr = [], candidate = '') => {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate) return false;
  return arr.some((item) => normalizeText(item) === normalizedCandidate);
};

const toTitleCase = (value = '') =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const normalizeCustomValue = (value = '') => String(value || '').trim().replace(/\s+/g, ' ');

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
  return encontrado ? encontrado[0].toUpperCase() + encontrado.slice(1) : "";
};

const isPlaceholderColor = (value = "") => {
  const txt = String(value || "").trim().toLowerCase();
  return txt === "sin color" || txt === "sin colores";
};

const parseTallas = (texto = "") => {
  const lista = String(texto)
    .split(",")
    .map((t) => t.trim())
    .filter((t) => tallaEsValida(t));

  return lista.length ? lista : ["Sin talla"];
};

const parseColores = (texto = "") => {
  const lista = String(texto)
    .split(',')
    .map((t) => t.trim())
    .filter((t) => {
      const valor = String(t || "").trim();
      const normalizado = valor.toLowerCase();
      return (
        colorEsValido(valor)
        && !isPlaceholderColor(valor)
        && normalizado !== "null"
        && normalizado !== "undefined"
      );
    });

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

const hasVariantEntries = (variantStocks) =>
  Boolean(variantStocks && typeof variantStocks === 'object' && Object.keys(variantStocks).length > 0);

const getProductoStockTotal = (producto, variantStocks) => {
  if (hasVariantEntries(variantStocks)) {
    return sumVariantStocks(variantStocks);
  }
  return Math.max(0, Number(producto?.stock) || 0);
};

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
  nombreCategoria,
  precio,
  cantidad,
  talla,
  color,
  registradoPor,
  stockAnterior,
  stockNuevo,
}) => {
  const nowIso = new Date().toISOString();
  const cantidadNormalizada = Math.max(0, Math.round(Number(cantidad) || 0));
  const stockAnteriorNormalizado = Math.max(0, Math.round(Number(stockAnterior) || 0));
  const stockNuevoNormalizado = Math.max(0, Math.round(Number(stockNuevo ?? cantidadNormalizada) || 0));

  return {
    id_producto: idProducto,
    modelo,
    id_categoria: idCategoria,
    nombre_categoria: nombreCategoria || null,
    precio: Number(precio) || 0,
    cantidad: cantidadNormalizada,
    stock: stockNuevoNormalizado,
    stock_anterior: stockAnteriorNormalizado,
    stock_nuevo: stockNuevoNormalizado,
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
  return t === 'sin talla' || c === 'sin color' || c === 'sin colores';
};

const formatPrecio = (v) =>
  v != null ? `$${Number(v).toLocaleString("es-MX")}` : "-";

const buildResumenModelos = (items = []) => {
  const map = new Map();

  items.forEach((item) => {
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
    .sort((a, b) => {
      const porCategoria = String(a.categoria || '').localeCompare(String(b.categoria || ''));
      if (porCategoria !== 0) return porCategoria;
      return String(a.modelo || '').localeCompare(String(b.modelo || ''));
    });
};

const getVariantesParaFiltroStock = (item, filtroStock) => {
  const variantesReales = (item?.variantes || []).filter((v) => !isPlaceholderVariant(v.talla, v.color));

  if (filtroStock === 'bajo') {
    return variantesReales.filter((v) => Number(v.stock || 0) <= VARIANT_LOW_STOCK_LIMIT);
  }

  if (filtroStock === 'agotado') {
    return variantesReales.filter((v) => Number(v.stock || 0) <= 0);
  }

  return variantesReales;
};

export default function InventarioDetalladoPage({ canManage = true }) {
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
  const [filtroStock, setFiltroStock] = useState("");
  const [expandedModelId, setExpandedModelId] = useState(null);
  const [stockVariantesPrevios, setStockVariantesPrevios] = useState({});
  const deleteProductoTimeoutRef = useRef(null);

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

  useEffect(() => {
    const refrescar = () => cargarInventario();

    window.addEventListener('storage', refrescar);
    window.addEventListener('focus', refrescar);
    window.addEventListener('inventario-updated', refrescar);
    window.addEventListener('liquidaciones-updated', refrescar);

    return () => {
      window.removeEventListener('storage', refrescar);
      window.removeEventListener('focus', refrescar);
      window.removeEventListener('inventario-updated', refrescar);
      window.removeEventListener('liquidaciones-updated', refrescar);
    };
  }, [cargarInventario]);

  useEffect(() => {
    return () => {
      if (deleteProductoTimeoutRef.current) {
        clearTimeout(deleteProductoTimeoutRef.current);
        deleteProductoTimeoutRef.current = null;
      }
    };
  }, []);

  const modeloDuplicadoCrear = useMemo(() => {
    const modelo = normalizeText(formCrear.modelo);
    const categoria = normalizeCategoryId(formCrear.id_categoria);
    if (!modelo || categoria === null) return false;

    return productos.some(
      (p) => normalizeText(p?.modelo) === modelo && normalizeCategoryId(p?.id_categoria) === categoria
    );
  }, [productos, formCrear.modelo, formCrear.id_categoria]);

  const modeloDuplicadoEditar = useMemo(() => {
    const modelo = normalizeText(formEditar.modelo);
    const categoria = normalizeCategoryId(formEditar.id_categoria);
    if (!modelo || categoria === null || !productoActual?.id_producto) return false;

    return productos.some(
      (p) => Number(p?.id_producto) !== Number(productoActual.id_producto)
        && normalizeText(p?.modelo) === modelo
        && normalizeCategoryId(p?.id_categoria) === categoria
    );
  }, [productos, formEditar.modelo, formEditar.id_categoria, productoActual]);

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

    if (!modeloEsValido(form.modelo)) {
      toast.warn('El modelo no puede ser solo guiones o símbolos.');
      return false;
    }

    const tallasValidas = parseTallas(form.tallas).filter((talla) => normalizeText(talla) !== 'sin talla');
    if (!tallasValidas.length) {
      toast.warn('La talla no puede ser solo guiones o símbolos.');
      return false;
    }

    const coloresValidos = parseColores(form.colores);
    if (!coloresValidos.length) {
      toast.warn('El color no puede ser solo guiones o símbolos.');
      return false;
    }

    return true;
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (modeloDuplicadoCrear) {
      toast.warn('Ya existe un modelo con ese nombre en esta categoría.');
      return;
    }
    if (!validarFormulario(formCrear)) return;

    const modeloCrear = normalizeText(formCrear.modelo);
    const categoriaCrear = normalizeCategoryId(formCrear.id_categoria);
    const existeDuplicado = productos.some(
      (p) => normalizeText(p?.modelo) === modeloCrear && normalizeCategoryId(p?.id_categoria) === categoriaCrear
    );
    if (existeDuplicado) {
      toast.warn('Ya existe un modelo con ese nombre en esta categoría.');
      return;
    }

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
      const categoriaNombre = categoriasOptions.find(
        (cat) => Number(cat.id_categoria) === Number(payload.id_categoria)
      )?.nombre_categoria || null;

      const entradasNuevas = pairs
        .map((pair) => ({ pair, cantidad: Number(stockVariantes[pair.key] || 0) }))
        .filter((item) => item.cantidad > 0)
        .map((item) =>
          buildEntradaRecord({
            idProducto: productoCreado?.id_producto,
            modelo: payload.modelo,
            idCategoria: payload.id_categoria,
            nombreCategoria: categoriaNombre,
            precio: payload.precio,
            cantidad: item.cantidad,
            talla: item.pair.talla,
            color: item.pair.color,
            registradoPor,
            stockAnterior: 0,
            stockNuevo: item.cantidad,
          })
        );

      pushEntradasToStorage(entradasNuevas);

      if (entradasNuevas.length) {
        const resultados = await Promise.allSettled(
          entradasNuevas.map((entrada) => registrarMovimientoEntrada(entrada))
        );
        const fallidos = resultados.filter((r) => r.status === 'rejected').length;
        if (fallidos > 0) {
          toast.warning('Algunas entradas no se reflejaron en reportes en tiempo real.');
        }
      }

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
    if (modeloDuplicadoEditar) {
      toast.warn('Ya existe un modelo con ese nombre en esta categoría.');
      return;
    }
    if (!validarFormulario(formEditar)) return;
    if (!productoActual?.id_producto) return;

    const modeloEditar = normalizeText(formEditar.modelo);
    const categoriaEditar = normalizeCategoryId(formEditar.id_categoria);
    const existeDuplicado = productos.some(
      (p) => Number(p?.id_producto) !== Number(productoActual?.id_producto)
        && normalizeText(p?.modelo) === modeloEditar
        && normalizeCategoryId(p?.id_categoria) === categoriaEditar
    );
    if (existeDuplicado) {
      toast.warn('Ya existe un modelo con ese nombre en esta categoría.');
      return;
    }

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
      const categoriaNombre = categoriasOptions.find(
        (cat) => Number(cat.id_categoria) === Number(payload.id_categoria)
      )?.nombre_categoria || null;
      const previousMap = stockVariantesPrevios || {};
      const allKeys = Array.from(new Set([...Object.keys(previousMap), ...Object.keys(stockVariantes)]));
      const totalAntesGlobal = hasVariantEntries(previousMap)
        ? sumVariantStocks(previousMap)
        : Math.max(0, Number(productoActual?.stock) || 0);
      const totalDespuesGlobal = hasVariantEntries(stockVariantes)
        ? sumVariantStocks(stockVariantes)
        : Math.max(0, Number(payload.stock) || 0);

      const entradasNuevas = allKeys
        .map((key) => {
          const before = Math.max(0, Math.round(Number(previousMap[key]) || 0));
          const after = Math.max(0, Math.round(Number(stockVariantes[key]) || 0));
          const cambioDetectado = after !== before;
          if (!cambioDetectado) return null;

          const cantidadRegistro = after > 0 ? after : Math.abs(after - before);
          if (cantidadRegistro <= 0) return null;

          const [tallaRaw, colorRaw] = String(key).split('__');
          return buildEntradaRecord({
            idProducto: productoActual.id_producto,
            modelo: payload.modelo,
            idCategoria: payload.id_categoria,
            nombreCategoria: categoriaNombre,
            precio: payload.precio,
            cantidad: cantidadRegistro,
            talla: tallaRaw || 'N/A',
            color: colorRaw || 'N/A',
            registradoPor,
            stockAnterior: before,
            stockNuevo: after,
          });
        })
        .filter(Boolean);

      if (entradasNuevas.length === 0) {
        const deltaTotal = Math.abs(totalDespuesGlobal - totalAntesGlobal);
        const cantidadRegistroTotal = totalDespuesGlobal > 0 ? totalDespuesGlobal : deltaTotal;

        if (cantidadRegistroTotal > 0) {
          entradasNuevas.push(
            buildEntradaRecord({
              idProducto: productoActual.id_producto,
              modelo: payload.modelo,
              idCategoria: payload.id_categoria,
              nombreCategoria: categoriaNombre,
              precio: payload.precio,
              cantidad: cantidadRegistroTotal,
              talla: 'N/A',
              color: 'N/A',
              registradoPor,
              stockAnterior: totalAntesGlobal,
              stockNuevo: totalDespuesGlobal,
            })
          );
        }
      }

      pushEntradasToStorage(entradasNuevas);

      if (entradasNuevas.length) {
        const resultados = await Promise.allSettled(
          entradasNuevas.map((entrada) => registrarMovimientoEntrada(entrada))
        );
        const fallidos = resultados.filter((r) => r.status === 'rejected').length;
        if (fallidos > 0) {
          toast.warning('Algunas entradas no se reflejaron en reportes en tiempo real.');
        }
      }

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

  const confirmarEliminar = () => {
    if (!productoEliminar?.idProducto) return;

    const productoObjetivo = { ...productoEliminar };
    setModalEliminar(false);
    setProductoEliminar(null);

    if (deleteProductoTimeoutRef.current) {
      clearTimeout(deleteProductoTimeoutRef.current);
      deleteProductoTimeoutRef.current = null;
    }

    const timeoutId = setTimeout(async () => {
      deleteProductoTimeoutRef.current = null;
      try {
        await deleteProducto(productoObjetivo.idProducto);
        toast.success("Modelo eliminado correctamente.");
        if (expandedModelId === productoObjetivo.idProducto) {
          setExpandedModelId(null);
        }
        window.dispatchEvent(new Event('inventario-updated'));
        await cargarInventario();
      } catch (error) {
        const errorMsg = error.response?.data?.message || "No se pudo eliminar el modelo.";
        toast.error(errorMsg);
      }
    }, DELETE_UNDO_MS);

    deleteProductoTimeoutRef.current = timeoutId;

    toast.warning(
      ({ closeToast }) => (
        <div className="undo-toast-row">
          <span className="undo-toast-text">
            {productoObjetivo.modelo || "Modelo"} se eliminara en 3s.
          </span>
          <button
            type="button"
            className="undo-toast-btn"
            onClick={() => {
              if (deleteProductoTimeoutRef.current === timeoutId) {
                clearTimeout(timeoutId);
                deleteProductoTimeoutRef.current = null;
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

  const inventario = useMemo(() => {
    return productos.flatMap((p) => {
      const colorDesdeMapa = (Array.isArray(colorMap[p.id_producto]) ? colorMap[p.id_producto] : [])
        .map((c) => String(c || "").trim())
        .filter((c) => c && !isPlaceholderColor(c));
      const colorDesdeCampo = parseColores(p?.colores);
      const colorDetectado = detectColor(p?.modelo);
      const colores = colorDesdeCampo.length
        ? colorDesdeCampo
        : (colorDesdeMapa.length ? colorDesdeMapa : (colorDetectado ? [colorDetectado] : ['N/A']));

      const tallas = parseTallas(p?.tallas);
      const pairs = buildVariantPairs(tallas, colores);
      const totalPairs = pairs.length || 1;
      const varianteStock = variantStockMap[p.id_producto] || {};
      const varianteConDatos = hasVariantEntries(varianteStock);
      const totalStockProducto = getProductoStockTotal(p, varianteStock);
      const fallbackBase = Math.floor(totalStockProducto / totalPairs);
      const fallbackResto = totalStockProducto % totalPairs;

      return pairs.map((pair, i) => ({
        id: `${p.id_producto}-${pair.key}-${i}`,
        idProducto: p.id_producto,
        modelo: p.modelo || "Sin modelo",
        categoria: p.nombre_categoria || "Sin categoría",
        precio: Number(p.precio) || 0,
        estado: p.estado || "activo",
        color: pair.color,
        talla: pair.talla,
        stock: varianteConDatos
          ? (Object.prototype.hasOwnProperty.call(varianteStock, pair.key)
              ? Math.max(0, Number(varianteStock[pair.key]) || 0)
              : 0)
          : (fallbackBase + (i < fallbackResto ? 1 : 0)),
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

  const resumenModelos = useMemo(() => buildResumenModelos(filtradas), [filtradas]);
  const resumenModelosCompletos = useMemo(
    () => new Map(buildResumenModelos(inventario).map((item) => [item.idProducto, item])),
    [inventario]
  );

  const resumenModelosFiltrados = useMemo(() => {
    if (!filtroStock) return resumenModelos;

    return resumenModelos.filter((item) => {
      const variantesReales = item.variantes.filter((v) => !isPlaceholderVariant(v.talla, v.color));

      if (filtroStock === 'bajo') {
        return item.variantesBajas.length > 0;
      }

      if (filtroStock === 'agotado') {
        if (!variantesReales.length) return Number(item.stockTotal || 0) <= 0;
        return variantesReales.some((v) => Number(v.stock || 0) <= 0);
      }

      if (filtroStock === 'normal') {
        if (!variantesReales.length) return Number(item.stockTotal || 0) > VARIANT_LOW_STOCK_LIMIT;
        return variantesReales.every((v) => Number(v.stock || 0) > VARIANT_LOW_STOCK_LIMIT);
      }

      return true;
    });
  }, [resumenModelos, filtroStock]);

  const gruposPorCategoria = useMemo(() => {
    const map = new Map();
    resumenModelosFiltrados.forEach((item) => {
      const categoria = item?.categoria || 'Sin categoría';
      if (!map.has(categoria)) {
        map.set(categoria, []);
      }
      map.get(categoria).push(item);
    });
    return Array.from(map.entries()).map(([categoria, items]) => ({ categoria, items }));
  }, [resumenModelosFiltrados]);

  const totalStockVista = resumenModelosFiltrados.reduce((acc, item) => acc + item.stockTotal, 0);
  const tieneFiltrosActivos = Boolean(
    busquedaModelo.trim() || filtroCategoria || filtroColor || filtroStock
  );

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
      <header className="id-topbar">
        <div className="id-heading">
          <h1 className="id-title">Inventario</h1>
          <p className="id-subtitle">
            Consulta el stock por modelo y revisa su detalle por talla y color.
          </p>
        </div>

        {canManage && (
          <div className="id-header-actions">
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
          </div>
        )}
      </header>

      <section className="id-kpis">
        <article className="id-kpi">
          <span>Modelos visibles</span>
          <strong>{resumenModelosFiltrados.length}</strong>
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

        <select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)}>
          <option value="">Todo el stock</option>
          <option value="bajo">Stock bajo</option>
          <option value="agotado">Agotado</option>
          <option value="normal">Stock normal</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setBusquedaModelo("");
            setFiltroCategoria("");
            setFiltroColor("");
            setFiltroStock("");
          }}
        >
          Limpiar filtros
        </button>
      </section>

      <section className="id-card">
        {loading ? (
          <p className="id-estado">Cargando inventario...</p>
        ) : resumenModelosFiltrados.length === 0 ? (
          <p className="id-estado">No hay datos para mostrar con los filtros actuales.</p>
        ) : (
          <div className="id-table-wrap">
            <table className="id-table">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Colores</th>
                  <th>Tallas</th>
                  <th>Stock total</th>
                  <th>Precio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gruposPorCategoria.map((grupo) => (
                  <React.Fragment key={`categoria-${grupo.categoria}`}>
                    <tr className="id-category-group-row">
                      <td colSpan={6}>
                        <span className="id-category-group-chip">{grupo.categoria}</span>
                        <span className="id-category-group-count">{grupo.items.length} modelo(s)</span>
                      </td>
                    </tr>

                    {grupo.items.map((row) => {
                      const rowCompleto = resumenModelosCompletos.get(row.idProducto) || row;
                      const mostrarMatrizAutomatica = filtroStock === 'bajo' || filtroStock === 'agotado';
                      const detalleAbierto = mostrarMatrizAutomatica || expandedModelId === row.idProducto;

                      return (
                        <React.Fragment key={row.idProducto}>
                          <tr className={tieneFiltrosActivos ? 'id-row-filtered' : ''}>
                            <td className="id-model-cell">{row.modelo}</td>
                            <td>{renderCompactChips(row.colores, `${row.idProducto}-c`)}</td>
                            <td>{renderCompactChips(row.tallas, `${row.idProducto}-t`)}</td>
                            <td>{row.stockTotal}</td>
                            <td>{formatPrecio(row.precio)}</td>
                            <td>
                              <div className="id-actions">
                                {canManage && (
                                  <button
                                    type="button"
                                    className="id-edit-btn"
                                    onClick={() => abrirEditar(rowCompleto)}
                                    title="Modificar modelo"
                                    aria-label="Modificar modelo"
                                  >
                                    Editar
                                  </button>
                                )}
                                {canManage && (
                                  <button
                                    type="button"
                                    className="id-delete-btn"
                                    onClick={() => handleEliminar(rowCompleto)}
                                    title="Eliminar modelo"
                                    aria-label="Eliminar modelo"
                                  >
                                    Eliminar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="id-toggle-btn"
                                  onClick={() => setExpandedModelId((prev) => (prev === row.idProducto ? null : row.idProducto))}
                                  style={{ display: mostrarMatrizAutomatica ? 'none' : 'inline-flex' }}
                                >
                                  {expandedModelId === row.idProducto ? 'Ocultar' : 'Ver detalle'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {detalleAbierto && (
                            <tr className="id-expand-row">
                              <td colSpan={6}>
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
                                          const variantesValidas = mostrarMatrizAutomatica
                                            ? getVariantesParaFiltroStock(rowCompleto, filtroStock)
                                            : rowCompleto.variantes.filter((v) => !isPlaceholderVariant(v.talla, v.color));
                                          const gruposPorColor = variantesValidas.reduce((acc, v) => {
                                            const key = String(v.color || 'N/A');
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(v);
                                            return acc;
                                          }, {});

                                          if (!Object.keys(gruposPorColor).length) {
                                            return (
                                              <tr>
                                                <td colSpan={4} className="id-estado">No hay variantes para este filtro.</td>
                                              </tr>
                                            );
                                          }

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
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canManage && modalCrear && (
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
                modeloDuplicado={modeloDuplicadoCrear}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalCrear(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCrear} disabled={modeloDuplicadoCrear}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {canManage && modalEditar && (
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
                modeloDuplicado={modeloDuplicadoEditar}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEditar(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleEditar} disabled={modeloDuplicadoEditar}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {canManage && modalEliminar && (
        <div className="modal-overlay" onClick={() => setModalEliminar(false)}>
          <div className="modal-box modal-box-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar modelo</h2>
              <button className="modal-close" onClick={() => setModalEliminar(false)}>x</button>
            </div>
            <div className="modal-body">
              <p>¿Seguro que quieres eliminar este modelo?</p>
              <p><strong>{productoEliminar?.modelo || 'Modelo'}</strong></p>
              <p>Podras deshacer durante 3 segundos.</p>
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

const FormularioProducto = ({ form, setForm, categorias, modeloDuplicado = false }) => {
  const [nuevaTalla, setNuevaTalla] = useState('');
  const [nuevoColor, setNuevoColor] = useState('');
  const tallasSeleccionadas = useMemo(
    () => parseTallas(form.tallas).filter((talla) => normalizeText(talla) !== 'sin talla'),
    [form.tallas]
  );
  const coloresSeleccionados = useMemo(() => parseColores(form.colores), [form.colores]);
  const combinaciones = useMemo(() => buildVariantPairs(tallasSeleccionadas, coloresSeleccionados), [tallasSeleccionadas, coloresSeleccionados]);
  const stockVariantes = useMemo(() => normalizeVariantStocks(combinaciones, form.stock_variantes), [combinaciones, form.stock_variantes]);
  const stockTotalCalculado = useMemo(() => sumVariantStocks(stockVariantes), [stockVariantes]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'modelo') {
      setForm((prev) => ({ ...prev, [name]: value }));
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

  const quitarTalla = (talla) => {
    setForm((prev) => ({
      ...prev,
      tallas: toCsv(parseTallas(prev.tallas).filter((item) => normalizeText(item) !== normalizeText(talla) && normalizeText(item) !== 'sin talla')),
    }));
  };

  const quitarColor = (color) => {
    setForm((prev) => ({
      ...prev,
      colores: toCsv(parseColores(prev.colores).filter((item) => normalizeText(item) !== normalizeText(color))),
    }));
  };

  const agregarColorPersonalizado = () => {
    const colorFormateado = toTitleCase(nuevoColor);

    if (!colorEsValido(colorFormateado)) {
      toast.warn('El color no puede ser solo guiones o símbolos.');
      return;
    }

    if (includesIgnoreCase(coloresSeleccionados, colorFormateado)) {
      toast.info('Ese color ya esta seleccionado.');
      setNuevoColor('');
      return;
    }

    setForm((prev) => ({
      ...prev,
      colores: toCsv([...parseColores(prev.colores), colorFormateado]),
    }));
    setNuevoColor('');
  };

  const agregarTallaPersonalizada = () => {
    const tallaFormateada = normalizeCustomValue(nuevaTalla);

    if (!tallaEsValida(tallaFormateada)) {
      toast.warn('La talla no puede ser solo guiones o símbolos.');
      return;
    }

    if (includesIgnoreCase(tallasSeleccionadas, tallaFormateada)) {
      toast.info('Esa talla ya esta seleccionada.');
      setNuevaTalla('');
      return;
    }

    setForm((prev) => ({
      ...prev,
      tallas: toCsv([
        ...parseTallas(prev.tallas).filter((talla) => normalizeText(talla) !== 'sin talla'),
        tallaFormateada,
      ]),
    }));
    setNuevaTalla('');
  };

  const setStockVariante = (key, value) => {
    if (value !== '' && !/^\d*$/.test(value)) return;
    setForm((prev) => ({
      ...prev,
      stock_variantes: {
        ...(prev.stock_variantes || {}),
        [key]: value,
      },
    }));
  };

  const handleStockFocus = (key) => {
    const raw = form.stock_variantes?.[key];
    const current = raw === '' ? '' : Number(raw ?? stockVariantes[key] ?? 0);
    if (current !== 0) return;

    setForm((prev) => ({
      ...prev,
      stock_variantes: {
        ...(prev.stock_variantes || {}),
        [key]: '',
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
        {modeloDuplicado && (
          <small style={{ color: '#b42318', display: 'block', marginTop: 6 }}>
            Ya existe un modelo con ese nombre en esta categoría.
          </small>
        )}
      </div>

      <div className="form-group span-2">
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

      <div className="form-group span-2">
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

      <div className="form-group form-group-tallas">
        <label>Tallas *</label>
        <div className="custom-option-row">
          <input
            type="text"
            value={nuevaTalla}
            onChange={(e) => setNuevaTalla(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === '-') {
                e.preventDefault();
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                agregarTallaPersonalizada();
              }
            }}
            placeholder="Agregar talla (ej. 39.5)"
          />
          <button type="button" className="custom-option-btn" onClick={agregarTallaPersonalizada}>
            Agregar talla
          </button>
        </div>
        {tallasSeleccionadas.length > 0 && (
          <div className="custom-option-tags">
            {tallasSeleccionadas.map((talla) => (
              <button
                key={talla}
                type="button"
                className="selector-chip active custom-option-chip"
                onClick={() => quitarTalla(talla)}
                title="Quitar talla"
              >
                {talla}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="form-group span-2 form-group-colores">
        <label>Color *</label>
        <div className="custom-option-row">
          <input
            type="text"
            value={nuevoColor}
            onChange={(e) => setNuevoColor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregarColorPersonalizado();
              }
            }}
            placeholder="Agregar color (ej. Mostaza)"
          />
          <button type="button" className="custom-option-btn" onClick={agregarColorPersonalizado}>
            Agregar color
          </button>
        </div>
        {coloresSeleccionados.length > 0 && (
          <div className="custom-option-tags">
            {coloresSeleccionados.map((color) => (
              <button
                key={color}
                type="button"
                className="selector-chip active custom-option-chip"
                onClick={() => quitarColor(color)}
                title="Quitar color"
              >
                {color}
              </button>
            ))}
          </div>
        )}
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
                  value={form.stock_variantes?.[pair.key] === '' ? '' : (stockVariantes[pair.key] ?? 0)}
                  onChange={(e) => setStockVariante(pair.key, e.target.value)}
                  onFocus={() => handleStockFocus(pair.key)}
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
