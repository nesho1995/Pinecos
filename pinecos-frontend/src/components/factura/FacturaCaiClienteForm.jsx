/**
 * Datos del adquirente para factura CAI (SAR Honduras).
 * Consumidor final vs obligado tributario: campos exigidos validados tambien en backend.
 */
export const facturaClienteVacio = () => ({
  tipoCliente: 'CONSUMIDOR_FINAL',
  nombreCliente: '',
  rtnCliente: '',
  identidadCliente: '',
  direccionCliente: '',
  telefonoCliente: '',
  condicionPago: 'CONTADO',
  tipoFacturaFiscal: 'GRAVADO_15',
  numeroOrdenCompraExenta: '',
  numeroConstanciaRegistroExonerado: '',
  numeroRegistroSag: ''
});

function FacturaCaiClienteForm({ value, onChange, idPrefix = 'fcai' }) {
  const set = (field, v) => onChange({ ...value, [field]: v });

  const esEmpresa = String(value.tipoCliente || '').toUpperCase() === 'OBLIGADO_TRIBUTARIO';

  return (
    <div className="border rounded p-3 bg-light mb-2">
      <div className="fw-semibold mb-2 text-dark">Datos del adquirente (factura fiscal)</div>
      <p className="small text-muted mb-3">
        Completar segun el tipo de cliente. Para <strong>empresa</strong> se requiere RTN de 14 digitos. Para{' '}
        <strong>consumidor final</strong>, identidad y datos de contacto.
      </p>

      <div className="row g-2 mb-2">
        <div className="col-12 col-md-6">
          <label className="form-label small mb-0">Tipo de adquirente</label>
          <select
            className="form-select form-select-sm"
            id={`${idPrefix}-tipo`}
            value={value.tipoCliente || 'CONSUMIDOR_FINAL'}
            onChange={(e) => set('tipoCliente', e.target.value)}
          >
            <option value="CONSUMIDOR_FINAL">Persona (consumidor final)</option>
            <option value="OBLIGADO_TRIBUTARIO">Empresa (obligado tributario)</option>
          </select>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label small mb-0">Condicion de venta</label>
          <select
            className="form-select form-select-sm"
            id={`${idPrefix}-cond`}
            value={value.condicionPago || 'CONTADO'}
            onChange={(e) => set('condicionPago', e.target.value)}
          >
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Credito</option>
          </select>
        </div>
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">{esEmpresa ? 'Razon social' : 'Nombre completo'}</label>
        <input
          type="text"
          className="form-control form-control-sm"
          id={`${idPrefix}-nombre`}
          value={value.nombreCliente || ''}
          onChange={(e) => set('nombreCliente', e.target.value)}
          placeholder={esEmpresa ? 'Nombre de la empresa' : 'Nombre y apellidos'}
          autoComplete="name"
        />
      </div>

      {esEmpresa ? (
        <div className="mb-2">
          <label className="form-label small mb-0">RTN (14 digitos)</label>
          <input
            type="text"
            className="form-control form-control-sm font-monospace"
            id={`${idPrefix}-rtn`}
            value={value.rtnCliente || ''}
            onChange={(e) => set('rtnCliente', e.target.value)}
            placeholder="Ej. 08011980123456"
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="mb-2">
          <label className="form-label small mb-0">Identidad</label>
          <input
            type="text"
            className="form-control form-control-sm font-monospace"
            id={`${idPrefix}-id`}
            value={value.identidadCliente || ''}
            onChange={(e) => set('identidadCliente', e.target.value)}
            placeholder="Numero de identidad"
            autoComplete="off"
          />
        </div>
      )}

      <div className="mb-2">
        <label className="form-label small mb-0">Direccion</label>
        <input
          type="text"
          className="form-control form-control-sm"
          id={`${idPrefix}-dir`}
          value={value.direccionCliente || ''}
          onChange={(e) => set('direccionCliente', e.target.value)}
          placeholder="Colonia, ciudad, referencia"
          autoComplete="street-address"
        />
      </div>

      <div className="mb-2">
        <label className="form-label small mb-0">Telefono</label>
        <input
          type="text"
          className="form-control form-control-sm"
          id={`${idPrefix}-tel`}
          value={value.telefonoCliente || ''}
          onChange={(e) => set('telefonoCliente', e.target.value)}
          placeholder="Telefono de contacto"
          autoComplete="tel"
        />
      </div>

      <div className="mb-0">
        <label className="form-label small mb-0">Tipo de factura (afecta desglose de gravamen en comprobante)</label>
        <select
          className="form-select form-select-sm"
          id={`${idPrefix}-tf`}
          value={value.tipoFacturaFiscal || 'GRAVADO_15'}
          onChange={(e) => set('tipoFacturaFiscal', e.target.value)}
        >
          <option value="GRAVADO_15">Gravado 15% ISV</option>
          <option value="GRAVADO_18">Gravado 18% ISV</option>
          <option value="EXENTO">Exento</option>
          <option value="EXONERADO">Exonerado</option>
        </select>
      </div>

      {(value.tipoFacturaFiscal === 'EXONERADO' || value.tipoFacturaFiscal === 'EXENTO') && (
        <div className="row g-2 mt-2">
          <div className="col-12">
            <label className="form-label small mb-0">No. orden compra exenta (si aplica)</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={value.numeroOrdenCompraExenta || ''}
              onChange={(e) => set('numeroOrdenCompraExenta', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label small mb-0">No. constancia registro exonerado (si aplica)</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={value.numeroConstanciaRegistroExonerado || ''}
              onChange={(e) => set('numeroConstanciaRegistroExonerado', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label small mb-0">No. registro SAG (si aplica)</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={value.numeroRegistroSag || ''}
              onChange={(e) => set('numeroRegistroSag', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default FacturaCaiClienteForm;
