namespace Pinecos.DTOs
{
    public class FacturaClienteRequestDto
    {
        public string TipoCliente { get; set; } = "CONSUMIDOR_FINAL";
        public string NombreCliente { get; set; } = string.Empty;
        public string RtnCliente { get; set; } = string.Empty;
        public string IdentidadCliente { get; set; } = string.Empty;
        public string DireccionCliente { get; set; } = string.Empty;
        public string TelefonoCliente { get; set; } = string.Empty;
        public string CondicionPago { get; set; } = "CONTADO";
        public string TipoFacturaFiscal { get; set; } = "GRAVADO_15";
        public string NumeroOrdenCompraExenta { get; set; } = string.Empty;
        public string NumeroConstanciaRegistroExonerado { get; set; } = string.Empty;
        public string NumeroRegistroSag { get; set; } = string.Empty;
    }
}
