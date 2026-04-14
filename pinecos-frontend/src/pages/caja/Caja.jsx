import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const lineaCanal = (canal = '') => ({ canal, monto: '' });

function Caja() {
  const [cajaActual, setCajaActual] = useState(null);
  const [cuadrePrevio, setCuadrePrevio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [apertura, setApertura] = useState({
    monto_Inicial: '',
    observacion: ''
  });

  const [cierre, setCierre] = useState({
    monto_Cierre: '',
    pos: [lineaCanal('POS 1')],
    delivery: [lineaCanal('PEDIDOS_YA')],
    observacion: ''
  });

  const cargarCajaActual = async () => {
    const response = await api.get('/Dashboard/caja-actual');
    setCajaActual(response.data);
    return response.data;
  };

  const cargarCuadrePrevio = async (idCaja) => {
    if (!idCaja) {
      setCuadrePrevio(null);
      return;
    }
    const response = await api.get(`/Cajas/cuadre-previo/${idCaja}`);
    setCuadrePrevio(response.data);
  };

  const refrescarPantalla = async () => {
    try {
      setLoading(true);
      const caja = await cargarCajaActual();
      if (caja?.abierta && caja?.id_Caja) await cargarCuadrePrevio(caja.id_Caja);
      else setCuadrePrevio(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar caja');
    } finally {
      setLoading(false);
    }
  };

  const handleAperturaChange = (e) => {
    setApertura((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCierreChange = (e) => {
    setCierre((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const updateLinea = (tipo, index, campo, value) => {
    setCierre((prev) => {
      const lista = [...prev[tipo]];
      lista[index] = { ...lista[index], [campo]: value };
      return { ...prev, [tipo]: lista };
    });
  };

  const addLinea = (tipo, nombreInicial) => {
    setCierre((prev) => ({ ...prev, [tipo]: [...prev[tipo], lineaCanal(nombreInicial)] }));
  };

  const removeLinea = (tipo, index) => {
    setCierre((prev) => {
      const lista = prev[tipo].filter((_, i) => i !== index);
      return { ...prev, [tipo]: lista.length ? lista : [lineaCanal()] };
    });
  };

  const abrirCaja = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      await api.post('/Cajas/abrir', {
        monto_Inicial: Number(apertura.monto_Inicial),
        observacion: apertura.observacion
      });

      setMensaje('Caja abierta correctamente');
      setApertura({ monto_Inicial: '', observacion: '' });
      await refrescarPantalla();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al abrir caja');
    }
  };

  const cerrarCaja = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    try {
      const payload = {
        monto_Cierre: Number(cierre.monto_Cierre || 0),
        pos: (cierre.pos || []).map((x) => ({ canal: String(x.canal || '').trim(), monto: Number(x.monto || 0) })),
        delivery: (cierre.delivery || []).map((x) => ({ canal: String(x.canal || '').trim(), monto: Number(x.monto || 0) })),
        observacion: cierre.observacion
      };

      const response = await api.post(`/Cajas/cerrar/${cajaActual.id_Caja}`, payload);

      const cuadro = response?.data?.cuadre?.cuadro;
      const dif = Number(response?.data?.cuadre?.diferencia || 0);
      setMensaje(cuadro ? 'Caja cerrada y cuadra correctamente.' : `Caja cerrada pero NO cuadra. Diferencia: L ${dif.toFixed(2)}`);

      setCierre({
        monto_Cierre: '',
        pos: [lineaCanal('POS 1')],
        delivery: [lineaCanal('PEDIDOS_YA')],
        observacion: ''
      });

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
  const totalEsperado = Number(cuadrePrevio?.resumen?.totalEsperado || 0);
  const diferenciaPreview = totalDeclarado - totalEsperado;
  const cuadroPreview = Math.abs(diferenciaPreview) <= 0.01;

  if (loading) return <div>Cargando caja...</div>;

  return (
    <div>
      <h2 className="mb-4">Caja</h2>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!cajaActual?.abierta ? (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="mb-3">Abrir caja</h5>
            <form onSubmit={abrirCaja} className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Monto inicial</label>
                <input type="number" step="0.01" className="form-control" name="monto_Inicial" value={apertura.monto_Inicial} onChange={handleAperturaChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Observacion</label>
                <input type="text" className="form-control" name="observacion" value={apertura.observacion} onChange={handleAperturaChange} />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button className="btn btn-dark w-100">Abrir</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5>Caja abierta</h5>
                <p><strong>ID Caja:</strong> {cajaActual.id_Caja}</p>
                <p><strong>Sucursal:</strong> {cajaActual.id_Sucursal}</p>
                <p><strong>Fecha apertura:</strong> {new Date(cajaActual.fecha_Apertura).toLocaleString('es-HN')}</p>
                <p><strong>Monto inicial:</strong> L {Number(cajaActual.monto_Inicial || 0).toFixed(2)}</p>
                <p><strong>Estado:</strong> {cajaActual.estado}</p>
              </div>
            </div>

            <div className="card shadow-sm mt-3">
              <div className="card-body">
                <h6 className="mb-3">Esperado del dia</h6>
                <div className="d-flex justify-content-between"><span>Efectivo esperado</span><strong>L {Number(cuadrePrevio?.resumen?.efectivoEsperado || 0).toFixed(2)}</strong></div>
                <div className="d-flex justify-content-between"><span>POS esperado</span><strong>L {Number(cuadrePrevio?.resumen?.ventasPos || 0).toFixed(2)}</strong></div>
                <div className="d-flex justify-content-between"><span>Delivery esperado</span><strong>L {Number(cuadrePrevio?.resumen?.ventasDelivery || 0).toFixed(2)}</strong></div>
                <hr />
                <div className="d-flex justify-content-between"><span>Total esperado</span><strong>L {totalEsperado.toFixed(2)}</strong></div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5>Cierre y cuadre diario</h5>
                <form onSubmit={cerrarCaja} className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Efectivo final contado</label>
                    <input type="number" step="0.01" className="form-control" name="monto_Cierre" value={cierre.monto_Cierre} onChange={handleCierreChange} required />
                  </div>

                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label mb-0">Dinero en POS</label>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => addLinea('pos', `POS ${cierre.pos.length + 1}`)}>Agregar POS</button>
                    </div>
                    {cierre.pos.map((item, index) => (
                      <div className="row g-2 mb-2" key={`pos-${index}`}>
                        <div className="col-7">
                          <input type="text" className="form-control" placeholder="Nombre POS" value={item.canal} onChange={(e) => updateLinea('pos', index, 'canal', e.target.value)} />
                        </div>
                        <div className="col-4">
                          <input type="number" step="0.01" className="form-control" placeholder="Monto" value={item.monto} onChange={(e) => updateLinea('pos', index, 'monto', e.target.value)} />
                        </div>
                        <div className="col-1">
                          <button type="button" className="btn btn-outline-danger btn-sm w-100" onClick={() => removeLinea('pos', index)}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label mb-0">Empresas de pedidos</label>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => addLinea('delivery', 'NUEVA_APP')}>Agregar empresa</button>
                    </div>
                    {cierre.delivery.map((item, index) => (
                      <div className="row g-2 mb-2" key={`delivery-${index}`}>
                        <div className="col-7">
                          <input type="text" className="form-control" placeholder="Empresa (ej. PEDIDOS_YA)" value={item.canal} onChange={(e) => updateLinea('delivery', index, 'canal', e.target.value)} />
                        </div>
                        <div className="col-4">
                          <input type="number" step="0.01" className="form-control" placeholder="Monto" value={item.monto} onChange={(e) => updateLinea('delivery', index, 'monto', e.target.value)} />
                        </div>
                        <div className="col-1">
                          <button type="button" className="btn btn-outline-danger btn-sm w-100" onClick={() => removeLinea('delivery', index)}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="col-12">
                    <label className="form-label">Observacion</label>
                    <input type="text" className="form-control" name="observacion" value={cierre.observacion} onChange={handleCierreChange} />
                  </div>

                  <div className="col-12">
                    <div className={`p-3 rounded ${cuadroPreview ? 'bg-success-subtle border border-success' : 'bg-warning-subtle border border-warning'}`}>
                      <div className="d-flex justify-content-between"><span>Declarado total</span><strong>L {totalDeclarado.toFixed(2)}</strong></div>
                      <div className="d-flex justify-content-between"><span>Esperado total</span><strong>L {totalEsperado.toFixed(2)}</strong></div>
                      <div className="d-flex justify-content-between"><span>Diferencia</span><strong>L {diferenciaPreview.toFixed(2)}</strong></div>
                      <div className="mt-2 fw-semibold">{cuadroPreview ? 'Cuadra correctamente' : 'No cuadra'}</div>
                    </div>
                  </div>

                  <div className="col-12">
                    <button className="btn btn-danger w-100">Cerrar caja</button>
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
