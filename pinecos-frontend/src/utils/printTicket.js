import api from '../services/api';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatTipoServicio = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'COMER_AQUI') return 'Comer aqui';
  if (normalized === 'LLEVAR') return 'Para llevar';
  return value || '-';
};

const formatMetodoPago = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'EFECTIVO') return 'Efectivo';
  if (normalized === 'TARJETA' || normalized === 'TARJETA_POS' || normalized === 'POS') return 'Tarjeta';
  if (normalized === 'TRANSFERENCIA') return 'Transferencia';
  if (normalized === 'MIXTO') return 'Mixto';
  return value || 'Sin metodo';
};

const imprimirEnMismaPantalla = (html) =>
  new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.setAttribute('aria-hidden', 'true');

    let disparado = false;
    let finalizado = false;

    const limpiar = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const resolver = () => {
      if (finalizado) return;
      finalizado = true;
      setTimeout(limpiar, 120);
      resolve();
    };

    const fallar = (mensaje) => {
      if (finalizado) return;
      finalizado = true;
      setTimeout(limpiar, 120);
      reject(new Error(mensaje));
    };

    iframe.onload = () => {
      if (disparado) return;
      disparado = true;

      const win = iframe.contentWindow;
      if (!win) {
        fallar('No se pudo abrir el motor de impresion');
        return;
      }

      const after = () => {
        win.removeEventListener('afterprint', after);
        resolver();
      };
      win.addEventListener('afterprint', after);

      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          fallar('No se pudo ejecutar la impresion');
          return;
        }

        // Fallback si el navegador no dispara afterprint.
        setTimeout(resolver, 1500);
      }, 100);
    };

    // Asignar srcdoc antes de adjuntar evita cargas intermedias de about:blank.
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    setTimeout(() => {
      if (!disparado) fallar('No se pudo inicializar la impresion');
    }, 5000);
  });

