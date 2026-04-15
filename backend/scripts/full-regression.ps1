param(
    [string]$BaseUrl = "http://127.0.0.1:5152",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "1234"
)

$ErrorActionPreference = "Stop"

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param(
        [string]$Test,
        [bool]$Ok,
        [string]$Detail
    )
    $results.Add([pscustomobject]@{
        Test      = $Test
        Resultado = $(if ($Ok) { "OK" } else { "FALLO" })
        Detalle   = $Detail
    }) | Out-Null
}

function Invoke-Api {
    param(
        [ValidateSet("GET","POST","PUT","DELETE")]
        [string]$Method,
        [string]$Path,
        $Body = $null,
        [string]$Token = "",
        [int[]]$ExpectedStatus = @(200)
    )

    $uri = "$BaseUrl$Path"
    $headers = @{}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    try {
        $resp = if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 12
            Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -ContentType "application/json" -Body $json -UseBasicParsing -TimeoutSec 20
        } else {
            Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -UseBasicParsing -TimeoutSec 20
        }

        $status = [int]$resp.StatusCode
        $content = $null
        if (-not [string]::IsNullOrWhiteSpace($resp.Content)) {
            try { $content = $resp.Content | ConvertFrom-Json } catch { $content = $resp.Content }
        }

        return [pscustomobject]@{
            Ok      = ($ExpectedStatus -contains $status)
            Status  = $status
            Content = $content
            Raw     = $resp.Content
        }
    }
    catch {
        $status = -1
        $raw = $_.Exception.Message
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $raw = $reader.ReadToEnd()
            }
            catch {
            }
        }
        $content = $null
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            try { $content = $raw | ConvertFrom-Json } catch { $content = $raw }
        }
        return [pscustomobject]@{
            Ok      = ($ExpectedStatus -contains $status)
            Status  = $status
            Content = $content
            Raw     = $raw
        }
    }
}

function Get-Message {
    param($Response)
    if ($null -eq $Response) { return "" }
    if ($Response.Content -and $Response.Content.message) { return [string]$Response.Content.message }
    if ($Response.Raw) { return [string]$Response.Raw }
    return ""
}

$adminToken = ""
$idSucursal = $null
$idCaja = $null
$cajaAbiertaPorTest = $false
$ventaIdCreada = $null
$mesaCreada = $null
$usuarioCajero = $null
$canalesOriginal = $null

