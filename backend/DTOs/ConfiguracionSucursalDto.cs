namespace Pinecos.DTOs
{
    public class ConfiguracionSucursalDto
    {
        public int IdSucursal { get; set; }
        public string Nombre_Negocio { get; set; } = string.Empty;
        public string Direccion { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public string Rtn { get; set; } = string.Empty;
        public string Mensaje_Ticket { get; set; } = string.Empty;
        public string Ancho_Ticket { get; set; } = "80mm";
        public string Logo_Url { get; set; } = string.Empty;
        public string Moneda { get; set; } = "L";
        public bool Activo { get; set; } = true;
    }
}
