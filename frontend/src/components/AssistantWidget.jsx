import { useEffect, useMemo, useState } from 'react';
import { Bot, MessageCircle, SendHorizontal, X } from 'lucide-react';
import { sendAssistantMessage } from '../api/asistente';
import { useAuth } from '../context/AuthContext';
import '../styles/assistant.css';

const ENTRADAS_LS_KEY = 'entradas_inventario';
const VENTAS_LS_KEY = 'ventas_punto_venta';
const LIQUIDACIONES_STORAGE_KEY = 'inventario_liquidaciones_ids';
const LIQUIDACIONES_DISCOUNT_KEY = 'inventario_liquidaciones_descuentos';
const VARIANT_STOCK_MAP_KEY = 'inventario_stock_variantes_map';
const COLOR_MAP_KEY = 'inventario_colores_map';

const parseStorageArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseStorageObject = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const parseDateSafe = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const calcularMetricasCliente = () => {
  const entradas = parseStorageArray(ENTRADAS_LS_KEY);
  const ventas = parseStorageArray(VENTAS_LS_KEY);

  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioManana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioSiguienteMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);

  const entradasHoy = entradas.filter((item) => {
    const fecha = parseDateSafe(item?.fecha_creacion || item?.created_at || item?.fechaCreacion);
    return fecha && fecha >= inicioHoy && fecha < inicioManana;
  }).length;

  const entradasMes = entradas.filter((item) => {
    const fecha = parseDateSafe(item?.fecha_creacion || item?.created_at || item?.fechaCreacion);
    return fecha && fecha >= inicioMes && fecha < inicioSiguienteMes;
  }).length;

  let salidasHoy = 0;
  let salidasMes = 0;
  let ventasHoyMonto = 0;

  ventas.forEach((venta) => {
    const fecha = parseDateSafe(venta?.fecha || venta?.created_at);
    if (!fecha) return;

    const cantidadVenta = Array.isArray(venta?.detalle)
      ? venta.detalle.reduce((acc, d) => acc + (Number(d?.cantidad) || 0), 0)
      : 0;

    if (fecha >= inicioMes && fecha < inicioSiguienteMes) {
      salidasMes += cantidadVenta;
    }

    if (fecha >= inicioHoy && fecha < inicioManana) {
      salidasHoy += cantidadVenta;
      ventasHoyMonto += Number(venta?.total) || 0;
    }
  });

  return { entradasHoy, entradasMes, salidasHoy, salidasMes, ventasHoyMonto };
};

const construirEventosCliente = () => {
  const entradas = parseStorageArray(ENTRADAS_LS_KEY)
    .slice(-500)
    .map((item) => ({
      registroId: item?.registroId,
      id_producto: item?.id_producto,
      modelo: item?.modelo,
      nombre_categoria: item?.nombre_categoria,
      cantidad: item?.cantidad,
      stock: item?.stock,
      precio: item?.precio,
      registrado_por: item?.registrado_por,
      fecha_creacion: item?.fecha_creacion || item?.created_at || item?.fechaCreacion,
    }));

  const ventas = parseStorageArray(VENTAS_LS_KEY)
    .slice(-500)
    .map((venta) => ({
      id: venta?.id,
      fecha: venta?.fecha,
      hora: venta?.hora,
      created_at: venta?.created_at,
      total: venta?.total,
      registrado_por: venta?.registrado_por,
      detalle: Array.isArray(venta?.detalle)
        ? venta.detalle.map((d) => ({
          nombre: d?.nombre,
          cantidad: d?.cantidad,
          precio: d?.precio,
          categoria: d?.categoria,
        }))
        : [],
    }));

  return { entradas, ventas };
};

const construirContextoSistemaCliente = () => {
  const liquidaciones = parseStorageArray(LIQUIDACIONES_STORAGE_KEY)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  const descuentosLiquidacion = parseStorageObject(LIQUIDACIONES_DISCOUNT_KEY);
  const stockVariantes = parseStorageObject(VARIANT_STOCK_MAP_KEY);
  const coloresMap = parseStorageObject(COLOR_MAP_KEY);

  const totalVariantesRegistradas = Object.values(stockVariantes).reduce((acc, item) => {
    if (!item || typeof item !== 'object') return acc;
    return acc + Object.keys(item).length;
  }, 0);

  return {
    liquidaciones,
    descuentosLiquidacion,
    totalLiquidaciones: liquidaciones.length,
    totalVariantesRegistradas,
    totalMapeosColor: Object.keys(coloresMap).length,
    stockVariantesMap: stockVariantes,
    coloresMap,
  };
};

