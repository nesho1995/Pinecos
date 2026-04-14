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
}
