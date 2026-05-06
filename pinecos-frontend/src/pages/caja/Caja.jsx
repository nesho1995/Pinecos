import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { getUsuario } from '../../utils/auth';
import { formatCurrencyHNL, formatDateTimeHN } from '../../utils/formatters';

const lineaCanal = (canal = '', monto = '') => ({ canal, monto });
const cierreBase = {
  monto_Cierre: '',
  pos: [lineaCanal('POS 1')],
  delivery: [lineaCanal('PEDIDOS_YA')],
  turno: '',
  observacion: ''
};

const buildCierreFromCanales = (canalesConfig, previous = null) => {
  const pos = (canalesConfig?.pos || ['POS 1']).map((c) => {
    const previo = previous?.pos?.find((x) => String(x.canal).toUpperCase() === String(c).toUpperCase());
    return lineaCanal(c, previo?.monto ?? '');
  });

  const delivery = (canalesConfig?.delivery || ['PEDIDOS_YA']).map((c) => {
    const previo = previous?.delivery?.find((x) => String(x.canal).toUpperCase() === String(c).toUpperCase());
    return lineaCanal(c, previo?.monto ?? '');
  });

  return {
    monto_Cierre: previous?.monto_Cierre ?? '',
    pos,
    delivery,
    turno: previous?.turno ?? '',
    observacion: previous?.observacion ?? ''
  };
};

