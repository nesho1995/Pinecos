import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrencyHNL } from '../../utils/formatters';

function Productos() {
  const location = useLocation();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [idSucursalListado, setIdSucursalListado] = useState('');
  const [precioVenta, setPrecioVenta] = useState({ id_Sucursal: '', precio: '' });
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    id_Categoria: '',
    costo: 0,
    tipo_Fiscal: 'GRAVADO_15',
    activo: true
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const fileImportRef = useRef(null);
  const [importandoExcel, setImportandoExcel] = useState(false);
  const [crearCategoriasImport, setCrearCategoriasImport] = useState(true);
  const [crearPresentacionesImport, setCrearPresentacionesImport] = useState(true);
  const [formatoImport, setFormatoImport] = useState('basico');
  const [detalleImport, setDetalleImport] = useState(null);

  const cargarProductos = async () => {
    try {
      const response = await api.get('/Productos', {
        params: {
          incluirInactivos: mostrarInactivos,
          idSucursal: idSucursalListado || undefined
        }
      });
      setProductos(response.data || []);
    } catch {
      setError('Error al cargar productos');
    }
  };

  const cargarCategorias = async () => {
    try {
      const response = await api.get('/Categorias');
      setCategorias(response.data || []);
    } catch {
      setError('Error al cargar categorias');
    }
  };

  const cargarSucursales = async () => {
    try {
      const response = await api.get('/Sucursales');
      setSucursales(response.data || []);
    } catch {
      setSucursales([]);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, [mostrarInactivos, idSucursalListado]);

  useEffect(() => {
    cargarCategorias();
    cargarSucursales();
  }, []);

  useEffect(() => {
    if (idSucursalListado || !sucursales.length) return;
    setIdSucursalListado(String(sucursales[0].id_Sucursal));
  }, [sucursales, idSucursalListado]);

  useEffect(() => {
    if (location.hash !== '#importar-productos-excel') return;
    const el = document.getElementById('importar-productos-excel');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.pathname, location.hash]);

  const limpiarMensajes = () => {
    setError('');
    setMensaje('');
    setDetalleImport(null);
  };

  const descargarPlantillaExcel = async () => {
    limpiarMensajes();
    try {
      const response = await api.get('/Productos/excel/plantilla', {
        params: { formato: formatoImport },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        formatoImport === 'presentacion'
          ? 'plantilla_productos_con_presentacion_pinecos.xlsx'
          : 'plantilla_productos_pinecos.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMensaje('Plantilla descargada. Completa las filas y vuelve a subir el archivo aqui.');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo descargar la plantilla');
    }
  };

  const importarDesdeExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    limpiarMensajes();
    setImportandoExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(
        `/Productos/excel/importar?crearCategorias=${crearCategoriasImport ? 'true' : 'false'}&crearPresentaciones=${crearPresentacionesImport ? 'true' : 'false'}&formato=${formatoImport}`,
        formData
      );
      setDetalleImport(res.data);
      setMensaje(res.data?.message || 'Importacion finalizada');
      await cargarCategorias();
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al importar el Excel');
    } finally {
      setImportandoExcel(false);
    }
  };

  const limpiarFormulario = () => {
    setForm({
      nombre: '',
      id_Categoria: '',
      costo: 0,
      tipo_Fiscal: 'GRAVADO_15',
      activo: true
    });
    setPrecioVenta({ id_Sucursal: '', precio: '' });
    setEditandoId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!form.nombre.trim()) return setError('El nombre es requerido');
    if (!form.id_Categoria) return setError('Selecciona una categoria');

    const pvn = Number(precioVenta.precio);
    const idSucSel = precioVenta.id_Sucursal;
    const tieneSucursal = idSucSel !== '' && idSucSel != null;
    const tienePrecio = !Number.isNaN(pvn) && pvn > 0;
    if (tieneSucursal !== tienePrecio) {
      return setError(
        'Precio de venta: elige sucursal y escribe un precio mayor a cero, o deja ambos vacios y configuralo despues en Precios por sucursal.'
      );
    }

    const payload = {
      nombre: form.nombre.trim(),
      id_Categoria: Number(form.id_Categoria),
      costo: Number(form.costo || 0),
      tipo_Fiscal: String(form.tipo_Fiscal || 'GRAVADO_15').toUpperCase(),
      activo: form.activo
    };

    try {
      let idProducto = editandoId;
      let msg = '';

      if (editandoId) {
        await api.put(`/Productos/${editandoId}`, payload);
        msg = 'Producto actualizado correctamente.';
      } else {
        const res = await api.post('/Productos', payload);
        const creado = res.data?.data;
        idProducto = creado?.id_Producto ?? creado?.id_producto;
        msg = 'Producto creado correctamente.';
        if (tienePrecio && !idProducto) {
          setError(
            'El producto se guardo pero no se pudo leer el codigo para asignar precio. Asigna el precio en Precios por sucursal.'
          );
          await cargarProductos();
          return;
        }
      }

      if (tienePrecio && tieneSucursal && idProducto) {
        await api.post('/Menu/producto-sucursal', {
          id_Producto: Number(idProducto),
          id_Sucursal: Number(idSucSel),
          precio: pvn,
          activo: true
        });
        msg += ' Precio de venta asignado en la sucursal elegida.';
      }

      setMensaje(msg);
      limpiarFormulario();
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar producto');
    }
  };

  const editarProducto = (item) => {
    limpiarMensajes();
    setEditandoId(item.id_Producto);
    setForm({
      nombre: item.nombre || '',
      id_Categoria: item.id_Categoria || '',
      costo: item.costo || 0,
      tipo_Fiscal: String(item.tipo_Fiscal || 'GRAVADO_15').toUpperCase(),
      activo: item.activo ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const desactivarProducto = async (item) => {
    if (!window.confirm('Se desactivara este producto. Continuar?')) return;
    limpiarMensajes();
    try {
      await api.delete(`/Productos/${item.id_Producto}`);
      setMensaje('Producto desactivado correctamente');
      if (editandoId === item.id_Producto) limpiarFormulario();
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al desactivar producto');
    }
  };

  const reactivarProducto = async (item) => {
    limpiarMensajes();
    try {
      await api.post(`/Productos/${item.id_Producto}/reactivar`);
      setMensaje('Producto reactivado correctamente');
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al reactivar producto');
    }
  };

  const eliminarFisicoProducto = async (item) => {
    const confirmar = window.confirm(
      `Eliminar fisicamente "${item.nombre}"?\n\nEsta accion borra el producto y no se puede deshacer.`
    );
    if (!confirmar) return;

    limpiarMensajes();
    try {
      await api.delete(`/Productos/${item.id_Producto}/fisico`);
      setMensaje('Producto eliminado fisicamente');
      if (editandoId === item.id_Producto) limpiarFormulario();
      await cargarProductos();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al eliminar fisicamente');
    }
  };

  const dataFiltrada = useMemo(() => {
    const text = filtro.toLowerCase().trim();
    if (!text) return productos;
    return productos.filter((p) =>
      [p.nombre, p.categoria].join(' ').toLowerCase().includes(text)
    );
  }, [productos, filtro]);

  return (
    <div>
      <h2 className="mb-3">Productos</h2>

      {mensaje && <div className="alert alert-success mb-3">{mensaje}</div>}
      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div
        id="importar-productos-excel"
        className="card shadow-sm mb-4 border border-primary border-2"
      >
        <div className="card-body">
          <h3 className="h5 mb-2 text-primary">Importar productos (Excel)</h3>
          <p className="small text-muted mb-2">
            Formato: archivo <strong>.xlsx</strong>; se lee siempre la <strong>primera hoja</strong> del libro.
            Desde la fila 2, un producto por fila. Limite 5000 filas.
          </p>
          <ul className="small text-muted ps-3 mb-3">
            <li>
              <strong>Formato basico</strong>: <strong>nombre</strong>, <strong>categoria</strong>, <strong>costo</strong>, <strong>precio</strong> y <strong>sucursal</strong>.
            </li>
            <li>
              <strong>Formato con presentacion</strong>: agrega <strong>presentacion</strong> y tambien incluye <strong>precio</strong> + <strong>sucursal</strong>. Puedes usar nombres de negocio como <strong>Con agua</strong>, <strong>Con leche</strong>, <strong>250 gramos</strong> o <strong>400 gramos</strong>.
            </li>
            <li>
              Regla unica para ambos formatos: <strong>precio y sucursal son requeridos en cada fila</strong>, porque la carga se gestiona por sucursal.
            </li>
            <li>
              Si el nombre ya existe activo, la fila actualiza/activa el precio en la sucursal indicada. Puedes crear categorias nuevas con la casilla de abajo.
            </li>
          </ul>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <select
              className="form-select"
              style={{ maxWidth: 320 }}
              value={formatoImport}
              onChange={(e) => setFormatoImport(e.target.value)}
            >
              <option value="basico">Formato basico (sin presentacion)</option>
              <option value="presentacion">Formato con presentacion</option>
            </select>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={descargarPlantillaExcel}>
              Descargar plantilla
            </button>
            <input
              ref={fileImportRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="d-none"
              onChange={importarDesdeExcel}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={importandoExcel}
              onClick={() => fileImportRef.current?.click()}
            >
              {importandoExcel ? 'Importando...' : 'Importar productos desde archivo'}
            </button>
            <div className="form-check mb-0 ms-md-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="crearCatsImport"
                checked={crearCategoriasImport}
                onChange={(e) => setCrearCategoriasImport(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="crearCatsImport">
                Crear categorias nuevas si no existen
              </label>
            </div>
            {formatoImport === 'presentacion' && (
              <div className="form-check mb-0 ms-md-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="crearPresImport"
                  checked={crearPresentacionesImport}
                  onChange={(e) => setCrearPresentacionesImport(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="crearPresImport">
                  Crear presentaciones nuevas si no existen
                </label>
              </div>
            )}
          </div>
          {detalleImport && (
            <div className="small border-top pt-3 mt-2">
              {Array.isArray(detalleImport.errores) && detalleImport.errores.length > 0 && (
                <div className="alert alert-warning py-2 mb-2">
                  <div className="fw-semibold mb-1">Filas con error</div>
                  <ul className="mb-0 ps-3">
                    {detalleImport.errores.map((row, idx) => (
                      <li key={idx}>
                        Fila {row.fila}: {row.mensaje}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(detalleImport.omitidos) && detalleImport.omitidos.length > 0 && (
                <div className="alert alert-secondary py-2 mb-0">
                  <div className="fw-semibold mb-1">Omitidos (sin crear)</div>
                  <ul className="mb-0 ps-3">
                    {detalleImport.omitidos.map((row, idx) => (
                      <li key={idx}>
                        Fila {row.fila} &quot;{row.nombre}&quot;: {row.razon}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm mb-4 border-0 bg-light">
        <div className="card-body">
          <h3 className="h6 mb-2">Como funciona el catalogo</h3>
          <ul className="small mb-3 ps-3">
            <li>
              <strong>Costo (L)</strong>: referencia interna (costo aproximado o valor de inventario). Una sola cifra por producto.
            </li>
            <li>
              <strong>Precio de venta (L)</strong>: lo que paga el cliente en caja. En este sistema va <strong>por sucursal</strong>, porque cada tienda puede cobrar distinto.
            </li>
            <li>
              Puedes poner el precio aqui abajo al guardar (una sucursal por vez) o mas tarde en &quot;Precios por sucursal&quot;. Si tienes varias sucursales, repite el guardado o usa esa pantalla.
            </li>
            <li>
              Las <strong>categorias</strong> son maestro aparte: crea o edita en &quot;Categorias&quot; o deja que el Excel las cree si marcaste la opcion en la importacion.
            </li>
          </ul>
          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-sm btn-outline-primary" to="/categorias">
              Ir a Categorias
            </Link>
            <Link className="btn btn-sm btn-outline-primary" to="/menu-sucursal">
              Ir a Precios por sucursal
            </Link>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h3 className="h6 mb-3">Alta o edicion de producto</h3>
          <form onSubmit={guardarProducto} className="row g-3">
            <div className="col-lg-4 col-md-6">
              <label className="form-label">Nombre</label>
              <input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="col-lg-4 col-md-6">
              <label className="form-label d-flex justify-content-between align-items-end gap-2">
                <span>Categoria</span>
                <Link to="/categorias" className="small">Administrar</Link>
              </label>
              <select className="form-select" name="id_Categoria" value={form.id_Categoria} onChange={handleChange} required>
                <option value="">Seleccione</option>
                {categorias.map((cat) => (
                  <option key={cat.id_Categoria} value={cat.id_Categoria}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-lg-2 col-md-4">
              <label className="form-label">Costo interno (L)</label>
              <input type="number" min="0" step="0.01" className="form-control" name="costo" value={form.costo} onChange={handleChange} />
            </div>
            <div className="col-lg-3 col-md-6">
              <label className="form-label">Tipo fiscal (SAR)</label>
              <select className="form-select" name="tipo_Fiscal" value={form.tipo_Fiscal} onChange={handleChange}>
                <option value="GRAVADO_15">Gravado 15% ISV</option>
                <option value="GRAVADO_18">Gravado 18% ISV</option>
                <option value="EXENTO">Exento</option>
                <option value="EXONERADO">Exonerado</option>
              </select>
            </div>
            <div className="col-lg-2 col-md-4 d-flex align-items-end">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" name="activo" checked={form.activo} onChange={handleChange} />
                <label className="form-check-label">Activo</label>
              </div>
            </div>

            <div className="col-12">
              <hr className="my-2" />
              <div className="fw-semibold small mb-2">Precio de venta en sucursal (opcional)</div>
              <p className="small text-muted mb-2">
                Si ya sabes cuanto cobraras en una sucursal, elige la sucursal y el precio. Se guarda junto con el producto. Deja vacio si prefieres configurarlo despues en &quot;Precios por sucursal&quot;.
              </p>
            </div>
            <div className="col-md-4">
              <label className="form-label">Sucursal para precio de venta</label>
              <select
                className="form-select"
                value={precioVenta.id_Sucursal}
                onChange={(e) => setPrecioVenta((p) => ({ ...p, id_Sucursal: e.target.value }))}
              >
                <option value="">(Ninguna — despues en Precios por sucursal)</option>
                {sucursales.map((s) => (
                  <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Precio de venta (L)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-control"
                placeholder="Ej. 45"
                value={precioVenta.precio}
                onChange={(e) => setPrecioVenta((p) => ({ ...p, precio: e.target.value }))}
              />
            </div>

            <div className="col-md-5 d-flex align-items-end flex-wrap gap-2">
              <button className="btn btn-dark" type="submit">{editandoId ? 'Actualizar' : 'Guardar'}</button>
              <button className="btn btn-outline-secondary" type="button" onClick={limpiarFormulario}>Limpiar</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="module-filters-bar mb-3">
            <div className="module-filters-main">
              <input
                type="text"
                className="form-control module-filter-input"
                placeholder="Buscar producto..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
              <select
                className="form-select module-filter-select"
                value={idSucursalListado}
                onChange={(e) => setIdSucursalListado(e.target.value)}
              >
                {sucursales.map((s) => (
                  <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-check module-filter-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="verInactivosProductos"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="verInactivosProductos">
                Ver inactivos
              </label>
            </div>
          </div>

          <table className="table table-bordered align-middle productos-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Costo</th>
                <th>Precio venta</th>
                <th>Fiscal</th>
                <th>Estado</th>
                <th style={{ width: 320 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dataFiltrada.map((item) => (
                <tr key={item.id_Producto}>
                  <td>{item.id_Producto}</td>
                  <td>{item.nombre}</td>
                  <td>{item.categoria}</td>
                  <td>{formatCurrencyHNL(item.costo)}</td>
                  <td>
                    {item.precioReferencia > 0 ? (
                      <>
                        {formatCurrencyHNL(item.precioReferencia)}
                      </>
                    ) : (
                      <span className="text-muted">Sin precio en esta sucursal</span>
                    )}
                  </td>
                  <td className="productos-fiscal-cell">{String(item.tipo_Fiscal || 'GRAVADO_15').replace('_', ' ')}</td>
                  <td>
                    <span className={`status-pill ${item.activo ? 'active' : 'inactive'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => editarProducto(item)}>
                        Editar
                      </button>
                      {item.activo ? (
                        <button className="btn btn-sm btn-outline-warning" onClick={() => desactivarProducto(item)}>
                          Desactivar
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline-success" onClick={() => reactivarProducto(item)}>
                          Reactivar
                        </button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => eliminarFisicoProducto(item)}>
                        Eliminar fisico
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {dataFiltrada.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center">No hay productos para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Productos;

