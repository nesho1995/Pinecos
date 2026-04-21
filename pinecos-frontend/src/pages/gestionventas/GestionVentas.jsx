import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { imprimirTicketHtml } from '../../utils/printTicket';

function fechaHoyLocal() {
  return new Date().toISOString().slice(0, 10);
}

function fechaHaceDiasLocal(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function toIsoStart(dateText) {
  if (!dateText) return null;
  return `${dateText}T00:00:00`;
}

function toIsoEnd(dateText) {
  if (!dateText) return null;
  return `${dateText}T23:59:59`;
}

function GestionVentas() {
  const [desde, setDesde] = useState(() => fechaHaceDiasLocal(30));
  const [hasta, setHasta] = useState(() => fechaHoyLocal());
  const [idSucursal, setIdSucursal] = useState('');
  const [estado, setEstado] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [modalAnular, setModalAnular] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [refFiscalAnular, setRefFiscalAnular] = useState('');
  const [procesandoAnular, setProcesandoAnular] = useState(false);

  const mapaSucursales = useMemo(() => {
    const m = {};
    (sucursales || []).forEach((s) => {
      m[s.id_Sucursal] = s.nombre || s.Nombre || `#${s.id_Sucursal}`;
    });
    return m;
  }, [sucursales]);

  const cargarSucursales = async () => {
    try {
      const res = await api.get('/Sucursales', { params: { incluirInactivas: true } });
      setSucursales(res.data || []);
    } catch {
      setSucursales([]);
    }
  };

  const cargarVentas = useCallback(async () => {
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      const params = {
        desde: toIsoStart(desde),
        hasta: toIsoEnd(hasta)
      };
      if (idSucursal) params.idSucursal = Number(idSucursal);
      if (estado) params.estado = estado;

      const res = await api.get('/Ventas', { params });
      const data = res.data || [];
      setFilas(Array.isArray(data) ? data : []);
      setMensaje(`Mostrando ${(Array.isArray(data) ? data.length : 0)} ventas (máx. 2000 en el período).`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar ventas');
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, idSucursal, estado]);

  useEffect(() => {
    cargarSucursales();
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  const abrirAnular = (v) => {
    setModalAnular(v);
    setMotivoAnular('');
    setRefFiscalAnular('');
    setError('');
  };

  const cerrarAnular = () => {
    if (procesandoAnular) return;
    setModalAnular(null);
  };

  const confirmarAnular = async () => {
    if (!modalAnular) return;
    const id = modalAnular.id_Venta ?? modalAnular.id_venta;
    const t = motivoAnular.trim();
    if (t.length < 5) {
      setError('El motivo debe tener al menos 5 caracteres.');
      return;
    }
    setProcesandoAnular(true);
    setError('');
    try {
      const payload = {
        motivo: t,
        referenciaDocumentoFiscal: refFiscalAnular.trim() || null
      };
      const res = await api.post(`/Ventas/anular/${id}`, payload);
      const adv = res.data?.advertenciaCai;
      let msg = res.data?.message || 'Venta anulada.';
      if (adv) msg += ` ${adv}`;
      setMensaje(msg);
      setModalAnular(null);
      await cargarVentas();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo anular la venta');
    } finally {
      setProcesandoAnular(false);
    }
  };

  const reimprimir = async (idVenta) => {
    setError('');
    try {
      await imprimirTicketHtml(idVenta);
    } catch (err) {
      setError(err?.message || 'No se pudo abrir el ticket para impresión');
    }
  };

  return (
    <div>
      <h2 className="mb-2">Gestión de ventas</h2>
      <p className="text-muted small mb-4">
        Consulta ventas por período, reimprime comprobantes y anula ventas (solo administrador). La anulación excluye la venta de
        reportes y cuadres; si hubo factura CAI, el correlativo sigue consumido y debe completarse el trámite fiscal según normativa.
      </p>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sucursal</label>
              <select
                className="form-select"
                value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value)}
              >
                <option value="">Todas</option>
                {sucursales.map((s) => (
                  <option key={s.id_Sucursal} value={s.id_Sucursal}>
                    {s.nombre || s.Nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select className="form-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todas</option>
                <option value="ACTIVA">Activa</option>
                <option value="ANULADA">Anulada</option>
              </select>
            </div>
            <div className="col-md-3">
              <button type="button" className="btn btn-dark w-100" disabled={cargando} onClick={cargarVentas}>
                {cargando ? 'Cargando…' : 'Actualizar'}
              </button>
            </div>
          </div>
          {error && !modalAnular && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
          {mensaje && <div className="alert alert-success mt-3 mb-0 py-2">{mensaje}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Sucursal</th>
                  <th className="text-end">Total</th>
                  <th>Pago</th>
                  <th>Factura</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && !cargando && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      No hay ventas en el criterio seleccionado.
                    </td>
                  </tr>
                )}
                {filas.map((row) => {
                  const v = row.venta || row;
                  const id = v.id_Venta ?? v.id_venta;
                  const activa = (v.estado || v.Estado) === 'ACTIVA';
                  const nombreSucursal = mapaSucursales[v.id_Sucursal] || v.id_Sucursal;
                  const tieneCai = row.tieneFacturaCai === true;
                  const numF = row.numeroFactura || '';
                  return (
                    <tr key={id}>
                      <td className="font-monospace">{id}</td>
                      <td className="small">
                        {v.fecha || v.Fecha
                          ? new Date(v.fecha || v.Fecha).toLocaleString('es-HN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </td>
                      <td>{nombreSucursal}</td>
                      <td className="text-end">L {Number(v.total ?? v.Total ?? 0).toFixed(2)}</td>
                      <td className="small">{v.metodo_Pago || v.Metodo_Pago || '—'}</td>
                      <td>
                        {tieneCai ? (
                          <span className="badge bg-primary" title={row.cai ? `CAI ${row.cai}` : ''}>
                            CAI {numF ? `#${numF}` : ''}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {activa ? (
                          <span className="badge bg-success">Activa</span>
                        ) : (
                          <span className="badge bg-secondary">Anulada</span>
                        )}
                      </td>
                      <td className="text-end text-nowrap">
                        <button type="button" className="btn btn-outline-secondary btn-sm me-1" onClick={() => reimprimir(id)}>
                          Reimprimir
                        </button>
                        {activa && (
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => abrirAnular(v)}>
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalAnular && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Anular venta #{modalAnular.id_Venta ?? modalAnular.id_venta}</h5>
                <button type="button" className="btn-close" onClick={cerrarAnular} aria-label="Cerrar" />
              </div>
              <div className="modal-body">
                <div className="alert alert-warning small">
                  <strong>Facturación CAI:</strong> al emitir venta con factura, el correlativo ya se consumió en el talonario.
                  Anular aquí solo marca la venta en el sistema (sale de reportes). Debe quedar sustentada la anulación fiscal (por
                  ejemplo nota de crédito) según SAR y su contador.
                </div>
                <div className="mb-3">
                  <label className="form-label">Motivo de anulación (obligatorio)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={motivoAnular}
                    onChange={(e) => setMotivoAnular(e.target.value)}
                    placeholder="Ej.: Cliente devolvió producto; error de cobro; duplicado."
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">Referencia documento fiscal (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={refFiscalAnular}
                    onChange={(e) => setRefFiscalAnular(e.target.value)}
                    placeholder="Ej.: NC-000-001-01-00001234"
                  />
                  <div className="form-text">Número de nota de crédito u otro documento, si ya existe.</div>
                </div>
                {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={cerrarAnular} disabled={procesandoAnular}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmarAnular} disabled={procesandoAnular}>
                  {procesandoAnular ? 'Anulando…' : 'Confirmar anulación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionVentas;
