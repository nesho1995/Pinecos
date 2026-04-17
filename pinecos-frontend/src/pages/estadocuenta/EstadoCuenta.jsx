import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';

function toIsoLocalStart(dateText) {
  if (!dateText) return null;
  return `${dateText}T00:00:00`;
}

function toIsoLocalEnd(dateText) {
  if (!dateText) return null;
  return `${dateText}T23:59:59`;
}

function EstadoCuenta() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [filtros, setFiltros] = useState({
    desde: hoy,
    hasta: hoy,
    idSucursal: ''
  });
  const [sucursales, setSucursales] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [idCajaDetalle, setIdCajaDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const detalleRef = useRef(null);

  const cargarSucursales = async () => {
    try {
      const res = await api.get('/Sucursales', { params: { incluirInactivas: true } });
      setSucursales(res.data || []);
    } catch {
      setSucursales([]);
    }
  };

  const buscarCierres = async () => {
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      const params = {
        desde: toIsoLocalStart(filtros.desde),
        hasta: toIsoLocalEnd(filtros.hasta)
      };
      if (filtros.idSucursal) params.idSucursal = Number(filtros.idSucursal);

      const res = await api.get('/Cajas/cierres', { params });
      setCierres(res.data || []);
      setDetalle(null);
      setMensaje(`Se encontraron ${(res.data || []).length} cierres`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al consultar cierres');
    } finally {
      setCargando(false);
    }
  };

  const verDetalle = async (idCaja) => {
    if (!idCaja) return;
    setError('');
    setDetalleCargando(true);
    try {
      const res = await api.get(`/Cajas/estado-cuenta/${idCaja}`);
      setDetalle(res.data);
      setIdCajaDetalle(idCaja);
      setMensaje(`Detalle cargado para caja #${idCaja}`);
      setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar estado de cuenta');
    } finally {
      setDetalleCargando(false);
    }
  };

  const exportarExcel = () => {
    if (!cierres.length) return;
    const headers = [
      'id_caja',
      'id_sucursal',
      'fecha_apertura',
      'fecha_cierre',
      'monto_inicial',
      'monto_cierre',
      'cuadro',
      'diferencia',
      'total_esperado',
      'total_declarado'
    ];
    const rows = cierres.map((c) => ([
      c.id_Caja,
      c.id_Sucursal,
      c.fecha_Apertura || '',
      c.fecha_Cierre || '',
      Number(c.monto_Inicial || 0).toFixed(2),
      Number(c.monto_Cierre || 0).toFixed(2),
      c.cuadro == null ? '' : (c.cuadro ? 'SI' : 'NO'),
      Number(c.diferencia || 0).toFixed(2),
      Number(c.totalEsperado || 0).toFixed(2),
      Number(c.totalDeclarado || 0).toFixed(2)
    ]));
    exportToExcelCsv(`estado_cuenta_${filtros.desde}_${filtros.hasta}.csv`, headers, rows);
  };

  useEffect(() => {
    cargarSucursales();
    buscarCierres();
  }, []);

  const resumen = useMemo(() => {
    const totalEsperado = cierres.reduce((acc, x) => acc + Number(x.totalEsperado || 0), 0);
    const totalDeclarado = cierres.reduce((acc, x) => acc + Number(x.totalDeclarado || 0), 0);
    const diferencia = totalDeclarado - totalEsperado;
    const cierresCuadrados = cierres.filter((x) => x.cuadro === true).length;
    return { totalEsperado, totalDeclarado, diferencia, cierresCuadrados, totalCierres: cierres.length };
  }, [cierres]);

  return (
    <div>
      <h2 className="mb-4">Estado de Cuenta</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Desde</label>
              <input type="date" className="form-control" value={filtros.desde} onChange={(e) => setFiltros((p) => ({ ...p, desde: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-control" value={filtros.hasta} onChange={(e) => setFiltros((p) => ({ ...p, hasta: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sucursal</label>
              <select className="form-select" value={filtros.idSucursal} onChange={(e) => setFiltros((p) => ({ ...p, idSucursal: e.target.value }))}>
                <option value="">Todas</option>
                {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-dark w-100" onClick={buscarCierres} disabled={cargando}>
                {cargando ? 'Consultando...' : 'Consultar'}
              </button>
              <button className="btn btn-outline-success w-100" onClick={exportarExcel} disabled={!cierres.length}>
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-3"><div className="card shadow-sm"><div className="card-body"><h6>Cierres</h6><h4>{resumen.totalCierres}</h4></div></div></div>
        <div className="col-md-3"><div className="card shadow-sm"><div className="card-body"><h6>Cuadrados</h6><h4>{resumen.cierresCuadrados}</h4></div></div></div>
        <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Esperado</h6><h5>L {resumen.totalEsperado.toFixed(2)}</h5></div></div></div>
        <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Declarado</h6><h5>L {resumen.totalDeclarado.toFixed(2)}</h5></div></div></div>
        <div className="col-md-2"><div className="card shadow-sm"><div className="card-body"><h6>Diferencia</h6><h5>L {resumen.diferencia.toFixed(2)}</h5></div></div></div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body table-responsive">
          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Caja</th>
                <th>Sucursal</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Esperado</th>
                <th>Declarado</th>
                <th>Diferencia</th>
                <th>Cuadre</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {cierres.map((c, index) => {
                const idCaja = c.id_Caja ?? c.idCaja ?? c.Id_Caja ?? null;
                const idSucursal = c.id_Sucursal ?? c.idSucursal ?? c.Id_Sucursal ?? '-';
                const fechaApertura = c.fecha_Apertura ?? c.fechaApertura ?? c.Fecha_Apertura ?? null;
                const fechaCierre = c.fecha_Cierre ?? c.fechaCierre ?? c.Fecha_Cierre ?? null;
                const totalEsperado = c.totalEsperado ?? c.TotalEsperado ?? 0;
                const totalDeclarado = c.totalDeclarado ?? c.TotalDeclarado ?? 0;
                const diferencia = c.diferencia ?? c.Diferencia ?? 0;
                const cuadro = c.cuadro ?? c.Cuadro ?? false;
                return (
                <tr key={idCaja || `cierre-${index}`}>
                  <td>{idCaja ?? '-'}</td>
                  <td>{idSucursal}</td>
                  <td>{fechaApertura ? new Date(fechaApertura).toLocaleString('es-HN') : '-'}</td>
                  <td>{fechaCierre ? new Date(fechaCierre).toLocaleString('es-HN') : '-'}</td>
                  <td>L {Number(totalEsperado).toFixed(2)}</td>
                  <td>L {Number(totalDeclarado).toFixed(2)}</td>
                  <td>L {Number(diferencia).toFixed(2)}</td>
                  <td>
                    <span className={`status-pill ${cuadro ? 'active' : 'inactive'}`}>
                      {cuadro ? 'CUADRO' : 'NO CUADRO'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => verDetalle(idCaja)}
                      disabled={!idCaja || detalleCargando}
                    >
                      {detalleCargando && idCajaDetalle === idCaja ? 'Cargando...' : 'Ver'}
                    </button>
                  </td>
                </tr>
              )})}
              {!cierres.length && (
                <tr><td colSpan="9" className="text-center">No hay cierres en el rango seleccionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <div className="card shadow-sm" ref={detalleRef}>
          <div className="card-body">
            <h5 className="mb-3">Detalle de caja #{detalle?.caja?.id_Caja}</h5>
            <div className="row g-3">
              <div className="col-md-3"><strong>Inicial:</strong> L {Number(detalle?.caja?.monto_Inicial || 0).toFixed(2)}</div>
              <div className="col-md-3"><strong>Cierre:</strong> L {Number(detalle?.caja?.monto_Cierre || 0).toFixed(2)}</div>
              <div className="col-md-3"><strong>Ventas:</strong> L {Number(detalle?.resumen?.ventasTotal || 0).toFixed(2)}</div>
              <div className="col-md-3"><strong>Gastos:</strong> L {Number(detalle?.resumen?.gastos || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EstadoCuenta;

