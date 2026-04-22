import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { exportToExcelCsv } from '../../utils/excelExport';
import { formatCurrencyHNL, formatDateTimeHN } from '../../utils/formatters';

const emptyItem = {
  id_Sucursal: '',
  codigo: '',
  nombre: '',
  unidad_Medida: 'UNIDAD',
  stock_Inicial: 0,
  stock_Minimo: 0,
  costo_Referencia: 0,
  activo: true
};

const emptyMovimiento = {
  id_Inventario_Item: '',
  tipo: 'ENTRADA',
  cantidad: '',
  costo_Unitario: '',
  referencia: '',
  observacion: ''
};

const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function Inventario() {
  const [tab, setTab] = useState('resumen');
  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [sucursalFiltro, setSucursalFiltro] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [filtroItems, setFiltroItems] = useState('');
  const [items, setItems] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [dashboardAvanzado, setDashboardAvanzado] = useState({ totalItems: 0, criticos: 0, alertas: 0, valorStockTotal: 0, items: [] });
  const [kardexFiltro, setKardexFiltro] = useState({
    idItem: '',
    desde: toLocalInput(new Date(new Date().setDate(new Date().getDate() - 30))),
    hasta: toLocalInput(new Date())
  });
  const [kardexData, setKardexData] = useState(null);
  const [checklistData, setChecklistData] = useState(null);
  const [checklistError, setChecklistError] = useState('');
  const [resumen, setResumen] = useState({ totalItems: 0, itemsStockBajo: 0, porcentajeBajo: 0 });
  const [itemForm, setItemForm] = useState(emptyItem);
  const [itemEditandoId, setItemEditandoId] = useState(null);
  const [movimientoForm, setMovimientoForm] = useState(emptyMovimiento);
  const [compraForm, setCompraForm] = useState({
    id_Proveedor: '',
    observacion: '',
    detalles: [{ id_Inventario_Item: '', cantidad: '', costo_Unitario: '' }]
  });
  const [ordenForm, setOrdenForm] = useState({
    id_Proveedor: '',
    observacion: '',
    detalles: [{ id_Inventario_Item: '', cantidad: '', costo_Unitario: '' }]
  });
  const [recetasProducto, setRecetasProducto] = useState([]);
  const [recetaForm, setRecetaForm] = useState({
    id_Producto: '',
    id_Presentacion: '',
    detalles: [{ id_Inventario_Item: '', cantidad_Insumo: '' }]
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
  };

  const cargarSucursales = async () => {
    const res = await api.get('/Sucursales', { params: { incluirInactivas: true } });
    const data = res.data || [];
    setSucursales(data);
    if (!sucursalFiltro && data.length) setSucursalFiltro(String(data[0].id_Sucursal));
  };

  const cargarProveedores = async () => {
    const res = await api.get('/Proveedores');
    setProveedores(res.data || []);
  };

  const cargarCatalogosReceta = async () => {
    const [resProductos, resPresentaciones] = await Promise.all([
      api.get('/Productos', { params: { incluirInactivos: true } }),
      api.get('/Presentaciones')
    ]);
    setProductos(resProductos.data || []);
    setPresentaciones(resPresentaciones.data || []);
  };

  const cargarItems = async () => {
    const params = {
      incluirInactivos: mostrarInactivos,
      idSucursal: sucursalFiltro ? Number(sucursalFiltro) : undefined
    };
    const res = await api.get('/Inventario/items', { params });
    setItems(res.data || []);
  };

  const cargarMovimientos = async () => {
    const params = {
      idSucursal: sucursalFiltro ? Number(sucursalFiltro) : undefined
    };
    const res = await api.get('/Inventario/movimientos', { params });
    setMovimientos(res.data || []);
  };

  const cargarCompras = async () => {
    const params = {
      idSucursal: sucursalFiltro ? Number(sucursalFiltro) : undefined
    };
    const res = await api.get('/Inventario/compras', { params });
    setCompras(res.data || []);
  };

  const cargarResumen = async () => {
    const params = {
      idSucursal: sucursalFiltro ? Number(sucursalFiltro) : undefined
    };
    const res = await api.get('/Inventario/resumen', { params });
    setResumen(res.data || { totalItems: 0, itemsStockBajo: 0, porcentajeBajo: 0 });
  };

  const cargarRecetasProducto = async () => {
    if (!sucursalFiltro) return;
    const params = {
      idSucursal: Number(sucursalFiltro),
      idProducto: recetaForm.id_Producto ? Number(recetaForm.id_Producto) : undefined
    };
    const res = await api.get('/Inventario/recetas-producto', { params });
    setRecetasProducto(res.data || []);
  };

  const cargarDashboardAvanzado = async () => {
    const params = { idSucursal: sucursalFiltro ? Number(sucursalFiltro) : undefined };
    const res = await api.get('/Inventario/dashboard-avanzado', { params });
    setDashboardAvanzado(res.data || { totalItems: 0, criticos: 0, alertas: 0, valorStockTotal: 0, items: [] });
  };

  const cargarOrdenesCompra = async () => {
    const params = { idSucursal: sucursalFiltro ? Number(sucursalFiltro) : undefined };
    const res = await api.get('/Inventario/ordenes-compra', { params });
    setOrdenesCompra(res.data || []);
  };

  const cargarChecklist = async () => {
    setChecklistError('');
    if (!sucursalFiltro) {
      setChecklistData(null);
      return;
    }
    try {
      const res = await api.get('/Inventario/checklist-sucursal', {
        params: { idSucursal: Number(sucursalFiltro) }
      });
      setChecklistData(res.data || null);
    } catch (err) {
      setChecklistData(null);
      setChecklistError(err?.response?.data?.message || 'No se pudo cargar el checklist');
    }
  };

  const recargarTodo = async () => {
    try {
      await Promise.all([cargarItems(), cargarMovimientos(), cargarCompras(), cargarResumen(), cargarDashboardAvanzado(), cargarOrdenesCompra(), cargarProveedores(), cargarCatalogosReceta(), cargarRecetasProducto()]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cargar inventario');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await cargarSucursales();
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al cargar sucursales');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!sucursalFiltro) return;
    recargarTodo();
  }, [sucursalFiltro, mostrarInactivos]);

  useEffect(() => {
    if (!sucursalFiltro) return;
    cargarRecetasProducto();
  }, [sucursalFiltro, recetaForm.id_Producto]);

  useEffect(() => {
    if (!sucursalFiltro || tab !== 'checklist') return;
    cargarChecklist();
  }, [sucursalFiltro, tab]);

  const itemsFiltrados = useMemo(() => {
    const text = filtroItems.trim().toLowerCase();
    if (!text) return items;
    return items.filter((x) => [x.codigo, x.nombre, x.unidad_Medida, x.sucursal].join(' ').toLowerCase().includes(text));
  }, [items, filtroItems]);

  const itemsStockBajo = useMemo(
    () => items.filter((x) => Number(x.stock_Actual || 0) <= Number(x.stock_Minimo || 0) && !!x.activo),
    [items]
  );

  const guardarItem = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      const payload = {
        id_Sucursal: Number(itemForm.id_Sucursal || 0),
        codigo: itemForm.codigo,
        nombre: itemForm.nombre,
        unidad_Medida: itemForm.unidad_Medida,
        stock_Inicial: Number(itemForm.stock_Inicial || 0),
        stock_Minimo: Number(itemForm.stock_Minimo || 0),
        costo_Referencia: Number(itemForm.costo_Referencia || 0),
        activo: !!itemForm.activo
      };

      if (itemEditandoId) {
        await api.put(`/Inventario/items/${itemEditandoId}`, payload);
        setMensaje('Insumo actualizado correctamente');
      } else {
        await api.post('/Inventario/items', payload);
        setMensaje('Insumo creado correctamente');
      }

      setItemEditandoId(null);
      setItemForm({ ...emptyItem, id_Sucursal: sucursalFiltro });
      await recargarTodo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar insumo');
    }
  };

  const editarItem = (item) => {
    limpiarMensajes();
    setItemEditandoId(item.id_Inventario_Item);
    setItemForm({
      id_Sucursal: item.id_Sucursal,
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      unidad_Medida: item.unidad_Medida || 'UNIDAD',
      stock_Inicial: item.stock_Inicial || 0,
      stock_Minimo: item.stock_Minimo || 0,
      costo_Referencia: item.costo_Referencia || 0,
      activo: item.activo ?? true
    });
    setTab('items');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inactivarItem = async (item) => {
    if (!window.confirm('Se inactivara este insumo. Continuar?')) return;
    limpiarMensajes();
    try {
      await api.delete(`/Inventario/items/${item.id_Inventario_Item}`);
      setMensaje('Insumo inactivado correctamente');
      await recargarTodo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al inactivar insumo');
    }
  };

  const reactivarItem = async (item) => {
    limpiarMensajes();
    try {
      await api.post(`/Inventario/items/${item.id_Inventario_Item}/reactivar`);
      setMensaje('Insumo reactivado correctamente');
      await recargarTodo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al reactivar insumo');
    }
  };

  const registrarMovimiento = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      if (!movimientoForm.id_Inventario_Item) {
        setError('Seleccione un insumo');
        return;
      }
      if (Number(movimientoForm.cantidad || 0) <= 0) {
        setError('La cantidad debe ser mayor a cero');
        return;
      }

      const payload = {
        id_Inventario_Item: Number(movimientoForm.id_Inventario_Item),
        tipo: movimientoForm.tipo,
        cantidad: Number(movimientoForm.cantidad || 0),
        costo_Unitario: Number(movimientoForm.costo_Unitario || 0),
        referencia: movimientoForm.referencia,
        observacion: movimientoForm.observacion
      };
      await api.post('/Inventario/movimientos', payload);
      setMensaje('Movimiento de inventario registrado correctamente');
      setMovimientoForm(emptyMovimiento);
      await recargarTodo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar movimiento');
    }
  };

  const addDetalleCompra = () => {
    setCompraForm((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { id_Inventario_Item: '', cantidad: '', costo_Unitario: '' }]
    }));
  };

  const removeDetalleCompra = (index) => {
    setCompraForm((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }));
  };

  const updateDetalleCompra = (index, field, value) => {
    setCompraForm((prev) => ({
      ...prev,
      detalles: prev.detalles.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    }));
  };

  const totalCompra = useMemo(
    () => (compraForm.detalles || []).reduce((acc, d) => acc + Number(d.cantidad || 0) * Number(d.costo_Unitario || 0), 0),
    [compraForm]
  );

  const registrarCompra = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      if (!compraForm.id_Proveedor) {
        setError('Seleccione un proveedor');
        return;
      }
      if (!compraForm.detalles?.length) {
        setError('Agregue al menos un detalle');
        return;
      }

      const ids = compraForm.detalles.map((d) => Number(d.id_Inventario_Item || 0)).filter((x) => x > 0);
      if (ids.length !== compraForm.detalles.length) {
        setError('Todos los detalles deben tener insumo');
        return;
      }
      if (new Set(ids).size !== ids.length) {
        setError('No se permiten insumos repetidos en la misma compra');
        return;
      }
      const detalleInvalido = compraForm.detalles.some((d) => Number(d.cantidad || 0) <= 0 || Number(d.costo_Unitario || 0) < 0);
      if (detalleInvalido) {
        setError('Verifique cantidades y costos de los detalles');
        return;
      }

      const payload = {
        id_Proveedor: Number(compraForm.id_Proveedor),
        observacion: compraForm.observacion,
        detalles: (compraForm.detalles || []).map((d) => ({
          id_Inventario_Item: Number(d.id_Inventario_Item),
          cantidad: Number(d.cantidad || 0),
          costo_Unitario: Number(d.costo_Unitario || 0)
        }))
      };
      await api.post('/Inventario/compras', payload);
      setMensaje('Compra registrada correctamente');
      setCompraForm({
        id_Proveedor: '',
        observacion: '',
        detalles: [{ id_Inventario_Item: '', cantidad: '', costo_Unitario: '' }]
      });
      await recargarTodo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar compra');
    }
  };

  const consultarKardex = async (e) => {
    e?.preventDefault?.();
    limpiarMensajes();
    try {
      if (!kardexFiltro.idItem) {
        setError('Seleccione un insumo para consultar kardex');
        return;
      }
      const params = {
        idItem: Number(kardexFiltro.idItem),
        desde: kardexFiltro.desde,
        hasta: kardexFiltro.hasta
      };
      const res = await api.get('/Inventario/kardex', { params });
      setKardexData(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al consultar kardex');
    }
  };

  const addDetalleOrden = () => {
    setOrdenForm((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { id_Inventario_Item: '', cantidad: '', costo_Unitario: '' }]
    }));
  };

  const removeDetalleOrden = (index) => {
    setOrdenForm((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }));
  };

  const updateDetalleOrden = (index, field, value) => {
    setOrdenForm((prev) => ({
      ...prev,
      detalles: prev.detalles.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    }));
  };

  const totalOrden = useMemo(
    () => (ordenForm.detalles || []).reduce((acc, d) => acc + Number(d.cantidad || 0) * Number(d.costo_Unitario || 0), 0),
    [ordenForm]
  );

  const crearOrdenCompra = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      const payload = {
        id_Proveedor: Number(ordenForm.id_Proveedor),
        observacion: ordenForm.observacion,
        detalles: (ordenForm.detalles || []).map((d) => ({
          id_Inventario_Item: Number(d.id_Inventario_Item),
          cantidad: Number(d.cantidad || 0),
          costo_Unitario: Number(d.costo_Unitario || 0)
        }))
      };
      await api.post('/Inventario/ordenes-compra', payload);
      setMensaje('Orden de compra creada');
      setOrdenForm({
        id_Proveedor: '',
        observacion: '',
        detalles: [{ id_Inventario_Item: '', cantidad: '', costo_Unitario: '' }]
      });
      await recargarTodo();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al crear orden de compra');
    }
  };

  const addDetalleReceta = () => {
    setRecetaForm((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { id_Inventario_Item: '', cantidad_Insumo: '' }]
    }));
  };

  const removeDetalleReceta = (index) => {
    setRecetaForm((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }));
  };

  const updateDetalleReceta = (index, field, value) => {
    setRecetaForm((prev) => ({
      ...prev,
      detalles: prev.detalles.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    }));
  };

  const guardarReceta = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      if (!sucursalFiltro) {
        setError('Seleccione una sucursal');
        return;
      }
      if (!recetaForm.id_Producto) {
        setError('Seleccione un producto');
        return;
      }
      if (!recetaForm.detalles?.length) {
        setError('Agregue al menos un insumo');
        return;
      }

      const payload = {
        id_Sucursal: Number(sucursalFiltro),
        id_Producto: Number(recetaForm.id_Producto),
        id_Presentacion: recetaForm.id_Presentacion ? Number(recetaForm.id_Presentacion) : null,
        detalles: recetaForm.detalles.map((d) => ({
          id_Inventario_Item: Number(d.id_Inventario_Item),
          cantidad_Insumo: Number(d.cantidad_Insumo || 0)
        }))
      };

      await api.put('/Inventario/recetas-producto', payload);
      setMensaje('Receta guardada correctamente');
      await cargarRecetasProducto();
      if (sucursalFiltro) await cargarChecklist();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al guardar receta');
    }
  };

  const aprobarOrden = async (idOrden) => {
    limpiarMensajes();
    try {
      await api.post(`/Inventario/ordenes-compra/${idOrden}/aprobar`);
      setMensaje('Orden aprobada');
      await recargarTodo();
      if (sucursalFiltro) await cargarChecklist();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al aprobar orden');
    }
  };

  const recibirOrden = async (idOrden) => {
    limpiarMensajes();
    try {
      await api.post(`/Inventario/ordenes-compra/${idOrden}/recibir`);
      setMensaje('Orden recibida y stock actualizado');
      await recargarTodo();
      if (sucursalFiltro) await cargarChecklist();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al recibir orden');
    }
  };

  const cancelarOrden = async (idOrden) => {
    if (!window.confirm('Se cancelara esta orden. Continuar?')) return;
    limpiarMensajes();
    try {
      await api.post(`/Inventario/ordenes-compra/${idOrden}/cancelar`);
      setMensaje('Orden cancelada');
      await recargarTodo();
      if (sucursalFiltro) await cargarChecklist();
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cancelar orden');
    }
  };

  const maxStock = Math.max(1, ...items.map((x) => Number(x.stock_Actual || 0)));
  const tabOptions = ['resumen', 'checklist', 'items', 'movimientos', 'compras', 'ordenes', 'recetas', 'kardex'];

  const handleTabKeydown = (event, currentTab) => {
    const currentIndex = tabOptions.indexOf(currentTab);
    if (currentIndex < 0) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setTab(tabOptions[(currentIndex + 1) % tabOptions.length]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setTab(tabOptions[(currentIndex - 1 + tabOptions.length) % tabOptions.length]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setTab(tabOptions[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      setTab(tabOptions[tabOptions.length - 1]);
    }
  };

  const exportarItems = () => {
    exportToExcelCsv(
      'inventario_items.csv',
      ['Id', 'Sucursal', 'Codigo', 'Nombre', 'Unidad', 'Stock inicial', 'Stock actual', 'Stock minimo', 'Costo referencia', 'Estado'],
      itemsFiltrados.map((x) => [
        x.id_Inventario_Item,
        x.sucursal,
        x.codigo,
        x.nombre,
        x.unidad_Medida,
        Number(x.stock_Inicial || 0).toFixed(3),
        Number(x.stock_Actual || 0).toFixed(3),
        Number(x.stock_Minimo || 0).toFixed(3),
        Number(x.costo_Referencia || 0).toFixed(2),
        x.activo ? 'ACTIVO' : 'INACTIVO'
      ])
    );
  };

  const exportarMovimientos = () => {
    exportToExcelCsv(
      'inventario_movimientos.csv',
      ['Fecha', 'Sucursal', 'Item', 'Tipo', 'Cantidad', 'Unidad', 'Costo unitario', 'Referencia', 'Observacion', 'Usuario'],
      movimientos.map((m) => [
        formatDateTimeHN(m.fecha),
        m.sucursal,
        m.item,
        m.tipo,
        Number(m.cantidad || 0).toFixed(3),
        m.unidad_Medida,
        Number(m.costo_Unitario || 0).toFixed(2),
        m.referencia,
        m.observacion,
        m.usuario
      ])
    );
  };

  const exportarCompras = () => {
    exportToExcelCsv(
      'inventario_compras.csv',
      ['Id compra', 'Fecha', 'Proveedor', 'Sucursal', 'Usuario', 'Total', 'Observacion'],
      compras.map((c) => [
        c.id_Compra_Proveedor,
        formatDateTimeHN(c.fecha),
        c.proveedor,
        c.sucursal,
        c.usuario,
        Number(c.total || 0).toFixed(2),
        c.observacion
      ])
    );
  };

  const exportarStockCritico = () => {
    exportToExcelCsv(
      'inventario_stock_critico.csv',
      ['Id', 'Sucursal', 'Codigo', 'Nombre', 'Unidad', 'Stock actual', 'Stock minimo'],
      itemsStockBajo.map((x) => [
        x.id_Inventario_Item,
        x.sucursal,
        x.codigo,
        x.nombre,
        x.unidad_Medida,
        Number(x.stock_Actual || 0).toFixed(3),
        Number(x.stock_Minimo || 0).toFixed(3)
      ])
    );
  };

  const exportarOrdenesCompra = () => {
    exportToExcelCsv(
      'inventario_ordenes_compra.csv',
      ['Id', 'Fecha', 'Estado', 'Proveedor', 'Sucursal', 'Total', 'Observacion'],
      ordenesCompra.map((x) => [
        x.id_Compra_Proveedor,
        formatDateTimeHN(x.fecha),
        x.estado,
        x.proveedor,
        x.sucursal,
        Number(x.total || 0).toFixed(2),
        x.observacion
      ])
    );
  };

  return (
    <div className="inv-page">
      <h2 className="mb-4">Inventario</h2>
      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <details className="card shadow-sm mb-4 inventario-guia border border-primary border-opacity-25" open>
        <summary className="px-3 py-3 fw-semibold user-select-none bg-primary-subtle rounded-top">
          Como funciona el inventario (tocar para ver u ocultar)
        </summary>
        <div className="card-body border-top py-3">
          <ol className="small ps-3 lh-lg mb-3">
            <li>
              <strong>Proveedores:</strong> alta de proveedores antes de registrar compras con nombre claro.
            </li>
            <li>
              <strong>Insumos:</strong> materia prima por sucursal (elige sucursal arriba). Pon <em>stock minimo</em> para alertas en resumen.
            </li>
            <li>
              <strong>Compras:</strong> cuando entra mercaderia desde proveedor; suma stock y deja costo (equivalente a movimiento COMPRA).
            </li>
            <li>
              <strong>Movimientos:</strong> entradas/salidas manuales o ajustes (mermas, donaciones). Para compras usa la pestaña Compras.
            </li>
            <li>
              <strong>Recetas:</strong> cuanto insumo descuenta cada producto al vendarse en POS; opcional por presentacion (8/12 oz).
            </li>
            <li>
              <strong>Kardex:</strong> auditoria por insumo: entradas, salidas y saldo en el rango de fechas.
            </li>
            <li>
              <strong>Checklist:</strong> pestaña con pendientes de la sucursal: stock bajo, ordenes de compra sin recibir y productos en POS sin receta.
            </li>
          </ol>
          <p className="small text-muted mb-0">
            <strong>Cobro POS:</strong> el stock baja solo si existe receta para ese producto (y presentacion si aplica). Sin receta, la venta no mueve inventario.
          </p>
        </div>
      </details>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Sucursal</label>
              <select className="form-select" value={sucursalFiltro} onChange={(e) => setSucursalFiltro(e.target.value)}>
                <option value="">Todas</option>
                {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="verInactivosInventario"
                  checked={mostrarInactivos}
                  onChange={(e) => setMostrarInactivos(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="verInactivosInventario">Ver inactivos</label>
              </div>
            </div>
            <div className="col-12">
              <p className="small text-muted mb-0">
                Casi todo (insumos, movimientos, compras, kardex) filtra por la sucursal elegida. Cambia de sucursal para trabajar otra tienda.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="reports-tabs inventario-tabs mb-3" role="tablist" aria-label="Secciones inventario">
        <button type="button" role="tab" aria-selected={tab === 'resumen'} aria-controls="panel-inventario-resumen" id="tab-inventario-resumen" className={`btn btn-sm ${tab === 'resumen' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'resumen')} onClick={() => setTab('resumen')}>Resumen</button>
        <button type="button" role="tab" aria-selected={tab === 'checklist'} aria-controls="panel-inventario-checklist" id="tab-inventario-checklist" className={`btn btn-sm ${tab === 'checklist' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'checklist')} onClick={() => setTab('checklist')}>Checklist</button>
        <button type="button" role="tab" aria-selected={tab === 'items'} aria-controls="panel-inventario-items" id="tab-inventario-items" className={`btn btn-sm ${tab === 'items' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'items')} onClick={() => setTab('items')}>Insumos</button>
        <button type="button" role="tab" aria-selected={tab === 'movimientos'} aria-controls="panel-inventario-movimientos" id="tab-inventario-movimientos" className={`btn btn-sm ${tab === 'movimientos' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'movimientos')} onClick={() => setTab('movimientos')}>Movimientos</button>
        <button type="button" role="tab" aria-selected={tab === 'compras'} aria-controls="panel-inventario-compras" id="tab-inventario-compras" className={`btn btn-sm ${tab === 'compras' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'compras')} onClick={() => setTab('compras')}>Compras</button>
        <button type="button" role="tab" aria-selected={tab === 'ordenes'} aria-controls="panel-inventario-ordenes" id="tab-inventario-ordenes" className={`btn btn-sm ${tab === 'ordenes' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'ordenes')} onClick={() => setTab('ordenes')}>Ordenes OC</button>
        <button type="button" role="tab" aria-selected={tab === 'recetas'} aria-controls="panel-inventario-recetas" id="tab-inventario-recetas" className={`btn btn-sm ${tab === 'recetas' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'recetas')} onClick={() => setTab('recetas')}>Recetas</button>
        <button type="button" role="tab" aria-selected={tab === 'kardex'} aria-controls="panel-inventario-kardex" id="tab-inventario-kardex" className={`btn btn-sm ${tab === 'kardex' ? 'btn-dark' : 'btn-outline-secondary'}`} onKeyDown={(e) => handleTabKeydown(e, 'kardex')} onClick={() => setTab('kardex')}>Kardex</button>
      </div>

      {tab === 'resumen' && (
        <div className="row g-3" role="tabpanel" id="panel-inventario-resumen" aria-labelledby="tab-inventario-resumen">
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="small text-muted">Total insumos</div>
                <div className="h3 mb-0">{resumen.totalItems}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="small text-muted">Stock bajo</div>
                <div className="h3 mb-0 text-danger">{resumen.itemsStockBajo}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="small text-muted">% en riesgo</div>
                <div className="h3 mb-0">{Number(resumen.porcentajeBajo || 0).toFixed(2)}%</div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="small text-muted">Alertas de cobertura ({'<='} 7 dias)</div>
                <div className="h3 mb-0 text-warning">{Number(dashboardAvanzado.alertas || 0)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="small text-muted">Valor total de stock</div>
                <div className="h3 mb-0">{formatCurrencyHNL(dashboardAvanzado.valorStockTotal)}</div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Insumos con stock critico</h5>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={exportarStockCritico}>Excel</button>
                </div>
                {itemsStockBajo.length === 0 ? (
                  <div className="text-muted">No hay insumos en stock bajo.</div>
                ) : (
                  <div className="inventory-bars">
                    {itemsStockBajo.slice(0, 15).map((item) => {
                      const value = Number(item.stock_Actual || 0);
                      const width = Math.max(5, (value / maxStock) * 100);
                      return (
                        <div className="inventory-bar-row" key={item.id_Inventario_Item}>
                          <div className="inventory-bar-label">{item.nombre}</div>
                          <div className="inventory-bar-track">
                            <div className="inventory-bar-fill danger" style={{ width: `${width}%` }} />
                          </div>
                          <div className="inventory-bar-value">{value.toFixed(3)} {item.unidad_Medida}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">Cobertura de inventario (top riesgo)</h5>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr>
                        <th title="Codigo interno del insumo">Codigo</th>
                        <th title="Nombre del insumo en catalogo">Insumo</th>
                        <th title="Saldo calculado con movimientos">Stock actual</th>
                        <th title="Promedio de salidas ultimos 30 dias / 30">Consumo diario</th>
                        <th title="Dias que alcanza el stock si sigue el ritmo de salida">Cobertura (dias)</th>
                        <th title="CRITICO: bajo minimo o menos de 3 dias; ALERTA: menos de 7 dias">Nivel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardAvanzado.items || []).slice(0, 20).map((x) => (
                        <tr key={`cov-${x.id_Inventario_Item}`}>
                          <td>{x.codigo}</td>
                          <td>{x.nombre}</td>
                          <td>{Number(x.stock_Actual || 0).toFixed(3)} {x.unidad_Medida}</td>
                          <td>{Number(x.consumo_Diario_Prom || 0).toFixed(3)}</td>
                          <td>{x.cobertura_Dias == null ? 'N/A' : Number(x.cobertura_Dias).toFixed(2)}</td>
                          <td>
                            <span className={`status-pill ${x.nivel === 'CRITICO' ? 'inactive' : x.nivel === 'ALERTA' ? 'warning' : 'active'}`}>
                              {x.nivel}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!(dashboardAvanzado.items || []).length && (
                        <tr><td colSpan="6" className="text-center">Sin datos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="row g-3" role="tabpanel" id="panel-inventario-checklist" aria-labelledby="tab-inventario-checklist">
          {!sucursalFiltro ? (
            <div className="col-12">
              <div className="alert alert-warning mb-0">Elige una sucursal arriba para ver el checklist operativo.</div>
            </div>
          ) : (
            <>
              {checklistError && <div className="col-12 alert alert-danger py-2">{checklistError}</div>}
              <div className="col-12 d-flex flex-wrap gap-2 align-items-center mb-1">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => cargarChecklist()}>
                  Actualizar checklist
                </button>
                <span className="small text-muted">Misma sucursal que el selector superior.</span>
              </div>
              <div className="col-lg-4">
                <div className="card shadow-sm border-danger border-opacity-25 h-100">
                  <div className="card-body">
                    <h5 className="h6 text-danger">Stock bajo o en minimo</h5>
                    <div className="display-6 fs-4 fw-bold">{checklistData?.stockBajoCount ?? '—'}</div>
                    <p className="small text-muted mb-2">Stock actual menor o igual al minimo configurado.</p>
                    <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                      <table className="table table-sm table-bordered align-middle mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th title="Codigo del insumo">Cod.</th>
                            <th title="Nombre del insumo">Insumo</th>
                            <th title="Cantidad disponible hoy">Stock</th>
                            <th title="Stock minimo de alerta">Min.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(checklistData?.stockBajo || []).map((x) => (
                            <tr key={x.id_Inventario_Item}>
                              <td>{x.codigo}</td>
                              <td>{x.nombre}</td>
                              <td className="text-danger fw-semibold">{Number(x.stock_Actual || 0).toFixed(3)}</td>
                              <td>{Number(x.stock_Minimo || 0).toFixed(3)}</td>
                            </tr>
                          ))}
                          {checklistData && (checklistData.stockBajo || []).length === 0 && (
                            <tr><td colSpan="4" className="text-center text-muted">Ninguno</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="btn btn-outline-primary btn-sm mt-2 w-100" onClick={() => setTab('items')}>
                      Ir a Insumos
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="card shadow-sm border-warning border-opacity-50 h-100">
                  <div className="card-body">
                    <h5 className="h6 text-warning-emphasis">Ordenes de compra pendientes</h5>
                    <div className="display-6 fs-4 fw-bold">{checklistData?.ordenesPendientesCount ?? '—'}</div>
                    <p className="small text-muted mb-2">Estado BORRADOR o APROBADA (aun no RECIBIDA).</p>
                    <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                      <table className="table table-sm table-bordered align-middle mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th title="Identificador interno">Id</th>
                            <th title="Estado del flujo de la OC">Estado</th>
                            <th title="Proveedor asociado">Proveedor</th>
                            <th title="Monto total de la orden">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(checklistData?.ordenesPendientes || []).map((o) => (
                            <tr key={o.id_Compra_Proveedor}>
                              <td>{o.id_Compra_Proveedor}</td>
                              <td>{o.estado}</td>
                              <td>{o.proveedor}</td>
                              <td>{formatCurrencyHNL(o.total)}</td>
                            </tr>
                          ))}
                          {checklistData && (checklistData.ordenesPendientes || []).length === 0 && (
                            <tr><td colSpan="4" className="text-center text-muted">Ninguna</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="btn btn-outline-primary btn-sm mt-2 w-100" onClick={() => setTab('ordenes')}>
                      Ir a Ordenes OC
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="card shadow-sm border-primary border-opacity-25 h-100">
                  <div className="card-body">
                    <h5 className="h6 text-primary">POS sin receta de inventario</h5>
                    <div className="display-6 fs-4 fw-bold">{checklistData?.productosSinRecetaCount ?? '—'}</div>
                    <p className="small text-muted mb-2">
                      Tienen precio en esta sucursal pero no hay receta que aplique: al vender, <strong>no</strong> baja insumo.
                    </p>
                    <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                      <table className="table table-sm table-bordered align-middle mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th title="Producto en menu / POS">Producto</th>
                            <th title="Presentacion en POS, vacio si es precio simple">Tamano</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(checklistData?.productosSinReceta || []).map((p, idx) => (
                            <tr key={`${p.id_Producto}-${p.id_Presentacion ?? 'n'}-${idx}`}>
                              <td>{p.producto}</td>
                              <td>{p.presentacion || '—'}</td>
                            </tr>
                          ))}
                          {checklistData && (checklistData.productosSinReceta || []).length === 0 && (
                            <tr><td colSpan="2" className="text-center text-muted">Todos cubiertos</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm mt-2 w-100"
                      onClick={() => {
                        const first = checklistData?.productosSinReceta?.[0];
                        if (first?.id_Producto) {
                          setRecetaForm((prev) => ({
                            ...prev,
                            id_Producto: String(first.id_Producto),
                            id_Presentacion: first.id_Presentacion != null ? String(first.id_Presentacion) : ''
                          }));
                        }
                        setTab('recetas');
                      }}
                    >
                      Ir a Recetas
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'items' && (
        <div className="row g-4" role="tabpanel" id="panel-inventario-items" aria-labelledby="tab-inventario-items">
          <div className="col-md-5">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">{itemEditandoId ? 'Editar insumo' : 'Nuevo insumo'}</h5>
                <form className="row g-2" onSubmit={guardarItem}>
                  <div className="col-12">
                    <label className="form-label">Sucursal</label>
                    <select className="form-select" value={itemForm.id_Sucursal} onChange={(e) => setItemForm((prev) => ({ ...prev, id_Sucursal: e.target.value }))} required>
                      <option value="">Seleccione</option>
                      {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-5">
                    <label className="form-label">Codigo</label>
                    <input className="form-control" value={itemForm.codigo} onChange={(e) => setItemForm((prev) => ({ ...prev, codigo: e.target.value }))} required />
                  </div>
                  <div className="col-7">
                    <label className="form-label">Nombre</label>
                    <input className="form-control" value={itemForm.nombre} onChange={(e) => setItemForm((prev) => ({ ...prev, nombre: e.target.value }))} required />
                  </div>
                  <div className="col-4">
                    <label className="form-label">Unidad</label>
                    <input className="form-control" value={itemForm.unidad_Medida} onChange={(e) => setItemForm((prev) => ({ ...prev, unidad_Medida: e.target.value }))} required />
                  </div>
                  <div className="col-4">
                    <label className="form-label">Stock inicial</label>
                    <input type="number" min="0" step="0.001" className="form-control" value={itemForm.stock_Inicial} onChange={(e) => setItemForm((prev) => ({ ...prev, stock_Inicial: e.target.value }))} />
                  </div>
                  <div className="col-4">
                    <label className="form-label">Stock minimo</label>
                    <input type="number" min="0" step="0.001" className="form-control" value={itemForm.stock_Minimo} onChange={(e) => setItemForm((prev) => ({ ...prev, stock_Minimo: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Costo referencia</label>
                    <input type="number" min="0" step="0.01" className="form-control" value={itemForm.costo_Referencia} onChange={(e) => setItemForm((prev) => ({ ...prev, costo_Referencia: e.target.value }))} />
                  </div>
                  <div className="col-6 d-flex align-items-end">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" checked={!!itemForm.activo} onChange={(e) => setItemForm((prev) => ({ ...prev, activo: e.target.checked }))} />
                      <label className="form-check-label">Activo</label>
                    </div>
                  </div>
                  <div className="col-6">
                    <button className="btn btn-dark w-100" type="submit">{itemEditandoId ? 'Actualizar' : 'Guardar'}</button>
                  </div>
                  <div className="col-6">
                    <button className="btn btn-outline-secondary w-100" type="button" onClick={() => { setItemEditandoId(null); setItemForm({ ...emptyItem, id_Sucursal: sucursalFiltro }); }}>Limpiar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-7">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="module-filters-bar mb-3">
                  <h5 className="mb-0">Catalogo de insumos</h5>
                  <div className="module-filters-main d-flex">
                    <input className="form-control module-filter-input" placeholder="Buscar..." value={filtroItems} onChange={(e) => setFiltroItems(e.target.value)} />
                    <button type="button" className="btn btn-outline-success btn-sm" onClick={exportarItems}>Excel</button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr>
                        <th title="Codigo interno o SKU">Codigo</th>
                        <th title="Descripcion del insumo">Nombre</th>
                        <th title="Stock actual calculado">Stock</th>
                        <th title="Umbral para alertas de compra">Min</th>
                        <th title="Unidad de medida (lb, unidad, etc.)">Unidad</th>
                        <th title="Activo o inactivo en catalogo">Estado</th>
                        <th title="Editar o inactivar">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsFiltrados.map((item) => (
                        <tr key={item.id_Inventario_Item}>
                          <td>{item.codigo}</td>
                          <td>{item.nombre}</td>
                          <td className={Number(item.stock_Actual || 0) <= Number(item.stock_Minimo || 0) ? 'text-danger fw-semibold' : ''}>{Number(item.stock_Actual || 0).toFixed(3)}</td>
                          <td>{Number(item.stock_Minimo || 0).toFixed(3)}</td>
                          <td>{item.unidad_Medida}</td>
                          <td><span className={`status-pill ${item.activo ? 'active' : 'inactive'}`}>{item.activo ? 'Activo' : 'Inactivo'}</span></td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-outline-primary" onClick={() => editarItem(item)}>Editar</button>
                              {item.activo ? (
                                <button className="btn btn-sm btn-outline-warning" onClick={() => inactivarItem(item)}>Inactivar</button>
                              ) : (
                                <button className="btn btn-sm btn-outline-success" onClick={() => reactivarItem(item)}>Reactivar</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {itemsFiltrados.length === 0 && (
                        <tr><td colSpan="7" className="text-center">Sin insumos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'movimientos' && (
        <div className="row g-4" role="tabpanel" id="panel-inventario-movimientos" aria-labelledby="tab-inventario-movimientos">
          <div className="col-md-5">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-2">Registrar movimiento</h5>
                <p className="small text-muted mb-3">
                  Compras con proveedor van en la pestaña <strong>Compras</strong>. Aqui solo ajustes, mermas, traslados internos o correcciones.
                </p>
                <form className="row g-2" onSubmit={registrarMovimiento}>
                  <div className="col-12">
                    <label className="form-label">Insumo</label>
                    <select className="form-select" value={movimientoForm.id_Inventario_Item} onChange={(e) => setMovimientoForm((prev) => ({ ...prev, id_Inventario_Item: e.target.value }))} required>
                      <option value="">Seleccione</option>
                      {items.filter((x) => x.activo).map((item) => <option key={item.id_Inventario_Item} value={item.id_Inventario_Item}>{item.codigo} - {item.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Tipo</label>
                    <select className="form-select" value={movimientoForm.tipo} onChange={(e) => setMovimientoForm((prev) => ({ ...prev, tipo: e.target.value }))}>
                      <option value="ENTRADA">ENTRADA</option>
                      <option value="SALIDA">SALIDA</option>
                      <option value="AJUSTE_POSITIVO">AJUSTE_POSITIVO</option>
                      <option value="AJUSTE_NEGATIVO">AJUSTE_NEGATIVO</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Cantidad</label>
                    <input type="number" min="0.001" step="0.001" className="form-control" value={movimientoForm.cantidad} onChange={(e) => setMovimientoForm((prev) => ({ ...prev, cantidad: e.target.value }))} required />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Costo unitario</label>
                    <input type="number" min="0" step="0.01" className="form-control" value={movimientoForm.costo_Unitario} onChange={(e) => setMovimientoForm((prev) => ({ ...prev, costo_Unitario: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Referencia</label>
                    <input className="form-control" value={movimientoForm.referencia} onChange={(e) => setMovimientoForm((prev) => ({ ...prev, referencia: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Observacion</label>
                    <input className="form-control" value={movimientoForm.observacion} onChange={(e) => setMovimientoForm((prev) => ({ ...prev, observacion: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-dark w-100" type="submit">Guardar movimiento</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-7">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Historial de movimientos</h5>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={exportarMovimientos}>Excel</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr>
                        <th title="Fecha y hora del movimiento">Fecha</th>
                        <th title="Insumo afectado">Item</th>
                        <th title="ENTRADA, SALIDA, COMPRA, AJUSTE...">Tipo</th>
                        <th title="Cantidad en unidad del insumo">Cant.</th>
                        <th title="Costo unitario registrado">Costo</th>
                        <th title="Texto libre de referencia">Ref.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m) => (
                        <tr key={m.id_Movimiento_Inventario}>
                          <td>{formatDateTimeHN(m.fecha)}</td>
                          <td>{m.item}</td>
                          <td>{m.tipo}</td>
                          <td>{Number(m.cantidad || 0).toFixed(3)} {m.unidad_Medida}</td>
                          <td>{formatCurrencyHNL(m.costo_Unitario)}</td>
                          <td>{m.referencia}</td>
                        </tr>
                      ))}
                      {movimientos.length === 0 && (
                        <tr><td colSpan="6" className="text-center">Sin movimientos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'compras' && (
        <div className="row g-4" role="tabpanel" id="panel-inventario-compras" aria-labelledby="tab-inventario-compras">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-2">Registrar compra a proveedor</h5>
                <p className="small text-muted mb-3">
                  Registra cuando la mercaderia ya ingreso con factura o vale. Los insumos de cada linea deben pertenecer a la misma sucursal; el sistema suma stock y registra compra para esa tienda.
                </p>
                <form className="row g-2" onSubmit={registrarCompra}>
                  <div className="col-12">
                    <label className="form-label">Proveedor</label>
                    <select className="form-select" value={compraForm.id_Proveedor} onChange={(e) => setCompraForm((prev) => ({ ...prev, id_Proveedor: e.target.value }))} required>
                      <option value="">Seleccione</option>
                      {proveedores.map((p) => <option key={p.id_Proveedor} value={p.id_Proveedor}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Observacion</label>
                    <input className="form-control" value={compraForm.observacion} onChange={(e) => setCompraForm((prev) => ({ ...prev, observacion: e.target.value }))} />
                  </div>

                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Detalles</strong>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addDetalleCompra}>Agregar linea</button>
                    </div>
                    {(compraForm.detalles || []).map((d, i) => (
                      <div className="row g-2 mb-2" key={`compra-det-${i}`}>
                        <div className="col-5">
                          <select className="form-select" value={d.id_Inventario_Item} onChange={(e) => updateDetalleCompra(i, 'id_Inventario_Item', e.target.value)} required>
                            <option value="">Insumo</option>
                            {items.filter((x) => x.activo).map((item) => (
                              <option key={item.id_Inventario_Item} value={item.id_Inventario_Item}>{item.codigo} - {item.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-3">
                          <input type="number" min="0.001" step="0.001" className="form-control" placeholder="Cant." value={d.cantidad} onChange={(e) => updateDetalleCompra(i, 'cantidad', e.target.value)} required />
                        </div>
                        <div className="col-3">
                          <input type="number" min="0" step="0.01" className="form-control" placeholder="Costo" value={d.costo_Unitario} onChange={(e) => updateDetalleCompra(i, 'costo_Unitario', e.target.value)} required />
                        </div>
                        <div className="col-1">
                          <button type="button" className="btn btn-outline-danger w-100" onClick={() => removeDetalleCompra(i)} disabled={(compraForm.detalles || []).length <= 1}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="col-12 d-flex justify-content-between align-items-center">
                    <strong>Total compra:</strong>
                    <strong>L {totalCompra.toFixed(2)}</strong>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-dark w-100" type="submit">Guardar compra</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Historial de compras</h5>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={exportarCompras}>Excel</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr>
                        <th title="Fecha de registro de la compra">Fecha</th>
                        <th title="Proveedor de la factura">Proveedor</th>
                        <th title="Sucursal que recibio el stock">Sucursal</th>
                        <th title="Total Lempiras de la compra">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.map((c) => (
                        <tr key={c.id_Compra_Proveedor}>
                          <td>{formatDateTimeHN(c.fecha)}</td>
                          <td>{c.proveedor}</td>
                          <td>{c.sucursal}</td>
                          <td>{formatCurrencyHNL(c.total)}</td>
                        </tr>
                      ))}
                      {compras.length === 0 && (
                        <tr><td colSpan="4" className="text-center">Sin compras</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'ordenes' && (
        <div className="row g-4" role="tabpanel" id="panel-inventario-ordenes" aria-labelledby="tab-inventario-ordenes">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">Nueva orden de compra</h5>
                <form className="row g-2" onSubmit={crearOrdenCompra}>
                  <div className="col-12">
                    <label className="form-label">Proveedor</label>
                    <select className="form-select" value={ordenForm.id_Proveedor} onChange={(e) => setOrdenForm((prev) => ({ ...prev, id_Proveedor: e.target.value }))} required>
                      <option value="">Seleccione</option>
                      {proveedores.map((p) => <option key={p.id_Proveedor} value={p.id_Proveedor}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Observacion</label>
                    <input className="form-control" value={ordenForm.observacion} onChange={(e) => setOrdenForm((prev) => ({ ...prev, observacion: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Detalles OC</strong>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addDetalleOrden}>Agregar linea</button>
                    </div>
                    {(ordenForm.detalles || []).map((d, i) => (
                      <div className="row g-2 mb-2" key={`orden-det-${i}`}>
                        <div className="col-5">
                          <select className="form-select" value={d.id_Inventario_Item} onChange={(e) => updateDetalleOrden(i, 'id_Inventario_Item', e.target.value)} required>
                            <option value="">Insumo</option>
                            {items.filter((x) => x.activo).map((item) => (
                              <option key={item.id_Inventario_Item} value={item.id_Inventario_Item}>{item.codigo} - {item.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-3">
                          <input type="number" min="0.001" step="0.001" className="form-control" placeholder="Cant." value={d.cantidad} onChange={(e) => updateDetalleOrden(i, 'cantidad', e.target.value)} required />
                        </div>
                        <div className="col-3">
                          <input type="number" min="0" step="0.01" className="form-control" placeholder="Costo" value={d.costo_Unitario} onChange={(e) => updateDetalleOrden(i, 'costo_Unitario', e.target.value)} required />
                        </div>
                        <div className="col-1">
                          <button type="button" className="btn btn-outline-danger w-100" onClick={() => removeDetalleOrden(i)} disabled={(ordenForm.detalles || []).length <= 1}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="col-12 d-flex justify-content-between align-items-center">
                    <strong>Total orden:</strong>
                    <strong>{formatCurrencyHNL(totalOrden)}</strong>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-dark w-100" type="submit">Crear orden (BORRADOR)</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Ordenes de compra</h5>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={exportarOrdenesCompra}>Excel</button>
                </div>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr>
                        <th title="Numero interno de la orden">Id</th>
                        <th title="Fecha de creacion">Fecha</th>
                        <th title="Proveedor">Proveedor</th>
                        <th title="BORRADOR, APROBADA, RECIBIDA, CANCELADA">Estado</th>
                        <th title="Total estimado de la OC">Total</th>
                        <th title="Aprobar, recibir o cancelar">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenesCompra.map((o) => (
                        <tr key={o.id_Compra_Proveedor}>
                          <td>{o.id_Compra_Proveedor}</td>
                          <td>{formatDateTimeHN(o.fecha)}</td>
                          <td>{o.proveedor}</td>
                          <td><span className={`status-pill ${o.estado === 'RECIBIDA' ? 'active' : o.estado === 'CANCELADA' ? 'inactive' : 'warning'}`}>{o.estado}</span></td>
                          <td>{formatCurrencyHNL(o.total)}</td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              {o.estado === 'BORRADOR' && <button className="btn btn-sm btn-outline-primary" onClick={() => aprobarOrden(o.id_Compra_Proveedor)}>Aprobar</button>}
                              {o.estado === 'APROBADA' && <button className="btn btn-sm btn-outline-success" onClick={() => recibirOrden(o.id_Compra_Proveedor)}>Recibir</button>}
                              {(o.estado === 'BORRADOR' || o.estado === 'APROBADA') && (
                                <button className="btn btn-sm btn-outline-danger" onClick={() => cancelarOrden(o.id_Compra_Proveedor)}>Cancelar</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {ordenesCompra.length === 0 && (
                        <tr><td colSpan="6" className="text-center">Sin ordenes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'recetas' && (
        <div className="row g-4" role="tabpanel" id="panel-inventario-recetas" aria-labelledby="tab-inventario-recetas">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-2">Configurar receta de producto</h5>
                <p className="small text-muted mb-3">
                  Define cuanto insumo consume <strong>una unidad vendida</strong> del producto. Si el producto tiene presentaciones en el menu, puedes receta por tamano o una receta general.
                </p>
                <form className="row g-2" onSubmit={guardarReceta}>
                  <div className="col-12">
                    <label className="form-label">Producto</label>
                    <select className="form-select" value={recetaForm.id_Producto} onChange={(e) => setRecetaForm((prev) => ({ ...prev, id_Producto: e.target.value }))} required>
                      <option value="">Seleccione</option>
                      {productos.filter((x) => x.activo).map((p) => <option key={p.id_Producto} value={p.id_Producto}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Presentacion (opcional)</label>
                    <select className="form-select" value={recetaForm.id_Presentacion} onChange={(e) => setRecetaForm((prev) => ({ ...prev, id_Presentacion: e.target.value }))}>
                      <option value="">General del producto</option>
                      {presentaciones.map((pr) => <option key={pr.id_Presentacion} value={pr.id_Presentacion}>{pr.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Insumos</strong>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addDetalleReceta}>Agregar insumo</button>
                    </div>
                    {(recetaForm.detalles || []).map((d, i) => (
                      <div className="row g-2 mb-2" key={`receta-det-${i}`}>
                        <div className="col-8">
                          <select className="form-select" value={d.id_Inventario_Item} onChange={(e) => updateDetalleReceta(i, 'id_Inventario_Item', e.target.value)} required>
                            <option value="">Insumo</option>
                            {items.filter((x) => x.activo).map((it) => (
                              <option key={it.id_Inventario_Item} value={it.id_Inventario_Item}>{it.codigo} - {it.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-3">
                          <input type="number" min="0.001" step="0.001" className="form-control" placeholder="Cant." value={d.cantidad_Insumo} onChange={(e) => updateDetalleReceta(i, 'cantidad_Insumo', e.target.value)} required />
                        </div>
                        <div className="col-1">
                          <button type="button" className="btn btn-outline-danger w-100" onClick={() => removeDetalleReceta(i)} disabled={(recetaForm.detalles || []).length <= 1}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="col-12">
                    <button className="btn btn-dark w-100" type="submit">Guardar receta</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">Recetas configuradas</h5>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead>
                      <tr>
                        <th title="Producto de venta en POS">Producto</th>
                        <th title="Tamano si aplica; GENERAL si aplica a todos">Presentacion</th>
                        <th title="Insumo que descuenta del stock">Insumo</th>
                        <th title="Cantidad de insumo por 1 unidad vendida">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recetasProducto.map((r) => (
                        <tr key={r.id_Receta_Producto_Insumo}>
                          <td>{r.producto}</td>
                          <td>{r.presentacion || 'GENERAL'}</td>
                          <td>{r.insumo}</td>
                          <td>{Number(r.cantidad_Insumo || 0).toFixed(3)} {r.unidad_Medida}</td>
                        </tr>
                      ))}
                      {recetasProducto.length === 0 && (
                        <tr><td colSpan="4" className="text-center">Sin recetas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'kardex' && (
        <div className="row g-4" role="tabpanel" id="panel-inventario-kardex" aria-labelledby="tab-inventario-kardex">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <form className="row g-2 align-items-end" onSubmit={consultarKardex}>
                  <div className="col-md-4">
                    <label className="form-label">Insumo</label>
                    <select className="form-select" value={kardexFiltro.idItem} onChange={(e) => setKardexFiltro((prev) => ({ ...prev, idItem: e.target.value }))} required>
                      <option value="">Seleccione</option>
                      {items.filter((x) => x.activo).map((item) => (
                        <option key={item.id_Inventario_Item} value={item.id_Inventario_Item}>{item.codigo} - {item.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Desde</label>
                    <input type="datetime-local" className="form-control" value={kardexFiltro.desde} onChange={(e) => setKardexFiltro((prev) => ({ ...prev, desde: e.target.value }))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Hasta</label>
                    <input type="datetime-local" className="form-control" value={kardexFiltro.hasta} onChange={(e) => setKardexFiltro((prev) => ({ ...prev, hasta: e.target.value }))} />
                  </div>
                  <div className="col-md-2">
                    <button className="btn btn-dark w-100" type="submit">Consultar</button>
                  </div>
                </form>
                <p className="small text-muted mb-0 mt-3">
                  Kardex valorizado: cada linea muestra entrada/salida y saldo; el costo sigue un <strong>promedio ponderado</strong> segun movimientos en esa sucursal.
                </p>
              </div>
            </div>
          </div>

          {kardexData && (
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Kardex: {kardexData.codigo} - {kardexData.nombre}</h5>
                    <span className="badge text-bg-light border">
                      Saldo inicial: {Number(kardexData.saldo_Inicial || 0).toFixed(3)} | Saldo final: {Number(kardexData.saldo_Final || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-bordered align-middle">
                      <thead>
                        <tr>
                          <th title="Fecha del movimiento">Fecha</th>
                          <th title="Tipo de movimiento de inventario">Tipo</th>
                          <th title="Cantidad que entra al saldo">Entrada</th>
                          <th title="Cantidad que sale del saldo">Salida</th>
                          <th title="Costo unitario del movimiento">Costo U.</th>
                          <th title="Saldo acumulado despues del movimiento">Saldo</th>
                          <th title="Referencia o documento">Referencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(kardexData.movimientos || []).map((m) => (
                          <tr key={m.id_Movimiento_Inventario}>
                            <td>{formatDateTimeHN(m.fecha)}</td>
                            <td>{m.tipo}</td>
                            <td>{Number(m.entrada || 0).toFixed(3)}</td>
                            <td>{Number(m.salida || 0).toFixed(3)}</td>
                            <td>{formatCurrencyHNL(m.costo_Unitario)}</td>
                            <td>{Number(m.saldo || 0).toFixed(3)}</td>
                            <td>{m.referencia}</td>
                          </tr>
                        ))}
                        {!(kardexData.movimientos || []).length && (
                          <tr><td colSpan="7" className="text-center">Sin movimientos en el rango</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Inventario;
