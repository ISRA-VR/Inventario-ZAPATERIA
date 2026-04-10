import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PackageMinus, CalendarDays, BarChart3, User, TriangleAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/entradas.css";

const VENTAS_LS_KEY = "ventas_punto_venta";
const SALIDAS_RESUMEN_LS_KEY = "salidas_resumen";

const toSafeIntOrNull = (value) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	return Math.max(0, Math.round(parsed));
};

const normalizeDetalleStock = (detalle = []) => {
	let changed = false;
	const normalized = (Array.isArray(detalle) ? detalle : []).map((item) => {
		const cantidad = Math.max(0, Math.round(Number(item?.cantidad) || 0));
		const stockAnterior = toSafeIntOrNull(item?.stock_anterior);
		const stockNuevo = toSafeIntOrNull(item?.stock_nuevo);

		let nextAnterior = stockAnterior;
		let nextNuevo = stockNuevo;

		if (nextAnterior == null && nextNuevo == null) {
			nextAnterior = cantidad;
			nextNuevo = 0;
			changed = true;
		} else if (nextAnterior == null) {
			nextAnterior = Math.max(0, nextNuevo + cantidad);
			changed = true;
		} else if (nextNuevo == null) {
			nextNuevo = Math.max(0, nextAnterior - cantidad);
			changed = true;
		}

		return {
			...item,
			stock_anterior: nextAnterior,
			stock_nuevo: nextNuevo,
		};
	});

	return { normalized, changed };
};

const normalizeVentasStock = (ventas = []) => {
	let changed = false;
	const normalizedVentas = (Array.isArray(ventas) ? ventas : []).map((venta) => {
		const { normalized, changed: changedDetalle } = normalizeDetalleStock(venta?.detalle);
		if (changedDetalle) changed = true;

		return {
			...venta,
			detalle: normalized,
		};
	});

	return { normalizedVentas, changed };
};

