namespace Pinecos.Helpers
{
    public class FacturaResumenFiscal
    {
        public decimal ImporteExento { get; set; }
        public decimal ImporteExonerado { get; set; }
        public decimal ImporteGravado15 { get; set; }
        public decimal ImporteGravado18 { get; set; }
        public decimal Isv15 { get; set; }
        public decimal Isv18 { get; set; }
    }

    public static class FacturaResumenFiscalHelper
    {
        public static FacturaResumenFiscal Calcular(decimal subtotalBase, decimal impuesto, string? tipoFacturaFiscal)
        {
            var baseAfecta = subtotalBase < 0 ? 0 : subtotalBase;
            var impuestoAfecta = impuesto < 0 ? 0 : impuesto;
            var tipo = (tipoFacturaFiscal ?? "GRAVADO_15").Trim().ToUpperInvariant();

            var resumen = new FacturaResumenFiscal();
            switch (tipo)
            {
                case "EXENTO":
                    resumen.ImporteExento = baseAfecta;
                    break;
                case "EXONERADO":
                    resumen.ImporteExonerado = baseAfecta;
                    break;
                case "GRAVADO_18":
                    resumen.ImporteGravado18 = baseAfecta;
                    resumen.Isv18 = impuestoAfecta;
                    break;
                default:
                    resumen.ImporteGravado15 = baseAfecta;
                    resumen.Isv15 = impuestoAfecta;
                    break;
            }

            return resumen;
        }
    }
}
