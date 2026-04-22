namespace Pinecos.DTOs
{
    public class FacturacionSarConfigDto
    {
        public int? IdSucursal { get; set; }
        public bool HabilitadoCai { get; set; }
        public string Cai { get; set; } = string.Empty;
        public string RangoInicio { get; set; } = string.Empty;
        public string RangoFin { get; set; } = string.Empty;
        public int? SiguienteCorrelativo { get; set; }
        public DateTime? FechaLimiteEmision { get; set; }
        public string LeyendaSar { get; set; } = string.Empty;
        public bool PermitirVentaSinFactura { get; set; } = true;
        public string NombreImprenta { get; set; } = string.Empty;
        public string RtnImprenta { get; set; } = string.Empty;
        public string NumeroCertificadoImprenta { get; set; } = string.Empty;
        public string CorreoNegocioFactura { get; set; } = string.Empty;
        public string ClientePorDefecto { get; set; } = "CONSUMIDOR FINAL";
        public string RtnClientePorDefecto { get; set; } = string.Empty;
        public string DireccionClientePorDefecto { get; set; } = string.Empty;
        public string CiudadFechaFactura { get; set; } = string.Empty;
        public string PieFactura { get; set; } = "La factura es beneficio de todos. Exijala.";
        public int? CorrelativoInicio { get; set; }
        public int? CorrelativoFin { get; set; }
        public int? CorrelativoActual { get; set; }
        public int FacturasRestantes { get; set; }
        public bool CaiVencido { get; set; }
    }

    public class FacturacionSarStoreDataDto
    {
        public Dictionary<int, FacturacionSarConfigDto> ConfiguracionesPorSucursal { get; set; } = new();
    }

    public class FacturacionSarSucursalResumenDto
    {
        public int IdSucursal { get; set; }
        public bool HabilitadoCai { get; set; }
        public string Cai { get; set; } = string.Empty;
        public int? SiguienteCorrelativo { get; set; }
        public DateTime? FechaLimiteEmision { get; set; }
        public int FacturasRestantes { get; set; }
        public bool CaiVencido { get; set; }
        public string NumeroCertificadoImprenta { get; set; } = string.Empty;
    }

    public class FacturaEmitidaDto
    {
        public string NumeroFactura { get; set; } = string.Empty;
        public string Cai { get; set; } = string.Empty;
        public DateTime? FechaLimiteEmision { get; set; }
    }

    public class FacturacionSarEventoRevisionDto
    {
        public bool Revisado { get; set; }
        public string ComentarioOperacion { get; set; } = string.Empty;
    }

    public class FacturacionSarEventoRevisionSeleccionDto : FacturacionSarEventoRevisionDto
    {
        public List<long> IdsEvento { get; set; } = new();
    }
}