const createBotMessage = (text) => ({
  id: `${Date.now()}-bot-${Math.random().toString(16).slice(2)}`,
  role: 'bot',
  text,
});

const createUserMessage = (text) => ({
  id: `${Date.now()}-usr-${Math.random().toString(16).slice(2)}`,
  role: 'user',
  text,
});

export default function AssistantWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => []);

  if (user?.role !== 'admin') {
    return null;
  }

  useEffect(() => {
    const nombreUsuario = user?.nombre || user?.email;
    if (!nombreUsuario) return;

    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        createBotMessage(`Hola ${nombreUsuario}, soy tu asistente. Puedo ayudarte con inventario, caja, entradas, salidas, categorías, liquidaciones y reportes.`),
      ];
    });
  }, [user]);

  const quickPrompts = useMemo(() => {
    const base = [
      'Resumen del día',
      'Reporte del día',
      'Muéstrame stock bajo',
      'Salidas del mes',
      'Resumen del sistema',
      'Resumen de caja',
      'Liquidaciones activas',
      '¿Qué categoría tiene más stock?',
    ];

    return base;
  }, []);

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg = createUserMessage(text);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const clientMetrics = calcularMetricasCliente();
      const clientEvents = construirEventosCliente();
      const clientSystemSnapshot = construirContextoSistemaCliente();
      const { data } = await sendAssistantMessage({
        question: text,
        clientMetrics,
        clientEvents,
        clientContext: {
          route: window.location.pathname,
          role: user?.role || 'empleado',
          userName: user?.nombre || user?.email || 'Usuario',
          userEmail: user?.email || null,
          systemSnapshot: clientSystemSnapshot,
        },
      });

      const answer = data?.answer || 'No pude generar respuesta en este momento.';
      const suggestionText = Array.isArray(data?.suggestions) && data.suggestions.length
        ? `\n\nSugerencias:\n- ${data.suggestions.join('\n- ')}`
        : '';

      setMessages((prev) => [...prev, createBotMessage(`${answer}${suggestionText}`)]);
    } catch (error) {
      const status = error?.response?.status;
      let detail = error?.response?.data?.message || 'Revisa conexión y sesión.';

      if (status === 401) {
        detail = 'Tu sesión venció o no es válida. Cierra sesión y vuelve a entrar.';
      }

      if (status === 403) {
        detail = 'No tienes permiso para consultar esa información.';
      }

      setMessages((prev) => [...prev, createBotMessage(`No pude responder ahora. ${detail}`)]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  useEffect(() => {
    const onAssistantOpen = () => setOpen(true);
    window.addEventListener('assistant-open', onAssistantOpen);

    return () => {
      window.removeEventListener('assistant-open', onAssistantOpen);
    };
  }, []);

  return (
    <div className="assistant-root">
      {open && (
        <section className="assistant-panel" aria-label="Asistente de inventario">
          <header className="assistant-header">
            <div className="assistant-title-wrap">
              <span className="assistant-badge"><Bot size={14} /></span>
              <div>
                <h3 className="assistant-title">Asistente</h3>
              </div>
            </div>
            <button className="assistant-close" type="button" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </header>

          <div className="assistant-messages">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`assistant-msg ${msg.role === 'user' ? 'assistant-msg-user' : 'assistant-msg-bot'}`}
              >
                {msg.text}
              </article>
            ))}
            {loading && <article className="assistant-msg assistant-msg-bot">Consultando datos...</article>}
          </div>

          <div className="assistant-quick-actions">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                className="assistant-chip"
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="assistant-form" onSubmit={onSubmit}>
            <input
              className="assistant-input"
              placeholder="Escribe tu pregunta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button className="assistant-send" type="submit" disabled={loading || !input.trim()}>
              <SendHorizontal size={16} />
            </button>
          </form>
        </section>
      )}

      <button className="assistant-fab" type="button" onClick={() => setOpen((prev) => !prev)}>
        <MessageCircle size={18} />
        <span>Asistente</span>
      </button>
    </div>
  );
}