function Caja() {
  const usuario = getUsuario();
  const idUsuario = Number(usuario?.id_Usuario ?? usuario?.id_usuario ?? 0);
  const [cajaActual, setCajaActual] = useState(null);
  const [, setCuadrePrevio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCuadre, setLoadingCuadre] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [apertura, setApertura] = useState({
    monto_Inicial: '',
    turno: '',
    observacion: ''
  });

  const [cierre, setCierre] = useState(cierreBase);
  const [idCajaCargadaEnCierre, setIdCajaCargadaEnCierre] = useState(null);

  const cargarCajaActual = async () => {
    const response = await api.get('/Dashboard/caja-actual');
    setCajaActual(response.data);
    return response.data;
  };

  const cargarCuadrePrevio = async (idCaja) => {
    if (!idCaja) {
      setCuadrePrevio(null);
      setIdCajaCargadaEnCierre(null);
      setCierre(cierreBase);
      return;
    }
    setLoadingCuadre(true);
    try {
      const response = await api.get(`/Cajas/cuadre-previo/${idCaja}`);
      setCuadrePrevio(response.data);
      const esMismaCaja = Number(idCajaCargadaEnCierre) === Number(idCaja);
      setCierre((prev) => buildCierreFromCanales(response.data?.canalesConfig, esMismaCaja ? prev : null));
      setIdCajaCargadaEnCierre(idCaja);
    } finally {
      setLoadingCuadre(false);
    }
  };

  const refrescarPantalla = async () => {
    try {
      setLoading(true);
      const caja = await cargarCajaActual();
      if (caja?.abierta && caja?.id_Caja) await cargarCuadrePrevio(caja.id_Caja);
      else {
        setCuadrePrevio(null);
        setIdCajaCargadaEnCierre(null);
        setCierre(cierreBase);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar caja');
    } finally {
      setLoading(false);
    }
  };

  const handleAperturaChange = (e) => {
    setApertura((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCierreChange = (e) => {
    setCierre((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateLineaMonto = (tipo, index, value) => {
    setCierre((prev) => {
      const lista = [...prev[tipo]];
      lista[index] = { ...lista[index], monto: value };
      return { ...prev, [tipo]: lista };
    });
  };

  const abrirCaja = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await api.post('/Cajas/abrir', {
        monto_Inicial: Number(apertura.monto_Inicial),
        turno: apertura.turno,
        observacion: apertura.observacion
      });
      setMensaje('Caja abierta correctamente');
      setApertura({ monto_Inicial: '', turno: '', observacion: '' });
      await refrescarPantalla();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al abrir caja');
    }
  };

  const cerrarCaja = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    if (cierre.monto_Cierre === '') return setError('Debes ingresar el efectivo final');
    if ((cierre.pos || []).some((x) => x.monto === '')) return setError('Debes ingresar monto en todos los POS');
    if ((cierre.delivery || []).some((x) => x.monto === '')) return setError('Debes ingresar monto en todas las empresas de pedidos');
    try {
      const payload = {
        monto_Cierre: Number(cierre.monto_Cierre),
        pos: (cierre.pos || []).map((x) => ({ canal: String(x.canal || '').trim(), monto: Number(x.monto) })),
        delivery: (cierre.delivery || []).map((x) => ({ canal: String(x.canal || '').trim(), monto: Number(x.monto) })),
        turno: cierre.turno || '',
        observacion: cierre.observacion
      };
      const response = await api.post(`/Cajas/cerrar/${cajaActual.id_Caja}`, payload);
      const okCuadre = response?.data?.cuadre?.cuadro === true;
      const dif = Number(response?.data?.cuadre?.diferencia ?? 0);
      const esperado = Number(response?.data?.cuadre?.esperado ?? 0);
      const declarado = Number(response?.data?.cuadre?.declarado ?? 0);
      if (okCuadre) {
        setMensaje(
          `Caja cerrada. Cuadre correcto. Declarado: L ${declarado.toFixed(2)} | Esperado: L ${esperado.toFixed(2)} | Diferencia: L ${Math.abs(dif).toFixed(2)}.`
        );
      } else {
        const abs = Math.abs(dif).toFixed(2);
        const sentido =
          dif > 0.01
            ? 'Tu declaración total queda por encima de lo que el sistema calcula; revisa captura o informa a supervisión si aplica.'
            : dif < -0.01
              ? 'Tu declaración total queda por debajo de lo que el sistema calcula; revisa conteo o informa a supervisión si aplica.'
              : 'Hay una diferencia pequeña; confirma montos o informa a supervisión.';
        setMensaje(
          `Caja cerrada, pero el conteo no cuadra. Declarado: L ${declarado.toFixed(2)} | Esperado: L ${esperado.toFixed(2)} | Diferencia: L ${abs}. ${sentido}`
        );
      }
      setCierre(cierreBase);
      setIdCajaCargadaEnCierre(null);
      await refrescarPantalla();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cerrar caja');
    }
  };

  useEffect(() => {
    refrescarPantalla();
  }, []);

  const totalPosDeclarado = useMemo(
    () => (cierre.pos || []).reduce((acc, item) => acc + Number(item.monto || 0), 0),
    [cierre.pos]
  );

  const totalDeliveryDeclarado = useMemo(
    () => (cierre.delivery || []).reduce((acc, item) => acc + Number(item.monto || 0), 0),
    [cierre.delivery]
  );

  const totalDeclarado = Number(cierre.monto_Cierre || 0) + totalPosDeclarado + totalDeliveryDeclarado;

  if (loading) {
    return (
      <div>
        <div className="caja-page-header mb-4">
          <h4 className="mb-0 fw-bold">Caja</h4>
        </div>
        <div className="row g-4">
          <div className="col-md-5">
            <div className="card shadow-sm">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-4 mb-3 d-block"></span>
                <span className="placeholder col-8 mb-2 d-block"></span>
                <span className="placeholder col-7 mb-2 d-block"></span>
                <span className="placeholder col-6 d-block"></span>
              </div>
            </div>
          </div>
          <div className="col-md-7">
            <div className="card shadow-sm">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-5 mb-3 d-block"></span>
                <span className="placeholder col-12 mb-2 d-block"></span>
                <span className="placeholder col-12 mb-2 d-block"></span>
                <span className="placeholder col-10 mb-2 d-block"></span>
                <span className="placeholder col-8 d-block"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="caja-page-header mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div>
            <h4 className="mb-0 fw-bold">Caja</h4>
            <div className="small text-muted">Apertura y cierre de turno</div>
          </div>
          <span className={`badge ms-auto caja-status-badge ${cajaActual?.abierta ? 'caja-status-abierta' : 'caja-status-cerrada'}`}>
            {cajaActual?.abierta ? '● Abierta' : '○ Cerrada'}
          </span>
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!cajaActual?.abierta ? (
        <div className="card shadow-sm caja-form-card">
          <div className="card-body">
            <div className="caja-section-label mb-3">Abrir caja</div>
            <form onSubmit={abrirCaja} className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Usuario de sesion</label>
                <input type="text" className="form-control" value={usuario?.nombre || usuario?.usuario || 'Usuario de caja'} readOnly />
              </div>
              <div className="col-md-4">
                <label className="form-label">Monto inicial</label>
                <input type="number" step="0.01" className="form-control" name="monto_Inicial" value={apertura.monto_Inicial} onChange={handleAperturaChange} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Turno</label>
                <input type="text" className="form-control" name="turno" value={apertura.turno || ''} onChange={handleAperturaChange} placeholder="Manana / Tarde / Noche" />
              </div>
              <div className="col-md-8">
                <label className="form-label">Observacion</label>
                <input type="text" className="form-control" name="observacion" value={apertura.observacion} onChange={handleAperturaChange} />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-success w-100 fw-semibold">Abrir caja</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-md-5">
            <div className="card shadow-sm caja-info-card h-100">
              <div className="card-body">
                <div className="caja-section-label mb-3">Estado de caja</div>
                <div className="caja-stat-grid">
                  <div className="caja-stat-row">
                    <span className="caja-stat-key">ID Caja</span>
                    <span className="caja-stat-val">#{cajaActual.id_Caja}</span>
                  </div>
                  <div className="caja-stat-row">
                    <span className="caja-stat-key">Sucursal</span>
                    <span className="caja-stat-val">{cajaActual.id_Sucursal}</span>
                  </div>
                  <div className="caja-stat-row">
                    <span className="caja-stat-key">Abierta por</span>
                    <span className="caja-stat-val">{cajaActual.usuarioAperturaNombre || 'Usuario de caja'}</span>
                  </div>
                  <div className="caja-stat-row">
                    <span className="caja-stat-key">Turno</span>
                    <span className="caja-stat-val">{cajaActual.turnoApertura || 'N/D'}</span>
                  </div>
                  <div className="caja-stat-row">
                    <span className="caja-stat-key">Fecha apertura</span>
                    <span className="caja-stat-val">{formatDateTimeHN(cajaActual.fecha_Apertura)}</span>
                  </div>
                  <div className="caja-stat-row caja-stat-highlight">
                    <span className="caja-stat-key">Monto inicial</span>
                    <span className="caja-stat-val fw-bold">{formatCurrencyHNL(cajaActual.monto_Inicial)}</span>
                  </div>
                </div>
                {idUsuario > 0 && Number(cajaActual.id_Usuario_Apertura) !== idUsuario && (
                  <div className="alert alert-info mt-3 mb-0 small">
                    Esta caja fue abierta por otro usuario de tu sucursal, pero esta disponible para operar.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-7">
            <div className="card shadow-sm caja-form-card">
              <div className="card-body">
                <div className="caja-section-label mb-3">Cierre y cuadre</div>
                {loadingCuadre && (
                  <div className="alert alert-secondary py-2 small">Actualizando cuadre previo...</div>
                )}
                <form onSubmit={cerrarCaja} className="row g-3">
                  <div className="col-12">
                    <div className="caja-field-group-label">Efectivo</div>
                    <label className="form-label mt-1">Efectivo final contado</label>
                    <input type="number" step="0.01" className="form-control" name="monto_Cierre" value={cierre.monto_Cierre} onChange={handleCierreChange} required />
                  </div>

                  <div className="col-12">
                    <div className="caja-field-group-label">Terminales POS</div>
                    {(cierre.pos || []).map((item, index) => (
                      <div className="row g-2 mb-2" key={`pos-${index}`}>
                        <div className="col-7">
                          <input type="text" className="form-control" value={item.canal} readOnly />
                        </div>
                        <div className="col-5">
                          <input type="number" step="0.01" className="form-control" placeholder="Monto" value={item.monto} onChange={(e) => updateLineaMonto('pos', index, e.target.value)} required />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="col-12">
                    <div className="caja-field-group-label">Delivery</div>
                    {(cierre.delivery || []).map((item, index) => (
                      <div className="row g-2 mb-2" key={`delivery-${index}`}>
                        <div className="col-7">
                          <input type="text" className="form-control" value={item.canal} readOnly />
                        </div>
                        <div className="col-5">
                          <input type="number" step="0.01" className="form-control" placeholder="Monto" value={item.monto} onChange={(e) => updateLineaMonto('delivery', index, e.target.value)} required />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Turno de cierre</label>
                    <input type="text" className="form-control" name="turno" value={cierre.turno || ''} onChange={handleCierreChange} placeholder="Manana / Tarde / Noche" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Observacion</label>
                    <input type="text" className="form-control" name="observacion" value={cierre.observacion} onChange={handleCierreChange} />
                  </div>

                  <div className="col-12">
                    <div className="caja-total-bar">
                      <span>Total declarado</span>
                      <strong className="fs-5">{formatCurrencyHNL(totalDeclarado)}</strong>
                    </div>
                  </div>

                  <div className="col-12">
                    <button className="btn btn-danger w-100 fw-semibold">Cerrar caja</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Caja;
