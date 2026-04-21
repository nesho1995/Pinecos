using System.Text.RegularExpressions;
using Pinecos.DTOs;

namespace Pinecos.Helpers
{
    /// <summary>
    /// Valida datos del adquirente cuando se emite factura CAI (nombre, identidad o RTN según tipo).
    /// </summary>
    public static class FacturaClienteValidacionHelper
    {
        public static string? ValidarParaEmisionCai(FacturaClienteRequestDto? request)
        {
            var f = FacturaClienteMetadataHelper.Normalizar(request);

            if (string.IsNullOrWhiteSpace(f.NombreCliente) || f.NombreCliente.Trim().Length < 3)
            {
                return "Factura CAI: ingrese el nombre completo o la razon social del adquirente (minimo 3 caracteres).";
            }

            if (f.TipoCliente == "OBLIGADO_TRIBUTARIO")
            {
                if (!EsRtnHondurasValido(f.RtnCliente))
                {
                    return "Factura CAI a empresa: el RTN debe tener 14 digitos (sin o con guiones).";
                }

                if (string.IsNullOrWhiteSpace(f.DireccionCliente) || f.DireccionCliente.Trim().Length < 5)
                {
                    return "Factura CAI a empresa: ingrese la direccion fiscal del adquirente.";
                }

                if (string.IsNullOrWhiteSpace(f.TelefonoCliente) || f.TelefonoCliente.Trim().Length < 5)
                {
                    return "Factura CAI a empresa: ingrese telefono de contacto.";
                }
            }
            else
            {
                if (string.IsNullOrWhiteSpace(f.IdentidadCliente) || f.IdentidadCliente.Trim().Length < 5)
                {
                    return "Factura CAI (consumidor final): ingrese el numero de identidad del adquirente.";
                }

                if (string.IsNullOrWhiteSpace(f.DireccionCliente) || f.DireccionCliente.Trim().Length < 5)
                {
                    return "Factura CAI (consumidor final): ingrese direccion del adquirente.";
                }

                if (string.IsNullOrWhiteSpace(f.TelefonoCliente) || f.TelefonoCliente.Trim().Length < 5)
                {
                    return "Factura CAI (consumidor final): ingrese telefono de contacto.";
                }
            }

            return null;
        }

        private static bool EsRtnHondurasValido(string? rtn)
        {
            if (string.IsNullOrWhiteSpace(rtn))
                return false;

            var digitos = Regex.Replace(rtn.Trim(), @"\D", "");
            return digitos.Length == 14;
        }
    }
}
