import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Box, CalendarDays, BarChart3, User, TriangleAlert, Plus } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { createProducto, getCategorias, getProductos, updateProducto } from "../../api/productos"
import { registrarMovimientoEntrada } from "../../api/movimientos"
import { toast } from "react-toastify"
import "../../styles/entradas.css"
import "../../styles/addproducto.css"

const COLOR_MAP_KEY = "inventario_colores_map"
const VARIANT_STOCK_MAP_KEY = "inventario_stock_variantes_map"
const ENTRADAS_LS_KEY = "entradas_inventario"
const VENTAS_LS_KEY = "ventas_punto_venta"
const ENTRADAS_RESUMEN_LS_KEY = "entradas_resumen"

const normalizeText = (value = "") => String(value || "").trim().toLowerCase()
const normalizeCategoryId = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
const normalizeIdentity = (value = "") => String(value || "").trim().toLowerCase()

const modeloEsValido = (value = "") => {
  const limpio = String(value || "").trim()
  if (!limpio) return false
  if (/^-+$/.test(limpio)) return false
  return /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/.test(limpio)
}

const tallaEsValida = (value = "") => {
  const limpio = String(value || "").trim()
  if (!limpio) return false
  if (limpio.includes("-")) return false
  return /[A-Za-z0-9]/.test(limpio)
}

const colorEsValido = (value = "") => {
  const limpio = String(value || "").trim()
  if (!limpio) return false
  if (/^-+$/.test(limpio)) return false
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(limpio)
}

const includesIgnoreCase = (arr = [], candidate = "") => {
  const normalizedCandidate = normalizeText(candidate)
  if (!normalizedCandidate) return false
  return arr.some((item) => normalizeText(item) === normalizedCandidate)
}

const toTitleCase = (value = "") =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")

const normalizeCustomValue = (value = "") => String(value || "").trim().replace(/\s+/g, " ")

const FORM_EMPTY = {
  modelo: "",
  id_categoria: "",
  precio: "",
  tallas: "",
  colores: "",
  stock_variantes: {},
  estado: "activo",
}

const parseCsv = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const parseTallas = (value = "") => {
  const lista = parseCsv(value).filter((t) => tallaEsValida(t))
  return lista.length ? lista : ["Sin talla"]
}

const parseColores = (value = "") => {
  const lista = parseCsv(value).filter((color) => {
    if (!colorEsValido(color)) return false
    const normalizado = String(color || "").toLowerCase()
    return normalizado !== "sin color" && normalizado !== "sin colores"
  })
  return lista.length ? lista : []
}

const toCsv = (arr = []) => arr.join(", ")

const toggleValueInCsv = (csv, value) => {
  const current = parseCsv(csv)
  const exists = current.includes(value)
  const next = exists ? current.filter((x) => x !== value) : [...current, value]
  return toCsv(next)
}

const buildVariantPairs = (tallas = [], colores = []) =>
  tallas.flatMap((talla) => colores.map((color) => ({
    key: `${talla}__${color}`,
    talla,
    color,
  })))

const normalizeVariantStocks = (pairs, currentStocks = {}) => {
  const out = {}

  pairs.forEach((pair) => {
    const raw = Number(currentStocks[pair.key])
    out[pair.key] = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0
  })

  return out
}

const sumVariantStocks = (variantStocks = {}) =>
  Object.values(variantStocks).reduce((acc, n) => acc + (Number(n) || 0), 0)

const getSessionUserName = () => {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user")
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.nombre || parsed?.email || "Empleado"
  } catch {
    return "Empleado"
  }
}

const readMap = (key) => {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

const toSafeIntOrNull = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.round(parsed))
}

const normalizeEntradaStock = (item = {}) => {
  const cantidad = Math.max(0, Math.round(Number(item?.cantidad) || 0))
  const stockAnterior = toSafeIntOrNull(item?.stock_anterior)
  const stockNuevo = toSafeIntOrNull(item?.stock_nuevo ?? item?.stock)

  let nextAnterior = stockAnterior
  let nextNuevo = stockNuevo

  if (nextAnterior == null && nextNuevo == null) {
    nextAnterior = 0
    nextNuevo = cantidad
  } else if (nextAnterior == null) {
    nextAnterior = Math.max(0, nextNuevo - cantidad)
  } else if (nextNuevo == null) {
    nextNuevo = Math.max(0, nextAnterior + cantidad)
  }

  return {
    ...item,
    stock_anterior: nextAnterior,
    stock_nuevo: nextNuevo,
    stock: nextNuevo,
  }
}

const normalizeEntradasStockList = (list = []) => {
  let changed = false
  const normalized = (Array.isArray(list) ? list : []).map((item) => {
    const next = normalizeEntradaStock(item)
    if (
      Number(item?.stock_anterior) !== Number(next.stock_anterior) ||
      Number(item?.stock_nuevo) !== Number(next.stock_nuevo)
    ) {
      changed = true
    }
    return next
  })

  return { normalized, changed }
}

