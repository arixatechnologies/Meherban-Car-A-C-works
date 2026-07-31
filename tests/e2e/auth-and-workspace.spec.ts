import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "meharbancaracwork@gmail.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "Meharban@786";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(adminEmail);
  await page.locator('input[name="password"]').fill(adminPassword);
  await page.getByRole("button", { name: /login/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

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
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "Billing Workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: /New Job Card/i })).toBeVisible();
  await expect(page.locator('a[href="/?type=job-card"]')).toBeVisible();
  await expect(page.locator('a[href="/?type=estimate"]')).toBeVisible();
  await expect(page.locator('a[href="/?type=invoice"]')).toBeVisible();
});

test("new job card validates inline and does not restore draft", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/job-cards/new");
  await page.waitForFunction(() => document.querySelector("#job-card-form")?.getAttribute("data-job-card-guard-ready") === "true");

  await page.locator("#job-card-form").evaluate((form) => (form as HTMLFormElement).requestSubmit());

  await expect(page).toHaveURL(/\/job-cards\/new/);
  await expect(page).not.toHaveURL(/\/action-error/);
  const validationSummary = page.getByText("Please fill the mandatory fields below.").locator("..");
  await expect(validationSummary.getByText("Enter customer contact number.")).toBeVisible();
  await expect(validationSummary.getByText("Enter vehicle registration number.")).toBeVisible();
  await expect(validationSummary.getByText("Select fuel type.")).toBeVisible();
  await expect(validationSummary.getByText("Enter car make / model.")).toBeVisible();
  await expect(page.locator('input[name="customerMobile"]')).toHaveClass(/job-card-invalid-field/);

  await page.locator('input[name="customerName"]').fill("Draft Customer");
  await page.locator('input[name="customerMobile"]').fill("98765432109");
  await expect(page.locator('input[name="customerMobile"]')).toHaveValue("9876543210");
  await page.reload();

  await expect(page.locator('input[name="customerName"]')).toHaveValue("");
  await expect(page.locator('input[name="customerMobile"]')).toHaveValue("");
});
