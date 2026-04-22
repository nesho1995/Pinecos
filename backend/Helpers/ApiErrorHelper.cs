namespace Pinecos.Helpers
{
    public static class ApiErrorHelper
    {
        public static object Build(HttpContext httpContext, string code, string message, object? details = null)
        {
            var payload = new Dictionary<string, object?>
            {
                ["code"] = string.IsNullOrWhiteSpace(code) ? "UNEXPECTED_ERROR" : code.Trim().ToUpperInvariant(),
                ["message"] = string.IsNullOrWhiteSpace(message) ? "Ocurrio un error." : message.Trim(),
                ["traceId"] = httpContext.TraceIdentifier
            };

            if (details != null)
                payload["details"] = details;

            return payload;
        }
    }
}

