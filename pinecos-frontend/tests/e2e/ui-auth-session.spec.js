import { test, expect } from '@playwright/test';

test.describe('UI Auth Session', () => {
  test('redirige a login si intentan entrar a ruta protegida sin sesion', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });

  test('logout invalida la sesion y volver atras no permite ver modulo protegido', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'e2e.fake.jwt.token');
      localStorage.setItem(
        'usuario',
        JSON.stringify({
          id_Usuario: 9999,
          nombre: 'E2E Test',
          usuarioLogin: 'e2e',
          rol: 'ADMIN',
          id_Sucursal: 1
        })
      );
    });

    await page.route('**/api/Auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          idUsuario: 9999,
          usuario: 'e2e',
          rol: 'ADMIN',
          idSucursal: 1
        })
      });
    });

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('button', { name: 'Salir' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });
});
