import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { getProductos, updateProducto } from "../../api/productos";
import { registrarMovimientoVenta } from "../../api/movimientos";
import { useAuth } from "../../context/AuthContext";
import "../../styles/styles-POS/caja.css";

const VENTAS_LS_KEY = "ventas_punto_venta";
const COLOR_MAP_KEY = "inventario_colores_map";
const VARIANT_STOCK_MAP_KEY = "inventario_stock_variantes_map";
const LIQUIDACIONES_STORAGE_KEY = "inventario_liquidaciones_ids";
const LIQUIDACIONES_DISCOUNT_KEY = "inventario_liquidaciones_descuentos";

const COLOR_KEYWORDS = [
  "negro", "negra", "blanco", "blanca", "azul", "rojo", "roja", "verde", "amarillo", "amarilla",
  "gris", "cafe", "marron", "morado", "beige", "rosa", "nude", "vino", "dorado", "plateado",
];

const parseCsvList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const normalized = String(item || "").toLowerCase();
      return Boolean(item) && normalized !== "null" && normalized !== "undefined";
    });

const readColorMap = () => {
  try {
    const raw = localStorage.getItem(COLOR_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const readLiquidacionesIds = () => {
  try {
    const raw = localStorage.getItem(LIQUIDACIONES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
};

const readLiquidacionesDescuentos = () => {
  try {
    const raw = localStorage.getItem(LIQUIDACIONES_DISCOUNT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed).reduce((acc, [id, d]) => {
      const idNum = Number(id);
      const discountNum = Number(d);
      if (!Number.isFinite(idNum) || !Number.isFinite(discountNum)) return acc;
      acc[idNum] = Math.max(0, Math.min(90, Math.round(discountNum)));
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const detectColor = (modelo = "") => {
  const limpio = String(modelo).toLowerCase();
  const encontrado = COLOR_KEYWORDS.find((c) => limpio.includes(c));
  return encontrado ? encontrado[0].toUpperCase() + encontrado.slice(1) : "";
};

const getFirstOrNA = (list = []) => (Array.isArray(list) && list.length ? list[0] : "N/A");

const normalizeVariantPart = (value) => String(value || "").trim();

const buildVariantKey = (talla, color) => `${normalizeVariantPart(talla)}__${normalizeVariantPart(color)}`;

const getAvailableStockForPair = (item, talla, color) => {
  const baseStock = Math.max(0, Number(item?.stock) || 0);
  const map = item?.variantesStockMap;
  if (!map || typeof map !== "object") return baseStock;

  const key = buildVariantKey(talla, color);
  if (!Object.prototype.hasOwnProperty.call(map, key)) return baseStock;

  return Math.max(0, Number(map[key]) || 0);
};

const getVariantAvailableStock = (item) => {
  const talla = normalizeVariantPart(item?.tallaSeleccionada);
  const color = normalizeVariantPart(item?.colorSeleccionado);
  if (!talla || !color || talla === "N/A" || color === "N/A") {
    return Math.max(0, Number(item?.stock) || 0);
  }

  return getAvailableStockForPair(item, talla, color);
};

const getAvailableTallasForColor = (item, color) => {
  const tallas = Array.isArray(item?.tallasDisponibles) ? item.tallasDisponibles : [];
  const colores = Array.isArray(item?.coloresDisponibles) ? item.coloresDisponibles : [];
  const colorNormalizado = normalizeVariantPart(color);

  if (!colorNormalizado || colorNormalizado === "N/A") {
    return tallas.filter((talla) =>
      colores.some((colorItem) => getAvailableStockForPair(item, talla, colorItem) > 0)
    );
  }

  return tallas.filter((talla) => getAvailableStockForPair(item, talla, colorNormalizado) > 0);
};

const getAvailableColorsForTalla = (item, talla) => {
  const tallas = Array.isArray(item?.tallasDisponibles) ? item.tallasDisponibles : [];
  const colores = Array.isArray(item?.coloresDisponibles) ? item.coloresDisponibles : [];
  const tallaNormalizada = normalizeVariantPart(talla);

  if (!tallaNormalizada || tallaNormalizada === "N/A") {
    return colores.filter((color) =>
      tallas.some((tallaItem) => getAvailableStockForPair(item, tallaItem, color) > 0)
    );
  }

  return colores.filter((color) => getAvailableStockForPair(item, tallaNormalizada, color) > 0);
};

const resolveBestVariant = (item, preferredTalla, preferredColor) => {
  const tallas = Array.isArray(item?.tallasDisponibles) ? item.tallasDisponibles : [];
  const colores = Array.isArray(item?.coloresDisponibles) ? item.coloresDisponibles : [];

  const targetTalla = normalizeVariantPart(preferredTalla || item?.tallaSeleccionada);
  const targetColor = normalizeVariantPart(preferredColor || item?.colorSeleccionado);

  // 1) Exact combination if available.
  if (targetTalla && targetColor && getAvailableStockForPair(item, targetTalla, targetColor) > 0) {
    return { talla: targetTalla, color: targetColor };
  }

  // 2) Keep chosen talla, switch to first color with stock.
  if (targetTalla) {
    const colorConStock = colores.find((color) => getAvailableStockForPair(item, targetTalla, color) > 0);
    if (colorConStock) return { talla: targetTalla, color: colorConStock };
  }

  // 3) Keep chosen color, switch to first talla with stock.
  if (targetColor) {
    const tallaConStock = tallas.find((talla) => getAvailableStockForPair(item, talla, targetColor) > 0);
    if (tallaConStock) return { talla: tallaConStock, color: targetColor };
  }

  // 4) Fallback to first available pair with stock.
  for (const talla of tallas) {
    for (const color of colores) {
      if (getAvailableStockForPair(item, talla, color) > 0) {
        return { talla, color };
      }
    }
  }

  return { talla: targetTalla || "N/A", color: targetColor || "N/A" };
};

const resolveVariantForTallaChange = (item, preferredTalla) => {
  const tallas = Array.isArray(item?.tallasDisponibles) ? item.tallasDisponibles : [];
  const colores = Array.isArray(item?.coloresDisponibles) ? item.coloresDisponibles : [];

  const targetTalla = normalizeVariantPart(preferredTalla || item?.tallaSeleccionada);
  const targetColor = normalizeVariantPart(item?.colorSeleccionado);

  // 1) Exact requested pair.
  if (targetTalla && targetColor && getAvailableStockForPair(item, targetTalla, targetColor) > 0) {
    return { talla: targetTalla, color: targetColor };
  }

  // 2) Keep chosen talla, switch color.
  if (targetTalla) {
    const colorConStock = colores.find((color) => getAvailableStockForPair(item, targetTalla, color) > 0);
    if (colorConStock) return { talla: targetTalla, color: colorConStock };
  }

  // 3) Keep chosen color, move to another talla with stock.
  if (targetColor) {
    const tallaConStock = tallas.find((talla) => getAvailableStockForPair(item, talla, targetColor) > 0);
    if (tallaConStock) return { talla: tallaConStock, color: targetColor };
  }

  return resolveBestVariant(item, targetTalla, targetColor);
};

const resolveVariantForColorChange = (item, preferredColor) => {
  const tallas = Array.isArray(item?.tallasDisponibles) ? item.tallasDisponibles : [];
  const colores = Array.isArray(item?.coloresDisponibles) ? item.coloresDisponibles : [];

  const targetTalla = normalizeVariantPart(item?.tallaSeleccionada);
  const targetColor = normalizeVariantPart(preferredColor || item?.colorSeleccionado);

  // 1) Exact requested pair.
  if (targetTalla && targetColor && getAvailableStockForPair(item, targetTalla, targetColor) > 0) {
    return { talla: targetTalla, color: targetColor };
  }

  // 2) Keep chosen color, switch talla.
  if (targetColor) {
    const tallaConStock = tallas.find((talla) => getAvailableStockForPair(item, talla, targetColor) > 0);
    if (tallaConStock) return { talla: tallaConStock, color: targetColor };
  }

  // 3) Keep chosen talla, switch color.
  if (targetTalla) {
    const colorConStock = colores.find((color) => getAvailableStockForPair(item, targetTalla, color) > 0);
    if (colorConStock) return { talla: targetTalla, color: colorConStock };
  }

  return resolveBestVariant(item, targetTalla, targetColor);
};

const descontarStockVariantesLocal = (detalleVenta = []) => {
  try {
    const raw = localStorage.getItem(VARIANT_STOCK_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const mapa = parsed && typeof parsed === "object" ? { ...parsed } : {};

    detalleVenta.forEach((item) => {
      const idProducto = item?.id_producto;
      if (!idProducto || !mapa[idProducto] || typeof mapa[idProducto] !== "object") return;

      const talla = normalizeVariantPart(item?.talla);
      const color = normalizeVariantPart(item?.color);
      if (!talla || !color || talla === "N/A" || color === "N/A") return;

      const key = `${talla}__${color}`;
      const actual = Number(mapa[idProducto][key]) || 0;
      const cantidad = Math.max(0, Number(item?.cantidad) || 0);
      mapa[idProducto][key] = Math.max(0, actual - cantidad);
    });

    localStorage.setItem(VARIANT_STOCK_MAP_KEY, JSON.stringify(mapa));
    window.dispatchEvent(new Event("inventario-updated"));
  } catch (error) {
    console.error("No se pudo sincronizar stock de variantes en localStorage:", error);
  }
};

export default function NuevaVenta() {
  const { user } = useAuth();
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [pagoConInput, setPagoConInput] = useState("0");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const ventaUndoRef = useRef(null);

  const pagoCon = Number(pagoConInput || 0);

  const cargarProductos = async () => {
    try {
      setCargandoProductos(true);
      const { data } = await getProductos();
      const colorMap = readColorMap();
      const variantMapRaw = localStorage.getItem(VARIANT_STOCK_MAP_KEY);
      const variantMapParsed = variantMapRaw ? JSON.parse(variantMapRaw) : {};
      const variantMap = variantMapParsed && typeof variantMapParsed === "object" ? variantMapParsed : {};
      const liquidacionesSet = new Set(readLiquidacionesIds());
      const descuentosMap = readLiquidacionesDescuentos();
      const normalizados = (Array.isArray(data) ? data : []).map((p) => {
        const coloresBackend = parseCsvList(p.colores);
        const coloresMap = Array.isArray(colorMap[p.id_producto]) ? colorMap[p.id_producto] : [];
        const colorDetectado = detectColor(p.modelo);
        const coloresDisponibles = coloresBackend.length
          ? coloresBackend
          : (coloresMap.length ? coloresMap : (colorDetectado ? [colorDetectado] : []));
        const precioBase = Number(p.precio) || 0;
        const enLiquidacion = liquidacionesSet.has(Number(p.id_producto));
        const descuentoLiquidacion = enLiquidacion ? Number(descuentosMap[Number(p.id_producto)] || 0) : 0;
        const precioFinal = precioBase * (1 - (descuentoLiquidacion / 100));

        return {
        id: p.id_producto,
        nombre: p.modelo,
        precio: Number(precioFinal.toFixed(2)),
        precioBase,
        enLiquidacion,
        descuentoLiquidacion,
        stock: Number(p.stock) || 0,
        marca: p.nombre_categoria || "Sin categoría",
        tallasDisponibles: parseCsvList(p.tallas),
        coloresDisponibles,
        variantesStockMap:
          variantMap[p.id_producto] && typeof variantMap[p.id_producto] === "object"
            ? variantMap[p.id_producto]
            : {},
        raw: p,
        };
      });
      setProductosDisponibles(normalizados);
    } catch (error) {
      console.error("Error cargando productos en caja:", error);
      toast.error("No se pudieron cargar los productos del inventario");
    } finally {
      setCargandoProductos(false);
    }
  };
  useEffect(() => {
    cargarProductos();
    const refrescar = () => cargarProductos();
    window.addEventListener("storage", refrescar);
    window.addEventListener("focus", refrescar);
    window.addEventListener("liquidaciones-updated", refrescar);

    return () => {
      window.removeEventListener("storage", refrescar);
      window.removeEventListener("focus", refrescar);
      window.removeEventListener("liquidaciones-updated", refrescar);
    };
  }, []);

  const sugerencias = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return [];
    return productosDisponibles
      .filter((p) => p.stock > 0)
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) ||
          p.marca.toLowerCase().includes(texto)
      )
      .slice(0, 8);
  }, [busqueda, productosDisponibles]);

  const subtotal = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const cambio = pagoCon - subtotal > 0 ? pagoCon - subtotal : 0;

  const handleBusqueda = (val) => {
    setBusqueda(val);
  };

  const agregarProducto = (prod) => {
    setCarrito((prev) => {
      const existe = prev.find((p) => p.id === prod.id);
      if (existe) {
        const disponibleVariante = getVariantAvailableStock(existe);
        if (existe.cantidad >= disponibleVariante) {
          toast.warn(`Sin stock disponible para agregar más de ${prod.nombre}`);
          return prev;
        }
        return prev.map((p) =>
          p.id === prod.id ? { ...p, cantidad: p.cantidad + 1 } : p
        );
      }
      const inicial = {
        ...prod,
        tallaSeleccionada: getFirstOrNA(prod.tallasDisponibles),
        colorSeleccionado: getFirstOrNA(prod.coloresDisponibles),
      };
      const auto = resolveBestVariant(inicial);
      const draft = {
        ...inicial,
        tallaSeleccionada: auto.talla,
        colorSeleccionado: auto.color,
      };

      const disponibleInicial = getVariantAvailableStock(draft);
      if (disponibleInicial <= 0) {
        toast.warn(`La variante seleccionada de ${prod.nombre} está agotada.`);
        return prev;
      }

      return [
        ...prev,
        {
          ...draft,
          cantidad: 1,
        },
      ];
    });
    setBusqueda("");
  };

  const cambiarTalla = (id, talla) => {
    setCarrito((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const auto = resolveVariantForTallaChange(p, talla || "N/A");
        const actualizado = {
          ...p,
          tallaSeleccionada: auto.talla,
          colorSeleccionado: auto.color,
        };
        const disponible = getVariantAvailableStock(actualizado);
        if (disponible <= 0) {
          return { ...actualizado, cantidad: 0 };
        }
        if (actualizado.cantidad > disponible) {
          return { ...actualizado, cantidad: disponible };
        }
        return actualizado;
      })
    );
  };

  const cambiarColor = (id, color) => {
    setCarrito((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const auto = resolveVariantForColorChange(p, color || "N/A");
        const actualizado = {
          ...p,
          tallaSeleccionada: auto.talla,
          colorSeleccionado: auto.color,
        };
        const disponible = getVariantAvailableStock(actualizado);
        if (disponible <= 0) {
          return { ...actualizado, cantidad: 0 };
        }
        if (actualizado.cantidad > disponible) {
          return { ...actualizado, cantidad: disponible };
        }
        return actualizado;
      })
    );
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito((prev) => {
      const actual = prev.find((p) => p.id === id);
      if (!actual) return prev;
      const siguienteCantidad = actual.cantidad + delta;
      const disponible = getVariantAvailableStock(actual);

      if (delta > 0 && siguienteCantidad > disponible) {
        toast.warn(`Stock máximo alcanzado para ${actual.nombre}`);
        return prev;
      }

      return prev
        .map((p) => (p.id === id ? { ...p, cantidad: siguienteCantidad } : p))
        .filter((p) => p.cantidad > 0);
    });
  };

  const eliminar = (id) => {
    const actual = carrito.find((p) => p.id === id);
    if (!actual) return;

    setCarrito((prev) => prev.filter((p) => p.id !== id));

    toast.info(
      ({ closeToast }) => (
        <div className="undo-toast-row">
          <span className="undo-toast-text">{actual.nombre} eliminado del carrito.</span>
          <button
            type="button"
            onClick={() => {
              setCarrito((prev) => {
                if (prev.some((p) => p.id === actual.id)) return prev;
                return [...prev, actual];
              });
              closeToast?.();
            }}
            className="undo-toast-btn"
          >
            Deshacer
          </button>
        </div>
      ),
      { autoClose: 3000 }
    );
  };

  const cancelar = () => {
    const snapshotCarrito = [...carrito];
    const snapshotBusqueda = busqueda;
    const snapshotPagoConInput = pagoConInput;
    const snapshotMetodoPago = metodoPago;

    setCarrito([]);
    setBusqueda("");
    setPagoConInput("0");

    if (!snapshotCarrito.length && !snapshotBusqueda && snapshotPagoConInput === "0") return;

    toast.info(
      ({ closeToast }) => (
        <div className="undo-toast-row">
          <span className="undo-toast-text">Venta cancelada.</span>
          <button
            type="button"
            onClick={() => {
              setCarrito(snapshotCarrito);
              setBusqueda(snapshotBusqueda);
              setPagoConInput(snapshotPagoConInput);
              setMetodoPago(snapshotMetodoPago);
              closeToast?.();
            }}
            className="undo-toast-btn"
          >
            Deshacer
          </button>
        </div>
      ),
      { autoClose: 3000 }
    );
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;

    if ((Number(pagoCon) || 0) < subtotal) {
      toast.warn("El pago es menor que el total de la venta");
      return;
    }

    try {
      setProcesandoVenta(true);

      const sinStock = carrito.find((item) => item.cantidad > getVariantAvailableStock(item));
      if (sinStock) {
        toast.warn(`La variante seleccionada de ${sinStock.nombre} no tiene stock suficiente.`);
        setProcesandoVenta(false);
        return;
      }

      const detalleVenta = carrito.map((p) => {
        const productoActual = productosDisponibles.find((item) => item.id === p.id);
        const talla = p.tallaSeleccionada || getFirstOrNA(p.tallasDisponibles);
        const color = p.colorSeleccionado || getFirstOrNA(p.coloresDisponibles) || "N/A";
        const stockAnterior = productoActual
          ? getAvailableStockForPair(productoActual, talla, color)
          : 0;
        const cantidadSalida = Math.max(0, Number(p.cantidad) || 0);
        const stockNuevo = Math.max(0, stockAnterior - cantidadSalida);

        return {
          id_producto: p.id,
          nombre: p.nombre,
          talla,
          color,
          cantidad: cantidadSalida,
          precio: p.precio,
          marca: p.marca,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          raw: productoActual?.raw,
        };
      });

      // 1. Descontar stock en backend
      for (const item of detalleVenta) {
        if (!item.raw) continue;
        const raw = item.raw;
        await updateProducto(raw.id_producto, {
          modelo: raw.modelo,
          id_categoria: raw.id_categoria,
          stock: item.stock_nuevo,
          precio: Number(raw.precio) || 0,
          estado: raw.estado || "activo",
          tallas: raw.tallas || "",
          colores: raw.colores || "",
          cantidad_inicial: Number(raw.cantidad_inicial) || 0,
        });
      }

      // 2. Descontar stock local de variantes
      descontarStockVariantesLocal(detalleVenta);
      await cargarProductos();

      const ahora = new Date();
      const fecha = ahora.toISOString().slice(0, 10);
      const hora = ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
      const carritoSnapshot = [...carrito];
      const venta = {
        id: `V-${Date.now()}`,
        fecha,
        hora,
        detalle: detalleVenta,
        total: subtotal,
        metodo: metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1),
        registrado_por: user?.nombre || user?.email || "Usuario",
        registrado_por_id: Number.isFinite(Number(user?.id)) ? Number(user.id) : null,
        created_at: ahora.toISOString(),
      };

      // Limpiar carrito
      setCarrito([]);
      setBusqueda("");
      setPagoConInput("0");

      // Cancelar undo anterior si existía
      if (ventaUndoRef.current) {
        clearTimeout(ventaUndoRef.current);
        ventaUndoRef.current = null;
      }

      // 3. Mostrar toast con Deshacer (3s). Solo si no se deshace, guardar.
      const timeoutId = setTimeout(async () => {
        ventaUndoRef.current = null;

        // Guardar en localStorage
        const ventasRaw = localStorage.getItem(VENTAS_LS_KEY);
        const ventasPrevias = ventasRaw ? JSON.parse(ventasRaw) : [];
        localStorage.setItem(VENTAS_LS_KEY, JSON.stringify([venta, ...ventasPrevias]));
        window.dispatchEvent(new Event("ventas-pos-updated"));

        // Registrar movimiento en backend
        try {
          await registrarMovimientoVenta(venta);
        } catch (movError) {
          console.error("No se pudo persistir la venta en historial backend:", movError);
        }
      }, 3000);

      ventaUndoRef.current = timeoutId;

      toast.info(
        ({ closeToast }) => (
          <div className="undo-toast-row">
            <span className="undo-toast-text">Venta registrada. Deshacer en 3s.</span>
            <button
              type="button"
              className="undo-toast-btn"
              onClick={async () => {
                if (ventaUndoRef.current !== timeoutId) {
                  closeToast?.();
                  return;
                }
                clearTimeout(timeoutId);
                ventaUndoRef.current = null;
                closeToast?.();

                // Revertir stock en backend
                try {
                  for (const item of detalleVenta) {
                    if (!item.raw) continue;
                    const raw = item.raw;
                    await updateProducto(raw.id_producto, {
                      modelo: raw.modelo,
                      id_categoria: raw.id_categoria,
                      stock: item.stock_anterior,
                      precio: Number(raw.precio) || 0,
                      estado: raw.estado || "activo",
                      tallas: raw.tallas || "",
                      colores: raw.colores || "",
                      cantidad_inicial: Number(raw.cantidad_inicial) || 0,
                    });
                  }

                  // Revertir stock local de variantes
                  try {
                    const rawMap = localStorage.getItem(VARIANT_STOCK_MAP_KEY);
                    const mapa = rawMap ? { ...JSON.parse(rawMap) } : {};
                    detalleVenta.forEach((item) => {
                      const id = item?.id_producto;
                      if (!id || !mapa[id]) return;
                      const key = `${item.talla}__${item.color}`;
                      mapa[id][key] = item.stock_anterior;
                    });
                    localStorage.setItem(VARIANT_STOCK_MAP_KEY, JSON.stringify(mapa));
                    window.dispatchEvent(new Event("inventario-updated"));
                  } catch {}

                  // Restaurar carrito
                  setCarrito(carritoSnapshot);
                  await cargarProductos();
                  toast.success("Venta deshecha. Stock restaurado.");
                } catch {
                  toast.error("No se pudo deshacer la venta.");
                }
              }}
            >
              Deshacer
            </button>
          </div>
        ),
        { autoClose: 3000 }
      );
    } catch (error) {
      console.error("Error al finalizar venta:", error);
      toast.error("No se pudo finalizar la venta");
    } finally {
      setProcesandoVenta(false);
    }
  };

  return (
    <div className="nv-wrapper">
      {/* Header */}
      <div className="nv-header">
        <div className="nv-header-left">
          <div className="nv-logo">B</div>
          <div>
            <span className="nv-breadcrumb">Ventas</span>
            <span className="nv-breadcrumb-sep"> / </span>
            <span className="nv-breadcrumb-active">Nueva venta</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="nv-body">
        {/* Panel izquierdo */}
        <div className="nv-left">
          {/* Barra búsqueda */}
          <div className="nv-search-row">
            <div className="nv-search-wrap">
              <span className="nv-search-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                className="nv-search-input"
                placeholder="Buscar producto o marca..."
                value={busqueda}
                onChange={(e) => handleBusqueda(e.target.value)}
              />
              {sugerencias.length > 0 && (
                <ul className="nv-sugerencias">
                  {sugerencias.map((s) => (
                    <li key={s.id} onClick={() => agregarProducto(s)}>
                      <span className="sug-nombre">{s.nombre}</span>
                      <span className="sug-info">{s.marca} · Stock: {s.stock}</span>
                      <span className="sug-precio">
                        ${s.precio.toLocaleString("es-MX")}
                        {s.enLiquidacion ? ` (${s.descuentoLiquidacion}% off)` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="nv-btn-cancelar" onClick={cancelar}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
              Cancelar venta
            </button>
          </div>

          {/* Tabla carrito */}
          {carrito.length > 0 ? (
            <div className="nv-table-wrap">
              <table className="nv-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Talla</th>
                    <th>Color</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((p) => {
                    const tallasFiltradas = getAvailableTallasForColor(p, p.colorSeleccionado);
                    const coloresFiltrados = getAvailableColorsForTalla(p, p.tallaSeleccionada);
                    const tallasRender = tallasFiltradas.length ? tallasFiltradas : p.tallasDisponibles;
                    const coloresRender = coloresFiltrados;
                    const coloresAgotadosParaTalla =
                      p.coloresDisponibles?.length > 0 && coloresRender.length === 0;

                    return (
                    <tr key={p.id}>
                      <td data-label="Artículo">
                        <p className="prod-nombre">{p.nombre}</p>
                        <p className="prod-stock">
                          Stock: {getVariantAvailableStock(p)}
                          {getVariantAvailableStock(p) <= 0 ? " (Agotado)" : ""}
                        </p>
                      </td>
                      <td data-label="Talla">
                        {p.tallasDisponibles?.length ? (
                          <select
                            className="nv-variant-select"
                            value={p.tallaSeleccionada || getFirstOrNA(p.tallasDisponibles)}
                            onChange={(e) => cambiarTalla(p.id, e.target.value)}
                          >
                            {tallasRender.map((talla) => (
                              <option key={`${p.id}-t-${talla}`} value={talla}>
                                {talla}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="nv-variant-na">N/A</span>
                        )}
                      </td>
                      <td data-label="Color">
                        {p.coloresDisponibles?.length ? (
                          <select
                            className="nv-variant-select"
                            value={
                              coloresRender.includes(p.colorSeleccionado)
                                ? p.colorSeleccionado
                                : (coloresRender[0] || "N/A")
                            }
                            onChange={(e) => cambiarColor(p.id, e.target.value || "N/A")}
                            disabled={coloresAgotadosParaTalla}
                          >
                            {coloresAgotadosParaTalla ? (
                              <option value="N/A">No disponible</option>
                            ) : (
                              coloresRender.map((color) => (
                                <option key={`${p.id}-c-${color}`} value={color}>
                                  {color}
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <span className="nv-variant-na">N/A</span>
                        )}
                      </td>
                      <td className="td-precio" data-label="Precio">${p.precio}</td>
                      <td data-label="Cantidad">
                        <div className="qty-control">
                          <button onClick={() => cambiarCantidad(p.id, -1)}>−</button>
                          <span>{p.cantidad}</span>
                          <button onClick={() => cambiarCantidad(p.id, 1)}>+</button>
                        </div>
                      </td>
                      <td className="td-total" data-label="Total">${p.precio * p.cantidad}</td>
                      <td className="td-actions" data-label="Acciones">
                        <button className="btn-delete" onClick={() => eliminar(p.id)}>
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="nv-empty">
              <svg width="56" height="56" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p>{cargandoProductos ? "Cargando inventario..." : "El carrito está vacío"}</p>
              <span>{cargandoProductos ? "Espera un momento" : "Busca un producto para agregarlo"}</span>
            </div>
          )}
        </div>

        {/* Panel derecho — resumen */}
        <div className="nv-right">
          <h2 className="nv-resumen-title">Resumen de venta</h2>

          <div className="nv-resumen-rows">
            <div className="resumen-row">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString("es-MX")}</span>
            </div>
            <div className="resumen-row">
              <span>Pago con</span>
              <input
                className="pago-input"
                type="number"
                min="0"
                step="1"
                value={pagoConInput}
                onFocus={() => {
                  if (pagoConInput === "0") setPagoConInput("");
                }}
                onBlur={() => {
                  if (pagoConInput.trim() === "") setPagoConInput("0");
                }}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const limpio = e.target.value.replace(/\D/g, "");
                  setPagoConInput(limpio);
                }}
              />
            </div>
            <div className="nv-pago-rapido">
              {[200, 400, 600, 800, 1000].map((monto) => (
                <button
                  key={monto}
                  type="button"
                  className={`nv-pago-chip ${pagoCon === monto ? "active" : ""}`}
                  onClick={() => setPagoConInput(String(monto))}
                >
                  ${monto}
                </button>
              ))}
            </div>
            <div className="resumen-row">
              <span>Cambio</span>
              <span className="cambio-val">${cambio.toLocaleString("es-MX")}</span>
            </div>
            <div className="resumen-divider" />
            <div className="resumen-row resumen-total">
              <span>Total</span>
              <span>${subtotal.toLocaleString("es-MX")}</span>
            </div>
          </div>

          <div className="nv-metodo">
            <p className="nv-metodo-label">Método de pago</p>
            <div className="nv-metodo-btns">
              {[
                { key: "efectivo", label: "Efectivo", icon: <Banknote size={16} /> },
                { key: "tarjeta", label: "Tarjeta", icon: <CreditCard size={16} /> },
                { key: "transferencia", label: "Transferencia", icon: <Smartphone size={16} /> },
              ].map((m) => (
                <button
                  key={m.key}
                  className={`metodo-btn ${metodoPago === m.key ? "active" : ""}`}
                  onClick={() => setMetodoPago(m.key)}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button className="nv-btn-finalizar" disabled={carrito.length === 0 || procesandoVenta} onClick={finalizarVenta}>
            Finalizar venta
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}