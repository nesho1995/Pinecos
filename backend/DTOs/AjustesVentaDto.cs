namespace Pinecos.DTOs
{
    public class OpcionAjusteVentaDto
    {
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string TipoCalculo { get; set; } = "NINGUNO"; // NINGUNO | PORCENTAJE | MONTO | INCLUIDO_PORCENTAJE
        public decimal Valor { get; set; }
        public bool PermiteEditarMonto { get; set; }
        public bool Activo { get; set; } = true;
    }

    public class AjustesVentaSucursalDto
    {
        public int IdSucursal { get; set; }
        public List<OpcionAjusteVentaDto> Descuentos { get; set; } = new();
        public List<OpcionAjusteVentaDto> Impuestos { get; set; } = new();
    }
}
