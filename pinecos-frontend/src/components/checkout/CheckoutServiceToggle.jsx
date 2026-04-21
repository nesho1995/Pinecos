/** Modo servicio estilo botones grandes (rápido en mostrador). */
function CheckoutServiceToggle({ value, onChange, disabled = false }) {
  const v = String(value || 'COMER_AQUI').toUpperCase();

  return (
    <div className="pro-service-toggle">
      <div className="pro-pay-chips-label text-muted small fw-semibold mb-1">Servicio</div>
      <div className="d-flex gap-2">
        <button
          type="button"
          disabled={disabled}
          className={`btn flex-fill py-2 pro-service-btn ${v === 'COMER_AQUI' ? 'btn-dark' : 'btn-outline-secondary'}`}
          onClick={() => !disabled && onChange('COMER_AQUI')}
        >
          Comer aqui
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`btn flex-fill py-2 pro-service-btn ${v === 'LLEVAR' ? 'btn-dark' : 'btn-outline-secondary'}`}
          onClick={() => !disabled && onChange('LLEVAR')}
        >
          Para llevar
        </button>
      </div>
    </div>
  );
}

export default CheckoutServiceToggle;
