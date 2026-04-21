import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { imprimirTicketHtml, imprimirTicketsDivisionMesa } from '../../utils/printTicket';
import { getUsuario } from '../../utils/auth';
import FacturaCaiClienteForm, { facturaClienteVacio } from '../../components/factura/FacturaCaiClienteForm';
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
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
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
  const [pagosMixtos, setPagosMixtos] = useState([{ nombre: 'Persona 1', metodo_Pago: 'EFECTIVO', monto: '' }]);
  const [asignacionDetalles, setAsignacionDetalles] = useState({});
  const [descuentoDetalles, setDescuentoDetalles] = useState({});
  const [vistaTablet, setVistaTablet] = useState('mesas');

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
        nombre: `Sucursal #${idSucursalUsuario}`
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
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0)
    }));

    const conPresentacion = (response.data?.conPresentacion || []).map((item) => ({
      id_Producto: item.id_Producto,
      id_Presentacion: item.id_Presentacion,
      nombre: `${item.producto} - ${item.presentacion || 'Presentacion'}`,
      precio: Number(item.precio || 0),
      costo: Number(item.costo || 0)
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
        { codigo: 'TRANSFERENCIA', nombre: 'Transferencia', categoria: 'OTRO', activo: true }
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
  const menuItemsFiltrados = useMemo(() => {
    const filtro = filtroProducto.trim().toLowerCase();
    if (!filtro) return menuItemsOrdenados;
    return menuItemsOrdenados.filter((item) => item.nombre.toLowerCase().includes(filtro));
  }, [menuItemsOrdenados, filtroProducto]);

  const menuSeleccionado = useMemo(() => {
    if (!formAgregar.id_Producto) return null;
    return menuItems.find(
      (x) =>
        String(x.id_Producto) === String(formAgregar.id_Producto) &&
        String(x.id_Presentacion ?? '') === String(formAgregar.id_Presentacion ?? '')
    );
  }, [menuItems, formAgregar]);

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
  const totalPorPersona = useMemo(() => {
    const personas = Number(personasDivision || 0);
    if (!Number.isFinite(personas) || personas <= 0) return 0;
    return totalCuenta / personas;
  }, [totalCuenta, personasDivision]);
  const montosAutoPorPersona = useMemo(() => {
    const cantidad = Math.max(1, Number(personasDivision || 1));
    const acumulado = Array.from({ length: cantidad }, () => 0);
    const detalles = detalleCuenta?.detalles || [];
    if (!detalles.length) return acumulado;

    detalles.forEach((d) => {
      const idxRaw = Number(asignacionDetalles[d.id_Detalle_Cuenta_Mesa] ?? 0);
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
      .map((p, idx) => ({
        nombre: String(p?.nombre || '').trim() || `Persona ${idx + 1}`,
        metodo_Pago: String(p?.metodo_Pago || '').trim(),
        monto: redondear2(p?.monto)
      }))
      .filter((p) => p.metodo_Pago && p.monto > 0),
    [pagosMixtos]
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

  useEffect(() => {
    setCobroMixto(dividirCuenta);
  }, [dividirCuenta]);

  useEffect(() => {
    if (!dividirCuenta) return;
    const cantidad = Math.max(1, Number(personasDivision || 1));
    const metodoDefault = metodosPago[0]?.codigo || metodoPago || 'EFECTIVO';
    setPagosMixtos((prev) => {
      const base = Array.from({ length: cantidad }, (_, idx) => ({
        nombre: prev[idx]?.nombre || `Persona ${idx + 1}`,
        metodo_Pago: prev[idx]?.metodo_Pago || metodoDefault,
        monto: prev[idx]?.monto || ''
      }));
      return base;
    });
  }, [dividirCuenta, personasDivision, metodoPago, metodosPago]);

  useEffect(() => {
    if (!dividirCuenta) return;
    const detalles = detalleCuenta?.detalles || [];
    const cantidad = Math.max(1, Number(personasDivision || 1));
    setAsignacionDetalles((prev) => {
      const next = {};
      detalles.forEach((d) => {
        const valorPrevio = prev[d.id_Detalle_Cuenta_Mesa];
        const raw = Number(valorPrevio ?? 0);
        next[d.id_Detalle_Cuenta_Mesa] = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), cantidad - 1) : 0;
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
      setPagosMixtos([{ nombre: 'Cliente', metodo_Pago: metodoPago || 'EFECTIVO', monto: totalCuenta > 0 ? totalCuenta.toFixed(2) : '' }]);
    }
  }, [cobroMixto, metodoPago, totalCuenta]);

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

  const agregarProducto = async () => {
    limpiarMensajes();
    if (!detalleCuenta?.cuenta?.id_Cuenta_Mesa) return setError('No hay cuenta abierta');
    if (!formAgregar.id_Producto) return setError('Selecciona un producto');
    try {
      setProcesando(true);
      await api.post(`/CuentasMesa/${detalleCuenta.cuenta.id_Cuenta_Mesa}/agregar-producto`, {
        id_Producto: Number(formAgregar.id_Producto),
        id_Presentacion: formAgregar.id_Presentacion ? Number(formAgregar.id_Presentacion) : null,
        cantidad: 1,
        es_Cortesia: !!formAgregar.es_Cortesia,
        observacion: formAgregar.es_Cortesia ? '[CORTESIA]' : ''
      });
      setMensaje('Producto agregado');
      setFormAgregar({ id_Producto: '', id_Presentacion: '', es_Cortesia: false });
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
    setPagosMixtos((prev) => prev.map((linea, i) => (i === index ? { ...linea, [campo]: valor } : linea)));
  };

  const asignarDetalleAPersona = (idDetalle, personaIndex) => {
    setAsignacionDetalles((prev) => ({ ...prev, [idDetalle]: Number(personaIndex || 0) }));
  };

  const construirPayloadDivisionTickets = (idVenta) => {
    if (!dividirCuenta || !detalleCuenta?.detalles?.length) return null;

    const cantidad = Math.max(1, Number(personasDivision || 1));
    const nombreSucursalActual =
      sucursales.find((s) => String(s.id_Sucursal) === String(sucursalSeleccionada))?.nombre ||
      (sucursalSeleccionada ? `Sucursal #${sucursalSeleccionada}` : 'Sucursal');

    const personas = Array.from({ length: cantidad }, (_, idx) => {
      const pago = pagosMixtos[idx] || {};
      const nombre = String(pago?.nombre || '').trim() || `Persona ${idx + 1}`;
      const metodoPagoPersona = String(pago?.metodo_Pago || metodoPago || 'EFECTIVO').trim();
      const items = (detalleCuenta?.detalles || [])
        .filter((d) => Number(asignacionDetalles[d.id_Detalle_Cuenta_Mesa] ?? 0) === idx)
        .map((d) => ({
          producto: d.producto,
          cantidad: Number(d.cantidad || 0),
          subtotal: Number(d.subtotal || 0)
        }));

      const totalPersona = redondear2(Number(pago?.monto || montosAutoPorPersona[idx] || 0));
      return {
        nombre,
        metodoPago: metodoPagoPersona || 'EFECTIVO',
        total: totalPersona,
        items
      };
    });

    return {
      idVenta,
      mesa: mesaSeleccionada?.nombre || `Mesa #${detalleCuenta?.cuenta?.id_Mesa || ''}`,
      cuenta: `#${detalleCuenta?.cuenta?.id_Cuenta_Mesa || ''}`,
      sucursal: nombreSucursalActual,
      tipoServicio: tipoServicio === 'LLEVAR' ? 'Para llevar' : 'Comer aqui',
      moneda: 'L',
      total: Number(totalCuenta || 0),
      personas
    };
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
      if (pagosMixtosNormalizados.length === 0) return setError('Debes ingresar al menos un pago en cobro mixto');
      if (Math.abs(diferenciaPagosMixtos) > 0.01) return setError('La suma de pagos mixtos debe ser igual al total');
      if ((pagosMixtos || []).some((p) => !String(p?.nombre || '').trim())) return setError('Cada persona debe tener nombre');
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
      const metodoPagoFinal = dividirCuenta ? 'MIXTO' : metodoPago;
      const detalleDivision = dividirCuenta
        ? pagosMixtosDetalle.map((p) => `${p.nombre}:${p.monto.toFixed(2)}(${p.metodo_Pago})`).join('; ')
        : '';
      const observacionCobro = `Cobro de mesa | Desc:${modoDescuento} | Imp:${modoImpuesto}${detalleDivision ? ` | DIVISION:${detalleDivision}` : ''}`;
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
        pagos: dividirCuenta ? pagosMixtosNormalizados : [],
        tipo_Servicio: tipoServicio,
        observacion: observacionCobro
      });

      const idVenta = response.data.data.id_Venta;
      const payloadDivisionTickets = construirPayloadDivisionTickets(idVenta);
      await cargarCuentasAbiertas();
      await cargarMesas(sucursalSeleccionada);
      setDetalleCuenta(null);
      setModoDescuento('NINGUNO');
      setDescuentoManual('0');
      setModoImpuesto('INCLUIDO_15');
      setImpuestoManual('0');
      setEmitirFactura(false);
      setFacturaCliente(facturaClienteVacio());
      setMetodoPago('EFECTIVO');
      setTipoServicio('COMER_AQUI');
      setDividirCuenta(false);
      setCobroMixto(false);
      setPagosMixtos([{ nombre: 'Persona 1', metodo_Pago: 'EFECTIVO', monto: '' }]);
      setAsignacionDetalles({});
      setDescuentoDetalles({});
      setPersonasDivision(2);

      let mensajeExito = `Cuenta cobrada. Venta #${idVenta}`;
      try {
        if (payloadDivisionTickets) {
          await imprimirTicketsDivisionMesa(payloadDivisionTickets);
          mensajeExito += ' | Tickets por persona impresos';
        }
        // Siempre se imprime el comprobante final de la venta (ticket/factura CAI),
        // incluso cuando hubo division por persona.
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
      setFormAgregar({ id_Producto: '', id_Presentacion: '', es_Cortesia: false });
      setFiltroProducto('');
      setDividirCuenta(false);
      setCobroMixto(false);
      setPagosMixtos([{ nombre: 'Persona 1', metodo_Pago: 'EFECTIVO', monto: '' }]);
      setAsignacionDetalles({});
      setDescuentoDetalles({});
      setPersonasDivision(2);
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
    setTipoServicio('COMER_AQUI');
    setPersonasDivision(2);
    setDividirCuenta(false);
    setCobroMixto(false);
    setPagosMixtos([{ nombre: 'Persona 1', metodo_Pago: 'EFECTIVO', monto: '' }]);
    setAsignacionDetalles({});
    setDescuentoDetalles({});
    setFiltroProducto('');
    setVistaTablet('cuenta');
    const cuenta = getCuentaMesa(mesa.id_Mesa);
    if (cuenta) await cargarCuentaDetalle(cuenta.id_Cuenta_Mesa);
  };

  return (
    <div className="mesas-page">
      <div className="mesas-page-hero card border-0 shadow-sm mb-4 overflow-hidden">
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h2 className="mb-1">Mesas y cuentas</h2>
              <p className="text-muted small mb-0">
                Toca una mesa para abrir o cobrar la cuenta. En tablet usa las pestañas <strong>Mesas</strong> y <strong>Cuenta y cobro</strong>.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className={`badge rounded-pill px-3 py-2 ${cajaActual?.abierta ? 'text-bg-success' : 'text-bg-warning text-dark'}`}>
                {cargandoCaja ? 'Caja...' : cajaActual?.abierta ? `Caja #${cajaActual.id_Caja} abierta` : 'Caja cerrada'}
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

      <div className="row g-3">
        <div className={`col-12 col-xl-7 ${vistaTablet === 'mesas' ? '' : 'd-none d-xl-block'}`}>
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
                      <div className="mesa-capacidad">Cap. {capacidad}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`col-12 col-xl-5 ${vistaTablet === 'cuenta' ? '' : 'd-none d-xl-block'}`}>
          <div className="card shadow-sm mesas-panel-card mesas-pos-shell">
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
                  {!detalleCuenta ? (
                    <>
                      <h6>Abrir cuenta</h6>
                      <input type="text" className="form-control mb-3" placeholder="Observacion" value={formAbrir.observacion} onChange={(e) => setFormAbrir({ observacion: e.target.value })} />
                      <button className="btn btn-dark w-100" onClick={abrirCuenta} disabled={procesando}>{procesando ? 'Procesando...' : 'Abrir cuenta'}</button>
                    </>
                  ) : (
                    <>
                      <h6 className="mb-1">Cuenta #{detalleCuenta.cuenta.id_Cuenta_Mesa}</h6>
                      <div className="small text-muted mb-2 mesas-atendio-chip">
                        Atendio: <strong>{detalleCuenta?.atendidoPor?.nombre || detalleCuenta?.atendidoPor?.usuarioLogin || 'N/D'}</strong>
                      </div>

                      <div className="bg-white border rounded p-3 mb-3 mesas-totals-card">
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                          <span className="small text-muted">Estado de caja</span>
                          <span className={`badge ${cargandoCaja ? 'bg-secondary' : cajaActual?.abierta ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {cargandoCaja ? 'Validando caja...' : cajaActual?.abierta ? `Caja #${cajaActual.id_Caja} abierta` : 'Caja cerrada'}
                          </span>
                        </div>
                        <div className="small text-muted">Agrega consumo, divide si hace falta, y cobra abajo con el total destacado.</div>
                      </div>

                      <div className="mesas-section-card mb-3">
                        <div className="mesas-section-title">Consumo actual</div>
                        <ul className="list-group mesas-detalle-list">
                        {detalleCuenta.detalles.length === 0 ? (
                          <li className="list-group-item text-center">Sin productos</li>
                        ) : (
                          detalleCuenta.detalles.map((d) => (
                            <li key={d.id_Detalle_Cuenta_Mesa} className="list-group-item d-flex justify-content-between align-items-start gap-2 mesas-detalle-item">
                              <div>
                                <strong>{d.producto}</strong>
                                {d.esCortesia && <span className="badge text-bg-warning ms-2">Cortesia</span>}
                                <div className="small">Cant: {d.cantidad}</div>
                                <div className="small">Precio: L {Number(d.precio_Unitario || 0).toFixed(2)}</div>
                                <div className="small">Subt: L {Number(d.subtotal || 0).toFixed(2)}</div>
                                {dividirCuenta && (
                                  <div className="mt-2">
                                    <label className="form-label mb-1 small">Lo paga:</label>
                                    <select
                                      className="form-select form-select-sm"
                                      value={asignacionDetalles[d.id_Detalle_Cuenta_Mesa] ?? 0}
                                      onChange={(e) => asignarDetalleAPersona(d.id_Detalle_Cuenta_Mesa, e.target.value)}
                                    >
                                      {Array.from({ length: Math.max(1, Number(personasDivision || 1)) }, (_, idx) => (
                                        <option key={`detalle-${d.id_Detalle_Cuenta_Mesa}-${idx}`} value={idx}>
                                          {pagosMixtos[idx]?.nombre || `Persona ${idx + 1}`}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                <div className="form-check mt-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`desc-detalle-${d.id_Detalle_Cuenta_Mesa}`}
                                    checked={descuentoDetalles[d.id_Detalle_Cuenta_Mesa] ?? true}
                                    disabled={!!d.esCortesia}
                                    onChange={(e) => cambiarDescuentoDetalle(d.id_Detalle_Cuenta_Mesa, e.target.checked)}
                                  />
                                  <label className="form-check-label small" htmlFor={`desc-detalle-${d.id_Detalle_Cuenta_Mesa}`}>
                                    Aplica descuento
                                  </label>
                                </div>
                              </div>
                              <button className="btn btn-sm btn-danger" onClick={() => eliminarDetalle(d.id_Detalle_Cuenta_Mesa)} disabled={procesando}>X</button>
                            </li>
                          ))
                        )}
                        </ul>
                      </div>

                      <hr />
                      <div className="mesas-section-card mb-3">
                      <h6 className="mesas-section-title mb-2">Agregar producto</h6>
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Buscar producto..."
                        value={filtroProducto}
                        onChange={(e) => setFiltroProducto(e.target.value)}
                      />
                      <div className="border rounded mb-2 mesas-menu-scroll">
                        {menuItemsFiltrados.length === 0 ? (
                          <div className="p-2 small text-muted">No hay productos para ese filtro.</div>
                        ) : (
                          menuItemsFiltrados.slice(0, 50).map((item) => {
                            const seleccionado =
                              String(formAgregar.id_Producto) === String(item.id_Producto) &&
                              String(formAgregar.id_Presentacion ?? '') === String(item.id_Presentacion ?? '');
                            return (
                              <button
                                type="button"
                                key={`${item.id_Producto}-${item.id_Presentacion ?? 'n'}`}
                                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${seleccionado ? 'active' : ''}`}
                            onClick={() => setFormAgregar({
                                  ...formAgregar,
                                  id_Producto: String(item.id_Producto),
                                  id_Presentacion: item.id_Presentacion ? String(item.id_Presentacion) : ''
                                })}
                              >
                                <span className="text-start">{item.nombre}</span>
                                <span className="small">L {Number(item.precio).toFixed(2)}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="small text-muted mb-2">Cada toque en agregar crea una linea nueva.</div>
                      <div className="form-control mb-3 bg-light">
                        Precio: L {Number(formAgregar.es_Cortesia ? 0 : menuSeleccionado?.precio || 0).toFixed(2)}
                      </div>
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="agregar-cortesia-mesa"
                          checked={!!formAgregar.es_Cortesia}
                          onChange={(e) => setFormAgregar((prev) => ({ ...prev, es_Cortesia: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="agregar-cortesia-mesa">
                          Agregar como cortesia (sin cobro)
                        </label>
                      </div>
                      <button className="btn btn-dark w-100 mb-3" onClick={agregarProducto} disabled={procesando}>Agregar a cuenta</button>
                      </div>

                      <div className="pro-checkout-total-hero mb-3">
                        <div className="pro-checkout-total-label">Total mesa</div>
                        <div className="pro-checkout-total-amount">L {Number(totalCuenta || 0).toFixed(2)}</div>
                        <div className="pro-checkout-total-sub mt-2 d-flex flex-column gap-1">
                          <div className="d-flex justify-content-between"><span>Subtotal base</span><span>L {subtotalBaseCuenta.toFixed(2)}</span></div>
                          <div className="d-flex justify-content-between"><span>Base descuento (lineas marcadas)</span><span>L {subtotalDescuentoCuenta.toFixed(2)}</span></div>
                          <div className="d-flex justify-content-between"><span>Descuento</span><span>L {descuentoNum.toFixed(2)}</span></div>
                          <div className="d-flex justify-content-between"><span>Impuesto</span><span>L {impuestoNum.toFixed(2)}</span></div>
                          {impuestoIncluidoEnSubtotal && (
                            <div className="small text-warning">Impuesto incluido en precios (no se suma al total)</div>
                          )}
                        </div>
                      </div>

                      <div className="row g-2 mb-2 mesas-cobro-shell">
                        <div className="col-12">
                          <label className="form-label mb-1">Modo de cobro</label>
                          <select
                            className="form-select"
                            value={dividirCuenta ? 'DIVIDIR' : 'NORMAL'}
                            onChange={(e) => setDividirCuenta(e.target.value === 'DIVIDIR')}
                          >
                            <option value="NORMAL">Un solo pago (rapido)</option>
                            <option value="DIVIDIR">Dividir cuenta (quien paga cada consumo)</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <CheckoutPayMethodChips
                            value={metodoPago}
                            onChange={setMetodoPago}
                            disabled={dividirCuenta || procesando}
                            options={(metodosPago || []).length
                              ? metodosPago.map((m) => ({
                                  codigo: String(m.codigo || '').toUpperCase(),
                                  label: m.nombre || m.codigo,
                                  title: m.nombre
                                }))
                              : undefined}
                          />
                        </div>
                        {dividirCuenta && (
                          <div className="col-12">
                            <div className="border rounded p-3 mesas-mixto-wrap">
                              <div className="row g-2 mb-2">
                                <div className="col-6">
                                  <label className="form-label mb-1">Personas</label>
                                  <input
                                    type="number"
                                    min="2"
                                    max="20"
                                    className="form-control"
                                    value={personasDivision}
                                    onChange={(e) => setPersonasDivision(e.target.value)}
                                  />
                                </div>
                                <div className="col-6">
                                  <label className="form-label mb-1">Total por persona</label>
                                  <div className="form-control bg-light">L {totalPorPersona.toFixed(2)}</div>
                                </div>
                              </div>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <strong className="small">Division final antes de cobrar</strong>
                                <span className="small text-muted">Personas: {Math.max(1, Number(personasDivision || 1))}</span>
                              </div>
                              {(pagosMixtos || []).map((pago, idx) => (
                                <div className="mesas-mixto-line mb-2" key={`pago-mixto-${idx}`}>
                                  <div className="mesas-mixto-field mesas-mixto-nombre">
                                    <input
                                      type="text"
                                      className="form-control"
                                      placeholder="Nombre"
                                      value={pago.nombre || ''}
                                      onChange={(e) => actualizarPagoMixto(idx, 'nombre', e.target.value)}
                                    />
                                  </div>
                                  <div className="mesas-mixto-field mesas-mixto-metodo">
                                    <select
                                      className="form-select"
                                      value={pago.metodo_Pago}
                                      onChange={(e) => actualizarPagoMixto(idx, 'metodo_Pago', e.target.value)}
                                    >
                                      {metodosPago.map((m) => (
                                        <option key={`mix-${idx}-${m.codigo}`} value={m.codigo}>{m.nombre}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="mesas-mixto-field mesas-mixto-monto">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="form-control"
                                      placeholder="Monto"
                                      value={pago.monto}
                                      readOnly
                                    />
                                  </div>
                                  <div className="mesas-mixto-field mesas-mixto-remove d-flex align-items-center justify-content-center">
                                    <span className="badge text-bg-light">#{idx + 1}</span>
                                  </div>
                                </div>
                              ))}
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="small text-muted">Edita nombres/metodos y al final asigna quien paga cada producto en "Consumo actual".</span>
                                <div className={`small ${Math.abs(diferenciaPagosMixtos) <= 0.01 ? 'text-success' : 'text-danger'}`}>
                                  Ingresado: L {totalPagosMixtos.toFixed(2)} | Diferencia: L {diferenciaPagosMixtos.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="col-12 mb-2">
                          <CheckoutServiceToggle value={tipoServicio} onChange={setTipoServicio} disabled={procesando} />
                        </div>
                        <div className="col-12">
                          <details className="pro-checkout-advanced">
                            <summary>Mas opciones — descuento, impuesto, factura CAI</summary>
                            <div className="pt-2 mt-2 border-top">
                              <div className="row g-2 mb-2">
                                <div className="col-12">
                                  <label className="form-label mb-1">Descuento</label>
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
                              <div className="row g-2 mb-2">
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
                              {facturacionSar?.habilitadoCai && (
                                <>
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
                                      Emitir factura CAI (datos del cliente abajo)
                                    </label>
                                  </div>
                                  {emitirFactura && <FacturaCaiClienteForm idPrefix="mesa" value={facturaCliente} onChange={setFacturaCliente} />}
                                </>
                              )}
                            </div>
                          </details>
                        </div>
                      </div>

                      <div className="d-grid gap-2 mesas-actions-bar">
                        <button className="btn btn-success" onClick={cobrarCuenta} disabled={cargandoCaja || !cajaActual?.abierta || procesando}>
                          {procesando ? 'Procesando...' : 'Cobrar mesa'}
                        </button>
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
