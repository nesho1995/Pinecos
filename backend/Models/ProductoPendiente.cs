namespace Pinecos.Models
{
    public class ProductoPendiente
    {
        public int Id_Producto_Pendiente { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public decimal Precio_Sugerido { get; set; }
        public int Id_Sucursal { get; set; }
        public int Id_Usuario_Solicita { get; set; }
        public string? Nota_Solicitud { get; set; }
        public string Estado { get; set; } = "PENDIENTE";
        public string? Comentario_Revision { get; set; }
        public int? Id_Usuario_Revision { get; set; }
        public int? Id_Producto_Creado { get; set; }
        public DateTime Fecha_Creacion { get; set; } = DateTime.UtcNow;
        public DateTime? Fecha_Revision { get; set; }
    }
}