const pushEntradasToStorage = (entradasNuevas = []) => {
  if (!entradasNuevas.length) return

  try {
    const raw = localStorage.getItem(ENTRADAS_LS_KEY)
    const prev = raw ? JSON.parse(raw) : []
    const prevList = Array.isArray(prev) ? prev : []
    const merged = [...entradasNuevas, ...prevList]
    const { normalized } = normalizeEntradasStockList(merged)
    localStorage.setItem(ENTRADAS_LS_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new Event("entradas-updated"))
  } catch (error) {
    console.error("No se pudo sincronizar entradas en localStorage:", error)
  }
}

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
  registradoPorId,
  stockAnterior,
  stockNuevo,
}) => {
  const nowIso = new Date().toISOString()
  const cantidadNormalizada = Math.max(0, Math.round(Number(cantidad) || 0))
  const stockAnteriorNormalizado = Math.max(0, Math.round(Number(stockAnterior) || 0))
  const stockNuevoNormalizado = Math.max(0, Math.round(Number(stockNuevo ?? cantidadNormalizada) || 0))

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
    talla: talla || "N/A",
    color: color || "N/A",
    registroId: `${idProducto || "producto"}-${talla || "na"}-${color || "na"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fecha_creacion: nowIso,
    registrado_por: registradoPor || "Empleado",
    registrado_por_id: Number.isFinite(Number(registradoPorId)) ? Number(registradoPorId) : null,
  }
}

function Entradas() {
  const [entradas, setEntradas] = useState(() => {
    try {
      const guardado = localStorage.getItem(ENTRADAS_LS_KEY)
      const parsed = guardado ? JSON.parse(guardado) : []
      const { normalized, changed } = normalizeEntradasStockList(parsed)
      if (changed) {
        localStorage.setItem(ENTRADAS_LS_KEY, JSON.stringify(normalized))
      }
      return normalized
    } catch (error) {
      console.error("Error parseando entradas en localStorage:", error)
      return []
    }
  })
  const [ventas, setVentas] = useState(() => {
    try {
      const raw = localStorage.getItem(VENTAS_LS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error("Error parseando ventas en localStorage:", error)
      return []
    }
  })
  const { user } = useAuth()
  const userId = Number(user?.id)
  const userIdValido = Number.isFinite(userId)
  const userNombreNorm = normalizeIdentity(user?.nombre)
  const userEmailNorm = normalizeIdentity(user?.email)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [modalConfirmar, setModalConfirmar] = useState(false)
  const [accionPendiente, setAccionPendiente] = useState(null)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("")
  const [modalRegistrarModelo, setModalRegistrarModelo] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [formCrear, setFormCrear] = useState(FORM_EMPTY)

  const persistEntradas = (list = []) => {
    localStorage.setItem(ENTRADAS_LS_KEY, JSON.stringify(list))
    window.dispatchEvent(new Event("entradas-updated"))
  }

  const persistVentas = (list = []) => {
    localStorage.setItem(VENTAS_LS_KEY, JSON.stringify(list))
    window.dispatchEvent(new Event("ventas-pos-updated"))
  }

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([getCategorias(), getProductos()])
        setCategorias(Array.isArray(catRes.data) ? catRes.data : [])
        setProductos(Array.isArray(prodRes.data) ? prodRes.data : [])
      } catch (error) {
        console.error("Error cargando datos:", error)
      }
    }

    cargarDatos()
  }, [])

  useEffect(() => {
    localStorage.setItem(ENTRADAS_LS_KEY, JSON.stringify(entradas))
  }, [entradas])

  useEffect(() => {
    localStorage.setItem(VENTAS_LS_KEY, JSON.stringify(ventas))
  }, [ventas])

  useEffect(() => {
    const recargarMovimientos = () => {
      try {
        const guardado = localStorage.getItem(ENTRADAS_LS_KEY)
        const parsed = guardado ? JSON.parse(guardado) : []
        const { normalized, changed } = normalizeEntradasStockList(parsed)
        if (changed) {
          localStorage.setItem(ENTRADAS_LS_KEY, JSON.stringify(normalized))
        }
        setEntradas(normalized)

        const rawVentas = localStorage.getItem(VENTAS_LS_KEY)
        const parsedVentas = rawVentas ? JSON.parse(rawVentas) : []
        setVentas(Array.isArray(parsedVentas) ? parsedVentas : [])
      } catch (error) {
        console.error("Error recargando movimientos en localStorage:", error)
      }
    }

    window.addEventListener("storage", recargarMovimientos)
    window.addEventListener("focus", recargarMovimientos)
    window.addEventListener("entradas-updated", recargarMovimientos)
    window.addEventListener("ventas-pos-updated", recargarMovimientos)

    return () => {
      window.removeEventListener("storage", recargarMovimientos)
      window.removeEventListener("focus", recargarMovimientos)
      window.removeEventListener("entradas-updated", recargarMovimientos)
      window.removeEventListener("ventas-pos-updated", recargarMovimientos)
    }
  }, [])

  const obtenerFechaRegistro = (item) => {
    if (!item) return null
    return item.fecha_creacion || item.created_at || item.fechaCreacion || null
  }

  const parseFecha = (fecha) => {
    if (!fecha) return null

    if (fecha instanceof Date) {
      return Number.isNaN(fecha.getTime()) ? null : fecha
    }

    if (typeof fecha === "number") {
      const dateFromNumber = new Date(fecha)
      return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber
    }

    const txt = String(fecha).trim()
    if (!txt) return null

    const direct = new Date(txt)
    if (!Number.isNaN(direct.getTime())) return direct

    const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
    if (match) {
      const [, dd, mm, yyyy, hh = "0", min = "0", ss = "0"] = match
      const date = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        Number(hh),
        Number(min),
        Number(ss)
      )
      return Number.isNaN(date.getTime()) ? null : date
    }

    return null
  }

  const getRangoSemanaActual = () => {
    const now = new Date()
    const inicio = new Date(now)
    inicio.setDate(now.getDate() - now.getDay())
    inicio.setHours(0, 0, 0, 0)

    const fin = new Date(inicio)
    fin.setDate(inicio.getDate() + 7)
    return { inicio, fin }
  }

  const esHoy = (fecha) => {
    const hoy = new Date()
    const f = parseFecha(fecha)
    if (!f) return false
    return (
      f.getDate() === hoy.getDate() &&
      f.getMonth() === hoy.getMonth() &&
      f.getFullYear() === hoy.getFullYear()
    )
  }

  const estaEnEstaSemana = (fecha) => {
    const f = parseFecha(fecha)
    if (!f) return false
    const { inicio, fin } = getRangoSemanaActual()
    return f >= inicio && f < fin
  }

  const estaEnEsteMes = (fecha) => {
    const ahora = new Date()
    const f = parseFecha(fecha)
    if (!f) return false
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()
  }

  const parseVentaFecha = (venta) => {
    const fechaBase = venta?.fecha || (venta?.created_at ? String(venta.created_at).slice(0, 10) : null)
    const horaBase = venta?.hora || (venta?.created_at
      ? new Date(venta.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
      : "00:00")

    const compuesta = fechaBase
      ? `${fechaBase}T${horaBase}:00`
      : (venta?.created_at || null)

    return parseFecha(compuesta)
  }

  const pedirConfirmacion = (accion, periodo) => {
    setAccionPendiente(() => accion)
    setPeriodoSeleccionado(periodo)
    setModalConfirmar(true)
  }

  const confirmarEliminar = () => {
    if (accionPendiente) accionPendiente()
    setModalConfirmar(false)
    setModalEliminar(false)
    setAccionPendiente(null)
    setPeriodoSeleccionado("")
  }

  const cancelarConfirmacion = () => {
    setModalConfirmar(false)
    setAccionPendiente(null)
    setPeriodoSeleccionado("")
  }

  const mostrarUndoMovimientos = ({ prevEntradas, prevVentas, periodo }) => {
    const restore = () => {
      setEntradas(prevEntradas)
      setVentas(prevVentas)
      persistEntradas(prevEntradas)
      persistVentas(prevVentas)
      toast.success(`Movimientos de ${periodo} restaurados.`)
    }

    toast.info(
      ({ closeToast }) => (
        <div className="undo-toast-row">
          <span className="undo-toast-text">Movimientos de {periodo} eliminados.</span>
          <button
            type="button"
            onClick={() => {
              restore()
              closeToast?.()
            }}
            className="undo-toast-btn"
          >
            Deshacer
          </button>
        </div>
      ),
      { autoClose: 3000 }
    )
  }

  const perteneceAlUsuarioActual = (registradoPor, registradoPorId) => {
    const idRegistro = Number(registradoPorId)
    if (userIdValido && Number.isFinite(idRegistro) && idRegistro === userId) {
      return true
    }

    const registradoPorNorm = normalizeIdentity(registradoPor)
    if (!registradoPorNorm) return false
    return registradoPorNorm === userNombreNorm || registradoPorNorm === userEmailNorm
  }

  const entradaEsDelUsuario = (entrada) =>
    perteneceAlUsuarioActual(entrada?.registrado_por, entrada?.registrado_por_id)

  const ventaEsDelUsuario = (venta) =>
    perteneceAlUsuarioActual(venta?.registrado_por, venta?.registrado_por_id)

  const eliminarEntradasHoy = () => {
    const prevEntradas = [...entradas]
    const prevVentas = [...ventas]

    const nextEntradas = prevEntradas.filter((e) => {
      const fecha = obtenerFechaRegistro(e)
      if (!parseFecha(fecha)) return true
      if (!esHoy(fecha)) return true
      if (user?.role === "empleado" && !entradaEsDelUsuario(e)) return true
      return false
    })

    const nextVentas = prevVentas.filter((venta) => {
      const fechaVenta = parseVentaFecha(venta)
      if (!fechaVenta) return true
      if (!esHoy(fechaVenta)) return true
      if (user?.role === "empleado" && !ventaEsDelUsuario(venta)) return true
      return false
    })

    setEntradas(nextEntradas)
    setVentas(nextVentas)
    persistEntradas(nextEntradas)
    persistVentas(nextVentas)
    mostrarUndoMovimientos({ prevEntradas, prevVentas, periodo: "hoy" })
  }

  const eliminarEntradasSemana = () => {
    const prevEntradas = [...entradas]
    const prevVentas = [...ventas]

    const nextEntradas = prevEntradas.filter((e) => {
      const fecha = obtenerFechaRegistro(e)
      if (!parseFecha(fecha)) return true
      if (!estaEnEstaSemana(fecha)) return true
      if (user?.role === "empleado" && !entradaEsDelUsuario(e)) return true
      return false
    })

    const nextVentas = prevVentas.filter((venta) => {
      const fechaVenta = parseVentaFecha(venta)
      if (!fechaVenta) return true
      if (!estaEnEstaSemana(fechaVenta)) return true
      if (user?.role === "empleado" && !ventaEsDelUsuario(venta)) return true
      return false
    })

    setEntradas(nextEntradas)
    setVentas(nextVentas)
    persistEntradas(nextEntradas)
    persistVentas(nextVentas)
    mostrarUndoMovimientos({ prevEntradas, prevVentas, periodo: "esta semana" })
  }

  const eliminarEntradasMes = () => {
    const prevEntradas = [...entradas]
    const prevVentas = [...ventas]

    const nextEntradas = prevEntradas.filter((e) => {
      const fecha = obtenerFechaRegistro(e)
      if (!parseFecha(fecha)) return true
      if (!estaEnEsteMes(fecha)) return true
      if (user?.role === "empleado" && !entradaEsDelUsuario(e)) return true
      return false
    })

    const nextVentas = prevVentas.filter((venta) => {
      const fechaVenta = parseVentaFecha(venta)
      if (!fechaVenta) return true
      if (!estaEnEsteMes(fechaVenta)) return true
      if (user?.role === "empleado" && !ventaEsDelUsuario(venta)) return true
      return false
    })

    setEntradas(nextEntradas)
    setVentas(nextVentas)
    persistEntradas(nextEntradas)
    persistVentas(nextVentas)
    mostrarUndoMovimientos({ prevEntradas, prevVentas, periodo: "este mes" })
  }

  const getMovimientoDelta = (item) => {
    if (Number.isFinite(Number(item?.movimiento_delta))) {
      return Math.round(Number(item.movimiento_delta))
    }

    const antesRaw = Number(item?.stock_anterior)
    const despuesRaw = Number(item?.stock_nuevo ?? item?.stock)
    const antes = Number.isFinite(antesRaw) ? Math.max(0, Math.round(antesRaw)) : null
    const despues = Number.isFinite(despuesRaw) ? Math.max(0, Math.round(despuesRaw)) : null

    if (antes != null && despues != null) {
      return despues - antes
    }

    const fallback = Number(item?.cantidad)
    if (Number.isFinite(fallback)) return Math.round(fallback)
    return null
  }

  const baseDatosEntradas = useMemo(() => {
    const entradasNormalizadas = (Array.isArray(entradas) ? entradas : []).map((item) => {
      const antes = Number(item?.stock_anterior)
      const despues = Number(item?.stock_nuevo ?? item?.stock)
      const delta = Number.isFinite(antes) && Number.isFinite(despues)
        ? Math.round(despues) - Math.round(antes)
        : Math.round(Number(item?.cantidad) || 0)

      return {
        ...item,
        movimiento_delta: delta,
        tipo_movimiento: delta >= 0 ? "entrada" : "salida",
        fecha_creacion: item?.fecha_creacion || item?.created_at || item?.fechaCreacion || null,
        modelo: item?.modelo || item?.nombre || "N/A",
      }
    })

    const salidasNormalizadas = (Array.isArray(ventas) ? ventas : []).flatMap((venta) => {
      const fechaVenta = parseVentaFecha(venta)
      const fechaIso = fechaVenta ? fechaVenta.toISOString() : (venta?.created_at || null)
      const detalle = Array.isArray(venta?.detalle) ? venta.detalle : []

      return detalle.map((item, idx) => {
        const antes = Number(item?.stock_anterior)
        const despues = Number(item?.stock_nuevo)
        const delta = Number.isFinite(antes) && Number.isFinite(despues)
          ? Math.round(despues) - Math.round(antes)
          : -Math.abs(Math.round(Number(item?.cantidad) || 0))

        return {
          registroId: `${venta?.id || "venta"}-${idx}`,
          id_producto: item?.id_producto,
          modelo: item?.nombre || item?.modelo || "N/A",
          talla: item?.talla || "N/A",
          color: item?.color || "N/A",
          stock_anterior: Number.isFinite(antes) ? Math.max(0, Math.round(antes)) : null,
          stock_nuevo: Number.isFinite(despues) ? Math.max(0, Math.round(despues)) : null,
          cantidad: Math.abs(Math.round(Number(item?.cantidad) || 0)),
          precio: Number(item?.precio) || 0,
          registrado_por: venta?.registrado_por || item?.registrado_por || "Empleado",
          registrado_por_id: venta?.registrado_por_id ?? item?.registrado_por_id ?? null,
          fecha_creacion: fechaIso,
          movimiento_delta: delta,
          tipo_movimiento: "salida",
        }
      })
    })

    const movimientosCombinados = [...entradasNormalizadas, ...salidasNormalizadas]
    const movimientosFiltrados = user?.role === "empleado"
      ? movimientosCombinados.filter((item) => perteneceAlUsuarioActual(item?.registrado_por, item?.registrado_por_id))
      : movimientosCombinados

    return movimientosFiltrados
      .sort((a, b) => {
        const fa = parseFecha(a?.fecha_creacion || a?.created_at || a?.fechaCreacion)
        const fb = parseFecha(b?.fecha_creacion || b?.created_at || b?.fechaCreacion)
        const ta = fa ? fa.getTime() : 0
        const tb = fb ? fb.getTime() : 0
        return tb - ta
      })
  }, [entradas, ventas, user?.role, userIdValido, userId, userNombreNorm, userEmailNorm])

  const entradasHoy = baseDatosEntradas.filter((p) => esHoy(obtenerFechaRegistro(p))).length
  const entradasSemana = baseDatosEntradas.filter((p) => estaEnEstaSemana(obtenerFechaRegistro(p))).length
  const entradasMes = baseDatosEntradas.filter((p) => estaEnEsteMes(obtenerFechaRegistro(p))).length

  useEffect(() => {
    const resumen = {
      hoy: entradasHoy,
      semana: entradasSemana,
      mes: entradasMes,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(ENTRADAS_RESUMEN_LS_KEY, JSON.stringify(resumen))
  }, [entradasHoy, entradasSemana, entradasMes])

  const formatFecha = (fecha) => {
    if (!fecha) return "—"
    const parsed = parseFecha(fecha)
    if (!parsed) return "—"
    return parsed.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const formatCosto = (precio, cantidad) => {
    if (!precio) return "—"
    const total = Number(precio) * Number(cantidad || 1)
    return `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  }

  const getStockAntes = (item) => {
    const raw = item?.stock_anterior
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null
  }

  const getStockDespues = (item) => {
    const candidatos = [item?.stock_nuevo, item?.stock, item?.cantidad]
    for (const valor of candidatos) {
      const parsed = Number(valor)
      if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed))
    }
    return null
  }

  const getEntrada = (item) => {
    const delta = getMovimientoDelta(item)
    if (delta == null) return null
    if (delta <= 0) return null
    return delta
  }

  const getTipoMovimiento = (item) => {
    const delta = getMovimientoDelta(item)
    if (delta == null) return "desconocido"
    return delta >= 0 ? "entrada" : "salida"
  }

  const validarFormulario = (form) => {
    const camposRequeridos = {
      modelo: "Modelo",
      id_categoria: "Categoría",
      precio: "Precio",
      tallas: "Tallas",
      colores: "Color",
    }

    for (const [key, label] of Object.entries(camposRequeridos)) {
      if (!String(form[key] ?? "").trim()) {
        toast.warn(`El campo "${label}" no puede estar vacío.`)
        return false
      }
    }

    if (!modeloEsValido(form.modelo)) {
      toast.warn("El modelo no puede ser solo guiones o símbolos.")
      return false
    }

    const tallasValidas = parseTallas(form.tallas).filter((talla) => normalizeText(talla) !== "sin talla")
    if (!tallasValidas.length) {
      toast.warn("La talla no puede ser solo guiones o símbolos.")
      return false
    }

    const coloresValidos = parseColores(form.colores)
    if (!coloresValidos.length) {
      toast.warn("El color no puede ser solo guiones o símbolos.")
      return false
    }

    return true
  }

  const modeloDuplicadoCrear = useMemo(() => {
    const modelo = normalizeText(formCrear.modelo)
    const categoria = normalizeCategoryId(formCrear.id_categoria)
    if (!modelo || categoria === null) return false
    return productos.some(
      (p) => normalizeText(p?.modelo) === modelo && normalizeCategoryId(p?.id_categoria) === categoria
    )
  }, [productos, formCrear.modelo, formCrear.id_categoria])

  // Producto existente con exact match de modelo + categoría (para modo agregar stock)
  const productoExistente = useMemo(() => {
    const objetivo = normalizeText(formCrear.modelo)
    const catId = normalizeCategoryId(formCrear.id_categoria)
    if (!objetivo || catId === null) return null
    const matches = productos.filter(
      (p) => normalizeText(p?.modelo) === objetivo && normalizeCategoryId(p?.id_categoria) === catId
    )
    return matches.length === 1 ? matches[0] : null
  }, [productos, formCrear.modelo, formCrear.id_categoria])

  const modoAgregarStock = productoExistente !== null

  const handleRegistrarModelo = async () => {
    if (modeloDuplicadoCrear && !modoAgregarStock) {
      toast.warn("Ya existe un modelo con ese nombre en esta categoría.")
      return
    }
    if (!validarFormulario(formCrear)) return

    try {
      const pairs = buildVariantPairs(parseTallas(formCrear.tallas), parseColores(formCrear.colores))
      if (!pairs.length) {
        toast.warn("Debes seleccionar al menos una combinación de talla y color")
        return
      }

      const stockVariantes = normalizeVariantStocks(pairs, formCrear.stock_variantes)

      if (modoAgregarStock) {
        // ── Modo: agregar stock a un producto existente ──
        const idProducto = productoExistente.id_producto
        const existingVariantMap = readMap(VARIANT_STOCK_MAP_KEY)[idProducto] || {}

        // Sumar las cantidades nuevas al stock actual por variante
        const mergedVariantMap = { ...existingVariantMap }
        pairs.forEach((pair) => {
          const added = Number(stockVariantes[pair.key] || 0)
          if (added > 0) {
            mergedVariantMap[pair.key] = (Number(existingVariantMap[pair.key] || 0)) + added
          }
        })

        const totalStock = Object.values(mergedVariantMap).reduce((sum, v) => sum + Number(v || 0), 0)

        await updateProducto(idProducto, {
          modelo: productoExistente.modelo,
          id_categoria: productoExistente.id_categoria,
          stock: totalStock,
          precio: Number(formCrear.precio) || Number(productoExistente.precio) || 0,
          estado: productoExistente.estado || "activo",
          tallas: productoExistente.tallas,
          colores: productoExistente.colores || "",
          cantidad_inicial: productoExistente.cantidad_inicial || 0,
        })

        // Actualizar localStorage
        const variantMap = readMap(VARIANT_STOCK_MAP_KEY)
        variantMap[idProducto] = mergedVariantMap
        localStorage.setItem(VARIANT_STOCK_MAP_KEY, JSON.stringify(variantMap))

        const registradoPor = user?.nombre || user?.email || getSessionUserName()
        const categoriaNombre = categorias.find(
          (cat) => Number(cat.id_categoria) === Number(formCrear.id_categoria)
        )?.nombre_categoria || null

        const entradasNuevas = pairs
          .map((pair) => ({ pair, cantidad: Number(stockVariantes[pair.key] || 0) }))
          .filter((item) => item.cantidad > 0)
          .map((item) =>
            buildEntradaRecord({
              idProducto,
              modelo: productoExistente.modelo,
              idCategoria: productoExistente.id_categoria,
              nombreCategoria: categoriaNombre,
              precio: Number(formCrear.precio) || Number(productoExistente.precio) || 0,
              cantidad: item.cantidad,
              talla: item.pair.talla,
              color: item.pair.color,
              registradoPor,
              registradoPorId: userIdValido ? userId : null,
              stockAnterior: Number(existingVariantMap[item.pair.key] || 0),
              stockNuevo: Number(existingVariantMap[item.pair.key] || 0) + item.cantidad,
            })
          )

        pushEntradasToStorage(entradasNuevas)

        if (entradasNuevas.length) {
          const resultados = await Promise.allSettled(
            entradasNuevas.map((entrada) => registrarMovimientoEntrada(entrada))
          )
          const fallidos = resultados.filter((r) => r.status === "rejected").length
          if (fallidos > 0) {
            toast.warning("Algunas entradas no se reflejaron en reportes en tiempo real.")
          }
        }

        toast.success("Stock agregado con éxito")
      } else {
        // ── Modo: registrar nuevo modelo ──
        const payload = {
          ...formCrear,
          stock: sumVariantStocks(stockVariantes),
          precio: Number(formCrear.precio) || 0,
          stock_variantes: stockVariantes,
        }

        const { data: productoCreado } = await createProducto(payload)
        const registradoPor = user?.nombre || user?.email || getSessionUserName()
        const categoriaNombre = categorias.find(
          (cat) => Number(cat.id_categoria) === Number(payload.id_categoria)
        )?.nombre_categoria || null

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
              registradoPorId: userIdValido ? userId : null,
              stockAnterior: 0,
              stockNuevo: item.cantidad,
            })
          )

        pushEntradasToStorage(entradasNuevas)

        if (entradasNuevas.length) {
          const resultados = await Promise.allSettled(
            entradasNuevas.map((entrada) => registrarMovimientoEntrada(entrada))
          )
          const fallidos = resultados.filter((r) => r.status === "rejected").length
          if (fallidos > 0) {
            toast.warning("Algunas entradas no se reflejaron en reportes en tiempo real.")
          }
        }

        if (productoCreado?.id_producto) {
          const colorMap = readMap(COLOR_MAP_KEY)
          colorMap[productoCreado.id_producto] = parseColores(payload.colores)
          localStorage.setItem(COLOR_MAP_KEY, JSON.stringify(colorMap))

          const variantMap = readMap(VARIANT_STOCK_MAP_KEY)
          variantMap[productoCreado.id_producto] = stockVariantes
          localStorage.setItem(VARIANT_STOCK_MAP_KEY, JSON.stringify(variantMap))
        }

        toast.success("Modelo registrado con éxito")
      }

      setFormCrear(FORM_EMPTY)
      setModalRegistrarModelo(false)
      window.dispatchEvent(new Event("inventario-updated"))
    } catch (error) {
      const msg = error.response?.data?.message || "No se pudo registrar el modelo"
      toast.error(msg)
    }
  }

  return (
    <div className="entradas-page">
      <div className="encabezado">
        <div className="encabezado-texto">
          <h1 className="titulo-pagina">{user?.role === "empleado" ? "Mis movimientos" : "Movimientos de Inventario"}</h1>
          <p className="subtitulo-pagina">Consulta en un solo lugar entradas y salidas de productos.</p>
        </div>
        {user?.role === "empleado" && (
          <button
            type="button"
            className="entradas-primary-btn"
            onClick={() => setModalRegistrarModelo(true)}
          >
            <Plus size={15} />
            Registrar modelo
          </button>
        )}
      </div>

      <div className="tarjetas-resumen">
        <div className="tarjeta">
          <div className="tarjeta-info">
            <span className="tarjeta-titulo">Movimientos Hoy</span>
            <span className="tarjeta-numero">{entradasHoy}</span>
          </div>
          <div className="tarjeta-icono verde"><Box size={18} /></div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-info">
            <span className="tarjeta-titulo">Movimientos Semana</span>
            <span className="tarjeta-numero">{entradasSemana}</span>
          </div>
          <div className="tarjeta-icono azul"><CalendarDays size={18} /></div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-info">
            <span className="tarjeta-titulo">Movimientos Mes</span>
            <span className="tarjeta-numero">{entradasMes}</span>
          </div>
          <div className="tarjeta-icono morado"><BarChart3 size={18} /></div>
        </div>
      </div>

      <div className="card-tabla">
        <div className="card-header">
          <h2 className="card-titulo">Historial de Movimientos</h2>
          <div className="btn-limpiar" onClick={() => setModalEliminar(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th>FECHA / HORA</th>
                <th>MODELO</th>
                <th>TALLA</th>
                <th>COLOR</th>
                <th>STOCK ANTES</th>
                <th>STOCK DESPUES</th>
                <th>MOVIMIENTO</th>
                <th>TIPO</th>
                <th>REGISTRADO POR</th>
                <th>COSTO TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {baseDatosEntradas.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "30px", color: "#aaa" }}>
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : (
                baseDatosEntradas.map((p) => (
                  <tr key={p.registroId || p.id_producto}>
                    <td>{formatFecha(obtenerFechaRegistro(p))}</td>
                    <td className="td-modelo">{p.modelo}</td>
                    <td>{p.talla || "N/A"}</td>
                    <td>{p.color || "N/A"}</td>
                    <td>
                      <span className="badge-cantidad">{getStockAntes(p) ?? "—"}</span>
                    </td>
                    <td>
                      <span className="badge-cantidad">{getStockDespues(p) ?? "—"}</span>
                    </td>
                    <td>
                      {(() => {
                        const delta = getMovimientoDelta(p)
                        if (delta == null) return "—"
                        const qty = Math.abs(delta)
                        const sign = delta >= 0 ? "+" : "-"
                        return (
                          <span className={`badge-cantidad ${delta < 0 ? "badge-cantidad-salida" : ""}`}>
                            {sign}{qty}
                          </span>
                        )
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const tipo = getTipoMovimiento(p)
                        const label = tipo === "entrada" ? "Entrada" : (tipo === "salida" ? "Salida" : "N/A")
                        return (
                          <span className={`badge-tipo ${tipo === "entrada" ? "badge-tipo-entrada" : (tipo === "salida" ? "badge-tipo-salida" : "")}`}>
                            {label}
                          </span>
                        )
                      })()}
                    </td>
                    <td>
                      <div className="celda-usuario">
                        <div className="avatar-mini"><User size={14} /></div>
                        <span>{p.registrado_por || user?.nombre || user?.email || "—"}</span>
                      </div>
                    </td>
                    <td className="td-costo">
                      {formatCosto(
                        p.precio,
                        Math.abs((getMovimientoDelta(p) ?? Number(p.cantidad) ?? 0))
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal selección de período */}
      {modalEliminar && createPortal(
        <div className="entradas-modal-overlay" onClick={() => setModalEliminar(false)}>
          <div className="entradas-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="entradas-modal-header">
              <h3>Limpiar Movimientos</h3>
              <button className="entradas-modal-close" onClick={() => setModalEliminar(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="entradas-modal-body">
              <p>Selecciona el período para eliminar los movimientos:</p>
              <div className="entradas-modal-opciones">
                <button className="entradas-modal-btn" onClick={() => pedirConfirmacion(eliminarEntradasHoy, "hoy")}>
                  Eliminar Movimientos de Hoy
                </button>
                <button className="entradas-modal-btn" onClick={() => pedirConfirmacion(eliminarEntradasSemana, "esta semana")}>
                  Eliminar Movimientos de Esta Semana
                </button>
                <button className="entradas-modal-btn" onClick={() => pedirConfirmacion(eliminarEntradasMes, "este mes")}>
                  Eliminar Movimientos de Este Mes
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de confirmación */}
      {modalConfirmar && createPortal(
        <div className="entradas-confirm-overlay" onClick={cancelarConfirmacion}>
          <div className="entradas-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="entradas-confirm-icono"><TriangleAlert size={18} /></div>
            <h3 className="entradas-confirm-titulo">¿Estás seguro?</h3>
            <p className="entradas-confirm-texto">
              Se eliminarán todos los movimientos de <strong>{periodoSeleccionado}</strong>.
            </p>
            <div className="entradas-confirm-acciones">
              <button className="entradas-confirm-cancelar" onClick={cancelarConfirmacion}>
                Cancelar
              </button>
              <button className="entradas-confirm-confirmar" onClick={confirmarEliminar}>
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modalRegistrarModelo && createPortal(
        <div className="modal-overlay" onClick={() => setModalRegistrarModelo(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modoAgregarStock ? "Agregar Stock" : "Registrar Modelo"}</h2>
              <button className="modal-close" onClick={() => setModalRegistrarModelo(false)}>x</button>
            </div>
            <div className="modal-body">
              <FormularioRegistroModelo
                form={formCrear}
                setForm={setFormCrear}
                categorias={categorias}
                productos={productos}
                modeloDuplicado={modeloDuplicadoCrear && !modoAgregarStock}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalRegistrarModelo(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleRegistrarModelo} disabled={modeloDuplicadoCrear && !modoAgregarStock}>
                {modoAgregarStock ? "Agregar stock" : "Registrar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const FormularioRegistroModelo = ({ form, setForm, categorias, productos = [], modeloDuplicado = false }) => {
  const [nuevaTalla, setNuevaTalla] = useState("")
  const [nuevoColor, setNuevoColor] = useState("")
  const tallasSeleccionadas = useMemo(
    () => parseTallas(form.tallas).filter((talla) => normalizeText(talla) !== "sin talla"),
    [form.tallas]
  )
  const coloresSeleccionados = useMemo(() => parseColores(form.colores), [form.colores])
  const combinaciones = useMemo(
    () => buildVariantPairs(tallasSeleccionadas, coloresSeleccionados),
    [tallasSeleccionadas, coloresSeleccionados]
  )
  const stockVariantes = useMemo(
    () => normalizeVariantStocks(combinaciones, form.stock_variantes),
    [combinaciones, form.stock_variantes]
  )
  const stockTotalCalculado = useMemo(() => sumVariantStocks(stockVariantes), [stockVariantes])
  const modelosSugeridos = useMemo(() => {
    const map = new Map()
    ;(Array.isArray(productos) ? productos : []).forEach((p) => {
      const modelo = String(p?.modelo || "").trim()
      if (!modelo) return
      const key = normalizeText(modelo)
      if (!map.has(key)) map.set(key, modelo)
    })
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b))
  }, [productos])

  const getCoincidenciaExacta = (modeloRaw = "") => {
    const objetivo = normalizeText(modeloRaw)
    if (!objetivo) return null

    const matches = (Array.isArray(productos) ? productos : []).filter(
      (p) => normalizeText(p?.modelo) === objetivo
    )

    if (matches.length !== 1) return null
    return matches[0]
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === "modelo") {
      const match = getCoincidenciaExacta(value)
      if (!match) {
        setForm((prev) => ({ ...prev, [name]: value }))
        return
      }

      setForm((prev) => ({
        ...prev,
        modelo: value,
        id_categoria: match?.id_categoria ?? "",
        precio: Number.isFinite(Number(match?.precio)) ? String(match.precio) : prev.precio,
        tallas: String(match?.tallas || prev.tallas || ""),
        colores: String(match?.colores || prev.colores || ""),
        estado: String(match?.estado || prev.estado || "activo"),
        stock_variantes: {},
      }))
      return
    }

    if (name === "precio") {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setForm((prev) => ({ ...prev, [name]: value }))
      }
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const quitarTalla = (talla) => {
    setForm((prev) => ({
      ...prev,
      tallas: toCsv(parseTallas(prev.tallas).filter((item) => normalizeText(item) !== normalizeText(talla) && normalizeText(item) !== "sin talla")),
    }))
  }

  const quitarColor = (color) => {
    setForm((prev) => ({
      ...prev,
      colores: toCsv(parseColores(prev.colores).filter((item) => normalizeText(item) !== normalizeText(color))),
    }))
  }

  const agregarColorPersonalizado = () => {
    const colorFormateado = toTitleCase(nuevoColor)

    if (!colorEsValido(colorFormateado)) {
      toast.warn("El color no puede ser solo guiones o símbolos.")
      return
    }

    if (includesIgnoreCase(coloresSeleccionados, colorFormateado)) {
      toast.info("Ese color ya esta seleccionado.")
      setNuevoColor("")
      return
    }

    setForm((prev) => ({
      ...prev,
      colores: toCsv([...parseColores(prev.colores), colorFormateado]),
    }))
    setNuevoColor("")
  }

  const agregarTallaPersonalizada = () => {
    const tallaFormateada = normalizeCustomValue(nuevaTalla)

    if (!tallaEsValida(tallaFormateada)) {
      toast.warn("La talla no puede ser solo guiones o símbolos.")
      return
    }

    if (includesIgnoreCase(tallasSeleccionadas, tallaFormateada)) {
      toast.info("Esa talla ya esta seleccionada.")
      setNuevaTalla("")
      return
    }

    setForm((prev) => ({
      ...prev,
      tallas: toCsv([
        ...parseTallas(prev.tallas).filter((talla) => normalizeText(talla) !== "sin talla"),
        tallaFormateada,
      ]),
    }))
    setNuevaTalla("")
  }

  const setStockVariante = (key, value) => {
    if (value !== "" && !/^\d*$/.test(value)) return
    setForm((prev) => ({
      ...prev,
      stock_variantes: {
        ...(prev.stock_variantes || {}),
        [key]: value,
      },
    }))
  }

  const handleStockFocus = (key) => {
    const raw = form.stock_variantes?.[key]
    const current = raw === "" ? "" : Number(raw ?? stockVariantes[key] ?? 0)
    if (current !== 0) return

    setForm((prev) => ({
      ...prev,
      stock_variantes: {
        ...(prev.stock_variantes || {}),
        [key]: "",
      },
    }))
  }

  const handleKeyDown = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault()
    }
  }

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
          list="inventario-modelos-empleado"
          placeholder="Ej. 1100"
          autoFocus
        />
        <datalist id="inventario-modelos-empleado">
          {modelosSugeridos.map((modelo) => (
            <option key={modelo} value={modelo} />
          ))}
        </datalist>
        <small style={{ color: '#667085', display: 'block', marginTop: 6 }}>
          Sugerencias basadas en el inventario actual.
        </small>
        {modeloDuplicado && (
          <small style={{ color: '#b42318', display: 'block', marginTop: 6 }}>
            Ya existe un modelo con ese nombre en esta categoría.
          </small>
        )}
      </div>

      <div className="form-group span-2">
        <label>Categoría *</label>
        <select
          name="id_categoria"
          value={form.id_categoria}
          onChange={handleChange}
        >
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
              if (e.key === "-") {
                e.preventDefault()
                return
              }
              if (e.key === "Enter") {
                e.preventDefault()
                agregarTallaPersonalizada()
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
              if (e.key === "Enter") {
                e.preventDefault()
                agregarColorPersonalizado()
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
                  value={form.stock_variantes?.[pair.key] === "" ? "" : (stockVariantes[pair.key] ?? 0)}
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
  )
}

export default Entradas
