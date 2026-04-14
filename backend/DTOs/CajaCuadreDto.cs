namespace Pinecos.DTOs
{
    public class CanalMontoDto
    {
        public string Canal { get; set; } = string.Empty;
        public decimal Monto { get; set; }
    }

    public class CierreCajaRequestDto
    {
        public decimal Monto_Cierre { get; set; }
        public List<CanalMontoDto> Pos { get; set; } = new();
        public List<CanalMontoDto> Delivery { get; set; } = new();
        public string Observacion { get; set; } = string.Empty;
    }

    public class CuadreCanalesConfigDto
    {
        public int? IdSucursal { get; set; }
        public List<string> Pos { get; set; } = new();
        public List<string> Delivery { get; set; } = new();
        public bool RequiereMontoEnTodos { get; set; } = true;
    }
}
