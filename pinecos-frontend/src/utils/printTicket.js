import api from '../services/api';

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

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const imprimirTicketHtml = async (idVenta) => {
  const response = await api.get(`/Tickets/venta/${idVenta}/html`, {
    responseType: 'text'
  });

  await imprimirEnMismaPantalla(response.data);
};

export const imprimirFacturaCaiDoble = async (idVenta) => {
  const [clienteResp, negocioResp] = await Promise.all([
    api.get(`/Tickets/venta/${idVenta}/html`, {
      params: { copia: 'CLIENTE' },
      responseType: 'text'
    }),
    api.get(`/Tickets/venta/${idVenta}/html`, {
      params: { copia: 'NEGOCIO' },
      responseType: 'text'
    })
  ]);

  const parser = new DOMParser();
  const docCliente = parser.parseFromString(clienteResp.data, 'text/html');
  const docNegocio = parser.parseFromString(negocioResp.data, 'text/html');

  const styleBlocks = [
    ...Array.from(docCliente.head?.querySelectorAll('style') || []).map((x) => x.textContent || ''),
    ...Array.from(docNegocio.head?.querySelectorAll('style') || []).map((x) => x.textContent || '')
  ].filter(Boolean);

  const estilos = Array.from(new Set(styleBlocks)).join('\n');
  const bodyCliente = docCliente.body?.innerHTML || '';
  const bodyNegocio = docNegocio.body?.innerHTML || '';

  const htmlDoble = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Factura CAI Doble #${idVenta}</title>
  <style>
    ${estilos}
    .cai-copy-break {
      page-break-before: always;
      break-before: page;
    }
    .cai-copy-root {
      display: block;
    }
  </style>
</head>
<body>
  <div class="cai-copy-root">${bodyCliente}</div>
  <div class="cai-copy-break cai-copy-root">${bodyNegocio}</div>
</body>
</html>`;

  // Una sola llamada a print evita que el navegador bloquee la segunda copia.
  await imprimirEnMismaPantalla(htmlDoble);
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
  totalPersonas
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

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Division de cuenta #${idVenta} - Persona ${indicePersona}</title>
  <style>
    * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, sans-serif; }
    body { margin: 0; background: #fff; color: #0f172a; }
    .shell { max-width: 820px; margin: 0 auto; padding: 10px; }
    .meta { border: 1px solid #dbe3ee; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; font-size: 13px; }
    .ticket-card { border: 1px solid #dbe3ee; border-radius: 12px; padding: 10px; break-inside: avoid; }
    .ticket-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px; }
    .ticket-title { font-weight: 800; font-size: 15px; }
    .ticket-sub { font-size: 12px; color: #475569; }
    .ticket-total { font-weight: 800; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .empty { text-align: center; color: #64748b; }
    .foot { margin-top: 10px; font-size: 12px; color: #475569; text-align: right; }
    @media print {
      @page { size: auto; margin: 8mm; }
      .shell { max-width: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="meta">
      <div><strong>Venta:</strong> #${idVenta} | <strong>Mesa:</strong> ${escapeHtml(mesa || '-')} | <strong>Cuenta:</strong> ${escapeHtml(cuenta || '-')}</div>
      <div><strong>Sucursal:</strong> ${escapeHtml(sucursal || '-')} | <strong>Servicio:</strong> ${escapeHtml(tipoServicio || '-')}</div>
      <div><strong>Division:</strong> Persona ${indicePersona} de ${totalPersonas}</div>
    </div>
    <div class="ticket-card">
      <div class="ticket-head">
        <div>
          <div class="ticket-title">${escapeHtml(persona?.nombre || `Persona ${indicePersona}`)}</div>
          <div class="ticket-sub">${escapeHtml(persona?.metodoPago || 'SIN METODO')}</div>
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
    </div>
  </div>
</body>
</html>`;
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
