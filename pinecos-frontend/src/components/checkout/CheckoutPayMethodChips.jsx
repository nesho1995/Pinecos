/**
 * Selector de metodo de pago estilo terminal POS (chips tactiles).
 */
const DEFAULTS = [
  { codigo: 'EFECTIVO', label: 'Efectivo', title: 'Efectivo' },
  { codigo: 'POS', label: 'Tarjeta / POS', title: 'POS / datáfono' },
  { codigo: 'TRANSFERENCIA', label: 'Transferencia', title: 'Transferencia bancaria' },
  { codigo: 'OTRO', label: 'Otro', title: 'Otro medio' }
];

function CheckoutPayMethodChips({ value, onChange, options = DEFAULTS, className = '', disabled = false }) {
  const v = String(value || 'EFECTIVO').toUpperCase();

  return (
    <div className={`pro-pay-chips ${className}`.trim()}>
      <div className="pro-pay-chips-label text-muted small fw-semibold mb-1">Como paga el cliente</div>
      <div className="pro-pay-chips-grid" role="group" aria-label="Metodo de pago">
        {options.map((opt) => (
          <button
            key={opt.codigo}
            type="button"
            disabled={disabled}
            title={opt.title || opt.label}
            className={`pro-pay-chip btn ${v === opt.codigo ? 'pro-pay-chip--active' : 'btn-outline-secondary'}`}
            onClick={() => !disabled && onChange(opt.codigo)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CheckoutPayMethodChips;