const construirHtmlDobleCopiaCai = (htmlBase) => {
  const parser = new DOMParser();
  const documento = parser.parseFromString(String(htmlBase || ''), 'text/html');
  const headOriginal = documento.head?.innerHTML || '';
  const bodyOriginal = documento.body?.innerHTML || String(htmlBase || '');

  const renderCopia = (etiqueta) => `
    <section class="ticket-copia-cai">
      <div class="ticket-copia-cai__badge">${escapeHtml(etiqueta)}</div>
      ${bodyOriginal}
    </section>
  `;

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${headOriginal}
  <style>
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      max-width: 100%;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    .ticket-copia-cai {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .ticket-copia-cai + .ticket-copia-cai {
      margin-top: 8mm;
      page-break-before: always;
    }
    .ticket-copia-cai__badge {
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin: 0 0 2mm;
      padding: 1.5mm 0;
      border-top: 1px dashed #111;
      border-bottom: 1px dashed #111;
    }
    @media print {
      .ticket-copia-cai + .ticket-copia-cai {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  ${renderCopia('COPIA CLIENTE')}
  ${renderCopia('COPIA NEGOCIO')}
</body>
</html>`;
};

export const imprimirTicketHtml = async (idVenta) => {
  let esFacturaCai = false;
  try {
    const ticketResponse = await api.get(`/Tickets/venta/${idVenta}`);
    const ticketPayload = ticketResponse?.data?.data ?? ticketResponse?.data;
    esFacturaCai = Boolean(ticketPayload?.esFacturaCai ?? ticketPayload?.EsFacturaCai);
  } catch {
    throw new Error(
      'No se pudo confirmar si la venta requiere copia fiscal CAI. Reintenta o descarga el PDF para evitar omisiones de impresion.'
    );
  }

  const response = await api.get(`/Tickets/venta/${idVenta}/html`, {
    responseType: 'text'
  });
  const html = esFacturaCai
    ? construirHtmlDobleCopiaCai(response.data)
    : response.data;

  await imprimirEnMismaPantalla(html);
};

export const descargarTicketPdf = async (idVenta) => {
  const response = await api.get(`/Tickets/venta/${idVenta}/pdf`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ticket_venta_${idVenta}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const imprimirHtmlDirecto = async (html) => {
  if (!html || typeof html !== 'string') {
    throw new Error('No hay contenido para imprimir');
  }
  await imprimirEnMismaPantalla(html);
};

const construirHtmlTicketPersona = ({
  idVenta,
  mesa,
  cuenta,
  sucursal,
  tipoServicio,
  moneda,
  persona,
  indicePersona,
  totalPersonas,
  montoDado = 0,
  cambio = 0
}) => {
  const items = Array.isArray(persona?.items) ? persona.items : [];
  const rows = items.length
    ? items.map((item) => `
        <tr>
          <td>${escapeHtml(item.producto)}</td>
          <td class="num">${Number(item.cantidad || 0).toFixed(2)}</td>
          <td class="num">${moneda} ${Number(item.subtotal || 0).toFixed(2)}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" class="empty">Sin productos asignados</td></tr>`;

  const ventaLabel = idVenta ? `#${idVenta}` : 'Pendiente';
  const tituloTicket = idVenta ? 'TICKET POR PERSONA' : 'COBRO DE PERSONA';
  const cambioHtml = cambio > 0 ? `
      <div class="cambio">Recibido: ${moneda} ${Number(montoDado).toFixed(2)}</div>
      <div class="cambio cambio--vuelto">Cambio: ${moneda} ${Number(cambio).toFixed(2)}</div>` : '';

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Division de cuenta ${ventaLabel} - Persona ${indicePersona}</title>
  <style>
    * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, sans-serif; }
    html, body { margin: 0; padding: 0; overflow-x: hidden; max-width: 100%; }
    body { background: #fff; color: #111827; font-size: 10.5px; }
    .shell { width: 100%; max-width: 58mm; margin: 0 auto; padding: 2.5mm 2mm; }
    .center { text-align: center; }
    .brand { font-size: 13px; font-weight: 900; letter-spacing: 0.02em; }
    .doc-title { font-size: 11px; font-weight: 800; margin-top: 1mm; }
    .muted { color: #4b5563; font-size: 9px; }
    .linea { border-top: 1px dashed #9ca3af; margin: 5px 0; }
    .meta { font-size: 9.5px; line-height: 1.35; }
    .ticket-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 5px; }
    .ticket-title { font-weight: 800; font-size: 11.5px; overflow-wrap: anywhere; }
    .ticket-sub { font-size: 9.5px; color: #475569; overflow-wrap: anywhere; }
    .ticket-total { font-weight: 900; font-size: 13px; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5px; }
    th, td { padding: 3px 1px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    th:nth-child(1), td:nth-child(1) { width: 52%; }
    th:nth-child(2), td:nth-child(2) { width: 18%; }
    th:nth-child(3), td:nth-child(3) { width: 30%; }
    .empty { text-align: center; color: #64748b; }
    .cambio { margin-top: 4px; font-size: 10px; text-align: right; color: #475569; }
    .cambio--vuelto { font-weight: 800; color: #15803d; font-size: 11px; }
    .foot { margin-top: 6px; font-size: 9px; color: #475569; text-align: center; }
    @media print {
      @page { size: 58mm auto; margin: 0.8mm 1mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="center brand">Cafe Pinecos</div>
    <div class="center doc-title">${tituloTicket}</div>
    <div class="center muted">${new Date().toLocaleString()}</div>
    <div class="linea"></div>
    <div class="meta">
      <div><strong>Venta:</strong> ${ventaLabel}</div>
      <div><strong>Mesa:</strong> ${escapeHtml(mesa || '-')} | <strong>Cuenta:</strong> ${escapeHtml(cuenta || '-')}</div>
      <div><strong>Sucursal:</strong> ${escapeHtml(sucursal || '-')} | <strong>Servicio:</strong> ${escapeHtml(formatTipoServicio(tipoServicio))}</div>
      <div><strong>Division:</strong> Persona ${indicePersona} de ${totalPersonas}</div>
    </div>
    <div class="linea"></div>
    <div>
      <div class="ticket-head">
        <div>
          <div class="ticket-title">${escapeHtml(persona?.nombre || `Persona ${indicePersona}`)}</div>
          <div class="ticket-sub">${escapeHtml(formatMetodoPago(persona?.metodoPago))}</div>
        </div>
        <div class="ticket-total">${moneda} ${Number(persona?.total || 0).toFixed(2)}</div>
      </div>
      <table>
        <thead>
          <tr><th>Producto</th><th class="num">Cant.</th><th class="num">Subtotal</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="foot">Total persona: ${moneda} ${Number(persona?.total || 0).toFixed(2)}</div>
      ${cambioHtml}
      <div class="linea"></div>
      <div class="foot">Conserve este comprobante hasta cerrar la mesa</div>
      <div class="foot">Plataforma empresarial por NesSys</div>
    </div>
  </div>
</body>
</html>`;
};

export const imprimirPreTicketPersona = async (payload) => {
  const { montoDado = 0, cambio = 0, ...rest } = payload || {};
  const html = construirHtmlTicketPersona({ ...rest, idVenta: null, montoDado, cambio });
  await imprimirEnMismaPantalla(html);
};

export const imprimirTicketsDivisionMesa = async (payload) => {
  const {
    idVenta,
    mesa,
    cuenta,
    sucursal,
    tipoServicio,
    moneda = 'L',
    personas = []
  } = payload || {};

  if (!idVenta || !Array.isArray(personas) || personas.length === 0) {
    throw new Error('No hay datos suficientes para imprimir division de cuenta');
  }

  const personasFiltradas = personas.filter((persona) => {
    const totalPersona = Number(persona?.total || 0);
    const tieneItems = Array.isArray(persona?.items) && persona.items.length > 0;
    return tieneItems || totalPersona > 0;
  });

  if (personasFiltradas.length === 0) {
    throw new Error('No hay personas con productos o montos para imprimir');
  }

  for (let i = 0; i < personasFiltradas.length; i += 1) {
    const persona = personasFiltradas[i];
    const html = construirHtmlTicketPersona({
      idVenta,
      mesa,
      cuenta,
      sucursal,
      tipoServicio,
      moneda,
      persona,
      indicePersona: i + 1,
      totalPersonas: personasFiltradas.length
    });
    // Imprime un ticket por persona para evitar mezclas en el mismo recibo.
    await imprimirEnMismaPantalla(html);
  }
};
