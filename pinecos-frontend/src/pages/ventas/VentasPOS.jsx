import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { descargarTicketPdf, imprimirHtmlDirecto, imprimirTicketHtml } from '../../utils/printTicket';
import { getUsuario } from '../../utils/auth';
import { formatCurrencyHNL, formatDateTimeHN, formatTimeHN } from '../../utils/formatters';
import FacturaCaiClienteForm, { facturaClienteVacio } from '../../components/factura/FacturaCaiClienteForm';
import CheckoutPayMethodChips from '../../components/checkout/CheckoutPayMethodChips';
import CheckoutServiceToggle from '../../components/checkout/CheckoutServiceToggle';

function VentasPOS() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const idSucursalUsuario = usuario?.id_Sucursal ?? usuario?.id_sucursal ?? null;

  const [cajaActual, setCajaActual] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [productos, setProductos] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [canalPagoCodigo, setCanalPagoCodigo] = useState('');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [tipoServicio, setTipoServicio] = useState('COMER_AQUI');
  const [metodosPago, setMetodosPago] = useState([]);
  const [modoDescuento, setModoDescuento] = useState('NINGUNO');
  const [descuentoManual, setDescuentoManual] = useState('0');
  const [modoImpuesto, setModoImpuesto] = useState('INCLUIDO_15');
  const [impuestoManual, setImpuestoManual] = useState('0');
  const [ajustesVenta, setAjustesVenta] = useState({ descuentos: [], impuestos: [] });
  const [facturacionSar, setFacturacionSar] = useState({ habilitadoCai: false });
  const [emitirFactura, setEmitirFactura] = useState(false);
  const [facturaCliente, setFacturaCliente] = useState(() => facturaClienteVacio());
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [ultimaVentaId, setUltimaVentaId] = useState(null);
  const [ticketPendienteImpresionId, setTicketPendienteImpresionId] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [preCuentaEstado, setPreCuentaEstado] = useState('NINGUNA');
  const [preCuentaFecha, setPreCuentaFecha] = useState(null);
  const [preCuentaHtmlUltima, setPreCuentaHtmlUltima] = useState('');
  const [preCuentaResumenUltima, setPreCuentaResumenUltima] = useState(null);
  const [actualizandoCatalogo, setActualizandoCatalogo] = useState(false);
  const [ultimaActualizacionCatalogo, setUltimaActualizacionCatalogo] = useState(null);
  const cobrarVentaRef = useRef(async () => {});
  /** Oculta catalogo y acorta lista de lineas para ver cobro sin scroll excesivo */
  const [vistaSoloCobro, setVistaSoloCobro] = useState(false);

  const formatearTipoServicio = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'COMER_AQUI') return 'Comer aqui';
    if (normalized === 'LLEVAR') return 'Para llevar';
    return value || '-';
  };

  const cargarCajaActual = async () => {
    try {
      setCargandoCaja(true);
      const response = await api.get('/Dashboard/caja-actual');
      const data = response.data || { abierta: false };
      setCajaActual(data);
      return data;
    } finally {
      setCargandoCaja(false);
    }
  };

  const cargarFacturacionSar = async (idSucursal) => {
    try {
      const params = idSucursal ? { idSucursal: Number(idSucursal) } : undefined;
      const response = await api.get('/FacturacionSar', { params });
      setFacturacionSar(response.data || { habilitadoCai: false });
    } catch {
      setFacturacionSar({ habilitadoCai: false });
    }
  };

  const cargarAjustesVenta = async (idSucursal) => {
    if (!idSucursal) return;
    const response = await api.get('/AjustesVenta', { params: { idSucursal: Number(idSucursal) } });
    setAjustesVenta({
      descuentos: response.data?.descuentos || [],
      impuestos: response.data?.impuestos || []
    });
  };

  const cargarCanalesConfig = async (idSucursal) => {
    try {
      const params = idSucursal ? { idSucursal: Number(idSucursal) } : undefined;
      const response = await api.get('/Cajas/canales-config', { params });
      const activos = (response.data?.metodosPago || []).filter((x) => x.activo);
      setMetodosPago(
        activos.length
          ? activos
          : [{ codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true }]
      );
    } catch {
      setMetodosPago([
        { codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true },
        { codigo: 'TARJETA', nombre: 'Tarjeta', categoria: 'POS', activo: true },
        { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', categoria: 'POS', activo: true }
      ]);
    }
  };

  const cargarMenuSucursal = async (idSucursal) => {
    if (!idSucursal) {
      setProductos([]);
      return;
    }

    const response = await api.get(`/Menu/sucursal/${idSucursal}`);
    const normales = (response.data?.normales || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: null,
      nombre: item.producto,
      categoria: item.categoria || 'Sin categoria',
      precio: Number(item.precio || 0),
      tipo_Fiscal: String(item.tipoFiscal || 'GRAVADO_15').toUpperCase()
    }));

    const conPresentacion = (response.data?.conPresentacion || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: item.id_Presentacion,
      nombre: `${item.producto} - ${item.presentacion || 'Presentacion'}`,
      categoria: item.categoria || 'Sin categoria',
      precio: Number(item.precio || 0),
      tipo_Fiscal: String(item.tipoFiscal || 'GRAVADO_15').toUpperCase()
    }));

    setProductos([...normales, ...conPresentacion].filter((x) => x.precio > 0));
    setUltimaActualizacionCatalogo(new Date().toISOString());
  };

  const obtenerSucursalObjetivo = (caja = cajaActual) =>
    Number(idSucursalUsuario || caja?.id_Sucursal || 0) || null;

  const actualizarCatalogoPos = async ({ manual = false, silent = false } = {}) => {
    const sucursalObjetivo = obtenerSucursalObjetivo();
    if (!sucursalObjetivo) return;

    if (manual) {
      limpiarMensajes();
      setActualizandoCatalogo(true);
    }

    try {
      await cargarMenuSucursal(sucursalObjetivo);
      if (manual && !silent) setMensaje('Catalogo actualizado correctamente.');
    } catch (err) {
      if (!silent) {
        setError(err?.response?.data?.message || 'No se pudo actualizar el catalogo en este momento');
      }
    } finally {
      if (manual) setActualizandoCatalogo(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const caja = await cargarCajaActual();
        const sucursalObjetivo = obtenerSucursalObjetivo(caja);
        await Promise.all([
          cargarMenuSucursal(sucursalObjetivo),
          cargarFacturacionSar(sucursalObjetivo),
          cargarAjustesVenta(sucursalObjetivo),
          cargarCanalesConfig(sucursalObjetivo)
        ]);
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al cargar POS');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!cajaActual?.abierta) return undefined;
    const intervalId = setInterval(() => {
      actualizarCatalogoPos({ manual: false, silent: true });
    }, 30000);
    return () => clearInterval(intervalId);
  }, [cajaActual?.abierta, idSucursalUsuario]);

  useEffect(() => {
    if (!['EFECTIVO', 'POS', 'TRANSFERENCIA', 'OTRO'].includes(metodoPago)) {
      setMetodoPago('EFECTIVO');
    }
  }, [metodoPago]);

  useEffect(() => {
    setEfectivoRecibido('');
  }, [metodoPago]);

  useEffect(() => {
    if (preCuentaEstado !== 'VIGENTE') return;
    invalidarPreCuenta();
  }, [modoDescuento, descuentoManual, modoImpuesto, impuestoManual, metodoPago, tipoServicio, emitirFactura, canalPagoCodigo]);

  const categorias = useMemo(() => {
    const unique = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [productos]);

  const descuentosActivos = useMemo(
    () => (ajustesVenta.descuentos || []).filter((x) => x.activo),
    [ajustesVenta.descuentos]
  );

  const impuestosActivos = useMemo(
    () => (ajustesVenta.impuestos || []).filter((x) => x.activo),
    [ajustesVenta.impuestos]
  );

  useEffect(() => {
    if (!descuentosActivos.some((x) => x.codigo === modoDescuento)) {
      setModoDescuento(descuentosActivos[0]?.codigo || 'NINGUNO');
      setDescuentoManual('0');
    }
  }, [descuentosActivos, modoDescuento]);

  useEffect(() => {
    if (!impuestosActivos.some((x) => x.codigo === modoImpuesto)) {
      setModoImpuesto(impuestosActivos[0]?.codigo || 'INCLUIDO_15');
      setImpuestoManual('0');
    }
  }, [impuestosActivos, modoImpuesto]);

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
    setTicketPendienteImpresionId(null);
  };

  const invalidarPreCuenta = () => {
    setPreCuentaEstado((prev) => (prev === 'VIGENTE' ? 'DESACTUALIZADA' : prev));
  };

  const metodoPagoActivo = useMemo(
    () => (metodosPago || []).find((x) => String(x?.codigo || '').toUpperCase() === String(metodoPago || '').toUpperCase()) || null,
    [metodosPago, metodoPago]
  );
  const categoriaMetodoPago = useMemo(() => {
    const codigo = String(metodoPago || '').toUpperCase();
    const cat = String(metodoPagoActivo?.categoria || '').toUpperCase();
    if (cat) return cat;
    // Respaldo: el chip "Tarjeta / POS" usa codigo POS pero en catálogo suele ser TARJETA; debe cuadrar a categoria POS.
    if (codigo === 'POS' || codigo === 'TARJETA' || codigo === 'TARJETA_POS') return 'POS';
    if (codigo === 'TRANSFERENCIA') return 'POS';
    if (codigo === 'EFECTIVO') return 'EFECTIVO';
    return 'OTRO';
  }, [metodoPago, metodoPagoActivo]);
  const canalesPagoFiltrados = useMemo(() => {
    if (categoriaMetodoPago === 'EFECTIVO') return [];
    return (metodosPago || []).filter((x) => String(x?.categoria || '').toUpperCase() === categoriaMetodoPago);
  }, [metodosPago, categoriaMetodoPago]);

  useEffect(() => {
    if (metodoPago === 'EFECTIVO') {
      setCanalPagoCodigo('');
      return;
    }
    if (!canalesPagoFiltrados.some((x) => x.codigo === canalPagoCodigo)) {
      setCanalPagoCodigo(canalesPagoFiltrados[0]?.codigo || '');
    }
  }, [metodoPago, canalesPagoFiltrados, canalPagoCodigo]);

  const construirContextoAjuste = () =>
    [
      String(modoDescuento || 'NINGUNO').trim().toUpperCase(),
      String(descuentoManual ?? '0').trim(),
      String(modoImpuesto || 'INCLUIDO_15').trim().toUpperCase(),
      String(impuestoManual ?? '0').trim()
    ].join('|');

  const esLineaCortesia = (item) => !!item?.esCortesia;
  const aplicaDescuentoLinea = (item) => !esLineaCortesia(item) && item?.aplicaDescuento !== false;

  const productosFiltrados = useMemo(() => {
    let lista = [...productos];
    if (categoriaSeleccionada) lista = lista.filter((p) => p.categoria === categoriaSeleccionada);
    if (busqueda.trim()) {
      const texto = busqueda.toLowerCase();
      lista = lista.filter((p) => p.nombre?.toLowerCase().includes(texto));
    }
    return lista;
  }, [productos, categoriaSeleccionada, busqueda]);

  const agregarProducto = (producto) => {
    limpiarMensajes();
    if (!cajaActual?.abierta) return setError('Debes abrir caja antes de vender');

    const contextoAjuste = construirContextoAjuste();
    invalidarPreCuenta();
    setCarrito((prev) => {
      const indexExistente = prev.findIndex(
        (item) =>
          Number(item?.id_Producto || 0) === Number(producto.id_Producto || 0) &&
          String(item?.id_Presentacion ?? '') === String(producto.id_Presentacion ?? '') &&
          String(item?.contextoAjuste ?? '') === contextoAjuste &&
          !esLineaCortesia(item) &&
          aplicaDescuentoLinea(item)
      );

      if (indexExistente >= 0) {
        const actual = prev[indexExistente];
        const cantidad = Number(actual?.cantidad || 0) + 1;
        const nuevo = [...prev];
        nuevo[indexExistente] = {
          ...actual,
          cantidad,
          subtotal: cantidad * Number(actual.precio_Unitario || 0)
        };
        return nuevo;
      }

      const nuevoItem = {
        id_Linea: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        id_Producto: producto.id_Producto,
        id_Presentacion: producto.id_Presentacion,
        nombre: producto.nombre,
        tipo_Fiscal: String(producto.tipo_Fiscal || 'GRAVADO_15').toUpperCase(),
        cantidad: 1,
        precio_Lista: Number(producto.precio),
        precio_Unitario: Number(producto.precio),
        subtotal: Number(producto.precio),
        contextoAjuste,
        aplicaDescuento: true,
        esCortesia: false
      };
      // Mostrar primero la linea mas reciente para facilitar correcciones en caja.
      return [nuevoItem, ...prev];
    });
  };

  const incrementarCantidadItem = (index) => {
    invalidarPreCuenta();
    setCarrito((prev) => {
      if (!prev[index]) return prev;
      const itemActual = prev[index];
      const cantidad = Number(itemActual?.cantidad || 0) + 1;
      const nuevo = [...prev];
      nuevo[index] = {
        ...itemActual,
        cantidad,
        subtotal: cantidad * Number(itemActual.precio_Unitario || 0)
      };
      return nuevo;
    });
  };

  const decrementarCantidadItem = (index) => {
    invalidarPreCuenta();
    setCarrito((prev) => {
      if (!prev[index]) return prev;
      const itemActual = prev[index];
      const cantidadActual = Number(itemActual?.cantidad || 0);
      if (cantidadActual <= 1) return prev;
      const cantidad = cantidadActual - 1;
      const nuevo = [...prev];
      nuevo[index] = {
        ...itemActual,
        cantidad,
        subtotal: cantidad * Number(itemActual.precio_Unitario || 0)
      };
      return nuevo;
    });
  };

  const separarLinea = (index) => {
    invalidarPreCuenta();
    setCarrito((prev) => {
      if (!prev[index]) return prev;
      const itemActual = prev[index];
      const cantidadActual = Number(itemActual?.cantidad || 0);
      if (cantidadActual <= 1) return prev;

      const nuevo = [...prev];
      nuevo[index] = {
        ...itemActual,
        cantidad: cantidadActual - 1,
        subtotal: (cantidadActual - 1) * Number(itemActual.precio_Unitario || 0)
      };

      const lineaSeparada = {
        ...itemActual,
        id_Linea: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        cantidad: 1,
        subtotal: Number(itemActual.precio_Unitario || 0)
      };

      return [lineaSeparada, ...nuevo];
    });
  };

  const cambiarAplicaDescuento = (index, aplica) => {
    invalidarPreCuenta();
    setCarrito((prev) => {
      const nuevo = [...prev];
      if (!nuevo[index]) return prev;
      if (esLineaCortesia(nuevo[index])) return prev;
      nuevo[index] = { ...nuevo[index], aplicaDescuento: !!aplica };
      return nuevo;
    });
  };

  const cambiarCortesiaLinea = (index, esCortesia) => {
    invalidarPreCuenta();
    setCarrito((prev) => {
      const nuevo = [...prev];
      const item = nuevo[index];
      if (!item) return prev;

      if (esCortesia) {
        nuevo[index] = {
          ...item,
          esCortesia: true,
          aplicaDescuento: false,
          precio_Unitario: 0,
          subtotal: 0
        };
        return nuevo;
      }

      const precioLista = Number(item?.precio_Lista ?? item?.precio_Unitario ?? 0);
      if (precioLista <= 0) return prev;

      const cantidad = Number(item?.cantidad || 0);
      nuevo[index] = {
        ...item,
        esCortesia: false,
        aplicaDescuento: true,
        precio_Unitario: precioLista,
        subtotal: cantidad * precioLista
      };
      return nuevo;
    });
  };

  const aplicarDescuentoATodasLasLineas = (aplica) => {
    invalidarPreCuenta();
    setCarrito((prev) =>
      prev.map((item) =>
        esLineaCortesia(item)
          ? { ...item, aplicaDescuento: false }
          : { ...item, aplicaDescuento: !!aplica }
      )
    );
  };

  const quitarItemPorLinea = (idLinea, index) => {
    limpiarMensajes();
    invalidarPreCuenta();
    setCarrito((prev) => prev.filter((item, i) => (idLinea ? item.id_Linea !== idLinea : i !== index)));
  };

  const limpiarCarrito = () => {
    limpiarMensajes();
    setCarrito([]);
    setUltimaVentaId(null);
    setModoDescuento('NINGUNO');
    setDescuentoManual('0');
    setModoImpuesto('INCLUIDO_15');
    setImpuestoManual('0');
    setEmitirFactura(false);
    setEfectivoRecibido('');
    setTipoServicio('COMER_AQUI');
    setPreCuentaEstado('NINGUNA');
    setPreCuentaFecha(null);
    setPreCuentaHtmlUltima('');
    setPreCuentaResumenUltima(null);
  };

  const subtotal = carrito.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const baseDescuento = carrito
    .filter((item) => aplicaDescuentoLinea(item))
    .reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const lineasConDescuento = carrito.filter((item) => aplicaDescuentoLinea(item)).length;

  const descuentoSeleccionado = descuentosActivos.find((x) => x.codigo === modoDescuento) || null;
  const impuestoSeleccionado = impuestosActivos.find((x) => x.codigo === modoImpuesto) || null;

  const descuentoCalculado = useMemo(() => {
    if (!descuentoSeleccionado) return 0;
    if (baseDescuento <= 0) return 0;
    const tipo = String(descuentoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(descuentoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return Math.min(baseDescuento, baseDescuento * (valor / 100));
    if (tipo === 'MONTO') {
      const monto = descuentoSeleccionado.permiteEditarMonto ? Number(descuentoManual || 0) : valor;
      return Math.min(baseDescuento, Math.max(0, monto));
    }
    return 0;
  }, [descuentoSeleccionado, descuentoManual, baseDescuento]);

  const { impuestoCalculado, impuestoIncluidoEnSubtotal } = useMemo(() => {
    if (!impuestoSeleccionado) return { impuestoCalculado: 0, impuestoIncluidoEnSubtotal: false };
    const tipo = String(impuestoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(impuestoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return { impuestoCalculado: subtotal * (valor / 100), impuestoIncluidoEnSubtotal: false };
    if (tipo === 'MONTO') {
      return {
        impuestoCalculado: impuestoSeleccionado.permiteEditarMonto ? Number(impuestoManual || 0) : valor,
        impuestoIncluidoEnSubtotal: false
      };
    }
    if (tipo === 'INCLUIDO_PORCENTAJE') {
      const imp = subtotal > 0 ? subtotal * (valor / (100 + valor)) : 0;
      return { impuestoCalculado: imp, impuestoIncluidoEnSubtotal: true };
    }
    return { impuestoCalculado: 0, impuestoIncluidoEnSubtotal: false };
  }, [impuestoSeleccionado, impuestoManual, subtotal]);

  const subtotalBase = subtotal - (impuestoIncluidoEnSubtotal ? impuestoCalculado : 0);
  const total = subtotalBase - descuentoCalculado + impuestoCalculado;
  const soloCortesia = useMemo(
    () => carrito.length > 0 && carrito.every((item) => esLineaCortesia(item)),
    [carrito]
  );
  const canalPagoSeleccionado = canalesPagoFiltrados.find((x) => x.codigo === canalPagoCodigo) || null;
  const esPagoEnEfectivo = String(metodoPago || '').toUpperCase() === 'EFECTIVO';
  const efectivoRecibidoNum = Number(efectivoRecibido || 0);
  const cambioCalculado = esPagoEnEfectivo ? efectivoRecibidoNum - total : 0;

  const tieneLineasInvalidas = useMemo(
    () =>
      carrito.some(
        (item) =>
          Number(item?.cantidad || 0) <= 0 ||
          (!esLineaCortesia(item) && Number(item?.precio_Unitario || 0) <= 0)
      ),
    [carrito]
  );

  const escaparHtml = (valor) =>
    String(valor ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const construirHtmlPreCuenta = () => {
    const fecha = new Date();
    const filas = carrito.map((item) => `
      <tr>
        <td>${escaparHtml(item.nombre)}</td>
        <td class="num">${Number(item.cantidad || 0).toFixed(2)}</td>
        <td class="num">L ${Number(item.precio_Unitario || 0).toFixed(2)}</td>
        <td class="num">L ${Number(item.subtotal || 0).toFixed(2)}</td>
      </tr>
      ${esLineaCortesia(item) ? `<tr><td colspan="4" class="muted">Cortesia aplicada (sin cobro)</td></tr>` : ''}
    `).join('');

    return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pre-cuenta</title>
  <style>
    * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, sans-serif; }
    html, body { margin: 0; padding: 0; overflow-x: hidden; max-width: 100%; }
    body { color: #111827; background: #fff; font-size: 11px; }
    .ticket { width: 100%; max-width: 56mm; margin: 0 auto; padding: 2.5mm 2mm; }
    .center { text-align: center; }
    .muted { color: #4b5563; font-size: 9.5px; }
    .linea { border-top: 1px dashed #9ca3af; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { padding: 3px 2px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
    th { font-size: 9px; color: #374151; text-align: left; border-bottom: 1px solid #e5e7eb; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    th:nth-child(1), td:nth-child(1) { width: 43%; }
    th:nth-child(2), td:nth-child(2) { width: 15%; }
    th:nth-child(3), td:nth-child(3) { width: 21%; }
    th:nth-child(4), td:nth-child(4) { width: 21%; }
    .totales .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .total-final { font-size: 14px; font-weight: 800; }
    @media print {
      @page { size: 58mm auto; margin: 0.8mm 1mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="center"><strong>PRE-CUENTA</strong></div>
    <div class="center muted">Cafe Pinecos</div>
    <div class="center muted">Caja #${escaparHtml(cajaActual?.id_Caja || '-')} | ${escaparHtml(formatearTipoServicio(tipoServicio))}</div>
    <div class="center muted">${escaparHtml(fecha.toLocaleString())}</div>
    <div class="linea"></div>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th class="num">Cant</th>
          <th class="num">Precio</th>
          <th class="num">Subt.</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="linea"></div>
    <div class="totales">
      <div class="row"><span>Subtotal base</span><strong>L ${subtotalBase.toFixed(2)}</strong></div>
      <div class="row"><span>Descuento</span><strong>L ${descuentoCalculado.toFixed(2)}</strong></div>
      <div class="row"><span>Impuesto</span><strong>L ${impuestoCalculado.toFixed(2)}</strong></div>
      <div class="row total-final"><span>Total estimado</span><span>L ${total.toFixed(2)}</span></div>
    </div>
    <div class="linea"></div>
    <div class="center muted">Documento informativo - No es comprobante fiscal</div>
    <div class="center muted">Plataforma empresarial por NesSys</div>
  </div>
</body>
</html>`;
  };

  const cantidadEnCarritoPorProducto = (producto) =>
    carrito
      .filter(
        (item) =>
          Number(item?.id_Producto || 0) === Number(producto?.id_Producto || 0) &&
          String(item?.id_Presentacion ?? '') === String(producto?.id_Presentacion ?? '')
      )
      .reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
  const unidadesTotales = useMemo(
    () => carrito.reduce((acc, item) => acc + Number(item.cantidad || 0), 0),
    [carrito]
  );

  useEffect(() => {
    if (!emitirFactura) setFacturaCliente(facturaClienteVacio());
  }, [emitirFactura]);

  useEffect(() => {
    if (carrito.length === 0) setVistaSoloCobro(false);
  }, [carrito.length]);

  useEffect(() => {
    if (preCuentaEstado === 'VIGENTE' && carrito.length > 0) setVistaSoloCobro(true);
    if (preCuentaEstado === 'DESACTUALIZADA') setVistaSoloCobro(false);
  }, [preCuentaEstado, carrito.length]);

  const cobrarVenta = async () => {
    limpiarMensajes();
    if (!cajaActual?.abierta) return setError('No hay caja abierta');
    if (carrito.length === 0) return setError('Agrega productos al carrito');
    if (preCuentaEstado !== 'VIGENTE') return setError('La pre-cuenta no esta vigente. Genera o regenera antes del cobro final');
    if (tieneLineasInvalidas) return setError('Hay productos con cantidad o precio invalidos en la cuenta');
    if (!Number.isFinite(total) || total < 0) return setError('El total no es valido');
    if (!soloCortesia && total <= 0) return setError('El total debe ser mayor a cero');
    if (!soloCortesia && !esPagoEnEfectivo && !canalPagoSeleccionado) return setError('Selecciona el canal de pago para continuar');
    if (descuentoCalculado < 0 || impuestoCalculado < 0) return setError('Descuento e impuesto no pueden ser negativos');
    if (subtotalBase < 0) return setError('El subtotal base no puede ser negativo');
    if (total < 0) return setError('El total no puede ser negativo');
    const emiteCai = emitirFactura && !!facturacionSar?.habilitadoCai;
    if (emiteCai) {
      const nom = String(facturaCliente?.nombreCliente || '').trim();
      const dir = String(facturaCliente?.direccionCliente || '').trim();
      const tel = String(facturaCliente?.telefonoCliente || '').trim();
      const esOt = String(facturaCliente?.tipoCliente || '').toUpperCase() === 'OBLIGADO_TRIBUTARIO';
      const rtnDigits = String(facturaCliente?.rtnCliente || '').replace(/\D/g, '');
      const idn = String(facturaCliente?.identidadCliente || '').trim();
      if (nom.length < 3) return setError('Factura CAI: ingrese nombre o razon social del adquirente.');
      if (dir.length < 5) return setError('Factura CAI: ingrese la direccion del adquirente.');
      if (tel.length < 5) return setError('Factura CAI: ingrese un telefono de contacto.');
      if (esOt) {
        if (rtnDigits.length !== 14) return setError('Factura CAI: el RTN de la empresa debe tener 14 digitos.');
      } else if (idn.length < 5) {
        return setError('Factura CAI: ingrese el numero de identidad del adquirente.');
      }
    }
    if (esPagoEnEfectivo && !soloCortesia) {
      if (!efectivoRecibido || Number.isNaN(efectivoRecibidoNum)) {
        return setError('Ingresa el efectivo recibido');
      }
      if (efectivoRecibidoNum < total) {
        return setError('El efectivo recibido es menor al total de la venta');
      }
    }

    try {
      setProcesando(true);
      const metodoPagoFinal = soloCortesia
        ? 'CORTESIA'
        : canalPagoSeleccionado?.nombre || canalPagoSeleccionado?.codigo || metodoPago;
      const emiteCaiReq = emitirFactura && !!facturacionSar?.habilitadoCai;
      const response = await api.post('/Ventas', {
        id_Caja: cajaActual.id_Caja,
        descuento: Number(descuentoCalculado.toFixed(2)),
        impuesto: Number(impuestoCalculado.toFixed(2)),
        impuestoIncluidoEnSubtotal,
        emitirFactura: emiteCaiReq,
        facturaCliente: emiteCaiReq
          ? {
              tipoCliente: facturaCliente.tipoCliente,
              nombreCliente: String(facturaCliente.nombreCliente || '').trim(),
              rtnCliente: String(facturaCliente.rtnCliente || '').trim(),
              identidadCliente: String(facturaCliente.identidadCliente || '').trim(),
              direccionCliente: String(facturaCliente.direccionCliente || '').trim(),
              telefonoCliente: String(facturaCliente.telefonoCliente || '').trim(),
              condicionPago: facturaCliente.condicionPago || 'CONTADO',
              tipoFacturaFiscal: facturaCliente.tipoFacturaFiscal || 'GRAVADO_15',
              numeroOrdenCompraExenta: String(facturaCliente.numeroOrdenCompraExenta || '').trim(),
              numeroConstanciaRegistroExonerado: String(facturaCliente.numeroConstanciaRegistroExonerado || '').trim(),
              numeroRegistroSag: String(facturaCliente.numeroRegistroSag || '').trim()
            }
          : null,
        metodo_Pago: metodoPagoFinal,
        tipo_Servicio: tipoServicio,
        observacion: `Venta POS | TipoPago:${soloCortesia ? 'CORTESIA' : metodoPago}${canalPagoSeleccionado ? ` | Canal:${canalPagoSeleccionado.nombre}` : ''} | Desc:${modoDescuento} | Imp:${modoImpuesto}${esPagoEnEfectivo && !soloCortesia ? ` | Efectivo:${efectivoRecibidoNum.toFixed(2)} | Cambio:${Math.max(0, cambioCalculado).toFixed(2)}` : ''}`,
        detalles: carrito.map((item) => ({
          id_Producto: item.id_Producto,
          id_Presentacion: item.id_Presentacion,
          cantidad: item.cantidad,
          tipo_Fiscal_Linea: String(item.tipo_Fiscal || 'GRAVADO_15').toUpperCase(),
          es_Cortesia: esLineaCortesia(item),
          observacion: esLineaCortesia(item) ? '[CORTESIA]' : ''
        }))
      });

      const idVenta = response.data.data.id_Venta;
      setUltimaVentaId(idVenta);
      let mensajeOk = `Venta registrada correctamente. Venta #${idVenta}`;
      try {
        await imprimirTicketHtml(idVenta);
      } catch (printErr) {
        setTicketPendienteImpresionId(idVenta);
        mensajeOk += ` — No se abrio la impresion: ${printErr?.message || 'error desconocido'}`;
      }
      setMensaje(mensajeOk);
      setCarrito([]);
      setModoDescuento('NINGUNO');
      setDescuentoManual('0');
      setModoImpuesto('INCLUIDO_15');
      setImpuestoManual('0');
      setEmitirFactura(false);
      setFacturaCliente(facturaClienteVacio());
      setEfectivoRecibido('');
      setTipoServicio('COMER_AQUI');
      setPreCuentaEstado('NINGUNA');
      setPreCuentaFecha(null);
      setPreCuentaHtmlUltima('');
      setPreCuentaResumenUltima(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al registrar venta');
    } finally {
      setProcesando(false);
    }
  };

  cobrarVentaRef.current = cobrarVenta;

  useEffect(() => {
    const handler = (e) => {
      if (!e.altKey || e.code !== 'KeyC' || e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!cajaActual?.abierta || carrito.length === 0 || preCuentaEstado !== 'VIGENTE' || procesando) return;
      e.preventDefault();
      void cobrarVentaRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cajaActual?.abierta, carrito.length, preCuentaEstado, procesando]);

  const generarPreCuenta = async () => {
    limpiarMensajes();
    if (!cajaActual?.abierta) return setError('No hay caja abierta');
    if (carrito.length === 0) return setError('Agrega productos al carrito');
    if (tieneLineasInvalidas) return setError('Hay productos con cantidad o precio invalidos en la cuenta');
    if (!Number.isFinite(total) || total < 0) return setError('El total no es valido');
    if (!soloCortesia && total <= 0) return setError('El total debe ser mayor a cero');
    if (descuentoCalculado < 0 || impuestoCalculado < 0) return setError('Descuento e impuesto no pueden ser negativos');
    if (subtotalBase < 0) return setError('El subtotal base no puede ser negativo');
    if (total < 0) return setError('El total no puede ser negativo');

    try {
      setProcesando(true);
      const html = construirHtmlPreCuenta();
      await imprimirHtmlDirecto(html);
      const fecha = new Date();
      setPreCuentaEstado('VIGENTE');
      setPreCuentaFecha(fecha);
      setPreCuentaHtmlUltima(html);
      setPreCuentaResumenUltima({
        total: Number(total || 0),
        subtotalBase: Number(subtotalBase || 0),
        descuento: Number(descuentoCalculado || 0),
        impuesto: Number(impuestoCalculado || 0),
        items: carrito.reduce((acc, item) => acc + Number(item?.cantidad || 0), 0),
        fechaIso: fecha.toISOString()
      });
      setMensaje(`Pre-cuenta impresa y generada (${formatTimeHN(fecha)}). Ya puedes hacer cobro final.`);
    } catch (err) {
      setPreCuentaEstado('NINGUNA');
      setPreCuentaFecha(null);
      setError(err?.message || 'No se pudo imprimir la pre-cuenta. Intenta de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  const reimprimirUltimaPreCuenta = async () => {
    limpiarMensajes();
    if (!preCuentaHtmlUltima) {
      setError('No hay pre-cuenta previa para reimprimir');
      return;
    }
    try {
      setProcesando(true);
      await imprimirHtmlDirecto(preCuentaHtmlUltima);
      setMensaje('Pre-cuenta reimpresa correctamente.');
    } catch (err) {
      setError(err?.message || 'No se pudo reimprimir la pre-cuenta');
    } finally {
      setProcesando(false);
    }
  };

  const imprimirTicket = async () => {
    limpiarMensajes();
    if (!ultimaVentaId) return setError('No hay ticket para imprimir');
    try {
      await imprimirTicketHtml(ultimaVentaId);
      setMensaje(`Ticket #${ultimaVentaId} enviado a impresion.`);
    } catch (err) {
      setTicketPendienteImpresionId(ultimaVentaId);
      setError(err?.message || 'No se pudo imprimir el ticket');
    }
  };

  const reintentarImpresionPendiente = async () => {
    if (!ticketPendienteImpresionId) return;
    limpiarMensajes();
    try {
      await imprimirTicketHtml(ticketPendienteImpresionId);
      setMensaje(`Impresion reintentada con exito para ticket #${ticketPendienteImpresionId}.`);
      setTicketPendienteImpresionId(null);
    } catch (err) {
      setError(err?.message || 'No se pudo reintentar la impresion del ticket');
      setTicketPendienteImpresionId(ticketPendienteImpresionId);
    }
  };

  const descargarPdfPendiente = async () => {
    if (!ticketPendienteImpresionId) return;
    limpiarMensajes();
    try {
      await descargarTicketPdf(ticketPendienteImpresionId);
      setMensaje(`PDF del ticket #${ticketPendienteImpresionId} descargado correctamente.`);
      setTicketPendienteImpresionId(ticketPendienteImpresionId);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo descargar el PDF del ticket');
    }
  };

  return (
    <div className="pos-page">
      <div className="pos-page-hero card border-0 shadow-sm mb-3">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h2 className="mb-1">POS ventas</h2>
              <div className="text-muted small">
                {cargandoCaja
                  ? 'Validando estado de caja...'
                  : cajaActual?.abierta
                    ? `Listo para vender — caja #${cajaActual.id_Caja} abierta.`
                    : 'Abre caja en el modulo Caja antes de registrar ventas.'}
              </div>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className={`badge rounded-pill px-3 py-2 ${cargandoCaja ? 'text-bg-secondary' : cajaActual?.abierta ? 'text-bg-success' : 'text-bg-warning text-dark'}`}>
                {cargandoCaja ? 'Caja...' : cajaActual?.abierta ? 'Caja abierta' : 'Sin caja'}
              </span>
              <div className="compact-toolbar mb-0">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpiarCarrito}>Limpiar cuenta</button>
                <button type="button" className="btn btn-dark btn-sm" onClick={imprimirTicket} disabled={!ultimaVentaId}>Imprimir ticket</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {ticketPendienteImpresionId && (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            El ticket <strong>#{ticketPendienteImpresionId}</strong> quedo pendiente de impresion.
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-warning" onClick={reintentarImpresionPendiente}>
              Reintentar impresion
            </button>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={descargarPdfPendiente}>
              Descargar PDF
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setMensaje(`Ticket #${ticketPendienteImpresionId} marcado como pendiente de impresion.`)}
            >
              Marcar pendiente
            </button>
          </div>
        </div>
      )}
      {!idSucursalUsuario && <div className="alert alert-warning mb-3">El usuario no tiene sucursal asignada.</div>}

      {cargandoCaja ? (
        <div className="alert alert-secondary">Validando caja de la sucursal...</div>
      ) : !cajaActual?.abierta ? (
        <div className="alert alert-warning">Debes abrir caja antes de vender.</div>
      ) : (
        <div className={`row g-3 pos-layout-row ${vistaSoloCobro ? 'pos-layout-solo-cobro' : ''}`}>
          <div className={`col-xl-6 col-lg-6 ${vistaSoloCobro ? 'd-none' : ''}`}>
            <div className="card shadow-sm border-0 mb-3 pos-catalog-card pos-catalog-controls">
              <div className="card-body">
                <div className="alert alert-info py-2 small mb-3">
                  Si un cliente pide un producto que no existe en el catalogo, registralo en
                  {' '}
                  <button
                    type="button"
                    className="btn btn-link p-0 align-baseline"
                    onClick={() => navigate('/productos-pendientes')}
                  >
                    Productos faltantes
                  </button>
                  {' '}
                  para que administracion lo apruebe sin frenar la operacion.
                </div>
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <div className="small text-muted">
                    Ultima actualizacion de catalogo:{' '}
                    <strong>{ultimaActualizacionCatalogo ? formatTimeHN(ultimaActualizacionCatalogo) : 'sin datos'}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => actualizarCatalogoPos({ manual: true })}
                    disabled={actualizandoCatalogo}
                  >
                    {actualizandoCatalogo ? 'Actualizando catalogo...' : 'Actualizar catalogo'}
                  </button>
                </div>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Categoria</label>
                    <select className="form-select" value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)}>
                      <option value="">Todas</option>
                      {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Buscar producto</label>
                    <input type="text" className="form-control" placeholder="Escribe para buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pos-catalog-scroll">
              <div className="row g-2">
                {productosFiltrados.length === 0 ? (
                  <div className="col-12"><div className="alert alert-light border">No hay productos con precio configurado para esta sucursal.</div></div>
                ) : (
                  productosFiltrados.map((producto) => {
                    const cantidadEnCarrito = cantidadEnCarritoPorProducto(producto);
                    return (
                    <div className="col-md-4 col-xl-3" key={`${producto.id_Producto}-${producto.id_Presentacion ?? 'n'}`}>
                      <div className="card h-100 shadow-sm border-0 product-card">
                        <div className="card-body d-flex flex-column justify-content-between">
                          <div>
                            <h6 className="mb-1">{producto.nombre}</h6>
                            <div className="text-muted small">{producto.categoria}</div>
                            <div className="fw-semibold mt-1">Venta: {formatCurrencyHNL(producto.precio)}</div>
                            <div className="small mt-1">
                              {cantidadEnCarrito > 0 ? (
                                <span className="badge bg-success-subtle text-success-emphasis border">En cuenta: {cantidadEnCarrito}</span>
                              ) : (
                                <span className="badge bg-light text-muted border">Aun no agregado</span>
                              )}
                            </div>
                            <div className="small text-muted mt-1">Edita cantidades en el panel de cobro</div>
                          </div>
                          <div className="mt-2 d-flex gap-2">
                            <button className="btn btn-dark w-100 pos-touch-add" type="button" onClick={() => agregarProducto(producto)}>Agregar</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className={vistaSoloCobro ? 'col-12' : 'col-xl-6 col-lg-6'}>
            <div className="card shadow-sm border-0 carrito-sticky pos-order-card">
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                  <h5 className="mb-0">Cuenta actual</h5>
                  {carrito.length > 0 && (
                    <div className="btn-group btn-group-sm" role="group" aria-label="Vista cobro">
                      <button
                        type="button"
                        className={`btn ${vistaSoloCobro ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => setVistaSoloCobro(true)}
                      >
                        Solo cobro
                      </button>
                      <button
                        type="button"
                        className={`btn ${!vistaSoloCobro ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => setVistaSoloCobro(false)}
                      >
                        Ver catalogo
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-white border rounded p-2 mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>Lineas: {carrito.length}</strong>
                    <span className="small text-muted">Unidades: {unidadesTotales}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <span className={`badge ${cargandoCaja ? 'bg-secondary' : cajaActual?.abierta ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {cargandoCaja ? 'Validando caja...' : cajaActual?.abierta ? `Caja #${cajaActual.id_Caja} abierta` : 'Caja cerrada'}
                    </span>
                  </div>
                </div>
                <div className={`alert py-2 ${preCuentaEstado === 'VIGENTE' ? 'alert-success' : preCuentaEstado === 'DESACTUALIZADA' ? 'alert-warning' : 'alert-secondary'}`}>
                  {preCuentaEstado === 'VIGENTE' && `Pre-cuenta vigente${preCuentaFecha ? ` (${formatTimeHN(preCuentaFecha)})` : ''}`}
                  {preCuentaEstado === 'DESACTUALIZADA' && `Pre-cuenta desactualizada${preCuentaFecha ? ` (ultima: ${formatTimeHN(preCuentaFecha)})` : ''}. Regenera antes de cobrar.`}
                  {preCuentaEstado === 'NINGUNA' && 'Aun no se genera pre-cuenta'}
                </div>
                {preCuentaResumenUltima && (
                  <div className="alert alert-light border py-2">
                    <div className="small"><strong>Ultima pre-cuenta:</strong> {formatDateTimeHN(preCuentaResumenUltima.fechaIso)}</div>
                    <div className="small">Items: <strong>{preCuentaResumenUltima.items}</strong> | Subtotal base: <strong>{formatCurrencyHNL(preCuentaResumenUltima.subtotalBase)}</strong> | Total: <strong>{formatCurrencyHNL(preCuentaResumenUltima.total)}</strong></div>
                    <div className="small text-muted">Si cambias productos o descuento, debes regenerar pre-cuenta.</div>
                    <div className="mt-2">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reimprimirUltimaPreCuenta} disabled={procesando || !preCuentaHtmlUltima}>
                        Reimprimir ultima pre-cuenta
                      </button>
                    </div>
                  </div>
                )}
                {!vistaSoloCobro && (
                  <div className="small text-muted mb-2">
                    Cada toque en Agregar crea una linea nueva. Usa "Quitar" para eliminar cualquier linea o "+ Igual" para duplicarla.
                  </div>
                )}

                {carrito.length === 0 ? (
                  <div className="text-muted mb-3">No hay productos agregados.</div>
                ) : (
                  <details className="pos-lineas-checkout-details border rounded px-2 py-1 mb-3" open={!vistaSoloCobro}>
                    <summary className="fw-semibold py-2 user-select-none small">
                      Lineas en cuenta ({carrito.length})
                      {vistaSoloCobro && <span className="text-muted fw-normal ms-1">— toca para ver o editar</span>}
                    </summary>
                    <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
                      <span className="small text-muted">Quitar elimina esa linea</span>
                    </div>
                    <div className="order-items-scroll pos-order-lines">
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: '45px' }}>#</th>
                            <th>Producto</th>
                            <th style={{ width: '80px' }} className="text-end">Cant.</th>
                            <th style={{ width: '120px' }} className="text-end">P. Unit</th>
                            <th style={{ width: '120px' }} className="text-end">Subtotal</th>
                            <th style={{ width: '260px' }} className="text-end">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carrito.map((item, index) => (
                            <tr key={item.id_Linea || `${item.id_Producto}-${index}`}>
                              <td className="text-muted">{index + 1}</td>
                              <td>
                                <div className="fw-semibold">{item.nombre}</div>
                                <div className="small text-muted">
                                  {esLineaCortesia(item)
                                    ? 'Cortesia (sin cobro)'
                                    : aplicaDescuentoLinea(item)
                                      ? 'Con descuento'
                                      : 'Sin descuento'}
                                </div>
                                <div className="form-check mt-1">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`descuento-linea-${item.id_Linea || index}`}
                                    checked={aplicaDescuentoLinea(item)}
                                    disabled={esLineaCortesia(item)}
                                    onChange={(e) => cambiarAplicaDescuento(index, e.target.checked)}
                                  />
                                  <label className="form-check-label small" htmlFor={`descuento-linea-${item.id_Linea || index}`}>
                                    Aplicar descuento
                                  </label>
                                </div>
                                <div className="form-check mt-1">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`cortesia-linea-${item.id_Linea || index}`}
                                    checked={esLineaCortesia(item)}
                                    onChange={(e) => cambiarCortesiaLinea(index, e.target.checked)}
                                  />
                                  <label className="form-check-label small" htmlFor={`cortesia-linea-${item.id_Linea || index}`}>
                                    Cortesia (sin cobro)
                                  </label>
                                </div>
                              </td>
                              <td className="text-end fw-semibold">{Number(item.cantidad || 0)}</td>
                              <td className="text-end">{formatCurrencyHNL(item.precio_Unitario)}</td>
                              <td className="text-end fw-bold">{formatCurrencyHNL(item.subtotal)}</td>
                              <td className="text-end">
                                <div className="d-flex justify-content-end gap-2">
                                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => decrementarCantidadItem(index)} disabled={Number(item.cantidad || 0) <= 1}>
                                    -1
                                  </button>
                                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => incrementarCantidadItem(index)}>
                                    +1
                                  </button>
                                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => separarLinea(index)} disabled={Number(item.cantidad || 0) <= 1}>
                                    Separar
                                  </button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={() => quitarItemPorLinea(item.id_Linea, index)}>
                                    Eliminar fila
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    </div>
                  </details>
                )}

                <div className="pro-checkout-flow-block mt-3">
                  <div className="pro-checkout-flow-title">1 · Descuentos e impuesto</div>
                  <div className="pro-checkout-pricing-panel border rounded p-3 mb-0 bg-light">
                    <div className="small text-muted mb-2">Ajusta antes del pago; el total de abajo se recalcula al instante.</div>
                    <div className="row g-2 mb-2">
                      <div className="col-12">
                        <label className="form-label mb-1">Descuento sobre lineas</label>
                        <select className="form-select" value={modoDescuento} onChange={(e) => setModoDescuento(e.target.value)}>
                          {descuentosActivos.map((opt) => <option key={opt.codigo} value={opt.codigo}>{opt.nombre}</option>)}
                        </select>
                      </div>
                      {descuentoSeleccionado?.permiteEditarMonto && (
                        <div className="col-12">
                          <input type="number" min="0" step="0.01" className="form-control" value={descuentoManual} onChange={(e) => setDescuentoManual(e.target.value)} placeholder="Monto descuento" />
                        </div>
                      )}
                      {modoDescuento !== 'NINGUNO' && (
                        <div className="col-12">
                          <div className="small text-muted mb-1">Solo lineas marcadas en la tabla de arriba.</div>
                          <div className="d-flex gap-2 flex-wrap">
                            <button type="button" className="btn btn-sm btn-outline-success" onClick={() => aplicarDescuentoATodasLasLineas(true)} disabled={carrito.length === 0}>
                              Marcar todas
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => aplicarDescuentoATodasLasLineas(false)} disabled={carrito.length === 0}>
                              Quitar en todas
                            </button>
                          </div>
                          <div className="small text-muted mt-1">Con descuento: {lineasConDescuento} / {carrito.length}</div>
                        </div>
                      )}
                    </div>
                    <div className="row g-2 mb-0">
                      <div className="col-12">
                        <label className="form-label mb-1">Impuesto</label>
                        <select className="form-select" value={modoImpuesto} onChange={(e) => setModoImpuesto(e.target.value)}>
                          {impuestosActivos.map((opt) => <option key={opt.codigo} value={opt.codigo}>{opt.nombre}</option>)}
                        </select>
                      </div>
                      {impuestoSeleccionado?.permiteEditarMonto && (
                        <div className="col-12">
                          <input type="number" min="0" step="0.01" className="form-control" value={impuestoManual} onChange={(e) => setImpuestoManual(e.target.value)} placeholder="Monto impuesto" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pro-checkout-flow-block mt-3">
                  <div className="pro-checkout-flow-title">2 · Servicio</div>
                  <CheckoutServiceToggle value={tipoServicio} onChange={setTipoServicio} disabled={procesando} />
                </div>

                <div className="pro-checkout-flow-block mt-3">
                  <div className="pro-checkout-flow-title">3 · Documento fiscal</div>
                  {facturacionSar?.habilitadoCai ? (
                    <div className="border rounded p-3 mb-0 bg-body-secondary bg-opacity-25">
                      <div className="fw-semibold small mb-2 text-muted">Factura SAR (CAI) disponible</div>
                      <div className={`alert py-2 ${facturacionSar.facturasRestantes > 0 ? 'alert-info' : 'alert-danger'}`}>
                        Facturas CAI restantes: <strong>{Number(facturacionSar.facturasRestantes || 0)}</strong>
                      </div>
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="emitirFacturaPos"
                          checked={emitirFactura}
                          onChange={(e) => setEmitirFactura(e.target.checked)}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="emitirFacturaPos">
                          Emitir factura CAI (complete datos del adquirente abajo)
                        </label>
                      </div>
                      {emitirFactura && <FacturaCaiClienteForm idPrefix="pos" value={facturaCliente} onChange={setFacturaCliente} />}
                    </div>
                  ) : (
                    <div className="alert alert-light border py-2 mb-0 small text-body-secondary">
                      <strong>Sin CAI en esta sucursal.</strong> El cobro registra la venta y el ticket; no se emiten correlativos SAR hasta que un administrador active y configure CAI.
                    </div>
                  )}
                </div>

                <div className="pro-checkout-flow-block pro-checkout-flow-block--pay mt-3">
                  <div className="pro-checkout-flow-title">4 · Forma de pago</div>
                  <CheckoutPayMethodChips value={metodoPago} onChange={setMetodoPago} disabled={procesando} />

                  {!esPagoEnEfectivo && (
                    <div className="mb-2 mt-2">
                      <label className="form-label">Canal / terminal</label>
                      <select className="form-select" value={canalPagoCodigo} onChange={(e) => setCanalPagoCodigo(e.target.value)}>
                        {canalesPagoFiltrados.length === 0 ? (
                          <option value="">Configura canales en Administracion</option>
                        ) : (
                          canalesPagoFiltrados.map((canal) => (
                            <option key={canal.codigo} value={canal.codigo}>{canal.nombre}</option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  {esPagoEnEfectivo && (
                    <div className="pro-cash-strip mb-2 mt-2">
                      <label className="form-label">Efectivo recibido</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control form-control-lg"
                        value={efectivoRecibido}
                        onChange={(e) => setEfectivoRecibido(e.target.value)}
                        placeholder="Monto que entrega el cliente"
                      />
                      <div className={`fw-semibold mt-2 ${cambioCalculado >= 0 ? 'text-success' : 'text-danger'}`}>
                        Cambio: {formatCurrencyHNL(Math.max(0, cambioCalculado))}
                        {cambioCalculado < 0 ? ` · Faltan ${formatCurrencyHNL(Math.abs(cambioCalculado))}` : ''}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pro-checkout-total-hero mb-2 mt-3">
                  <div className="pro-checkout-flow-title pro-checkout-flow-title--on-dark">5 · Resumen y total</div>
                  <div className="pro-checkout-total-eyebrow">Revise montos y luego confirme abajo</div>
                  <div className="pro-checkout-total-breakdown mt-2">
                    <div className="pro-checkout-total-line">
                      <span className="pro-checkout-total-line-label">Subtotal base</span>
                      <span className="pro-checkout-total-line-value">{formatCurrencyHNL(subtotalBase)}</span>
                    </div>
                    <div className={`pro-checkout-total-line ${descuentoCalculado > 0 ? 'pro-checkout-total-line--deduccion' : ''}`}>
                      <span className="pro-checkout-total-line-label">Descuentos</span>
                      <span className="pro-checkout-total-line-value">{descuentoCalculado > 0 ? `- ${formatCurrencyHNL(descuentoCalculado)}` : formatCurrencyHNL(0)}</span>
                    </div>
                    <div className="pro-checkout-total-line">
                      <span className="pro-checkout-total-line-label">
                        Impuesto {impuestoIncluidoEnSubtotal ? '(en precio)' : '(ISV)'}
                      </span>
                      <span className="pro-checkout-total-line-value">{formatCurrencyHNL(impuestoCalculado)}</span>
                    </div>
                    {impuestoIncluidoEnSubtotal && (
                      <div className="pro-checkout-total-note">El ISV ya va en los precios de venta — no se suma otra vez al total.</div>
                    )}
                  </div>
                  <div className="pro-checkout-total-grand">
                    <div className="pro-checkout-total-label mb-1">Total a cobrar</div>
                    <div className="pro-checkout-total-amount">{formatCurrencyHNL(total)}</div>
                  </div>
                </div>

                <div className="pro-checkout-flow-block pro-checkout-flow-block--confirm">
                  <div className="pro-checkout-flow-title">6 · Pre-cuenta y cobro final</div>
                  <div className="pro-checkout-steps pro-checkout-steps--on-light mb-2" aria-hidden="true">
                    <span className={`pro-checkout-step ${preCuentaEstado === 'VIGENTE' ? 'pro-checkout-step--ok' : ''}`}>Pre-cuenta lista</span>
                    <span className={`pro-checkout-step ${preCuentaEstado === 'VIGENTE' ? 'pro-checkout-step--ok' : preCuentaEstado === 'DESACTUALIZADA' ? 'pro-checkout-step--warn' : ''}`}>
                      Total vigente
                    </span>
                    <span className="pro-checkout-step">Cobrar</span>
                  </div>
                </div>

                <div className="d-grid gap-2 mt-2 pos-checkout-actions">
                  <button type="button" className="btn btn-outline-primary" onClick={generarPreCuenta} disabled={procesando || carrito.length === 0}>
                    {preCuentaEstado === 'DESACTUALIZADA' ? 'Regenerar pre-cuenta' : 'Generar pre-cuenta'}
                  </button>
                  {preCuentaEstado !== 'VIGENTE' && (
                    <div className="small text-warning text-center">
                      Antes del cobro final debes generar una pre-cuenta vigente.
                    </div>
                  )}
                  <button type="button" className="btn btn-success" onClick={cobrarVenta} disabled={procesando || carrito.length === 0 || preCuentaEstado !== 'VIGENTE'}>
                    {procesando ? 'Procesando...' : 'Cobro final'}
                  </button>
                  <div className="small text-muted text-center">Atajo: <kbd className="px-1">Alt</kbd> + <kbd className="px-1">C</kbd> (fuera de campos de texto)</div>
                  <button type="button" className="btn btn-outline-secondary" onClick={limpiarCarrito} disabled={carrito.length === 0}>
                    Limpiar cuenta
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VentasPOS;





