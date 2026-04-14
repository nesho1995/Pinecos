namespace Pinecos.Models
{
    public class ConfiguracionNegocio
    {
        public int Id_Configuracion { get; set; }
        public string Nombre_Negocio { get; set; } = string.Empty;
        public string Direccion { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public string Rtn { get; set; } = string.Empty;
        public string Mensaje_Ticket { get; set; } = string.Empty;
        public string Ancho_Ticket { get; set; } = string.Empty;
        public string Logo_Url { get; set; } = string.Empty;
        public string Moneda { get; set; } = string.Empty;
        public bool Activo { get; set; }
    }
}