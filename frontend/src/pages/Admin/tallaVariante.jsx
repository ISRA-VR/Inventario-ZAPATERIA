import { useEffect, useState } from 'react';
import { getTallas, updateTalla } from '../../api/productos';
import { toast } from 'react-toastify';
import '../../styles/tallas.css';

const parseTallasValidas = (raw = '') => {
    return String(raw || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !/^-+$/.test(item))
        .filter((item) => /[0-9]/.test(item));
};

const EntradasPage = () => {
    const [tallas, setTallas] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalEditar, setModalEditar] = useState(false);
    const [formEditar, setFormEditar] = useState({ id_producto: '', modelo: '', tallas: '', cantidad_inicial: '' });

    const fetchTallas = async () => {
        try {
            const response = await getTallas();
            const dataArray = Array.isArray(response) ? response : (response?.data || []);
            setTallas(dataArray);
        } catch (error) {
            console.error('Error fetching tallas:', error);
            setTallas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTallas();
    }, []);

    const abrirEditar = (item) => {
        setFormEditar({
            id_producto: item.id_producto,
            modelo: item.modelo,
            tallas: item.tallas || item.talla || '',
            cantidad_inicial: item.cantidad_inicial || 0
        });
        setModalEditar(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'cantidad_inicial') {
            if (value === '' || /^\d*$/.test(value)) {
                setFormEditar(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        if (name === 'tallas') {
            if (value === '' || /^[\d\s,.]*$/.test(value)) {
                setFormEditar(prev => ({ ...prev, [name]: value }));
            }
            return;
        }

        setFormEditar({ ...formEditar, [name]: value });
    };

    const handleKeyDown = (e) => {
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handleActualizar = async (e) => {
        e.preventDefault();
        if (!formEditar.tallas.trim()) {
            toast.warn('El campo de tallas no puede estar vacío.');
            return;
        }

        const tallasValidas = parseTallasValidas(formEditar.tallas);
        if (!tallasValidas.length) {
            toast.warn('La talla no puede ser "-" ni valores inválidos.');
            return;
        }

        const tallasNormalizadas = tallasValidas.join(', ');

        try {
            await updateTalla(formEditar.id_producto, {
                tallas: tallasNormalizadas,
                cantidad_inicial: Number(formEditar.cantidad_inicial)
            });
            toast.success('Tallas actualizadas correctamente.');
            setModalEditar(false);
            fetchTallas();
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar las tallas.');
        }
    };

    return (
        <div className="ep-wrapper">
            <div className="ep-header">
                <div className="ep-header-text">
                    <h1 className="ep-title">Tallas y Variantes</h1>
                    <p className="ep-subtitle">Gestiona las tallas disponibles y su stock inicial por modelo</p>
                </div>
            </div>

            {loading ? (
                <p>Cargando tallas...</p>
            ) : (
                <div className="ep-grid">
                    {tallas && tallas.length > 0 ? (
                        tallas.map((item, index) => (
                            <div
                                className="ep-card"
                                key={item.id_producto || index}
                                style={{ animationDelay: `${index * 0.06}s` }}
                            >
                                <div className="ep-card-top">
                                    <h2 className="ep-card-title">Mod: {item.modelo} | Tallas: {item.tallas || item.talla}</h2>
                                    <div className="ep-card-actions">
                                        <button
                                            className="ep-action-btn ep-action-edit"
                                            title="Actualizar"
                                            onClick={() => abrirEditar(item)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <p className="ep-card-stock">
                                    Stock inicial: <span>{item.cantidad_inicial} unidades</span>
                                </p>
                            </div>
                        ))
                    ) : (
                        <p>No hay tallas disponibles.</p>
                    )}
                </div>
            )}

            {modalEditar && (
                <div className="modal-overlay" onClick={() => setModalEditar(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Editar Tallas - Mod: {formEditar.modelo}</h2>
                            <button className="modal-close" onClick={() => setModalEditar(false)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <form className="form-producto" onSubmit={handleActualizar}>
                                <div className="form-group span-2">
                                    <label>Tallas disponibles *</label>
                                    <input
                                        type="text"
                                        name="tallas"
                                        value={formEditar.tallas}
                                        onChange={handleChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ej: 25, 26, 27.5"
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group span-2">
                                    <label>Cantidad Inicial por Talla *</label>
                                    <input
                                        type="number"
                                        name="cantidad_inicial"
                                        min="0"
                                        step="1"
                                        value={formEditar.cantidad_inicial}
                                        onChange={handleChange}
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setModalEditar(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleActualizar}>
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntradasPage;