try {
    $reach = Invoke-Api -Method GET -Path "/api/Auth/me" -ExpectedStatus @(401)
    Add-Result "Reachability API" $reach.Ok "HTTP $($reach.Status)"

    $login = Invoke-Api -Method POST -Path "/api/Auth/login" -Body @{ usuario = $AdminUser; clave = $AdminPass } -ExpectedStatus @(200)
    $adminToken = $login.Content.token
    Add-Result "Login admin" ($login.Ok -and -not [string]::IsNullOrWhiteSpace($adminToken)) "HTTP $($login.Status)"
    if (-not $adminToken) { throw "No se pudo autenticar como admin" }

    $me = Invoke-Api -Method GET -Path "/api/Auth/me" -Token $adminToken -ExpectedStatus @(200)
    Add-Result "Auth/me admin" $me.Ok "HTTP $($me.Status)"

    $sucRes = Invoke-Api -Method GET -Path "/api/Sucursales?incluirInactivas=true" -Token $adminToken -ExpectedStatus @(200)
    if ($sucRes.Ok -and $sucRes.Content.Count -gt 0) {
        $idSucursal = [int]$sucRes.Content[0].id_Sucursal
    }
    Add-Result "Listar sucursales" ($sucRes.Ok -and $idSucursal) "Sucursal usada: $idSucursal"
    if (-not $idSucursal) { throw "No hay sucursal disponible para pruebas" }

    $canalesGet = Invoke-Api -Method GET -Path "/api/Cajas/canales-config?idSucursal=$idSucursal" -Token $adminToken -ExpectedStatus @(200)
    $canalesOriginal = $canalesGet.Content
    Add-Result "Canales/metodos GET" ($canalesGet.Ok -and $canalesGet.Content.metodosPago.Count -gt 0) "Metodos: $($canalesGet.Content.metodosPago.Count)"

    $tmpMetodoCodigo = "TEST_MP_$(Get-Random -Minimum 100 -Maximum 999)"
    $canalesNuevo = @{
        idSucursal = $idSucursal
        pos = @($canalesOriginal.pos)
        delivery = @($canalesOriginal.delivery)
        metodosPago = @($canalesOriginal.metodosPago) + @(@{
                codigo = $tmpMetodoCodigo
                nombre = "Metodo Test"
                categoria = "OTRO"
                activo = $true
            })
        requiereMontoEnTodos = $true
    }
    $putCanales = Invoke-Api -Method PUT -Path "/api/Cajas/canales-config?idSucursal=$idSucursal" -Token $adminToken -Body $canalesNuevo -ExpectedStatus @(200)
    Add-Result "Canales/metodos PUT" $putCanales.Ok "HTTP $($putCanales.Status)"

    $restoreCanales = Invoke-Api -Method PUT -Path "/api/Cajas/canales-config?idSucursal=$idSucursal" -Token $adminToken -Body $canalesOriginal -ExpectedStatus @(200)
    Add-Result "Canales/metodos restore" $restoreCanales.Ok "HTTP $($restoreCanales.Status)"

    $cajaActual = Invoke-Api -Method GET -Path "/api/Dashboard/caja-actual?idSucursal=$idSucursal" -Token $adminToken -ExpectedStatus @(200)
    if ($cajaActual.Ok -and -not $cajaActual.Content.abierta) {
        $abrirCaja = Invoke-Api -Method POST -Path "/api/Cajas/abrir" -Token $adminToken -Body @{
            monto_Inicial = 300
            observacion   = "Apertura automatica test"
        } -ExpectedStatus @(200)
        Add-Result "Abrir caja (si cerrada)" $abrirCaja.Ok "HTTP $($abrirCaja.Status)"
        if ($abrirCaja.Ok) { $cajaAbiertaPorTest = $true }
        $cajaActual = Invoke-Api -Method GET -Path "/api/Dashboard/caja-actual?idSucursal=$idSucursal" -Token $adminToken -ExpectedStatus @(200)
    } else {
        Add-Result "Caja ya abierta" $true "Caja existente"
    }
    if ($cajaActual.Ok -and $cajaActual.Content.abierta) {
        $idCaja = [int]$cajaActual.Content.id_Caja
    }
    Add-Result "Caja actual" ($idCaja -gt 0) "idCaja=$idCaja"
    if (-not $idCaja) { throw "No hay caja abierta para pruebas de venta/mesas" }

    $menu = Invoke-Api -Method GET -Path "/api/Menu/sucursal/$idSucursal" -Token $adminToken -ExpectedStatus @(200)
    $menuItem = $null
    if ($menu.Ok -and $menu.Content.normales.Count -gt 0) { $menuItem = $menu.Content.normales[0] }
    if (-not $menuItem -and $menu.Ok -and $menu.Content.conPresentacion.Count -gt 0) { $menuItem = $menu.Content.conPresentacion[0] }
    Add-Result "Menu por sucursal" ($menu.Ok -and $null -ne $menuItem) "HTTP $($menu.Status)"
    if (-not $menuItem) { throw "No hay productos con precio para pruebas" }

    $metodosCfg = Invoke-Api -Method GET -Path "/api/Cajas/canales-config?idSucursal=$idSucursal" -Token $adminToken -ExpectedStatus @(200)
    $metodoActivo = ($metodosCfg.Content.metodosPago | Where-Object { $_.activo } | Select-Object -First 1)
    $metodoCodigo = if ($metodoActivo) { [string]$metodoActivo.codigo } else { "EFECTIVO" }
    $sarCfg = Invoke-Api -Method GET -Path "/api/FacturacionSar?idSucursal=$idSucursal" -Token $adminToken -ExpectedStatus @(200)
    $emitirFacturaObligatoria = $false
    if ($sarCfg.Ok -and $sarCfg.Content.habilitadoCai -and -not $sarCfg.Content.permitirVentaSinFactura) {
        $emitirFacturaObligatoria = $true
    }

    $venta = Invoke-Api -Method POST -Path "/api/Ventas" -Token $adminToken -Body @{
        id_Caja = $idCaja
        descuento = 0
        impuesto = 0
        impuestoIncluidoEnSubtotal = $false
        emitirFactura = $emitirFacturaObligatoria
        metodo_Pago = $metodoCodigo
        tipo_Servicio = "LLEVAR"
        observacion = "Venta test regresion"
        detalles = @(
            @{
                id_Producto = [int]$menuItem.id_Producto
                id_Presentacion = if ($menuItem.id_Presentacion) { [int]$menuItem.id_Presentacion } else { $null }
                cantidad = 1
                observacion = "test"
            }
        )
    } -ExpectedStatus @(200)
    if ($venta.Ok) { $ventaIdCreada = [int]$venta.Content.data.id_Venta }
    Add-Result "Crear venta POS" ($venta.Ok -and $ventaIdCreada) "HTTP $($venta.Status) idVenta=$ventaIdCreada"

    if ($ventaIdCreada) {
        $ticket = Invoke-Api -Method GET -Path "/api/Tickets/venta/$ventaIdCreada/html" -Token $adminToken -ExpectedStatus @(200)
        Add-Result "Ticket HTML venta" $ticket.Ok "HTTP $($ticket.Status)"
    }

    $mesasRes = Invoke-Api -Method GET -Path "/api/Mesas/sucursal/$idSucursal" -Token $adminToken -ExpectedStatus @(200)
    $cuentasAbiertas = Invoke-Api -Method GET -Path "/api/CuentasMesa/abiertas" -Token $adminToken -ExpectedStatus @(200)

    $mesaLibre = $null
    if ($mesasRes.Ok) {
        foreach ($m in $mesasRes.Content) {
            $ocupada = $false
            foreach ($c in $cuentasAbiertas.Content) {
                if ([int]$c.id_Mesa -eq [int]$m.id_Mesa) { $ocupada = $true; break }
            }
            if (-not $ocupada) { $mesaLibre = $m; break }
        }
    }

    if (-not $mesaLibre) {
        $crearMesa = Invoke-Api -Method POST -Path "/api/Mesas" -Token $adminToken -Body @{
            id_Sucursal = $idSucursal
            nombre = "MESA_TEST_$(Get-Random -Minimum 100 -Maximum 999)"
            capacidad = 2
            forma = "RECTANGULAR"
            pos_X = 50
            pos_Y = 50
            ancho = 120
            alto = 90
        } -ExpectedStatus @(200)
        Add-Result "Crear mesa temporal" $crearMesa.Ok "HTTP $($crearMesa.Status)"
        if ($crearMesa.Ok) {
            $mesaLibre = $crearMesa.Content.data
            $mesaCreada = $mesaLibre
        }
    } else {
        Add-Result "Mesa libre encontrada" $true "Mesa #$($mesaLibre.id_Mesa)"
    }

    if ($mesaLibre) {
        $abrirCuenta = Invoke-Api -Method POST -Path "/api/CuentasMesa/abrir" -Token $adminToken -Body @{
            id_Mesa = [int]$mesaLibre.id_Mesa
            observacion = "Cuenta test regresion"
        } -ExpectedStatus @(200)
        Add-Result "Abrir cuenta mesa" $abrirCuenta.Ok "HTTP $($abrirCuenta.Status)"

        if ($abrirCuenta.Ok) {
            $idCuenta = [int]$abrirCuenta.Content.data.id_Cuenta_Mesa
            $agregar = Invoke-Api -Method POST -Path "/api/CuentasMesa/$idCuenta/agregar-producto" -Token $adminToken -Body @{
                id_Producto = [int]$menuItem.id_Producto
                id_Presentacion = if ($menuItem.id_Presentacion) { [int]$menuItem.id_Presentacion } else { $null }
                cantidad = 1
                observacion = "test"
            } -ExpectedStatus @(200)
            Add-Result "Agregar producto cuenta mesa" $agregar.Ok "HTTP $($agregar.Status)"

            $cancelar = Invoke-Api -Method POST -Path "/api/CuentasMesa/$idCuenta/cancelar" -Token $adminToken -ExpectedStatus @(200)
            Add-Result "Cancelar cuenta mesa" $cancelar.Ok "HTTP $($cancelar.Status)"
        }
    }

    $gastoInvalido = Invoke-Api -Method POST -Path "/api/Gastos" -Token $adminToken -Body @{
        categoria_Gasto = "TEST"
        descripcion = "gasto invalido"
        monto = -5
    } -ExpectedStatus @(400)
    Add-Result "Validacion gasto monto negativo" $gastoInvalido.Ok "HTTP $($gastoInvalido.Status)"

    $gastoValido = Invoke-Api -Method POST -Path "/api/Gastos" -Token $adminToken -Body @{
        categoria_Gasto = "TEST"
        descripcion = "gasto smoke"
        monto = 1.23
    } -ExpectedStatus @(200,400)
    Add-Result "Crear gasto (segun caja abierta)" $gastoValido.Ok "HTTP $($gastoValido.Status) $(Get-Message $gastoValido)"

    $reportes = @(
        "/api/Reportes/panel-negocio?idSucursal=$idSucursal",
        "/api/Reportes/ventas-resumen?idSucursal=$idSucursal",
        "/api/Reportes/gastos-resumen?idSucursal=$idSucursal",
        "/api/Reportes/utilidad?idSucursal=$idSucursal",
        "/api/Reportes/ventas-por-metodo-pago?idSucursal=$idSucursal",
        "/api/Reportes/ventas-por-tipo-servicio?idSucursal=$idSucursal",
        "/api/Reportes/ventas-por-categoria?idSucursal=$idSucursal",
        "/api/Reportes/gastos-por-categoria?idSucursal=$idSucursal",
        "/api/Reportes/productos-mas-vendidos?idSucursal=$idSucursal"
    )
    foreach ($path in $reportes) {
        $rep = Invoke-Api -Method GET -Path $path -Token $adminToken -ExpectedStatus @(200)
        Add-Result "Reporte $path" $rep.Ok "HTTP $($rep.Status)"
    }

    $loginCajero = "test_cajero_$(Get-Random -Minimum 1000 -Maximum 9999)"
    $claveCajero = "Test#1234A"
    $crearCajero = Invoke-Api -Method POST -Path "/api/Usuarios" -Token $adminToken -Body @{
        nombre = "Cajero Test"
        usuarioLogin = $loginCajero
        clave = $claveCajero
        rol = "CAJERO"
        id_Sucursal = $idSucursal
        activo = $true
    } -ExpectedStatus @(200)
    if ($crearCajero.Ok) { $usuarioCajero = $crearCajero.Content.data }
    Add-Result "Crear usuario cajero test" $crearCajero.Ok "HTTP $($crearCajero.Status)"

    if ($crearCajero.Ok) {
        $loginC = Invoke-Api -Method POST -Path "/api/Auth/login" -Body @{ usuario = $loginCajero; clave = $claveCajero } -ExpectedStatus @(200)
        $tokenC = $loginC.Content.token
        Add-Result "Login cajero test" ($loginC.Ok -and $tokenC) "HTTP $($loginC.Status)"

        $forbiddenUsuarios = Invoke-Api -Method GET -Path "/api/Usuarios" -Token $tokenC -ExpectedStatus @(403)
        Add-Result "Cajero bloqueado en modulo admin" $forbiddenUsuarios.Ok "HTTP $($forbiddenUsuarios.Status)"

        $dashCajero = Invoke-Api -Method GET -Path "/api/Dashboard/resumen" -Token $tokenC -ExpectedStatus @(200)
        Add-Result "Cajero acceso dashboard" $dashCajero.Ok "HTTP $($dashCajero.Status)"
    }
}
catch {
    Add-Result "Ejecucion general" $false $_.Exception.Message
}
finally {
    if ($mesaCreada -and $mesaCreada.id_Mesa) {
        $null = Invoke-Api -Method PUT -Path "/api/Mesas/$($mesaCreada.id_Mesa)" -Token $adminToken -Body @{
            id_Mesa = [int]$mesaCreada.id_Mesa
            id_Sucursal = [int]$mesaCreada.id_Sucursal
            nombre = [string]$mesaCreada.nombre
            capacidad = [int]$mesaCreada.capacidad
            estado = "LIBRE"
            forma = [string]$mesaCreada.forma
            pos_X = [int]$mesaCreada.pos_X
            pos_Y = [int]$mesaCreada.pos_Y
            ancho = [int]$mesaCreada.ancho
            alto = [int]$mesaCreada.alto
            activo = $false
        } -ExpectedStatus @(200)
    }

    if ($usuarioCajero -and $usuarioCajero.id_Usuario) {
        $null = Invoke-Api -Method DELETE -Path "/api/Usuarios/$($usuarioCajero.id_Usuario)" -Token $adminToken -ExpectedStatus @(200,404)
    }

    if ($cajaAbiertaPorTest -and $idCaja) {
        $previo = Invoke-Api -Method GET -Path "/api/Cajas/cuadre-previo/$idCaja" -Token $adminToken -ExpectedStatus @(200)
        if ($previo.Ok) {
            $efectivo = [decimal]$previo.Content.resumen.efectivoEsperado
            $ventasPos = [decimal]$previo.Content.resumen.ventasPos
            $ventasDelivery = [decimal]$previo.Content.resumen.ventasDelivery

            $posCanales = @($previo.Content.canalesConfig.pos)
            $deliveryCanales = @($previo.Content.canalesConfig.delivery)

            $posPayload = @()
            for ($i = 0; $i -lt $posCanales.Count; $i++) {
                $monto = if ($i -eq 0) { $ventasPos } else { 0 }
                $posPayload += @{ canal = [string]$posCanales[$i]; monto = [decimal]$monto }
            }
            $deliveryPayload = @()
            for ($i = 0; $i -lt $deliveryCanales.Count; $i++) {
                $monto = if ($i -eq 0) { $ventasDelivery } else { 0 }
                $deliveryPayload += @{ canal = [string]$deliveryCanales[$i]; monto = [decimal]$monto }
            }

            $cerrar = Invoke-Api -Method POST -Path "/api/Cajas/cerrar/$idCaja" -Token $adminToken -Body @{
                monto_Cierre = [decimal]$efectivo
                pos = $posPayload
                delivery = $deliveryPayload
                observacion = "Cierre automatico test regresion"
            } -ExpectedStatus @(200)
            Add-Result "Cerrar caja abierta por test" $cerrar.Ok "HTTP $($cerrar.Status)"
        }
    }
}

$results | Format-Table -AutoSize

$fails = ($results | Where-Object { $_.Resultado -eq "FALLO" }).Count
if ($fails -gt 0) {
    exit 1
}
exit 0
