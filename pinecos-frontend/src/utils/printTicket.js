import api from '../services/api';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

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
    esFacturaCai = false;
  }

  const response = await api.get(`/Tickets/venta/${idVenta}/html`, {
    responseType: 'text'
  });
  const html = esFacturaCai
    ? construirHtmlDobleCopiaCai(response.data)
    : response.data;

  await imprimirEnMismaPantalla(html);
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
