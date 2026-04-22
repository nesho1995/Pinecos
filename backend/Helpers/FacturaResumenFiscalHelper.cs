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
                    AsignarMontosGravados(ref baseAfecta, ref impuestoAfecta, 0.18m);
                    resumen.ImporteGravado18 = baseAfecta;
                    resumen.Isv18 = impuestoAfecta;
                    break;
                default:
                    AsignarMontosGravados(ref baseAfecta, ref impuestoAfecta, 0.15m);
                    resumen.ImporteGravado15 = baseAfecta;
                    resumen.Isv15 = impuestoAfecta;
                    break;
            }

            return resumen;
        }

        /// <summary>
        /// Normaliza montos gravados cuando una de las dos partes no fue enviada.
        /// - Si hay base y no hay ISV: calcula ISV por tasa.
        /// - Si hay ISV y no hay base: calcula base por tasa.
        /// </summary>
        private static void AsignarMontosGravados(ref decimal baseAfecta, ref decimal impuestoAfecta, decimal tasa)
        {
            if (tasa <= 0) return;

            if (baseAfecta > 0 && impuestoAfecta <= 0)
            {
                impuestoAfecta = Math.Round(baseAfecta * tasa, 2, MidpointRounding.AwayFromZero);
                return;
            }

            if (baseAfecta <= 0 && impuestoAfecta > 0)
            {
                baseAfecta = Math.Round(impuestoAfecta / tasa, 2, MidpointRounding.AwayFromZero);
                return;
            }

            if (baseAfecta > 0 && impuestoAfecta > 0)
            {
                baseAfecta = Math.Round(baseAfecta, 2, MidpointRounding.AwayFromZero);
                impuestoAfecta = Math.Round(impuestoAfecta, 2, MidpointRounding.AwayFromZero);
            }
        }
    }
}
