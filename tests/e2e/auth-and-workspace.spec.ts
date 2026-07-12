import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "meharbancaracwork@gmail.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "Meharban@786";

test("login page masks password on desktop and mobile", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Meharban Car A/C Works" })).toBeVisible();
  const passwordInput = page.locator('input[name="password"]');
  await expect(passwordInput).toHaveAttribute("type", "password");
  await expect(passwordInput).toHaveClass(/password-mask/);

  await passwordInput.fill("VisibleCheck123");
  await expect(passwordInput).toHaveValue("VisibleCheck123");
  const textSecurity = await passwordInput.evaluate((element) =>
    window.getComputedStyle(element).getPropertyValue("-webkit-text-security"),
  );
  expect(["disc", "circle", "square", "none", ""].includes(textSecurity)).toBeTruthy();
});

test("protected workspace redirects anonymous users to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/job-cards");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Meharban Car A/C Works" })).toBeVisible();
});

test("admin can login and see billing workspace", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword);
  await page.getByRole("button", { name: /login/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Billing Workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: /New Job Card/i })).toBeVisible();
  await expect(page.locator('a[href="/?type=job-card"]')).toBeVisible();
  await expect(page.locator('a[href="/?type=estimate"]')).toBeVisible();
  await expect(page.locator('a[href="/?type=invoice"]')).toBeVisible();
});