const SalidasPage = () => {
	const { user } = useAuth();
	const [ventas, setVentas] = useState(() => {
		try {
			const guardado = localStorage.getItem(VENTAS_LS_KEY);
			const parsed = guardado ? JSON.parse(guardado) : [];
			const { normalizedVentas, changed } = normalizeVentasStock(parsed);
			if (changed) {
				localStorage.setItem(VENTAS_LS_KEY, JSON.stringify(normalizedVentas));
			}
			return normalizedVentas;
		} catch (error) {
			console.error("Error parseando salidas en localStorage:", error);
			return [];
		}
	});

	const [modalEliminar, setModalEliminar] = useState(false);
	const [modalConfirmar, setModalConfirmar] = useState(false);
	const [accionPendiente, setAccionPendiente] = useState(null);
	const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");

	const persistVentas = (list = []) => {
		localStorage.setItem(VENTAS_LS_KEY, JSON.stringify(list));
		window.dispatchEvent(new Event("ventas-pos-updated"));
	};

	useEffect(() => {
		localStorage.setItem(VENTAS_LS_KEY, JSON.stringify(ventas));
	}, [ventas]);

	useEffect(() => {
		const recargarVentas = () => {
			try {
				const guardado = localStorage.getItem(VENTAS_LS_KEY);
				const parsed = guardado ? JSON.parse(guardado) : [];
				const { normalizedVentas, changed } = normalizeVentasStock(parsed);
				if (changed) {
					localStorage.setItem(VENTAS_LS_KEY, JSON.stringify(normalizedVentas));
				}
				setVentas(normalizedVentas);
			} catch (error) {
				console.error("Error recargando salidas en localStorage:", error);
			}
		};

		window.addEventListener("storage", recargarVentas);
		window.addEventListener("focus", recargarVentas);
		window.addEventListener("ventas-pos-updated", recargarVentas);

		return () => {
			window.removeEventListener("storage", recargarVentas);
			window.removeEventListener("focus", recargarVentas);
			window.removeEventListener("ventas-pos-updated", recargarVentas);
		};
	}, []);

	const parseFecha = (fecha) => {
		if (!fecha) return null;

		if (fecha instanceof Date) {
			return Number.isNaN(fecha.getTime()) ? null : fecha;
		}

		if (typeof fecha === "number") {
			const dateFromNumber = new Date(fecha);
			return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
		}

		const txt = String(fecha).trim();
		if (!txt) return null;

		const direct = new Date(txt);
		if (!Number.isNaN(direct.getTime())) return direct;

		const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
		if (match) {
			const [, dd, mm, yyyy, hh = "0", min = "0", ss = "0"] = match;
			const date = new Date(
				Number(yyyy),
				Number(mm) - 1,
				Number(dd),
				Number(hh),
				Number(min),
				Number(ss)
			);
			return Number.isNaN(date.getTime()) ? null : date;
		}

		return null;
	};

	const getFechaVenta = (venta) => {
		const fechaBase = venta?.fecha || (venta?.created_at ? String(venta.created_at).slice(0, 10) : null);
		const horaBase = venta?.hora || (venta?.created_at
			? new Date(venta.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
			: "");
		const fechaCompuesta = fechaBase
			? `${fechaBase}${horaBase ? `T${horaBase}:00` : "T00:00:00"}`
			: venta?.created_at;

		return parseFecha(fechaCompuesta);
	};

	const getRangoSemanaActual = () => {
		const now = new Date();
		const inicio = new Date(now);
		inicio.setDate(now.getDate() - now.getDay());
		inicio.setHours(0, 0, 0, 0);

		const fin = new Date(inicio);
		fin.setDate(inicio.getDate() + 7);
		return { inicio, fin };
	};

	const esHoy = (fecha) => {
		const hoy = new Date();
		const f = parseFecha(fecha);
		if (!f) return false;
		return (
			f.getDate() === hoy.getDate() &&
			f.getMonth() === hoy.getMonth() &&
			f.getFullYear() === hoy.getFullYear()
		);
	};

	const estaEnEstaSemana = (fecha) => {
		const f = parseFecha(fecha);
		if (!f) return false;
		const { inicio, fin } = getRangoSemanaActual();
		return f >= inicio && f < fin;
	};

	const estaEnEsteMes = (fecha) => {
		const ahora = new Date();
		const f = parseFecha(fecha);
		if (!f) return false;
		return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
	};

	const salidasDetalle = useMemo(() => {
		return ventas.flatMap((venta) => {
			const fechaVenta = getFechaVenta(venta);

			return (venta.detalle || []).map((item, idx) => ({
				id: `${venta.id || "venta"}-${idx}`,
				fecha_creacion: fechaVenta,
				modelo: item.nombre,
				talla: item.talla || "N/A",
				color: item.color || "N/A",
				cantidad: Number(item.cantidad) || 0,
				stock_anterior: Number(item.stock_anterior),
				stock_nuevo: Number(item.stock_nuevo),
				precio: Number(item.precio) || 0,
				registrado_por: venta.registrado_por,
			}));
		});
	}, [ventas]);

	const getStockAntes = (item) => {
		const parsed = Number(item?.stock_anterior);
		return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
	};

	const getStockDespues = (item) => {
		const parsed = Number(item?.stock_nuevo);
		if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));

		const antes = getStockAntes(item);
		if (antes == null) return null;
		return Math.max(0, antes - (Number(item?.cantidad) || 0));
	};

	const getSalida = (item) => {
		const antes = getStockAntes(item);
		const despues = getStockDespues(item);
		if (antes != null && despues != null) {
			return Math.abs(despues - antes);
		}

		const fallback = Number(item?.cantidad);
		if (Number.isFinite(fallback)) return Math.abs(Math.round(fallback));
		return 0;
	};

	const salidasHoy = salidasDetalle
		.filter((s) => esHoy(s.fecha_creacion))
		.reduce((acc, s) => acc + getSalida(s), 0);
	const salidasSemana = salidasDetalle
		.filter((s) => estaEnEstaSemana(s.fecha_creacion))
		.reduce((acc, s) => acc + getSalida(s), 0);
	const salidasMes = salidasDetalle
		.filter((s) => estaEnEsteMes(s.fecha_creacion))
		.reduce((acc, s) => acc + getSalida(s), 0);

	useEffect(() => {
		const resumen = {
			hoy: salidasHoy,
			semana: salidasSemana,
			mes: salidasMes,
			updatedAt: new Date().toISOString(),
		};
		localStorage.setItem(SALIDAS_RESUMEN_LS_KEY, JSON.stringify(resumen));
	}, [salidasHoy, salidasSemana, salidasMes]);

	const formatFecha = (fecha) => {
		if (!fecha) return "—";
		const parsed = parseFecha(fecha);
		if (!parsed) return "—";
		return parsed.toLocaleString("es-MX", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
	};

	const formatCosto = (precio, cantidadSalida) => {
		const total = Number(precio) * Number(cantidadSalida || 0);
		return `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
	};

	const pedirConfirmacion = (accion, periodo) => {
		setAccionPendiente(() => accion);
		setPeriodoSeleccionado(periodo);
		setModalConfirmar(true);
	};

	const confirmarEliminar = () => {
		if (accionPendiente) accionPendiente();
		setModalConfirmar(false);
		setModalEliminar(false);
		setAccionPendiente(null);
		setPeriodoSeleccionado("");
	};

	const cancelarConfirmacion = () => {
		setModalConfirmar(false);
		setAccionPendiente(null);
		setPeriodoSeleccionado("");
	};

	const eliminarPorPeriodo = (validador) => {
		setVentas((prev) => {
			const next = prev.filter((venta) => {
				const fechaVenta = getFechaVenta(venta);
				if (!fechaVenta) return true;
				return !validador(fechaVenta);
			});
			persistVentas(next);
			return next;
		});
	};

	return (
		<div className="entradas-page">
			<div className="encabezado">
				<div className="encabezado-texto">
					<h1 className="titulo-pagina">Salidas de Inventario</h1>
					<p className="subtitulo-pagina">Consulta y gestiona los egresos de productos del inventario</p>
				</div>
			</div>

			<div className="tarjetas-resumen">
				<div className="tarjeta">
					<div className="tarjeta-info">
						<span className="tarjeta-titulo">Salidas Hoy</span>
						<span className="tarjeta-numero">{salidasHoy}</span>
					</div>
					<div className="tarjeta-icono rojo-suave"><PackageMinus size={18} /></div>
				</div>

				<div className="tarjeta">
					<div className="tarjeta-info">
						<span className="tarjeta-titulo">Esta Semana</span>
						<span className="tarjeta-numero">{salidasSemana}</span>
					</div>
					<div className="tarjeta-icono azul"><CalendarDays size={18} /></div>
				</div>

				<div className="tarjeta">
					<div className="tarjeta-info">
						<span className="tarjeta-titulo">Total Mes</span>
						<span className="tarjeta-numero">{salidasMes}</span>
					</div>
					<div className="tarjeta-icono morado"><BarChart3 size={18} /></div>
				</div>
			</div>

			<div className="card-tabla">
				<div className="card-header">
					<h2 className="card-titulo">Historial de Salidas</h2>
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
								<th>SALIDA</th>
								<th>REGISTRADO POR</th>
								<th>IMPORTE</th>
							</tr>
						</thead>
						<tbody>
							{salidasDetalle.length === 0 ? (
								<tr>
									<td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "#aaa" }}>
										No hay salidas registradas
									</td>
								</tr>
							) : (
								salidasDetalle.map((s) => (
									<tr key={s.id}>
										<td>{formatFecha(s.fecha_creacion)}</td>
										<td className="td-modelo">{s.modelo}</td>
										<td>{s.talla}</td>
										<td>{s.color}</td>
										<td>
											<span className="badge-cantidad">{getStockAntes(s) ?? "—"}</span>
										</td>
										<td>
											<span className="badge-cantidad">{getStockDespues(s) ?? "—"}</span>
										</td>
										<td>
											<span className="badge-cantidad badge-cantidad-salida">-{getSalida(s)}</span>
										</td>
										<td>
											<div className="celda-usuario">
												<div className="avatar-mini"><User size={14} /></div>
												<span>{s.registrado_por || user?.nombre || user?.email || "—"}</span>
											</div>
										</td>
										<td className="td-costo">
											{formatCosto(s.precio, getSalida(s))}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{modalEliminar && createPortal(
				<div className="entradas-modal-overlay" onClick={() => setModalEliminar(false)}>
					<div className="entradas-modal-box" onClick={(e) => e.stopPropagation()}>
						<div className="entradas-modal-header">
							<h3>Limpiar Salidas</h3>
							<button className="entradas-modal-close" onClick={() => setModalEliminar(false)}>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
									<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
								</svg>
							</button>
						</div>
						<div className="entradas-modal-body">
							<p>Selecciona el período para eliminar las salidas:</p>
							<div className="entradas-modal-opciones">
								<button className="entradas-modal-btn" onClick={() => pedirConfirmacion(() => eliminarPorPeriodo(esHoy), "hoy")}>
									Eliminar Salidas de Hoy
								</button>
								<button className="entradas-modal-btn" onClick={() => pedirConfirmacion(() => eliminarPorPeriodo(estaEnEstaSemana), "esta semana")}>
									Eliminar Salidas de Esta Semana
								</button>
								<button className="entradas-modal-btn" onClick={() => pedirConfirmacion(() => eliminarPorPeriodo(estaEnEsteMes), "este mes")}>
									Eliminar Salidas de Este Mes
								</button>
							</div>
						</div>
					</div>
				</div>,
				document.body
			)}

			{modalConfirmar && createPortal(
				<div className="entradas-confirm-overlay" onClick={cancelarConfirmacion}>
					<div className="entradas-confirm-box" onClick={(e) => e.stopPropagation()}>
						<div className="entradas-confirm-icono"><TriangleAlert size={18} /></div>
						<h3 className="entradas-confirm-titulo">¿Estás seguro?</h3>
						<p className="entradas-confirm-texto">
							Se eliminarán todas las salidas de <strong>{periodoSeleccionado}</strong>. Esta acción no se puede deshacer.
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
		</div>
	);
};

export default SalidasPage;