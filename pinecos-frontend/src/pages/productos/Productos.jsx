import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

function Productos() {
  const location = useLocation();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    id_Categoria: '',
    costo: 0,
    activo: true
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const fileImportRef = useRef(null);
  const [importandoExcel, setImportandoExcel] = useState(false);
  const [crearCategoriasImport, setCrearCategoriasImport] = useState(true);
  const [detalleImport, setDetalleImport] = useState(null);

  const cargarProductos = async () => {
    try {
      const response = await api.get('/Productos', {
        params: { incluirInactivos: mostrarInactivos }
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

  useEffect(() => {
    cargarProductos();
  }, [mostrarInactivos]);

  useEffect(() => {
    cargarCategorias();
  }, []);

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
      const response = await api.get('/Productos/excel/plantilla', { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_productos_pinecos.xlsx';
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
        `/Productos/excel/importar?crearCategorias=${crearCategoriasImport ? 'true' : 'false'}`,
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
      activo: true
    });
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

    const payload = {
      nombre: form.nombre.trim(),
      id_Categoria: Number(form.id_Categoria),
      costo: Number(form.costo || 0),
      activo: form.activo
    };

    try {
      if (editandoId) {
        await api.put(`/Productos/${editandoId}`, payload);
        setMensaje('Producto actualizado correctamente');
      } else {
        await api.post('/Productos', payload);
        setMensaje('Producto creado correctamente');
      }
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
          <p className="small text-muted mb-3">
            Formato: archivo <strong>.xlsx</strong>; se lee siempre la <strong>primera hoja</strong> del libro.
            Fila 1 con encabezados: <strong>nombre</strong>, <strong>categoria</strong>, <strong>costo</strong> (tambien acepta name, category, cost en ingles).
            Desde la fila 2, un producto por fila. El costo puede ser numero en celda o texto con punto o coma decimal. Limite 5000 filas de datos.
            Si el nombre ya existe como producto activo, esa fila se omite. Opcional: crear categorias automaticamente si el nombre de categoria no existe aun.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={descargarPlantillaExcel}>
              Descargar plantilla Excel
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

      <div className="alert alert-info d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <span>
          Aqui defines el catalogo y el costo interno. El precio de venta por sucursal se configura en &quot;Precios por Sucursal&quot;.
        </span>
        <Link className="btn btn-sm btn-outline-primary" to="/menu-sucursal">
          Ir a Precios por Sucursal
        </Link>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={guardarProducto} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Nombre</label>
              <input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Categoria</label>
              <select className="form-select" name="id_Categoria" value={form.id_Categoria} onChange={handleChange} required>
                <option value="">Seleccione</option>
                {categorias.map((cat) => (
                  <option key={cat.id_Categoria} value={cat.id_Categoria}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Costo</label>
              <input type="number" min="0" step="0.01" className="form-control" name="costo" value={form.costo} onChange={handleChange} />
            </div>
            <div className="col-md-1 d-flex align-items-end">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" name="activo" checked={form.activo} onChange={handleChange} />
                <label className="form-check-label">Activo</label>
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-dark w-100" type="submit">{editandoId ? 'Actualizar' : 'Guardar'}</button>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" type="button" onClick={limpiarFormulario}>Limpiar</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 justify-content-between mb-3">
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: 320 }}
              placeholder="Buscar producto..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <div className="form-check">
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

          <table className="table table-bordered align-middle">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Costo</th>
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
                  <td>L {Number(item.costo || 0).toFixed(2)}</td>
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
                  <td colSpan="6" className="text-center">No hay productos para mostrar</td>
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

