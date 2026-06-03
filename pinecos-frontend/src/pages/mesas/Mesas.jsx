import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { imprimirPreTicketPersona, imprimirTicketHtml } from '../../utils/printTicket';
import { getUsuario } from '../../utils/auth';
import FacturaCaiClienteForm from '../../components/factura/FacturaCaiClienteForm';
import { facturaClienteVacio } from '../../components/factura/facturaClienteVacio';
import CheckoutPayMethodChips from '../../components/checkout/CheckoutPayMethodChips';
import CheckoutServiceToggle from '../../components/checkout/CheckoutServiceToggle';

function Mesas() {
  const usuario = getUsuario();
  const esAdmin = String(usuario?.rol || usuario?.Rol || '').toUpperCase() === 'ADMIN';
  const idSucursalUsuario = usuario?.id_Sucursal ?? usuario?.id_sucursal ?? null;
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [mesas, setMesas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [detalleCuenta, setDetalleCuenta] = useState(null);

  const [formAbrir, setFormAbrir] = useState({ observacion: '' });
  const [formAgregar, setFormAgregar] = useState({
    id_Producto: '',
    id_Presentacion: '',
    es_Cortesia: false
  });
  const [filtroProducto, setFiltroProducto] = useState('');
  const [categoriaMenu, setCategoriaMenu] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [canalPagoCodigo, setCanalPagoCodigo] = useState('');
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
  const [personasDivision, setPersonasDivision] = useState(2);
  const [dividirCuenta, setDividirCuenta] = useState(false);
  const [cobroMixto, setCobroMixto] = useState(false);
  const [pagosMixtos, setPagosMixtos] = useState([{ nombre: 'Pago 1', metodo_Pago: 'EFECTIVO', canalPagoCodigo: '', monto: '', recibido: '' }]);
  const [asignacionDetalles, setAsignacionDetalles] = useState({});
  const [descuentoDetalles, setDescuentoDetalles] = useState({});
  const [personasListas, setPersonasListas] = useState(new Set());
  const [montoDadoPorPersona, setMontoDadoPorPersona] = useState({});
  const [vistaTablet, setVistaTablet] = useState('mesas');
  /** Oculta plano de mesas y acordeon de consumo para ver solo cobro */
  const [mesaVistaSoloCobro, setMesaVistaSoloCobro] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [cajaActual, setCajaActual] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  const redondear2 = (valor) => Number((Number(valor || 0)).toFixed(2));

  const limpiarMensajes = () => {
    setMensaje('');
    setError('');
  };

  const cargarSucursales = async () => {
    if (esAdmin) {
      const response = await api.get('/Sucursales', { params: { incluirInactivas: true } });
      const data = response.data || [];
      setSucursales(data);
      return data;
    }

    if (!idSucursalUsuario) {
      setSucursales([]);
      return [];
    }

    const data = [
      {
        id_Sucursal: Number(idSucursalUsuario),
        nombre: 'Sucursal asignada'
      }
    ];
    setSucursales(data);
    return data;
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

  const cargarMenu = async (idSucursal) => {
    if (!idSucursal) {
      setMenuItems([]);
      return;
    }

    const response = await api.get(`/Menu/sucursal/${idSucursal}`);
    const normales = (response.data?.normales || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: null,
      nombre: item.producto,
      categoria: item.categoria || 'Sin categoria',
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0),
      tipo_Fiscal: String(item.tipoFiscal || 'GRAVADO_15').toUpperCase()
    }));

    const conPresentacion = (response.data?.conPresentacion || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: item.id_Presentacion,
      nombre: `${item.producto} - ${item.presentacion || 'Presentacion'}`,
      categoria: item.categoria || 'Sin categoria',
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0),
      tipo_Fiscal: String(item.tipoFiscal || 'GRAVADO_15').toUpperCase()
    }));

    setMenuItems([...normales, ...conPresentacion].filter((x) => x.precio > 0));
  };

  const cargarAjustesVenta = async (idSucursal) => {
    if (!idSucursal) {
      setAjustesVenta({ descuentos: [], impuestos: [] });
      return;
    }
    const response = await api.get('/AjustesVenta', { params: { idSucursal: Number(idSucursal) } });
    setAjustesVenta({
      descuentos: response.data?.descuentos || [],
      impuestos: response.data?.impuestos || []
    });
  };

  const cargarMesas = async (idSucursal) => {
    if (!idSucursal) return;
    const response = await api.get(`/Mesas/sucursal/${idSucursal}`);
    setMesas(response.data || []);
  };

  const cargarCuentasAbiertas = async () => {
    const response = await api.get('/CuentasMesa/abiertas');
    setCuentas(response.data || []);
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

  const cargarCuentaDetalle = async (idCuenta) => {
    const response = await api.get(`/CuentasMesa/${idCuenta}`);
    setDetalleCuenta(response.data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [sucursalesData, caja] = await Promise.all([cargarSucursales(), cargarCajaActual(), cargarCuentasAbiertas()]);
        const sucursalObjetivo =
          Number(idSucursalUsuario || caja?.id_Sucursal || sucursalesData?.[0]?.id_Sucursal || 0) || null;
        await Promise.all([cargarFacturacionSar(sucursalObjetivo), cargarCanalesConfig(sucursalObjetivo)]);
        if (!esAdmin && idSucursalUsuario) {
          setSucursalSeleccionada(String(idSucursalUsuario));
        } else if (esAdmin && sucursalObjetivo) {
          setSucursalSeleccionada(String(sucursalObjetivo));
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al cargar mesas');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!sucursalSeleccionada) return;
    const cargarSucursal = async () => {
      try {
        await Promise.all([
          cargarMesas(sucursalSeleccionada),
          cargarMenu(sucursalSeleccionada),
          cargarAjustesVenta(sucursalSeleccionada),
          cargarCanalesConfig(sucursalSeleccionada),
          cargarFacturacionSar(sucursalSeleccionada)
        ]);
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al cargar configuracion de la sucursal');
      }
    };
    cargarSucursal();
  }, [sucursalSeleccionada]);

  const menuItemsOrdenados = useMemo(
    () => [...menuItems].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [menuItems]
  );
  const categoriasMenu = useMemo(
    () => [...new Set((menuItems || []).map((x) => String(x?.categoria || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [menuItems]
  );
  const menuItemsFiltrados = useMemo(() => {
    const filtro = filtroProducto.trim().toLowerCase();
    const categoria = String(categoriaMenu || '').trim().toLowerCase();
    return menuItemsOrdenados.filter((item) => {
      const okTexto = !filtro || item.nombre.toLowerCase().includes(filtro);
      const okCategoria = !categoria || String(item.categoria || '').toLowerCase() === categoria;
      return okTexto && okCategoria;
    });
  }, [menuItemsOrdenados, filtroProducto, categoriaMenu]);

  const descuentosActivos = useMemo(
    () => (ajustesVenta.descuentos || []).filter((x) => x.activo),
    [ajustesVenta.descuentos]
  );

  const impuestosActivos = useMemo(
    () => (ajustesVenta.impuestos || []).filter((x) => x.activo),
    [ajustesVenta.impuestos]
  );

  useEffect(() => {
    if (!emitirFactura) setFacturaCliente(facturaClienteVacio());
  }, [emitirFactura]);

  useEffect(() => {
    const upper = (c) => String(c || '').toUpperCase();
    const list = metodosPago || [];
    if (!list.length) return;
    const codes = list.map((x) => upper(x.codigo));
    const current = upper(metodoPago);
    if (!codes.includes(current)) {
      setMetodoPago(codes[0] || 'EFECTIVO');
    } else if (String(metodoPago || '') !== current) {
      setMetodoPago(current);
    }
  }, [metodosPago, metodoPago]);

  const metodoPagoActivo = useMemo(
    () => (metodosPago || []).find((x) => String(x?.codigo || '').toUpperCase() === String(metodoPago || '').toUpperCase()) || null,
    [metodosPago, metodoPago]
  );
  const categoriaMetodoPago = useMemo(() => {
    const codigo = String(metodoPago || '').toUpperCase();
    const cat = String(metodoPagoActivo?.categoria || '').toUpperCase();
    if (cat) return cat;
    if (codigo === 'POS' || codigo === 'TARJETA' || codigo === 'TARJETA_POS') return 'POS';
    if (codigo === 'TRANSFERENCIA') return 'TRANSFERENCIA';
    if (codigo === 'EFECTIVO') return 'EFECTIVO';
    return 'OTRO';
  }, [metodoPago, metodoPagoActivo]);
  const resolverCategoriaMetodo = (codigoMetodo) => {
    const codigo = String(codigoMetodo || '').toUpperCase();
    const metodo = (metodosPago || []).find((x) => String(x?.codigo || '').toUpperCase() === codigo) || null;
    const cat = String(metodo?.categoria || '').toUpperCase();
    if (cat) return cat;
    if (codigo === 'POS' || codigo === 'TARJETA' || codigo === 'TARJETA_POS') return 'POS';
    if (codigo === 'TRANSFERENCIA') return 'TRANSFERENCIA';
    if (codigo === 'EFECTIVO') return 'EFECTIVO';
    return 'OTRO';
  };
  const esCanalTransferencia = (item) => {
    const texto = `${item?.codigo || ''} ${item?.nombre || ''}`.toUpperCase();
    return texto.includes('TRANSFER');
  };
  const esMetodoDelivery = (item) => String(item?.categoria || '').trim().toUpperCase() === 'DELIVERY';
  const metodosCobroBase = useMemo(() => {
    const activos = (metodosPago || [])
      .filter((x) => x?.activo !== false)
      .filter((x) => !esMetodoDelivery(x))
      .map((x) => ({
        codigo: String(x?.codigo || x?.nombre || '').trim().toUpperCase(),
        nombre: String(x?.nombre || x?.codigo || '').trim(),
        categoria: String(x?.categoria || '').trim().toUpperCase() || 'OTRO',
        activo: true
      }))
      .filter((x) => x.codigo && x.nombre);

    const vistos = new Set();
    const unicos = activos.filter((x) => {
      if (vistos.has(x.codigo)) return false;
      vistos.add(x.codigo);
      return true;
    });

    return unicos.length
      ? unicos
      : [{ codigo: 'EFECTIVO', nombre: 'Efectivo', categoria: 'EFECTIVO', activo: true }];
  }, [metodosPago]);
  const buscarMetodoConfig = (codigoMetodo) =>
    (metodosPago || []).find((x) => String(x?.codigo || '').toUpperCase() === String(codigoMetodo || '').toUpperCase()) || null;
  const requiereCanalParaMetodo = (codigoMetodo) => {
    const categoria = resolverCategoriaMetodo(codigoMetodo);
    if (categoria === 'EFECTIVO') return false;
    return !buscarMetodoConfig(codigoMetodo);
  };
  const nombreMetodoCobro = (codigoMetodo) => {
    const metodo = buscarMetodoConfig(codigoMetodo) || (metodosCobroBase || []).find((x) => String(x?.codigo || '').toUpperCase() === String(codigoMetodo || '').toUpperCase());
    return String(metodo?.nombre || metodo?.codigo || codigoMetodo || '').trim().toUpperCase();
  };
  const metodoCobroPermitido = (codigoMetodo) =>
    (metodosCobroBase || []).some((x) => String(x?.codigo || '').toUpperCase() === String(codigoMetodo || '').toUpperCase());
  const normalizarMetodoCobro = (codigoMetodo) => {
    const codigo = String(codigoMetodo || '').toUpperCase();
    return metodoCobroPermitido(codigo) ? codigo : (metodosCobroBase[0]?.codigo || 'EFECTIVO');
  };
  const obtenerCanalesPorMetodo = (codigoMetodo) => {
    const categoria = resolverCategoriaMetodo(codigoMetodo);
    if (categoria === 'EFECTIVO') return [];
    if (!requiereCanalParaMetodo(codigoMetodo)) return [];
    const canalesNoEfectivo = (metodosPago || [])
      .filter((x) => String(x?.categoria || '').toUpperCase() !== 'EFECTIVO')
      .filter((x) => !esMetodoDelivery(x));
    if (categoria === 'TRANSFERENCIA') {
      const especificos = canalesNoEfectivo.filter(esCanalTransferencia);
      return especificos.length ? especificos : canalesNoEfectivo;
    }
    if (categoria === 'POS') {
      const especificos = canalesNoEfectivo.filter((x) => !esCanalTransferencia(x));
      return especificos.length ? especificos : canalesNoEfectivo;
    }
    return (metodosPago || []).filter((x) => String(x?.categoria || '').toUpperCase() === categoria);
  };
  const canalesPagoFiltrados = useMemo(() => {
    if (categoriaMetodoPago === 'EFECTIVO') return [];
    return obtenerCanalesPorMetodo(metodoPago);
  }, [metodosPago, categoriaMetodoPago, metodoPago]);

  useEffect(() => {
    if (String(categoriaMetodoPago || '').toUpperCase() === 'EFECTIVO' || dividirCuenta || !requiereCanalParaMetodo(metodoPago)) {
      setCanalPagoCodigo('');
      return;
    }
    if (!canalesPagoFiltrados.some((x) => String(x?.codigo || '') === String(canalPagoCodigo || ''))) {
      setCanalPagoCodigo(canalesPagoFiltrados[0]?.codigo || '');
    }
  }, [categoriaMetodoPago, dividirCuenta, canalesPagoFiltrados, canalPagoCodigo]);

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

  useEffect(() => {
    const detalles = detalleCuenta?.detalles || [];
    if (!detalles.length) {
      setDescuentoDetalles({});
      return;
    }

    setDescuentoDetalles((prev) => {
      const next = {};
      detalles.forEach((d) => {
        const valorPrevio = prev[d.id_Detalle_Cuenta_Mesa];
        if (d.esCortesia) {
          next[d.id_Detalle_Cuenta_Mesa] = false;
          return;
        }
        next[d.id_Detalle_Cuenta_Mesa] = valorPrevio ?? true;
      });
      return next;
    });
  }, [detalleCuenta]);

  const subtotalCuenta = Number(detalleCuenta?.total || 0);
  const subtotalDescuentoCuenta = (detalleCuenta?.detalles || []).reduce((acc, d) => {
    if (d.esCortesia) return acc;
    const aplica = descuentoDetalles[d.id_Detalle_Cuenta_Mesa] ?? true;
    return aplica ? acc + Number(d.subtotal || 0) : acc;
  }, 0);
  const descuentoSeleccionado = descuentosActivos.find((x) => x.codigo === modoDescuento) || null;
  const impuestoSeleccionado = impuestosActivos.find((x) => x.codigo === modoImpuesto) || null;

  const descuentoNum = useMemo(() => {
    if (!descuentoSeleccionado) return 0;
    if (subtotalDescuentoCuenta <= 0) return 0;
    const tipo = String(descuentoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(descuentoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return Math.min(subtotalDescuentoCuenta, subtotalDescuentoCuenta * (valor / 100));
    if (tipo === 'MONTO') {
      const monto = descuentoSeleccionado.permiteEditarMonto ? Number(descuentoManual || 0) : valor;
      return Math.min(subtotalDescuentoCuenta, Math.max(0, monto));
    }
    return 0;
  }, [descuentoSeleccionado, descuentoManual, subtotalDescuentoCuenta]);

  const { impuestoNum, impuestoIncluidoEnSubtotal } = useMemo(() => {
    if (!impuestoSeleccionado) return { impuestoNum: 0, impuestoIncluidoEnSubtotal: false };
    const tipo = String(impuestoSeleccionado.tipoCalculo || '').toUpperCase();
    const valor = Number(impuestoSeleccionado.valor || 0);
    if (tipo === 'PORCENTAJE') return { impuestoNum: subtotalCuenta * (valor / 100), impuestoIncluidoEnSubtotal: false };
    if (tipo === 'MONTO') {
      return {
        impuestoNum: impuestoSeleccionado.permiteEditarMonto ? Number(impuestoManual || 0) : valor,
        impuestoIncluidoEnSubtotal: false
      };
    }
    if (tipo === 'INCLUIDO_PORCENTAJE') {
      const imp = subtotalCuenta > 0 ? subtotalCuenta * (valor / (100 + valor)) : 0;
      return { impuestoNum: imp, impuestoIncluidoEnSubtotal: true };
    }
    return { impuestoNum: 0, impuestoIncluidoEnSubtotal: false };
  }, [impuestoSeleccionado, impuestoManual, subtotalCuenta]);

  const subtotalBaseCuenta = subtotalCuenta - (impuestoIncluidoEnSubtotal ? impuestoNum : 0);
  const totalCuenta = subtotalBaseCuenta - descuentoNum + impuestoNum;
  const montosAutoPorPersona = useMemo(() => {
    const cantidad = Math.max(1, Number(personasDivision || 1));
    const acumulado = Array.from({ length: cantidad }, () => 0);
    const detalles = detalleCuenta?.detalles || [];
    if (!detalles.length) return acumulado;

    detalles.forEach((d) => {
      const asignado = asignacionDetalles[d.id_Detalle_Cuenta_Mesa];
      if (asignado === null || asignado === undefined) return;
      const idxRaw = Number(asignado);
      const idx = Number.isFinite(idxRaw) ? Math.min(Math.max(idxRaw, 0), cantidad - 1) : 0;
      acumulado[idx] += Number(d.subtotal || 0);
    });

    const subtotalBruto = Number(subtotalCuenta || 0);
    const factor = subtotalBruto > 0 ? Number(totalCuenta || 0) / subtotalBruto : 0;
    const result = acumulado.map((m) => redondear2(m * factor));
    const suma = result.reduce((acc, x) => acc + Number(x || 0), 0);
    const diff = redondear2(Number(totalCuenta || 0) - suma);
    result[cantidad - 1] = redondear2(Number(result[cantidad - 1] || 0) + diff);
    return result;
  }, [personasDivision, detalleCuenta, asignacionDetalles, subtotalCuenta, totalCuenta]);
  const pagosMixtosDetalle = useMemo(
    () => (pagosMixtos || [])
      .map((p, idx) => {
        const metodoCodigo = String(p?.metodo_Pago || '').trim().toUpperCase();
        const categoria = resolverCategoriaMetodo(metodoCodigo);
        const canales = obtenerCanalesPorMetodo(metodoCodigo);
        const canalSeleccionado = canales.find((x) => String(x?.codigo || '') === String(p?.canalPagoCodigo || '')) || null;
        const metodoDirecto = !requiereCanalParaMetodo(metodoCodigo);
        return {
          nombre: String(p?.nombre || '').trim() || (dividirCuenta ? `Persona ${idx + 1}` : `Pago ${idx + 1}`),
          metodo_Pago: categoria === 'EFECTIVO' || metodoDirecto
            ? metodoCodigo
            : (canalSeleccionado?.nombre || canalSeleccionado?.codigo || metodoCodigo),
          monto: redondear2(p?.monto),
          categoria,
          recibido: redondear2(p?.recibido)
        };
      })
      .filter((p) => p.metodo_Pago && p.monto > 0),
    [pagosMixtos, metodosPago, dividirCuenta]
  );
  const pagosMixtosNormalizados = useMemo(() => {
    const acumulado = {};
    pagosMixtosDetalle.forEach((p) => {
      const key = p.metodo_Pago;
      acumulado[key] = redondear2(Number(acumulado[key] || 0) + Number(p.monto || 0));
    });
    return Object.entries(acumulado)
      .map(([metodo_Pago, monto]) => ({ metodo_Pago, monto }))
      .filter((p) => p.monto > 0);
  }, [pagosMixtosDetalle]);
  const totalPagosMixtos = useMemo(
    () => redondear2(pagosMixtosDetalle.reduce((acc, p) => acc + Number(p.monto || 0), 0)),
    [pagosMixtosDetalle]
  );
  const diferenciaPagosMixtos = redondear2(totalCuenta - totalPagosMixtos);
  const tieneCanalesInvalidosEnCobroMixto = useMemo(() => {
    if (!cobroMixto) return false;
    return (pagosMixtos || []).some((p) => {
      const monto = Number(p?.monto || 0);
      if (monto <= 0) return false;
      const metodo = String(p?.metodo_Pago || '').toUpperCase();
      const categoria = resolverCategoriaMetodo(metodo);
      if (categoria === 'EFECTIVO' || !requiereCanalParaMetodo(metodo)) return false;
      const canales = obtenerCanalesPorMetodo(metodo);
      if (!canales.length) return true;
      const canal = String(p?.canalPagoCodigo || '');
      return !canal || !canales.some((x) => String(x?.codigo || '') === canal);
    });
  }, [cobroMixto, pagosMixtos, metodosPago]);
  const tieneEfectivoInvalidoEnCobroMixto = useMemo(() => {
    if (!cobroMixto || dividirCuenta) return false;
    return (pagosMixtos || []).some((p) => {
      const monto = Number(p?.monto || 0);
      if (monto <= 0) return false;
      if (resolverCategoriaMetodo(p?.metodo_Pago) !== 'EFECTIVO') return false;
      const recibidoRaw = String(p?.recibido ?? '').trim();
      if (!recibidoRaw) return false;
      const recibido = Number(recibidoRaw || 0);
      return Number.isNaN(recibido) || recibido < monto;
    });
  }, [cobroMixto, dividirCuenta, pagosMixtos]);
  const bloqueoPreventivoCobro = useMemo(() => {
    if (cobroMixto) return tieneCanalesInvalidosEnCobroMixto || tieneEfectivoInvalidoEnCobroMixto;
    if (String(categoriaMetodoPago || '').toUpperCase() === 'EFECTIVO') return false;
    if (!requiereCanalParaMetodo(metodoPago)) return false;
    if (canalesPagoFiltrados.length === 0) return true;
    return !canalPagoCodigo;
  }, [cobroMixto, tieneCanalesInvalidosEnCobroMixto, tieneEfectivoInvalidoEnCobroMixto, categoriaMetodoPago, metodoPago, canalesPagoFiltrados, canalPagoCodigo]);
  const validacionCaiLista = useMemo(() => {
    const emiteCai = emitirFactura && !!facturacionSar?.habilitadoCai;
    if (!emiteCai) return true;
    const nom = String(facturaCliente?.nombreCliente || '').trim();
    const dir = String(facturaCliente?.direccionCliente || '').trim();
    const tel = String(facturaCliente?.telefonoCliente || '').trim();
    const esOt = String(facturaCliente?.tipoCliente || '').toUpperCase() === 'OBLIGADO_TRIBUTARIO';
    const rtnDigits = String(facturaCliente?.rtnCliente || '').replace(/\D/g, '');
    const idn = String(facturaCliente?.identidadCliente || '').trim();
    if (nom.length < 3 || dir.length < 5 || tel.length < 5) return false;
    if (esOt) return rtnDigits.length === 14;
    return idn.length >= 5;
  }, [emitirFactura, facturacionSar, facturaCliente]);
  const todosItemsAsignados = useMemo(() => {
    if (!dividirCuenta) return true;
    return (detalleCuenta?.detalles || []).every(d => {
      const v = asignacionDetalles[d.id_Detalle_Cuenta_Mesa];
      return v !== null && v !== undefined;
    });
  }, [dividirCuenta, detalleCuenta, asignacionDetalles]);

  const todasPersonasListas = useMemo(() => {
    if (!dividirCuenta) return true;
    const n = Math.max(2, Number(personasDivision || 2));
    for (let i = 0; i < n; i++) {
      if (!personasListas.has(i)) return false;
    }
    return true;
  }, [dividirCuenta, personasListas, personasDivision]);

  const checklistCobro = useMemo(() => {
    const cajaLista = !!cajaActual?.abierta && !cargandoCaja;
    const cuentaConProductos = !!(detalleCuenta?.detalles?.length > 0);
    const pagosCuadrados = cobroMixto ? Math.abs(diferenciaPagosMixtos) <= 0.01 : true;
    const canalesListos = !bloqueoPreventivoCobro;
    const caiListo = validacionCaiLista;
    return [
      { key: 'caja', label: 'Caja abierta', ok: cajaLista },
      { key: 'consumo', label: 'Cuenta con consumo', ok: cuentaConProductos },
      ...(dividirCuenta ? [
        { key: 'asignados', label: 'Todos los items asignados', ok: todosItemsAsignados },
        { key: 'personas_listas', label: 'Cada persona cobrada', ok: todasPersonasListas }
      ] : []),
      { key: 'pagos', label: cobroMixto ? 'Pagos cuadran al total' : 'Metodo/cobro listo', ok: pagosCuadrados },
      { key: 'canal', label: 'Canales validados', ok: canalesListos },
      { key: 'cai', label: emitirFactura ? 'Datos CAI completos' : 'CAI no requerido', ok: caiListo }
    ];
  }, [cajaActual, cargandoCaja, detalleCuenta, dividirCuenta, cobroMixto, diferenciaPagosMixtos, bloqueoPreventivoCobro, validacionCaiLista, emitirFactura, todosItemsAsignados, todasPersonasListas]);
  const listoParaCobrar = checklistCobro.every((x) => x.ok);
  const cobrarDeshabilitado = cargandoCaja || !cajaActual?.abierta || procesando || bloqueoPreventivoCobro || !listoParaCobrar;

  useEffect(() => {
    if (dividirCuenta) setCobroMixto(true);
  }, [dividirCuenta]);

  useEffect(() => {
    if (!dividirCuenta) return;
    const cantidad = Math.max(1, Number(personasDivision || 1));
    const metodoDefault = metodosCobroBase[0]?.codigo || metodoPago || 'EFECTIVO';
    setPagosMixtos((prev) => {
      const base = Array.from({ length: cantidad }, (_, idx) => ({
        nombre: prev[idx]?.nombre || `Persona ${idx + 1}`,
        metodo_Pago: prev[idx]?.metodo_Pago || metodoDefault,
        canalPagoCodigo: prev[idx]?.canalPagoCodigo || '',
        monto: prev[idx]?.monto || '',
        recibido: prev[idx]?.recibido || ''
      }));
      return base.map((p) => {
        const metodo = normalizarMetodoCobro(p.metodo_Pago);
        const categoria = resolverCategoriaMetodo(metodo);
        if (categoria === 'EFECTIVO' || !requiereCanalParaMetodo(metodo)) return { ...p, metodo_Pago: metodo, canalPagoCodigo: '' };
        const canales = obtenerCanalesPorMetodo(metodo);
        const esValido = canales.some((x) => String(x?.codigo || '') === String(p.canalPagoCodigo || ''));
        return { ...p, metodo_Pago: metodo, canalPagoCodigo: esValido ? p.canalPagoCodigo : (canales[0]?.codigo || '') };
      });
    });
  }, [dividirCuenta, personasDivision, metodoPago, metodosPago, metodosCobroBase]);

  useEffect(() => {
    if (!dividirCuenta) return;
    const detalles = detalleCuenta?.detalles || [];
    const cantidad = Math.max(1, Number(personasDivision || 1));
    setAsignacionDetalles((prev) => {
      const next = {};
      detalles.forEach((d) => {
        const valorPrevio = prev[d.id_Detalle_Cuenta_Mesa];
        if (valorPrevio === undefined || valorPrevio === null) { next[d.id_Detalle_Cuenta_Mesa] = null; return; }
        const raw = Number(valorPrevio);
        next[d.id_Detalle_Cuenta_Mesa] = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), cantidad - 1) : null;
      });
      return next;
    });
  }, [dividirCuenta, detalleCuenta, personasDivision]);

  useEffect(() => {
    if (!dividirCuenta) return;
    setPagosMixtos((prev) => prev.map((p, idx) => ({ ...p, monto: String((montosAutoPorPersona[idx] || 0).toFixed(2)) })));
  }, [dividirCuenta, montosAutoPorPersona]);

  useEffect(() => {
    if (!cobroMixto) {
      setPagosMixtos([{ nombre: 'Cliente', metodo_Pago: metodoPago || 'EFECTIVO', canalPagoCodigo: '', monto: totalCuenta > 0 ? totalCuenta.toFixed(2) : '', recibido: '' }]);
    }
  }, [cobroMixto, metodoPago, totalCuenta]);

  useEffect(() => {
    if (!cobroMixto || dividirCuenta) return;
    setPagosMixtos((prev) => {
      const base = prev.length
        ? prev
        : [{ nombre: 'Pago 1', metodo_Pago: metodosCobroBase[0]?.codigo || 'EFECTIVO', canalPagoCodigo: '', monto: totalCuenta > 0 ? totalCuenta.toFixed(2) : '', recibido: '' }];
      return base.map((p, idx) => {
        const metodo = normalizarMetodoCobro(p?.metodo_Pago || metodosCobroBase[0]?.codigo || 'EFECTIVO');
        const categoria = resolverCategoriaMetodo(metodo);
        const montoActual = String(p?.monto || '').trim();
        const monto = idx === 0 && base.length === 1 && (!montoActual || Math.abs(Number(montoActual || 0) - Number(totalCuenta || 0)) <= 0.01)
          ? (totalCuenta > 0 ? totalCuenta.toFixed(2) : '')
          : p.monto;
        if (categoria === 'EFECTIVO' || !requiereCanalParaMetodo(metodo)) return { ...p, nombre: p.nombre || `Pago ${idx + 1}`, metodo_Pago: metodo, canalPagoCodigo: '', monto };
        const canales = obtenerCanalesPorMetodo(metodo);
        const esValido = canales.some((x) => String(x?.codigo || '') === String(p?.canalPagoCodigo || ''));
        return {
          ...p,
          nombre: p.nombre || `Pago ${idx + 1}`,
          metodo_Pago: metodo,
          canalPagoCodigo: esValido ? p.canalPagoCodigo : (canales[0]?.codigo || ''),
          monto
        };
      });
    });
  }, [cobroMixto, dividirCuenta, totalCuenta, metodosPago, metodosCobroBase]);

  const getCuentaMesa = (idMesa) => cuentas.find((c) => c.id_Mesa === idMesa);
  const mesasActivas = mesas.filter((m) => m.activo);
  const resolverClaseFormaMesa = (forma) => {
    const f = String(forma || '').trim().toUpperCase();
    if (f === 'CIRCULAR') return 'mesa-circular';
    if (f === 'OVALADA' || f === 'OVAL') return 'mesa-oval';
    if (f === 'BARRA') return 'mesa-barra';
    if (f === 'CUADRADA' || f === 'RECTANGULAR') return 'mesa-cuadrada';
    return 'mesa-capsula';
  };

  const abrirCuenta = async () => {
    limpiarMensajes();
    if (!mesaSeleccionada) return setError('Selecciona una mesa');
    if (getCuentaMesa(mesaSeleccionada.id_Mesa)) return setError('La mesa ya tiene una cuenta abierta');
    try {
      setProcesando(true);
      await api.post('/CuentasMesa/abrir', {
        id_Mesa: mesaSeleccionada.id_Mesa,
        observacion: formAbrir.observacion
      });
      setMensaje('Cuenta abierta correctamente');
      setFormAbrir({ observacion: '' });
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
      const response = await api.get('/CuentasMesa/abiertas');
      const cuentaNueva = (response.data || []).find((c) => c.id_Mesa === mesaSeleccionada.id_Mesa);
      if (cuentaNueva) await cargarCuentaDetalle(cuentaNueva.id_Cuenta_Mesa);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al abrir cuenta');
    } finally {
      setProcesando(false);
    }
  };

  const agregarProductoRapido = async (item) => {
    limpiarMensajes();
    if (!detalleCuenta?.cuenta?.id_Cuenta_Mesa) return setError('No hay cuenta abierta');
    try {
      setProcesando(true);
      await api.post(`/CuentasMesa/${detalleCuenta.cuenta.id_Cuenta_Mesa}/agregar-producto`, {
        id_Producto: Number(item.id_Producto),
        id_Presentacion: item.id_Presentacion ? Number(item.id_Presentacion) : null,
        cantidad: 1,
        tipo_Fiscal_Linea: String(item.tipo_Fiscal || 'GRAVADO_15').toUpperCase(),
        es_Cortesia: !!formAgregar.es_Cortesia,
        observacion: formAgregar.es_Cortesia ? '[CORTESIA]' : ''
      });
      await cargarCuentaDetalle(detalleCuenta.cuenta.id_Cuenta_Mesa);
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al agregar producto');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarDetalle = async (idDetalle) => {
    limpiarMensajes();
    try {
      setProcesando(true);
      await api.delete(`/CuentasMesa/detalle/${idDetalle}`);
      setMensaje('Detalle eliminado');
      if (detalleCuenta?.cuenta?.id_Cuenta_Mesa) await cargarCuentaDetalle(detalleCuenta.cuenta.id_Cuenta_Mesa);
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al eliminar detalle');
    } finally {
      setProcesando(false);
    }
  };

  const cambiarDescuentoDetalle = (idDetalle, aplica) => {
    const detalle = (detalleCuenta?.detalles || []).find((d) => d.id_Detalle_Cuenta_Mesa === idDetalle);
    if (detalle?.esCortesia) return;
    setDescuentoDetalles((prev) => ({
      ...prev,
      [idDetalle]: !!aplica
    }));
  };

  const actualizarPagoMixto = (index, campo, valor) => {
    setPagosMixtos((prev) => prev.map((linea, i) => {
      if (i !== index) return linea;
      if (campo !== 'metodo_Pago') return { ...linea, [campo]: valor };
      const metodoNuevo = String(valor || '').toUpperCase();
      const categoria = resolverCategoriaMetodo(metodoNuevo);
      if (categoria === 'EFECTIVO' || !requiereCanalParaMetodo(metodoNuevo)) return { ...linea, metodo_Pago: metodoNuevo, canalPagoCodigo: '' };
      const canales = obtenerCanalesPorMetodo(metodoNuevo);
      const canalValido = canales.some((x) => String(x?.codigo || '') === String(linea?.canalPagoCodigo || ''));
      return {
        ...linea,
        metodo_Pago: metodoNuevo,
        canalPagoCodigo: canalValido ? String(linea?.canalPagoCodigo || '') : (canales[0]?.codigo || '')
      };
    }));
  };

  const agregarPagoMixtoSimple = () => {
    const restante = Math.max(0, diferenciaPagosMixtos);
    const metodoDefault = metodosCobroBase[0]?.codigo || 'EFECTIVO';
    setPagosMixtos((prev) => [
      ...prev,
      {
        nombre: `Pago ${prev.length + 1}`,
        metodo_Pago: metodoDefault,
        canalPagoCodigo: '',
        monto: restante > 0 ? restante.toFixed(2) : '',
        recibido: ''
      }
    ]);
  };

  const eliminarPagoMixtoSimple = (index) => {
    setPagosMixtos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length
        ? next
        : [{ nombre: 'Pago 1', metodo_Pago: 'EFECTIVO', canalPagoCodigo: '', monto: totalCuenta > 0 ? totalCuenta.toFixed(2) : '', recibido: '' }];
    });
  };

  const asignarDetalleAPersona = (idDetalle, personaIndex) => {
    setAsignacionDetalles((prev) => ({ ...prev, [idDetalle]: Number(personaIndex || 0) }));
  };

  const construirPayloadPersonaTicket = (idx, idVenta = null) => {
    if (!dividirCuenta || !detalleCuenta?.detalles?.length) return null;

    const cantidad = Math.max(1, Number(personasDivision || 1));
    if (idx < 0 || idx >= cantidad) return null;

    const nombreSucursalActual =
      sucursales.find((s) => String(s.id_Sucursal) === String(sucursalSeleccionada))?.nombre ||
      'Sucursal';

    const pago = pagosMixtos[idx] || {};
    const nombre = String(pago?.nombre || '').trim() || `Persona ${idx + 1}`;
    const metodoPersonaCodigo = String(pago?.metodo_Pago || metodoPago || 'EFECTIVO').trim().toUpperCase();
    const canalesPersona = obtenerCanalesPorMetodo(metodoPersonaCodigo);
    const canalPersona = canalesPersona.find((x) => String(x?.codigo || '') === String(pago?.canalPagoCodigo || '')) || null;
    const metodoPagoPersona = resolverCategoriaMetodo(metodoPersonaCodigo) === 'EFECTIVO'
      ? metodoPersonaCodigo
      : requiereCanalParaMetodo(metodoPersonaCodigo)
        ? `${metodoPersonaCodigo === 'TRANSFERENCIA' ? 'Transferencia' : 'Tarjeta / POS'}${canalPersona ? ` - ${canalPersona.nombre || canalPersona.codigo}` : ''}`
        : nombreMetodoCobro(metodoPersonaCodigo);
    const items = (detalleCuenta?.detalles || [])
      .filter((d) => Number(asignacionDetalles[d.id_Detalle_Cuenta_Mesa] ?? 0) === idx)
      .map((d) => ({
        producto: d.producto,
        cantidad: Number(d.cantidad || 0),
        subtotal: Number(d.subtotal || 0)
      }));

    const totalPersona = redondear2(Number(pago?.monto || montosAutoPorPersona[idx] || 0));
    const montoDado = Number(montoDadoPorPersona[idx] || 0);
    const esEfectivo = resolverCategoriaMetodo(metodoPersonaCodigo) === 'EFECTIVO';
    const cambio = esEfectivo && montoDado > totalPersona ? redondear2(montoDado - totalPersona) : 0;

    return {
      idVenta,
      mesa: mesaSeleccionada?.nombre || `Mesa #${detalleCuenta?.cuenta?.id_Mesa || ''}`,
      cuenta: `#${detalleCuenta?.cuenta?.id_Cuenta_Mesa || ''}`,
      sucursal: nombreSucursalActual,
      tipoServicio: tipoServicio === 'LLEVAR' ? 'Para llevar' : 'Comer aqui',
      moneda: 'L',
      total: Number(totalCuenta || 0),
      persona: {
        nombre,
        metodoPago: metodoPagoPersona || 'EFECTIVO',
        total: totalPersona,
        items
      },
      indicePersona: idx + 1,
      totalPersonas: cantidad,
      montoDado,
      cambio
    };
  };

  const cobrarPersonaDivision = async (idx) => {
    limpiarMensajes();
    if (!dividirCuenta) return;
    if (!cajaActual?.abierta) return setError('Debes abrir caja primero');
    if (personasListas.has(idx)) return;

    const pago = pagosMixtos[idx] || {};
    const nombre = String(pago?.nombre || '').trim();
    if (!nombre) return setError(`Ingresa el nombre de la persona ${idx + 1}`);

    const itemsPersona = (detalleCuenta?.detalles || []).filter((d) => Number(asignacionDetalles[d.id_Detalle_Cuenta_Mesa]) === idx);
    if (itemsPersona.length === 0) return setError(`${nombre} no tiene productos asignados`);

    const totalPersona = redondear2(montosAutoPorPersona[idx] || 0);
    if (totalPersona <= 0) return setError(`El total de ${nombre} debe ser mayor a cero`);

    const metodo = String(pago?.metodo_Pago || 'EFECTIVO').toUpperCase();
    const categoria = resolverCategoriaMetodo(metodo);
    if (categoria !== 'EFECTIVO' && requiereCanalParaMetodo(metodo)) {
      const canales = obtenerCanalesPorMetodo(metodo);
      const canal = String(pago?.canalPagoCodigo || '');
      if (!canal || !canales.some((x) => String(x?.codigo || '') === canal)) {
        return setError(`${nombre} necesita un canal valido para ${metodo === 'TRANSFERENCIA' ? 'transferencia' : 'POS'}`);
      }
    } else {
      const recibido = Number(montoDadoPorPersona[idx] || 0);
      if (!recibido || recibido < totalPersona) return setError(`El efectivo recibido de ${nombre} debe cubrir su total`);
    }

    try {
      setProcesando(true);
      const payload = construirPayloadPersonaTicket(idx);
      await imprimirPreTicketPersona(payload);
      const newListas = new Set([...personasListas, idx]);
      setPersonasListas(newListas);
      setMensaje(`${nombre} cobrado e impreso. ${newListas.size}/${Math.max(2, Number(personasDivision || 2))} personas cobradas.`);

      const nPer = Math.max(2, Number(personasDivision || 2));
      const todasCobradas = Array.from({ length: nPer }, (_, i) => i).every((i) => newListas.has(i));
      const puedeCerrar = todasCobradas && !!cajaActual?.abierta && !cargandoCaja && !bloqueoPreventivoCobro && todosItemsAsignados && validacionCaiLista && Math.abs(diferenciaPagosMixtos) <= 0.01;
      if (puedeCerrar) {
        await cobrarCuenta();
      }
    } catch (err) {
      setError(err?.message || `No se pudo imprimir el ticket de ${nombre}`);
    } finally {
      setProcesando(false);
    }
  };

  const cobrarCuenta = async () => {
    limpiarMensajes();
    if (!detalleCuenta?.cuenta?.id_Cuenta_Mesa) return setError('No hay cuenta abierta');
    if (!cajaActual?.abierta) return setError('Debes abrir caja primero');
    if (!detalleCuenta.detalles || detalleCuenta.detalles.length === 0) return setError('La cuenta no tiene productos');
    if (descuentoNum < 0 || impuestoNum < 0) return setError('Descuento/impuesto invalidos');
    if (subtotalBaseCuenta < 0) return setError('El subtotal base no puede ser negativo');
    if (totalCuenta < 0) return setError('El total no puede ser negativo');
    if (dividirCuenta) {
      const sinAsignar = (detalleCuenta?.detalles || []).filter(d => {
        const v = asignacionDetalles[d.id_Detalle_Cuenta_Mesa];
        return v === null || v === undefined;
      });
      if (sinAsignar.length > 0) return setError(`Hay ${sinAsignar.length} producto(s) sin asignar a una persona`);
      if (pagosMixtosNormalizados.length === 0) return setError('Debes ingresar al menos un pago en cobro mixto');
      if (Math.abs(diferenciaPagosMixtos) > 0.01) return setError('La suma de pagos mixtos debe ser igual al total');
      if ((pagosMixtos || []).some((p) => !String(p?.nombre || '').trim())) return setError('Cada persona debe tener nombre');
      const codigosPermitidos = new Set((metodosCobroBase || []).map((m) => String(m?.codigo || '').toUpperCase()));
      const metodoInvalido = (pagosMixtos || []).some((p) => !codigosPermitidos.has(String(p?.metodo_Pago || '').toUpperCase()));
      if (metodoInvalido) return setError('Hay metodos de pago no permitidos en la configuracion actual.');
      const canalInvalido = (pagosMixtos || []).some((p) => {
        const metodo = String(p?.metodo_Pago || '').toUpperCase();
        const categoria = resolverCategoriaMetodo(metodo);
        if (categoria === 'EFECTIVO' || !requiereCanalParaMetodo(metodo)) return false;
        const canales = obtenerCanalesPorMetodo(metodo);
        if (!canales.length) return true;
        const canal = String(p?.canalPagoCodigo || '');
        return !canal || !canales.some((x) => String(x?.codigo || '') === canal);
      });
      if (canalInvalido) return setError('Cada pago no efectivo debe tener un canal valido configurado.');
    } else if (cobroMixto) {
      if (pagosMixtosNormalizados.length === 0) return setError('Debes ingresar al menos un pago mixto');
      if (Math.abs(diferenciaPagosMixtos) > 0.01) return setError('La suma de pagos mixtos debe ser igual al total');
      const codigosPermitidos = new Set((metodosCobroBase || []).map((m) => String(m?.codigo || '').toUpperCase()));
      const metodoInvalido = (pagosMixtos || []).some((p) => Number(p?.monto || 0) > 0 && !codigosPermitidos.has(String(p?.metodo_Pago || '').toUpperCase()));
      if (metodoInvalido) return setError('Hay metodos de pago no permitidos en la configuracion actual.');
      if (tieneCanalesInvalidosEnCobroMixto) return setError('Cada pago no efectivo debe tener un canal valido configurado.');
      if (tieneEfectivoInvalidoEnCobroMixto) return setError('En efectivo mixto, el recibido no puede ser menor al monto aplicado.');
    } else {
      const esEfectivo = String(categoriaMetodoPago || '').toUpperCase() === 'EFECTIVO';
      const requiereCanal = requiereCanalParaMetodo(metodoPago);
      if (!esEfectivo && requiereCanal) {
        if (canalesPagoFiltrados.length === 0) return setError('Configura canales en administracion para este metodo de pago.');
        if (!canalPagoCodigo) return setError('Selecciona un canal de pago antes de cobrar.');
      }
    }

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

    try {
      setProcesando(true);
      const canalPagoSeleccionado = canalesPagoFiltrados.find((x) => String(x?.codigo || '') === String(canalPagoCodigo || '')) || null;
      const metodoPagoFinal = cobroMixto
        ? 'MIXTO'
        : canalPagoSeleccionado?.nombre || canalPagoSeleccionado?.codigo || nombreMetodoCobro(metodoPago);
      const detalleDivision = dividirCuenta
        ? pagosMixtosDetalle.map((p) => `${p.nombre}:${p.monto.toFixed(2)}(${p.metodo_Pago})`).join('; ')
        : '';
      const detallePagoMixto = cobroMixto && !dividirCuenta
        ? pagosMixtosDetalle.map((p) => {
            const cambio = p.categoria === 'EFECTIVO' && p.recibido > p.monto ? ` Cambio:${(p.recibido - p.monto).toFixed(2)}` : '';
            const recibido = p.categoria === 'EFECTIVO' && p.recibido > 0 ? ` Recibido:${p.recibido.toFixed(2)}` : '';
            return `${p.metodo_Pago}:${p.monto.toFixed(2)}${recibido}${cambio}`;
          }).join('; ')
        : '';
      const observacionCobro = `Cobro de mesa | TipoPago:${cobroMixto ? 'MIXTO' : nombreMetodoCobro(metodoPago)}${canalPagoSeleccionado && !cobroMixto ? ` | Canal:${canalPagoSeleccionado.nombre || canalPagoSeleccionado.codigo}` : ''} | Desc:${modoDescuento} | Imp:${modoImpuesto}${detalleDivision ? ` | DIVISION:${detalleDivision}` : ''}${detallePagoMixto ? ` | PAGOS_MESA:${detallePagoMixto}` : ''}`;
      const emiteCaiReq = emitirFactura && !!facturacionSar?.habilitadoCai;
      const response = await api.post(`/CuentasMesa/${detalleCuenta.cuenta.id_Cuenta_Mesa}/cobrar`, {
        id_Caja: cajaActual.id_Caja,
        descuento: descuentoNum,
        impuesto: impuestoNum,
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
        pagos: cobroMixto ? pagosMixtosNormalizados : [],
        tipo_Servicio: tipoServicio,
        observacion: observacionCobro
      });

      const idVenta = response.data.data.id_Venta;
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
      setDetalleCuenta(null);
      setMesaVistaSoloCobro(false);
      setModoDescuento('NINGUNO');
      setDescuentoManual('0');
      setModoImpuesto('INCLUIDO_15');
      setImpuestoManual('0');
      setEmitirFactura(false);
      setFacturaCliente(facturaClienteVacio());
      setMetodoPago('EFECTIVO');
      setCanalPagoCodigo('');
      setTipoServicio('COMER_AQUI');
      setDividirCuenta(false);
      setCobroMixto(false);
      setPagosMixtos([{ nombre: 'Pago 1', metodo_Pago: 'EFECTIVO', canalPagoCodigo: '', monto: '', recibido: '' }]);
      setAsignacionDetalles({});
      setDescuentoDetalles({});
      setPersonasDivision(2);
      setPersonasListas(new Set());
      setMontoDadoPorPersona({});

      let mensajeExito = `Cuenta cobrada. Venta #${idVenta}`;
      try {
        await imprimirTicketHtml(idVenta);
      } catch (printErr) {
        setError(printErr?.message || 'Cuenta cobrada, pero no se pudo abrir la impresion');
      }
      setMensaje(mensajeExito);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cobrar cuenta');
    } finally {
      setProcesando(false);
    }
  };

  const cancelarCuenta = async () => {
    limpiarMensajes();
    if (!detalleCuenta?.cuenta?.id_Cuenta_Mesa) return setError('No hay cuenta abierta');
    if (!window.confirm('Se cancelara esta cuenta y se eliminaran sus productos. Continuar?')) return;

    try {
      setProcesando(true);
      await api.post(`/CuentasMesa/${detalleCuenta.cuenta.id_Cuenta_Mesa}/cancelar`);
      setMensaje('Cuenta cancelada y mesa liberada correctamente');
      setDetalleCuenta(null);
      setMesaVistaSoloCobro(false);
      setFormAgregar({ id_Producto: '', id_Presentacion: '', es_Cortesia: false });
      setFiltroProducto('');
      setDividirCuenta(false);
      setCobroMixto(false);
      setPagosMixtos([{ nombre: 'Pago 1', metodo_Pago: 'EFECTIVO', canalPagoCodigo: '', monto: '', recibido: '' }]);
      setAsignacionDetalles({});
      setDescuentoDetalles({});
      setPersonasDivision(2);
      setPersonasListas(new Set());
      setMontoDadoPorPersona({});
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al cancelar cuenta');
    } finally {
      setProcesando(false);
    }
  };

  const seleccionarMesa = async (mesa) => {
    limpiarMensajes();
    setMesaSeleccionada(mesa);
    setDetalleCuenta(null);
    setModoDescuento('NINGUNO');
    setDescuentoManual('0');
    setModoImpuesto('INCLUIDO_15');
    setImpuestoManual('0');
    setEmitirFactura(false);
    setMetodoPago('EFECTIVO');
    setCanalPagoCodigo('');
    setTipoServicio('COMER_AQUI');
    setPersonasDivision(2);
    setDividirCuenta(false);
    setCobroMixto(false);
    setPagosMixtos([{ nombre: 'Pago 1', metodo_Pago: 'EFECTIVO', canalPagoCodigo: '', monto: '', recibido: '' }]);
    setAsignacionDetalles({});
    setDescuentoDetalles({});
    setFiltroProducto('');
    setCategoriaMenu('');
    setVistaTablet('cuenta');
    setMesaVistaSoloCobro(false);
    const cuenta = getCuentaMesa(mesa.id_Mesa);
    if (cuenta) await cargarCuentaDetalle(cuenta.id_Cuenta_Mesa);
  };

  return (
    <div className="mesas-page">
      <div className="mesas-page-hero card border-0 mb-4 overflow-hidden">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h2 className="mb-0 fw-bold">Mesas y Cuentas</h2>
              <div className="d-flex gap-3 mt-1 flex-wrap">
                <span style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.65)'}}>
                  Toca una mesa para gestionar la cuenta
                </span>
                {mesasActivas.length > 0 && (
                  <span style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.85)', fontWeight:700}}>
                    {cuentas.length} ocupada{cuentas.length !== 1 ? 's' : ''} · {mesasActivas.length - cuentas.length} libre{mesasActivas.length - cuentas.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className={`badge rounded-pill px-3 py-2 fs-6 ${cajaActual?.abierta ? 'bg-success' : 'bg-warning text-dark'}`} style={{fontWeight:700}}>
                {cargandoCaja ? '⏳ Caja...' : cajaActual?.abierta ? `✓ Caja #${cajaActual.id_Caja}` : '⚠ Caja cerrada'}
              </span>
            </div>
          </div>
        </div>
      </div>
      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-4 mesas-toolbar-card">
        <div className="card-body py-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Sucursal</label>
              <select className="form-select" value={sucursalSeleccionada} onChange={(e) => setSucursalSeleccionada(e.target.value)} disabled={!esAdmin}>
                <option value="">Seleccione</option>
                {sucursales.map((s) => <option key={s.id_Sucursal} value={s.id_Sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            {esAdmin && (
              <div className="col-md-8">
                <div className="alert alert-info mb-0 py-2 small">
                  El plano de mesas (posicion y forma) se configura en <strong>Locales → Mesas (configuracion)</strong>.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="d-xl-none mb-3">
        <div className="btn-group w-100" role="group" aria-label="Vista mesas/cuenta">
          <button
            type="button"
            className={`btn ${vistaTablet === 'mesas' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setVistaTablet('mesas')}
          >
            Mesas
          </button>
          <button
            type="button"
            className={`btn ${vistaTablet === 'cuenta' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setVistaTablet('cuenta')}
          >
            Cuenta y Cobro
          </button>
        </div>
      </div>

      <div className={`row g-3 ${mesaVistaSoloCobro && detalleCuenta ? 'mesas-layout-solo-cobro' : ''}`}>
        <div
          className={`col-12 col-xl-5 ${vistaTablet === 'mesas' ? '' : 'd-none d-xl-block'} ${
            mesaVistaSoloCobro && detalleCuenta ? 'd-none' : ''
          }`}
        >
          <div className="card shadow-sm">
            <div className="card-body position-relative mesas-stage">
              {mesasActivas.map((mesa) => {
                const cuenta = getCuentaMesa(mesa.id_Mesa);
                const color = cuenta ? '#dc2626' : '#059669';
                const claseForma = resolverClaseFormaMesa(mesa.forma);
                const capacidad = Math.max(1, Number(mesa.capacidad || 1));
                return (
                  <div
                    key={mesa.id_Mesa}
                    onClick={() => seleccionarMesa(mesa)}
                    className={`mesa-node ${claseForma} ${cuenta ? 'mesa-ocupada' : 'mesa-libre'} ${mesaSeleccionada?.id_Mesa === mesa.id_Mesa ? 'mesa-selected' : ''}`}
                    style={{
                      position: 'absolute',
                      left: `${mesa.pos_X}px`,
                      top: `${mesa.pos_Y}px`,
                      width: `${mesa.ancho}px`,
                      height: `${mesa.alto}px`,
                      '--mesa-accent': color
                    }}
                  >
                    <div className="mesa-inner">
                      <div className="mesa-nombre">{mesa.nombre}</div>
                      <div className={`mesa-estado ${cuenta ? 'ocupada' : 'libre'}`}>{cuenta ? 'OCUPADA' : 'LIBRE'}</div>
                      {cuenta && cuenta.total != null
                        ? <div className="mesa-total-badge">L {Number(cuenta.total || 0).toFixed(0)}</div>
                        : <div className="mesa-capacidad">Cap. {capacidad}</div>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`${mesaVistaSoloCobro && detalleCuenta ? 'col-12' : 'col-12 col-xl-7'} ${
            vistaTablet === 'cuenta' ? '' : 'd-none d-xl-block'
          }`}
        >
          <div className={`card shadow-sm mesas-panel-card mesas-pos-shell ${mesaVistaSoloCobro && detalleCuenta ? 'mesas-panel-cobro-full' : ''}`}>
            <div className="card-body mesas-panel-body">
              <div className="d-xl-none mb-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setVistaTablet('mesas')}>
                  Volver a mesas
                </button>
              </div>
              {!mesaSeleccionada ? (
                <p>Selecciona una mesa</p>
              ) : (
                <>
                  <div className="mesas-header-strip mb-3">
                    <div>
                      <h5 className="mb-1">{mesaSeleccionada.nombre}</h5>
                      <div className="small text-muted">Capacidad: {mesaSeleccionada.capacidad}</div>
                    </div>
                    <span className={`badge ${detalleCuenta ? 'text-bg-danger' : 'text-bg-success'}`}>
                      {detalleCuenta ? 'Cuenta abierta' : 'Mesa libre'}
                    </span>
                  </div>
                  {detalleCuenta && (
                    <div className="d-xl-none mesas-tablet-quick-actions mb-3">
                      <button
                        type="button"
                        className={`btn ${!mesaVistaSoloCobro ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => setMesaVistaSoloCobro(false)}
                      >
                        Consumo
                      </button>
                      <button
                        type="button"
                        className={`btn ${mesaVistaSoloCobro ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => setMesaVistaSoloCobro(true)}
                      >
                        Cobro
                      </button>
                      <button
                        type="button"
                        className={`btn ${dividirCuenta ? 'btn-warning' : 'btn-outline-warning'}`}
                        onClick={() => setDividirCuenta((v) => !v)}
                      >
                        {dividirCuenta ? 'Cobro dividido' : 'Dividir'}
                      </button>
                      <button type="button" className="btn btn-dark" onClick={cobrarCuenta} disabled={cobrarDeshabilitado}>
                        Cobrar
                      </button>
                    </div>
                  )}
                  {!detalleCuenta ? (
                    <>
                      <h6>Abrir cuenta</h6>
                      <input type="text" className="form-control mb-3" placeholder="Observacion" value={formAbrir.observacion} onChange={(e) => setFormAbrir({ observacion: e.target.value })} />
                      <button className="btn btn-dark w-100" onClick={abrirCuenta} disabled={procesando}>{procesando ? 'Procesando...' : 'Abrir cuenta'}</button>
                    </>
                  ) : (
                    <>
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                        <h6 className="mb-0">Cuenta #{detalleCuenta.cuenta.id_Cuenta_Mesa}</h6>
                        <div className="small mesas-atendio-chip">
                          {detalleCuenta?.atendidoPor?.nombre || detalleCuenta?.atendidoPor?.usuarioLogin || 'N/D'}
                        </div>
                      </div>

                      {subtotalCuenta > 0 && (
                        <div className="mesas-account-summary mb-2">
                          <div>
                            <div className="mesas-account-summary-label">{detalleCuenta.detalles.length} producto{detalleCuenta.detalles.length !== 1 ? 's' : ''}</div>
                            <div style={{fontSize:'0.7rem', color:'#166534', opacity:0.75}}>subtotal actual</div>
                          </div>
                          <div className="mesas-account-summary-amount">L {subtotalCuenta.toFixed(2)}</div>
                        </div>
                      )}

                      <div className="bg-white border rounded p-3 mb-3 mesas-totals-card">
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                          <span className="small text-muted">Estado de caja</span>
                          <span className={`badge ${cargandoCaja ? 'bg-secondary' : cajaActual?.abierta ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {cargandoCaja ? 'Validando caja...' : cajaActual?.abierta ? `Caja #${cajaActual.id_Caja} abierta` : 'Caja cerrada'}
                          </span>
                        </div>
                        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                          <div className="small text-muted mb-0">
                            {mesaVistaSoloCobro ? 'Modo cobro ampliado — usa el boton para volver al consumo.' : 'Agrega consumo, divide si hace falta, y cobra con el total destacado.'}
                          </div>
                          <div className="btn-group btn-group-sm" role="group" aria-label="Vista cobro mesa">
                            <button
                              type="button"
                              className={`btn ${mesaVistaSoloCobro ? 'btn-success' : 'btn-outline-success'}`}
                              onClick={() => setMesaVistaSoloCobro(true)}
                            >
                              Solo cobro
                            </button>
                            <button
                              type="button"
                              className={`btn ${!mesaVistaSoloCobro ? 'btn-secondary' : 'btn-outline-secondary'}`}
                              onClick={() => setMesaVistaSoloCobro(false)}
                            >
                              Ver consumo
                            </button>
                          </div>
                        </div>
                      </div>

                      <details className="mesas-consumo-details border rounded px-2 py-1 mb-3" open={!mesaVistaSoloCobro}>
                        <summary className="fw-semibold py-2 user-select-none small px-1">
                          Consumo y agregar productos
                          {mesaVistaSoloCobro && <span className="text-muted fw-normal ms-1">— toca para expandir</span>}
                        </summary>
                        <div className="pt-2">
                      <div className="mesas-section-card mb-3">
                        <div className="mesas-section-title">Consumo actual</div>
                        <div className="mesas-detalle-list">
                        {detalleCuenta.detalles.length === 0 ? (
                          <div className="text-center text-muted small py-2">Sin productos</div>
                        ) : (
                          detalleCuenta.detalles.map((d) => (
                            <div key={d.id_Detalle_Cuenta_Mesa} className="mesas-order-item">
                              <div className="mesas-order-item-left">
                                <div className="mesas-order-item-name">
                                  {d.producto}
                                  {d.esCortesia && <span className="mesas-cortesia-badge">Cortesia</span>}
                                </div>
                                <div className="mesas-order-item-sub">
                                  {Number(d.cantidad || 0)}× L {Number(d.precio_Unitario || 0).toFixed(2)}
                                </div>
                                {(dividirCuenta || modoDescuento !== 'NINGUNO') && (
                                  <div className="mesas-order-item-extras">
                                    {dividirCuenta && (() => {
                                      const asignado = asignacionDetalles[d.id_Detalle_Cuenta_Mesa];
                                      const persona = (asignado !== null && asignado !== undefined) ? pagosMixtos[asignado] : null;
                                      return (
                                        <span className={`badge ${persona ? 'text-bg-primary' : 'text-bg-warning text-dark'}`} style={{ fontSize: '0.7rem' }}>
                                          {persona ? (persona.nombre || `P${asignado + 1}`) : 'Sin asignar'}
                                        </span>
                                      );
                                    })()}
                                    {modoDescuento !== 'NINGUNO' && (
                                      <div className="form-check mb-0">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          id={`desc-detalle-${d.id_Detalle_Cuenta_Mesa}`}
                                          checked={descuentoDetalles[d.id_Detalle_Cuenta_Mesa] ?? true}
                                          disabled={!!d.esCortesia}
                                          onChange={(e) => cambiarDescuentoDetalle(d.id_Detalle_Cuenta_Mesa, e.target.checked)}
                                        />
                                        <label className="form-check-label small" htmlFor={`desc-detalle-${d.id_Detalle_Cuenta_Mesa}`}>
                                          Aplica desc.
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mesas-order-item-right">
                                <span className="mesas-order-item-total">L {Number(d.subtotal || 0).toFixed(2)}</span>
                                <button
                                  className="mesas-order-item-del"
                                  onClick={() => eliminarDetalle(d.id_Detalle_Cuenta_Mesa)}
                                  disabled={procesando}
                                  title="Eliminar"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                        </div>
                      </div>

                      <hr />
                      <div className="mesas-section-card mb-3">
                      <div className="mesas-menu-header">
                        <h6 className="mesas-section-title mb-0">Agregar producto</h6>
                        <label className={`mesas-menu-cortesia-toggle ${formAgregar.es_Cortesia ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={!!formAgregar.es_Cortesia}
                            onChange={(e) => setFormAgregar((prev) => ({ ...prev, es_Cortesia: e.target.checked }))}
                          />
                          Cortesia
                        </label>
                      </div>
                      <div className="mesas-categorias-quick mb-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${!categoriaMenu ? 'btn-dark' : 'btn-outline-secondary'}`}
                          onClick={() => setCategoriaMenu('')}
                        >
                          Todas
                        </button>
                        {categoriasMenu.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`btn btn-sm ${categoriaMenu === cat ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setCategoriaMenu(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Buscar producto..."
                        value={filtroProducto}
                        onChange={(e) => setFiltroProducto(e.target.value)}
                      />
                      <div className="mesas-menu-grid mb-2">
                        {menuItemsFiltrados.length === 0 ? (
                          <div className="p-2 small text-muted" style={{gridColumn:'1/-1'}}>Sin productos para ese filtro.</div>
                        ) : (
                          menuItemsFiltrados.slice(0, 60).map((item) => (
                            <button
                              type="button"
                              key={`${item.id_Producto}-${item.id_Presentacion ?? 'n'}`}
                              className="mesas-menu-product-card"
                              onClick={() => agregarProductoRapido(item)}
                              disabled={procesando}
                              title={`Agregar ${item.nombre}`}
                            >
                              <span className="mesas-menu-product-name">{item.nombre}</span>
                              <span className="mesas-menu-product-price">L {Number(item.precio).toFixed(2)}</span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="small text-muted">
                        {formAgregar.es_Cortesia
                          ? '★ Modo cortesia — se agrega sin costo'
                          : 'Toca un producto para agregarlo a la cuenta'}
                      </div>
                      </div>
                        </div>
                      </details>

                      <div className="pro-checkout-flow-block mt-3">
                        <div className="pro-checkout-flow-title">1 · Descuentos e impuesto</div>
                        <div className="pro-checkout-pricing-panel border rounded p-3 mb-0 bg-light">
                          <div className="small text-muted mb-2">Ajusta antes del pago; el total de abajo se actualiza al instante.</div>
                          <div className="row g-2 mb-2">
                            <div className="col-12">
                              <label className="form-label mb-1">Descuento sobre lineas</label>
                              <select className="form-select" value={modoDescuento} onChange={(e) => setModoDescuento(e.target.value)}>
                                {descuentosActivos.map((opt) => <option key={opt.codigo} value={opt.codigo}>{opt.nombre}</option>)}
                              </select>
                            </div>
                            {descuentoSeleccionado?.permiteEditarMonto && (
                              <div className="col-12">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="form-control"
                                  value={descuentoManual}
                                  onChange={(e) => setDescuentoManual(e.target.value)}
                                  placeholder="Monto descuento"
                                />
                              </div>
                            )}
                            {modoDescuento !== 'NINGUNO' && (
                              <div className="col-12">
                                <div className="small text-muted">Marca en cada linea de Consumo actual si aplica descuento a esa linea.</div>
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
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="form-control"
                                  value={impuestoManual}
                                  onChange={(e) => setImpuestoManual(e.target.value)}
                                  placeholder="Monto impuesto"
                                />
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
                                id="emitirFacturaMesa"
                                checked={emitirFactura}
                                onChange={(e) => setEmitirFactura(e.target.checked)}
                              />
                              <label className="form-check-label fw-semibold" htmlFor="emitirFacturaMesa">
                                Emitir factura CAI (complete datos del adquirente abajo)
                              </label>
                            </div>
                            {emitirFactura && <FacturaCaiClienteForm idPrefix="mesa" value={facturaCliente} onChange={setFacturaCliente} />}
                          </div>
                        ) : (
                          <div className="alert alert-light border py-2 mb-0 small text-body-secondary">
                            <strong>Sin CAI en esta sucursal.</strong> El cobro registra la venta y el ticket; no se emiten correlativos SAR hasta que un administrador active y configure CAI.
                          </div>
                        )}
                      </div>

                      <div className="pro-checkout-flow-block pro-checkout-flow-block--pay mt-3">
                        <div className="pro-checkout-flow-title">4 · Forma de cobro y pago</div>
                        <div className="row g-2 mesas-cobro-shell">
                        <div className="col-12">
                          <div className="mesas-cobro-helper small text-muted">
                            Define si cobras en un solo pago o dividido. Si no es efectivo, selecciona siempre el canal para cuadrar caja correctamente.
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="small text-muted fw-semibold mb-1">Modo de cobro</div>
                          <div className="d-flex gap-2 flex-wrap">
                            <button
                              type="button"
                              className={`btn flex-fill pro-service-btn ${!dividirCuenta && !cobroMixto ? 'btn-dark' : 'btn-outline-secondary'}`}
                              onClick={() => {
                                setDividirCuenta(false);
                                setCobroMixto(false);
                                setPersonasListas(new Set());
                                setMontoDadoPorPersona({});
                              }}
                              disabled={procesando}
                            >
                              Pago unico
                            </button>
                            <button
                              type="button"
                              className={`btn flex-fill pro-service-btn ${!dividirCuenta && cobroMixto ? 'btn-success' : 'btn-outline-secondary'}`}
                              onClick={() => {
                                setDividirCuenta(false);
                                setCobroMixto(true);
                                setPersonasListas(new Set());
                                setMontoDadoPorPersona({});
                                setPagosMixtos([{ nombre: 'Pago 1', metodo_Pago: 'EFECTIVO', canalPagoCodigo: '', monto: totalCuenta > 0 ? totalCuenta.toFixed(2) : '', recibido: '' }]);
                              }}
                              disabled={procesando}
                            >
                              Pago mixto
                            </button>
                            <button
                              type="button"
                              className={`btn flex-fill pro-service-btn ${dividirCuenta ? 'btn-warning' : 'btn-outline-secondary'}`}
                              style={dividirCuenta ? {color:'#713f12', fontWeight:800} : {}}
                              onClick={() => {
                                setDividirCuenta(true);
                                setCobroMixto(true);
                                setPersonasListas(new Set());
                                setMontoDadoPorPersona({});
                              }}
                              disabled={procesando}
                            >
                              Dividir cuenta
                            </button>
                          </div>
                        </div>
                        <div className="col-12">
                          <CheckoutPayMethodChips
                            value={metodoPago}
                            onChange={setMetodoPago}
                            disabled={cobroMixto || procesando}
                            options={(metodosCobroBase || []).length
                              ? metodosCobroBase.map((m) => ({
                                  codigo: String(m.codigo || '').toUpperCase(),
                                  label: m.nombre || m.codigo,
                                  title: m.nombre
                                }))
                              : undefined}
                          />
                        </div>
                        {!dividirCuenta && !cobroMixto && String(categoriaMetodoPago || '').toUpperCase() !== 'EFECTIVO' && requiereCanalParaMetodo(metodoPago) && (
                          <div className="col-12">
                            <label className="form-label mb-1">Canal de pago</label>
                            <select
                              className="form-select"
                              value={canalPagoCodigo}
                              onChange={(e) => setCanalPagoCodigo(e.target.value)}
                              disabled={procesando}
                            >
                              {canalesPagoFiltrados.length === 0 ? (
                                <option value="">Configura canales en Administracion</option>
                              ) : (
                                canalesPagoFiltrados.map((canal) => (
                                  <option key={canal.codigo} value={canal.codigo}>
                                    {canal.nombre}
                                  </option>
                                ))
                              )}
                            </select>
                            <div className={`mesas-canal-hint small mt-1 ${canalesPagoFiltrados.length === 0 ? 'text-danger' : 'text-success'}`}>
                              {canalesPagoFiltrados.length === 0
                                ? 'No hay canales disponibles para este metodo.'
                                : `Canal activo: ${canalesPagoFiltrados.find((x) => String(x?.codigo || '') === String(canalPagoCodigo || ''))?.nombre || 'Selecciona canal'}`}
                            </div>
                          </div>
                        )}
                        {!dividirCuenta && cobroMixto && (
                          <div className="col-12">
                            <div className="pos-mixed-pay-panel">
                              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                                <div>
                                  <div className="fw-semibold small">Pagos de la mesa</div>
                                  <div className={`small ${Math.abs(diferenciaPagosMixtos) <= 0.01 ? 'text-success' : diferenciaPagosMixtos > 0 ? 'text-danger' : 'text-warning'}`}>
                                    Ingresado: L {totalPagosMixtos.toFixed(2)}
                                    {' '}
                                    {Math.abs(diferenciaPagosMixtos) <= 0.01
                                      ? '| Cuadrado'
                                      : diferenciaPagosMixtos > 0
                                        ? `| Faltan L ${diferenciaPagosMixtos.toFixed(2)}`
                                        : `| Sobra L ${Math.abs(diferenciaPagosMixtos).toFixed(2)}`}
                                  </div>
                                </div>
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={agregarPagoMixtoSimple} disabled={procesando}>
                                  Agregar pago
                                </button>
                              </div>

                              <div className="d-grid gap-2">
                                {pagosMixtos.map((pago, idx) => {
                                  const metodo = String(pago?.metodo_Pago || 'EFECTIVO').toUpperCase();
                                  const categoria = resolverCategoriaMetodo(metodo);
                                  const requiereCanalLinea = requiereCanalParaMetodo(metodo);
                                  const canalesLinea = obtenerCanalesPorMetodo(metodo);
                                  const montoLinea = Number(pago?.monto || 0);
                                  const recibidoLinea = Number(pago?.recibido || 0);
                                  const cambioLinea = categoria === 'EFECTIVO' && recibidoLinea > montoLinea ? recibidoLinea - montoLinea : 0;
                                  return (
                                    <div className="pos-mixed-pay-line" key={`mesa-mixed-${idx}`}>
                                      <div className="row g-2 align-items-end">
                                        <div className="col-md-4">
                                          <label className="form-label mb-1 small">Metodo</label>
                                          <select
                                            className="form-select form-select-sm"
                                            value={metodo}
                                            disabled={procesando}
                                            onChange={(e) => actualizarPagoMixto(idx, 'metodo_Pago', e.target.value)}
                                          >
                                            {metodosCobroBase.map((m) => (
                                              <option key={`mesa-m-${idx}-${m.codigo}`} value={m.codigo}>{m.nombre}</option>
                                            ))}
                                          </select>
                                        </div>
                                        {categoria !== 'EFECTIVO' && requiereCanalLinea && (
                                          <div className="col-md-4">
                                            <label className="form-label mb-1 small">Canal</label>
                                            <select
                                              className="form-select form-select-sm"
                                              value={String(pago?.canalPagoCodigo || '')}
                                              disabled={procesando}
                                              onChange={(e) => actualizarPagoMixto(idx, 'canalPagoCodigo', e.target.value)}
                                            >
                                              {canalesLinea.length === 0 ? (
                                                <option value="">Sin canales</option>
                                              ) : (
                                                canalesLinea.map((canal) => (
                                                  <option key={`mesa-c-${idx}-${canal.codigo}`} value={canal.codigo}>{canal.nombre}</option>
                                                ))
                                              )}
                                            </select>
                                          </div>
                                        )}
                                        <div className={categoria === 'EFECTIVO' ? 'col-md-3' : 'col-md-2'}>
                                          <label className="form-label mb-1 small">Monto</label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="form-control form-control-sm"
                                            value={pago?.monto || ''}
                                            disabled={procesando}
                                            placeholder="0.00"
                                            onChange={(e) => actualizarPagoMixto(idx, 'monto', e.target.value)}
                                          />
                                        </div>
                                        {categoria === 'EFECTIVO' && (
                                          <div className="col-md-3">
                                            <label className="form-label mb-1 small">Recibido</label>
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="form-control form-control-sm"
                                              value={pago?.recibido || ''}
                                              disabled={procesando}
                                              placeholder="Opcional"
                                              onChange={(e) => actualizarPagoMixto(idx, 'recibido', e.target.value)}
                                            />
                                          </div>
                                        )}
                                        <div className="col-md-2 d-grid">
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            disabled={procesando || pagosMixtos.length <= 1}
                                            onClick={() => eliminarPagoMixtoSimple(idx)}
                                          >
                                            Quitar
                                          </button>
                                        </div>
                                      </div>
                                      {categoria === 'EFECTIVO' && pago?.recibido && (
                                        <div className={`small mt-1 ${recibidoLinea >= montoLinea ? 'text-success' : 'text-danger'}`}>
                                          {recibidoLinea >= montoLinea
                                            ? `Cambio de esta linea: L ${cambioLinea.toFixed(2)}`
                                            : `Faltan L ${(montoLinea - recibidoLinea).toFixed(2)} en efectivo recibido`}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                        {dividirCuenta && (() => {
                          const detalles = detalleCuenta?.detalles || [];
                          const nPersonas = Math.max(2, Number(personasDivision || 2));
                          const hayPersonasCobradas = personasListas.size > 0;
                          const sinAsignar = detalles.filter(d => {
                            const v = asignacionDetalles[d.id_Detalle_Cuenta_Mesa];
                            return v === null || v === undefined;
                          });
                          return (
                          <div className="col-12">
                            <div className="border rounded p-3 mesas-mixto-wrap">

                              {/* Cantidad de personas */}
                              <div className="d-flex align-items-center gap-3 mb-3">
                                <label className="form-label mb-0 fw-semibold">Personas:</label>
                                <input
                                  type="number"
                                  min="2"
                                  max="20"
                                  className="form-control form-control-sm"
                                  style={{ width: 72 }}
                                  value={personasDivision}
                                  disabled={hayPersonasCobradas}
                                  onChange={(e) => setPersonasDivision(e.target.value)}
                                />
                                <span className="small text-muted ms-auto">Total: L {Number(totalCuenta || 0).toFixed(2)}</span>
                              </div>

                              {/* Pool: items sin asignar */}
                              {sinAsignar.length > 0 ? (
                                <div className="mesas-pool-wrap mb-3">
                                  <div className="mesas-pool-header">
                                    <span className="badge bg-warning text-dark me-2">Sin asignar</span>
                                    <span className="small text-muted">Toca una persona para asignar cada producto</span>
                                  </div>
                                  <div className="mesas-pool-list mt-2">
                                    {sinAsignar.map(d => (
                                      <div key={d.id_Detalle_Cuenta_Mesa} className="mesas-pool-item">
                                        <div className="mesas-pool-item-info">
                                          <span className="fw-semibold">{d.producto}</span>
                                          <span className="text-muted small ms-2">{Number(d.cantidad)}× L {Number(d.precio_Unitario || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="mesas-pool-item-actions">
                                          {Array.from({ length: nPersonas }, (_, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              className="btn btn-xs btn-outline-primary"
                                              disabled={personasListas.has(idx)}
                                              onClick={() => asignarDetalleAPersona(d.id_Detalle_Cuenta_Mesa, idx)}
                                            >
                                              {pagosMixtos[idx]?.nombre?.trim() || `P${idx + 1}`}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="alert alert-success py-2 small mb-3">
                                  Todos los productos asignados
                                </div>
                              )}

                              {/* Tarjeta por persona */}
                              {Array.from({ length: nPersonas }, (_, idx) => {
                                const pago = pagosMixtos[idx] || {};
                                const metodoPersona = String(pago?.metodo_Pago || 'EFECTIVO').toUpperCase();
                                const requiereCanalPersona = requiereCanalParaMetodo(metodoPersona);
                                const canalesPersona = obtenerCanalesPorMetodo(pago?.metodo_Pago);
                                const itemsPersona = detalles.filter(d => Number(asignacionDetalles[d.id_Detalle_Cuenta_Mesa]) === idx);
                                const totalPersona = montosAutoPorPersona[idx] || 0;
                                const personaCobrada = personasListas.has(idx);
                                const esEfectivo = String(resolverCategoriaMetodo(pago?.metodo_Pago || 'EFECTIVO')).toUpperCase() === 'EFECTIVO';
                                const montoDado = Number(montoDadoPorPersona[idx] || 0);
                                const cambioPersona = esEfectivo && montoDado > totalPersona ? montoDado - totalPersona : 0;
                                return (
                                  <div key={`persona-${idx}`} className={`mesas-persona-card mb-2 ${itemsPersona.length > 0 ? 'has-items' : ''} ${personaCobrada ? 'is-paid' : ''}`}>
                                    {/* Fila 1: número, nombre, total */}
                                    <div className="mesas-persona-header">
                                      <span className="mesas-persona-num">#{idx + 1}</span>
                                      <input
                                        type="text"
                                        className="form-control form-control-sm mesas-persona-nombre"
                                        placeholder={`Persona ${idx + 1}`}
                                        value={pago.nombre || ''}
                                        disabled={personaCobrada}
                                        onChange={(e) => actualizarPagoMixto(idx, 'nombre', e.target.value)}
                                      />
                                      <span className="mesas-persona-total ms-auto">L {totalPersona.toFixed(2)}</span>
                                    </div>
                                    {/* Fila 2: método + canal */}
                                    <div className="mesas-persona-pago">
                                      <select
                                        className="form-select form-select-sm"
                                        value={pago.metodo_Pago || 'EFECTIVO'}
                                        disabled={personaCobrada}
                                        onChange={(e) => actualizarPagoMixto(idx, 'metodo_Pago', e.target.value)}
                                      >
                                        {metodosCobroBase.map(m => (
                                          <option key={`pm-${idx}-${m.codigo}`} value={m.codigo}>{m.nombre}</option>
                                        ))}
                                      </select>
                                      {!esEfectivo && requiereCanalPersona && (
                                        canalesPersona.length > 0 ? (
                                          <select
                                            className="form-select form-select-sm"
                                            value={String(pago?.canalPagoCodigo || '')}
                                            disabled={personaCobrada}
                                            onChange={(e) => actualizarPagoMixto(idx, 'canalPagoCodigo', e.target.value)}
                                          >
                                            {canalesPersona.map(c => (
                                              <option key={`pc-${idx}-${c.codigo}`} value={c.codigo}>{c.nombre}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <span className="small text-danger">Sin canales</span>
                                        )
                                      )}
                                    </div>
                                    {/* Fila 3: efectivo → recibido + cambio */}
                                    {esEfectivo && (
                                      <div className="mesas-persona-efectivo">
                                        <label className="small fw-semibold me-2">Recibido L</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          style={{ width: 90 }}
                                          value={montoDadoPorPersona[idx] || ''}
                                          placeholder="0.00"
                                          disabled={personaCobrada}
                                          onChange={(e) => setMontoDadoPorPersona(prev => ({ ...prev, [idx]: e.target.value }))}
                                        />
                                        {montoDado > 0 && montoDado >= totalPersona && (
                                          <span className="mesas-persona-cambio">Cambio L {cambioPersona.toFixed(2)}</span>
                                        )}
                                      </div>
                                    )}
                                    {/* Items */}
                                    {itemsPersona.length > 0 ? (
                                      <div className="mesas-persona-items">
                                        {itemsPersona.map(d => (
                                          <div key={d.id_Detalle_Cuenta_Mesa} className="mesas-persona-item">
                                            <span className="mesas-persona-item-name">
                                              {d.producto} <span className="text-muted">×{Number(d.cantidad)}</span>
                                            </span>
                                            <span className="mesas-persona-item-price">L {Number(d.subtotal || 0).toFixed(2)}</span>
                                            <button
                                              type="button"
                                              className="btn-ghost-danger"
                                              title="Devolver al pool"
                                              disabled={personaCobrada}
                                              onClick={() => {
                                                setAsignacionDetalles(prev => ({ ...prev, [d.id_Detalle_Cuenta_Mesa]: null }));
                                                setPersonasListas(prev => { const n = new Set(prev); n.delete(idx); return n; });
                                              }}
                                            >×</button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="mesas-persona-empty">Sin productos asignados</div>
                                    )}
                                    {/* Cobrar */}
                                    <div className="d-flex justify-content-end align-items-center gap-2 mt-2 pt-2 border-top">
                                      {personaCobrada && (
                                        <span className="badge bg-success">Cobrada</span>
                                      )}
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${personaCobrada ? 'btn-outline-secondary' : 'btn-success'}`}
                                        disabled={personaCobrada || itemsPersona.length === 0 || procesando}
                                        onClick={() => cobrarPersonaDivision(idx)}
                                      >
                                        {personaCobrada ? 'Ticket impreso' : 'Cobrar persona'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              <div className={`small mt-2 text-end ${Math.abs(diferenciaPagosMixtos) <= 0.01 && todosItemsAsignados ? 'text-success' : 'text-danger'}`}>
                                {todosItemsAsignados
                                  ? `Total cubierto: L ${totalPagosMixtos.toFixed(2)}`
                                  : `${sinAsignar.length} producto(s) sin asignar — asigna todos para poder cobrar`}
                              </div>
                            </div>
                          </div>
                          );
                        })()}
                        </div>
                      </div>

                      <div className="pro-checkout-total-hero mb-2 mt-3">
                        <div className="pro-checkout-flow-title pro-checkout-flow-title--on-dark">5 · Resumen y total</div>
                        <div className="pro-checkout-total-eyebrow">Revise montos y luego confirme abajo</div>
                        <div className="pro-checkout-total-breakdown mt-2">
                          <div className="pro-checkout-total-line">
                            <span className="pro-checkout-total-line-label">Subtotal base</span>
                            <span className="pro-checkout-total-line-value">L {subtotalBaseCuenta.toFixed(2)}</span>
                          </div>
                          <div className="pro-checkout-total-line">
                            <span className="pro-checkout-total-line-label">Base para descuento</span>
                            <span className="pro-checkout-total-line-value text-white-50">L {subtotalDescuentoCuenta.toFixed(2)}</span>
                          </div>
                          <div className={`pro-checkout-total-line ${descuentoNum > 0 ? 'pro-checkout-total-line--deduccion' : ''}`}>
                            <span className="pro-checkout-total-line-label">Descuentos aplicados</span>
                            <span className="pro-checkout-total-line-value">{descuentoNum > 0 ? `- L ${descuentoNum.toFixed(2)}` : 'L 0.00'}</span>
                          </div>
                          <div className="pro-checkout-total-line">
                            <span className="pro-checkout-total-line-label">
                              Impuesto {impuestoIncluidoEnSubtotal ? '(en precio)' : '(ISV)'}
                            </span>
                            <span className="pro-checkout-total-line-value">L {impuestoNum.toFixed(2)}</span>
                          </div>
                          {impuestoIncluidoEnSubtotal && (
                            <div className="pro-checkout-total-note">El ISV ya va en los precios — no se suma otra vez al total.</div>
                          )}
                        </div>
                        <div className="pro-checkout-total-grand">
                          <div className="pro-checkout-total-label mb-1">Total a cobrar</div>
                          <div className="pro-checkout-total-amount">L {Number(totalCuenta || 0).toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="d-grid gap-2 mt-2 mesas-actions-bar">
                        <div className={`mesas-cobro-status-card ${listoParaCobrar ? 'is-ready' : 'is-pending'}`}>
                          <div className="mesas-cobro-status-title">
                            {listoParaCobrar ? 'Listo para cobrar' : 'Falta completar para cobrar'}
                          </div>
                          <div className="mesas-cobro-checklist">
                            {checklistCobro.map((item) => (
                              <span key={item.key} className={`mesas-cobro-check ${item.ok ? 'ok' : 'bad'}`}>
                                {item.ok ? 'OK' : 'FALTA'} · {item.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        {bloqueoPreventivoCobro && (
                          <div className="alert alert-warning py-2 mb-0 small">
                            Falta seleccionar canal de pago valido para uno o mas cobros no-efectivo.
                          </div>
                        )}
                        {dividirCuenta ? (
                          <div className="alert py-2 mb-0 small text-center fw-semibold" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
                            {procesando ? 'Procesando cobro...' : 'Cobra a cada persona con el boton Cobrar de su tarjeta — la mesa se cierra automaticamente al finalizar'}
                          </div>
                        ) : (
                          <button className="btn btn-success" onClick={cobrarCuenta} disabled={cobrarDeshabilitado}>
                            {procesando ? 'Procesando...' : 'Cobrar mesa'}
                          </button>
                        )}
                        <button className="btn btn-outline-danger" onClick={cancelarCuenta} disabled={procesando}>
                          Cancelar cuenta
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Mesas;
