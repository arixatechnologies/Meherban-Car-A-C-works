"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  EstimateStatus,
  InspectionStatus,
  InvoicePaymentStatus,
  ItemCategory,
  JobCardStatus,
  PaymentMode,
  Prisma,
  Priority,
  UserRole,
  WhatsAppMessageType,
} from "@/generated/prisma/client";
import {
  complaintOptions,
  customerVisibleStatuses,
  inspectionItemNames,
} from "@/lib/constants";
import { clearSessionCookie, requireUser, setSessionCookie, verifyLogin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveInspectionItemShortcut } from "@/lib/inspection-shortcuts";
import { normalizeMobile } from "@/lib/utils";
import { statusMessageTemplateFields } from "@/lib/status-message-templates";
import {
  invoiceGeneratedBody,
  sendEstimateApprovalReminderMessage,
  sendEstimateSharedMessage,
  sendInvoiceGeneratedMessage,
  sendJobCardCreatedMessage,
  sendPaymentReminderMessage,
  requestAppUrl,
  sendStatusUpdateMessage,
  sendVehicleDeliveredMessage,
  sendVehicleReadyMessage,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

export type AuthActionState = {
  message?: string;
};

export type PaymentActionState = {
  message?: string;
  fieldErrors?: {
    invoiceId?: string;
    amount?: string;
  };
  values?: {
    invoiceId?: string;
    amount?: string;
    mode?: string;
    paymentDate?: string;
    referenceNumber?: string;
    notes?: string;
  };
};

const maxLoginAttempts = 5;
const loginLockMs = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();
const expectedActionMessages = new Set([
  "Select an existing customer or enter new customer name and mobile number.",
  "Enter a valid 10 digit customer mobile number.",
  "Enter a valid 10 digit alternate mobile number.",
  "This customer mobile number already exists.",
  "Select an existing customer or enter customer mobile number.",
  "Enter customer contact number.",
  "Select an existing vehicle or enter vehicle number, car make/model, and fuel type.",
  "Select existing customer and vehicle, or enter new customer and vehicle details.",
  "This vehicle number already exists.",
  "Enter date in DD/MM/YYYY format.",
  "Delete linked estimates and invoices before deleting this job card.",
  "Delete linked invoices before deleting this estimate.",
  "Delete is blocked because payments are recorded for this invoice.",
  "Add at least one parts/materials or labour item.",
  "Select an invoice before recording payment.",
  "Payment amount must be greater than zero.",
  "Payment amount cannot be more than the invoice balance due.",
  "Enter customer mobile number and message before sending WhatsApp.",
  "Select a valid job card status.",
]);

function prismaErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

function prismaErrorTarget(error: unknown) {
  if (typeof error !== "object" || error === null || !("meta" in error)) return "";
  const meta = (error as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;
  if (Array.isArray(target)) return target.join(", ");
  if (typeof target === "string") return target;
  const causeTarget = (meta as { driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } } } | undefined)
    ?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(causeTarget)) return causeTarget.join(", ");
  return "";
}

function friendlyActionError(error: unknown) {
  const code = prismaErrorCode(error);
  const target = prismaErrorTarget(error);

  if (code === "P2002") {
    if (target.includes("mobile")) return "This customer mobile number already exists.";
    if (target.includes("vehicleNumber")) return "This vehicle number already exists.";
    if (target.includes("jobCardNumber")) return "This job card number already exists. Please try again.";
    if (target.includes("estimateNumber")) return "This estimate number already exists. Please try again.";
    if (target.includes("invoiceNumber")) return "This invoice number already exists. Please try again.";
    if (target.includes("email")) return "This email address already exists.";
    return "This record already exists. Please check duplicate details.";
  }

  if (code === "P2025") {
    return "The requested record was not found. It may have been deleted already.";
  }

  if (code === "P2022") {
    return "Database is not updated with the latest fields. Run prisma migrate deploy, then restart the app.";
  }

  if (error instanceof Error) {
    if (expectedActionMessages.has(error.message)) return error.message;
    if (error.message.includes("JobCardServiceObservation") && error.message.includes("category")) {
      return "Database is not updated with Job Card Parts/Labour field. Run prisma migrate deploy, then restart the app.";
    }
    if (error.message.includes("DATABASE_URL")) return "Database connection is not configured correctly.";
    if (error.message.includes("NEXTAUTH_SECRET") || error.message.includes("AUTH_SECRET")) {
      return "Login security secret is not configured correctly.";
    }
  }

  return "Something went wrong while saving. Please try again.";
}

async function currentPathFallback(fallbackPath: string) {
  const referer = (await headers()).get("referer");
  if (!referer) return fallbackPath;

  try {
    const url = new URL(referer);
    return `${url.pathname}${url.search}`;
  } catch {
    return fallbackPath;
  }
}

async function handleActionError(label: string, error: unknown, fallbackPath = "/") {
  unstable_rethrow(error);
  console.error(`[${label}]`, error);
  const params = new URLSearchParams({
    message: friendlyActionError(error),
    returnTo: await currentPathFallback(fallbackPath),
  });
  redirect(`/action-error?${params.toString()}`);
}

async function runAction<T>(label: string, fallbackPath: string, action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    return handleActionError(label, error, fallbackPath);
  }
}

function loginAttemptKey(email: string) {
  return email || "unknown";
}

function isLoginLocked(email: string) {
  const key = loginAttemptKey(email);
  const attempt = loginAttempts.get(key);
  if (!attempt?.lockedUntil) return false;
  if (attempt.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return false;
  }
  return true;
}

function recordFailedLogin(email: string) {
  const key = loginAttemptKey(email);
  const current = loginAttempts.get(key);
  const count = (current?.count ?? 0) + 1;
  loginAttempts.set(key, {
    count,
    lockedUntil: count >= maxLoginAttempts ? Date.now() + loginLockMs : undefined,
  });
}

function clearFailedLogins(email: string) {
  loginAttempts.delete(loginAttemptKey(email));
}

function loginSetupErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Server setup issue. Check Vercel environment variables.";
  }

  if (error.message.includes("DATABASE_URL")) {
    return "Server setup issue: DATABASE_URL is missing or invalid in Vercel.";
  }

  if (error.message.includes("NEXTAUTH_SECRET") || error.message.includes("AUTH_SECRET")) {
    return "Server setup issue: NEXTAUTH_SECRET must be set in Vercel Production.";
  }

  return "Server setup issue. Check Vercel function logs.";
}

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: string) {
  return value.trim() ? value.trim() : undefined;
}

function optionalInt(value: unknown) {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalDate(value: string) {
  return value ? new Date(value) : undefined;
}

function optionalDocumentDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.replaceAll("-", "/").replaceAll(".", "/");
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error("Enter date in DD/MM/YYYY format.");
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Enter date in DD/MM/YYYY format.");
  }

  return date;
}

function decimal(value: string) {
  const parsed = Number(value || "0");
  return Number.isFinite(parsed) ? new Prisma.Decimal(parsed) : new Prisma.Decimal(0);
}

function looseDecimal(value: string) {
  const match = value.replaceAll(",", "").match(/-?\d+(\.\d+)?/);
  return decimal(match?.[0] ?? "");
}

function strictDecimal(value: string) {
  const normalized = value.replaceAll(",", "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return new Prisma.Decimal(normalized);
}

function nonNegative(value: Prisma.Decimal) {
  return value.lessThan(0) ? new Prisma.Decimal(0) : value;
}

async function ensureCustomerMobileAvailable(mobile: string, currentCustomerId: string) {
  const existing = await prisma.customer.findUnique({
    where: { mobile },
    select: { id: true },
  });

  if (existing && existing.id !== currentCustomerId) {
    throw new Error("This customer mobile number already exists.");
  }
}

async function ensureVehicleNumberAvailable(vehicleNumber: string, currentVehicleId: string) {
  const existing = await prisma.vehicle.findUnique({
    where: { vehicleNumber },
    select: { id: true },
  });

  if (existing && existing.id !== currentVehicleId) {
    throw new Error("This vehicle number already exists.");
  }
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function paymentActionValues(formData: FormData): PaymentActionState["values"] {
  return {
    invoiceId: str(formData, "invoiceId"),
    amount: str(formData, "amount"),
    mode: str(formData, "mode"),
    paymentDate: str(formData, "paymentDate"),
    referenceNumber: str(formData, "referenceNumber"),
    notes: str(formData, "notes"),
  };
}

function paymentFieldErrors(message: string): PaymentActionState["fieldErrors"] {
  if (message.includes("invoice")) return { invoiceId: message };
  if (message.includes("Payment amount")) return { amount: message };
  return undefined;
}

function selectedArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .filter(Boolean);
}

function parseInspectionItems(formData: FormData) {
  const names = formData.getAll("inspectionName");
  const statuses = formData.getAll("inspectionStatus");
  const remarks = formData.getAll("inspectionRemarks");

  return names
    .map((name, index) => {
      const status = typeof statuses[index] === "string" ? statuses[index] : "";
      return {
        name: typeof name === "string" ? name.trim() : "",
        status: ["OK", "ATTENTION", "NOT_OK"].includes(status)
          ? (status as InspectionStatus)
          : InspectionStatus.OK,
        remarks: optional(typeof remarks[index] === "string" ? remarks[index] : ""),
      };
    })
    .filter((item) => item.name);
}

function parseJobCardServiceObservations(formData: FormData) {
  const categories = formData.getAll("observationCategory");
  const partServices = formData.getAll("observationPartService");
  const descriptions = formData.getAll("observationDescription");
  const quantities = formData.getAll("observationQuantity");
  const unitPrices = formData.getAll("observationUnitPrice");
  const amounts = formData.getAll("observationAmount");

  return partServices
    .map((partService, index) => {
      const partServiceText = typeof partService === "string" ? partService.trim() : "";
      const resolvedPartService = resolveInspectionItemShortcut(partServiceText).trim();
      const description = typeof descriptions[index] === "string" ? descriptions[index].trim() : "";
      const quantity = looseDecimal(typeof quantities[index] === "string" ? quantities[index] : "");
      const unitPrice = decimal(typeof unitPrices[index] === "string" ? unitPrices[index] : "");
      const enteredAmount = decimal(typeof amounts[index] === "string" ? amounts[index] : "");
      const amount = enteredAmount.greaterThan(0) ? enteredAmount : quantity.mul(unitPrice);

      return {
        sortOrder: index + 1,
        partService: resolvedPartService || description,
        description: optional(description),
        category:
          typeof categories[index] === "string" && categories[index] === ItemCategory.LABOUR
            ? ItemCategory.LABOUR
            : ItemCategory.PARTS,
        quantity,
        unitPrice,
        amount,
      };
    })
    .filter((item) => item.partService);
}

async function getSettingPrefixes() {
  const setting =
    (await prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } })) ??
    (await prisma.workshopSetting.create({ data: {} }));

  return {
    jobCardPrefix: setting.jobCardPrefix,
    estimatePrefix: setting.estimatePrefix,
    invoicePrefix: setting.invoicePrefix,
  };
}

async function nextJobCardNumber() {
  const { jobCardPrefix } = await getSettingPrefixes();
  const year = new Date().getFullYear();
  const prefix = `${jobCardPrefix}-${year}-`;
  const latestJobCard = await prisma.jobCard.findFirst({
    where: { jobCardNumber: { startsWith: prefix } },
    orderBy: { jobCardNumber: "desc" },
    select: { jobCardNumber: true },
  });
  const latestSequence = latestJobCard?.jobCardNumber.match(/(\d+)$/)?.[1];
  const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

function documentNumberFromJobCard(jobCardNumber: string, prefix: string) {
  const parts = jobCardNumber.split("-");
  const sequence = parts.at(-1) || "0001";
  const year = parts.at(-2) || String(new Date().getFullYear());
  return `${prefix}-${year}-${sequence}`;
}

async function estimateNumberForJobCard(jobCardNumber: string) {
  const { estimatePrefix } = await getSettingPrefixes();
  return documentNumberFromJobCard(jobCardNumber, estimatePrefix);
}

async function invoiceNumberForJobCard(jobCardNumber: string) {
  const { invoicePrefix } = await getSettingPrefixes();
  return documentNumberFromJobCard(jobCardNumber, invoicePrefix);
}

async function availableEstimateNumber(preferredNumber: string, excludeId: string) {
  const existing = await prisma.estimate.findUnique({
    where: { estimateNumber: preferredNumber },
    select: { id: true },
  });

  if (!existing || existing.id === excludeId) return preferredNumber;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${preferredNumber}-${String(index).padStart(2, "0")}`;
    const candidateExisting = await prisma.estimate.findUnique({
      where: { estimateNumber: candidate },
      select: { id: true },
    });
    if (!candidateExisting || candidateExisting.id === excludeId) return candidate;
  }

  return `${preferredNumber}-${Date.now()}`;
}

async function availableInvoiceNumber(preferredNumber: string, excludeId: string) {
  const existing = await prisma.invoice.findUnique({
    where: { invoiceNumber: preferredNumber },
    select: { id: true },
  });

  if (!existing || existing.id === excludeId) return preferredNumber;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${preferredNumber}-${String(index).padStart(2, "0")}`;
    const candidateExisting = await prisma.invoice.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });
    if (!candidateExisting || candidateExisting.id === excludeId) return candidate;
  }

  return `${preferredNumber}-${Date.now()}`;
}

async function moveEstimateToOwnAvailableNumber(id: string, jobCardId: string) {
  const legacyJobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    select: { jobCardNumber: true },
  });
  const preferredNumber = await estimateNumberForJobCard(legacyJobCard.jobCardNumber);
  const availableNumber = await availableEstimateNumber(preferredNumber, id);

  await prisma.estimate.update({
    where: { id },
    data: { estimateNumber: availableNumber },
  });
}

async function moveInvoiceToOwnAvailableNumber(id: string, jobCardId: string) {
  const legacyJobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    select: { jobCardNumber: true },
  });
  const preferredNumber = await invoiceNumberForJobCard(legacyJobCard.jobCardNumber);
  const availableNumber = await availableInvoiceNumber(preferredNumber, id);

  await prisma.invoice.update({
    where: { id },
    data: { invoiceNumber: availableNumber },
  });
}

function randomTrackingToken() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "").slice(0, 8);
}

async function jobCardMessageContext(jobCardId: string) {
  const baseUrl = await requestAppUrl();
  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    include: {
      customer: true,
      vehicle: true,
      estimates: { orderBy: { createdAt: "desc" }, take: 1 },
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const latestEstimate = jobCard.estimates[0];
  const latestInvoice = jobCard.invoices[0];
  const problemSummary =
    jobCard.problemFound ||
    jobCard.customComplaint ||
    jobCard.complaints.join(", ") ||
    undefined;

  return {
    customerId: jobCard.customerId,
    jobCardId: jobCard.id,
    estimateId: latestEstimate?.id,
    invoiceId: latestInvoice?.id,
    customerName: jobCard.customer.name,
    mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
    vehicleNumber: jobCard.vehicle.vehicleNumber,
    jobCardNumber: jobCard.jobCardNumber,
    estimateNumber: latestEstimate?.estimateNumber,
    invoiceNumber: latestInvoice?.invoiceNumber,
    totalAmount: latestInvoice?.totalAmount ?? latestEstimate?.totalAmount ?? jobCard.estimatedTotalAmount,
    paidAmount: latestInvoice?.paidAmount ?? jobCard.advanceAmount,
    balanceAmount: latestInvoice?.balanceAmount ?? latestEstimate?.balanceAmount ?? jobCard.balanceDue,
    amount: latestInvoice?.balanceAmount ?? latestEstimate?.balanceAmount ?? jobCard.balanceDue,
    trackingToken: jobCard.trackingToken,
    problemSummary,
    issueName: problemSummary,
    baseUrl,
  };
}

function parseStatusMessageTemplates(formData: FormData) {
  return Object.fromEntries(
    statusMessageTemplateFields.map((template) => [
      template.status,
      str(formData, `statusMessageTemplate-${template.status}`) || template.defaultTemplate,
    ]),
  ) as Prisma.InputJsonObject;
}

async function estimateMessageContext(estimateId: string) {
  const baseUrl = await requestAppUrl();
  const estimate = await prisma.estimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
    },
  });

  return {
    customerId: estimate.customerId,
    jobCardId: estimate.jobCardId,
    estimateId: estimate.id,
    customerName: estimate.customer.name,
    mobileNumber: estimate.customer.whatsapp || estimate.customer.mobile,
    vehicleNumber: estimate.vehicle.vehicleNumber,
    jobCardNumber: estimate.jobCard.jobCardNumber,
    estimateNumber: estimate.estimateNumber,
    totalAmount: estimate.totalAmount,
    balanceAmount: estimate.balanceAmount,
    trackingToken: estimate.jobCard.trackingToken,
    baseUrl,
  };
}

async function invoiceMessageContext(invoiceId: string) {
  const baseUrl = await requestAppUrl();
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
    },
  });

  return {
    customerId: invoice.customerId,
    jobCardId: invoice.jobCardId,
    invoiceId: invoice.id,
    customerName: invoice.customer.name,
    mobileNumber: invoice.customer.whatsapp || invoice.customer.mobile,
    vehicleNumber: invoice.vehicle.vehicleNumber,
    jobCardNumber: invoice.jobCard.jobCardNumber,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    trackingToken: invoice.jobCard.trackingToken,
    baseUrl,
  };
}

function parseLineItems(formData: FormData) {
  const partServices = formData.getAll("itemPartService");
  const descriptions = formData.getAll("itemDescription");
  const remarks = formData.getAll("itemRemarks");
  const categories = formData.getAll("itemCategory");
  const quantities = formData.getAll("itemQuantity");
  const unitPrices = formData.getAll("itemUnitPrice");
  const amounts = formData.getAll("itemAmount");

  return descriptions
    .map((description, index) => {
      const partServiceText = typeof partServices[index] === "string" ? partServices[index].trim() : "";
      const partService = resolveInspectionItemShortcut(partServiceText).trim();
      const lineDescription = typeof description === "string" ? description.trim() : "";
      const quantityText = typeof quantities[index] === "string" ? quantities[index] : "0";
      const unitPriceText = typeof unitPrices[index] === "string" ? unitPrices[index] : "0";
      const amountText = typeof amounts[index] === "string" ? amounts[index].trim() : "";
      const quantity = looseDecimal(quantityText);
      const unitPrice = decimal(unitPriceText);
      const enteredAmount = amountText ? decimal(amountText) : null;
      const strictQuantity = strictDecimal(quantityText);
      const strictUnitPrice = strictDecimal(unitPriceText);
      const calculatedAmount =
        strictQuantity && strictUnitPrice ? strictQuantity.mul(strictUnitPrice) : unitPrice;

      return {
        partService: optional(partService || lineDescription),
        description: lineDescription || partService,
        remarks: typeof remarks[index] === "string" ? optional(remarks[index]) : undefined,
        category:
          typeof categories[index] === "string"
            ? (categories[index] as ItemCategory)
            : ItemCategory.SERVICE,
        quantity,
        unitPrice,
        amount: enteredAmount ?? calculatedAmount,
      };
    })
    .filter((item) => item.partService || item.description);
}

function paymentStatusFor(total: Prisma.Decimal, paid: Prisma.Decimal) {
  if (paid.greaterThanOrEqualTo(total) && total.greaterThan(0)) return InvoicePaymentStatus.PAID;
  if (paid.greaterThan(0)) return InvoicePaymentStatus.PARTIALLY_PAID;
  return InvoicePaymentStatus.UNPAID;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");

  if (!email || !password) {
    return { message: "User name and password are required." };
  }

  if (isLoginLocked(email)) {
    return { message: "Too many login attempts. Try again after 15 minutes." };
  }

  if (password.length > 128) {
    recordFailedLogin(email);
    return { message: "Invalid user name or password." };
  }

  let user;
  try {
    user = await verifyLogin(email, password);
  } catch (error) {
    console.error("[loginAction] Login verification failed", error);
    return { message: loginSetupErrorMessage(error) };
  }

  if (!user) {
    recordFailedLogin(email);
    return { message: "Invalid user name or password." };
  }

  clearFailedLogins(email);
  try {
    await setSessionCookie(user);
  } catch (error) {
    console.error("[loginAction] Session creation failed", error);
    return { message: loginSetupErrorMessage(error) };
  }

  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function saveJobCard(id: string | null, formData: FormData) {
  return runAction("saveJobCard", id ? `/job-cards/${id}/edit` : "/job-cards/new", async () => {
  const session = await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.TECHNICIAN]);
  const complaints = selectedArray(formData, "complaints").filter((value) =>
    complaintOptions.includes(value as (typeof complaintOptions)[number]),
  );
  const status = (str(formData, "status") || "VEHICLE_RECEIVED") as JobCardStatus;
  const jobCardDate = optionalDocumentDate(str(formData, "jobCardDate"));
  const deliveryDate = str(formData, "expectedDeliveryAt") || str(formData, "expectedDeliveryDate");
  let customerId = str(formData, "customerId");
  let vehicleId = str(formData, "vehicleId");
  const serviceObservations = parseJobCardServiceObservations(formData);
  const observationsTotal = serviceObservations.reduce(
    (sum, item) => sum.add(item.amount),
    new Prisma.Decimal(0),
  );
  const submittedTotalAmount = decimal(str(formData, "estimatedTotalAmount"));
  const estimatedTotalAmount = serviceObservations.length
    ? observationsTotal
    : submittedTotalAmount;
  const advanceAmount = decimal(str(formData, "advanceAmount"));
  const balanceDue = nonNegative(estimatedTotalAmount.sub(advanceAmount));
  const paymentModeValue = str(formData, "jobCardPaymentMode");
  const paymentMode = Object.values(PaymentMode).includes(paymentModeValue as PaymentMode)
    ? (paymentModeValue as PaymentMode)
    : undefined;
  const customerName = str(formData, "customerName");
  const customerMobile = normalizeMobile(str(formData, "customerMobile"));
  const customerWhatsapp = normalizeMobile(str(formData, "customerWhatsapp"));
  const customerEmail = str(formData, "customerEmail");
  const customerAddress = str(formData, "customerAddress");
  const customerCity = str(formData, "customerCity");
  const hasCustomerDetails = Boolean(
    customerName || customerMobile || customerWhatsapp || customerEmail || customerAddress || customerCity,
  );
  const vehicleNumber = str(formData, "newVehicleNumber").toUpperCase().replace(/\s/g, "");
  const makeModel = str(formData, "newVehicleMakeModel");
  let brand = str(formData, "newVehicleBrand");
  let model = str(formData, "newVehicleModel");
  const fuelType = str(formData, "newVehicleFuelType");
  const vehicleVariant = str(formData, "newVehicleVariant");
  const vehicleYear = str(formData, "newVehicleYear");
  const vehicleOdometer = str(formData, "newVehicleOdometer");
  const vehicleChassisNumber = str(formData, "newVehicleChassisNumber");
  const vehicleEngineNumber = str(formData, "newVehicleEngineNumber");
  const vehicleNotes = str(formData, "newVehicleNotes");
  const hasVehicleDetails = Boolean(
    vehicleNumber ||
      makeModel ||
      brand ||
      model ||
      fuelType ||
      vehicleVariant ||
      vehicleYear ||
      vehicleOdometer ||
      vehicleChassisNumber ||
      vehicleEngineNumber ||
      vehicleNotes,
  );

  if ((!brand || !model) && makeModel) {
    const [firstPart, ...remainingParts] = makeModel.split(/\s+/);
    brand = brand || firstPart || makeModel;
    model = model || remainingParts.join(" ");
  }

  if (!id && hasCustomerDetails) {
    customerId = "";
    if (!hasVehicleDetails) {
      vehicleId = "";
    }
  }

  if (!id && hasVehicleDetails) {
    vehicleId = "";
  }

  if (vehicleId && !customerId) {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    customerId = vehicle.customerId;
  }

  if (!customerId) {
    if (!customerMobile) {
      throw new Error("Select an existing customer or enter customer mobile number.");
    }

    if (customerMobile.length !== 10) {
      throw new Error("Enter a valid 10 digit customer mobile number.");
    }

    if (customerWhatsapp && customerWhatsapp.length !== 10) {
      throw new Error("Enter a valid 10 digit alternate mobile number.");
    }

    const fallbackCustomerName = customerName || `Customer ${customerMobile}`;
    const customerData = {
      name: fallbackCustomerName,
      mobile: customerMobile,
      whatsapp: optional(customerWhatsapp),
      email: optional(customerEmail),
      address: optional(customerAddress),
      city: optional(customerCity),
    };
    const customer =
      (await prisma.customer.findUnique({ where: { mobile: customerMobile } })) ??
      (await prisma.customer.create({ data: customerData }));

    if (customer.id && customer.mobile === customerMobile) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName || customer.name,
          whatsapp: customerData.whatsapp,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
        },
      });
    }

    customerId = customer.id;
  } else if (hasCustomerDetails) {
    if (!customerMobile) {
      throw new Error("Enter customer contact number.");
    }

    if (customerMobile.length !== 10) {
      throw new Error("Enter a valid 10 digit customer mobile number.");
    }

    if (customerWhatsapp && customerWhatsapp.length !== 10) {
      throw new Error("Enter a valid 10 digit alternate mobile number.");
    }

    await ensureCustomerMobileAvailable(customerMobile, customerId);

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(customerName ? { name: customerName } : {}),
        mobile: customerMobile,
        whatsapp: optional(customerWhatsapp),
        email: optional(customerEmail),
        address: optional(customerAddress),
        city: optional(customerCity),
      },
    });
  }

  if (!vehicleId) {
    if (!customerId || !vehicleNumber || !brand || !fuelType) {
      throw new Error("Select an existing vehicle or enter vehicle number, car make/model, and fuel type.");
    }

    const vehicleData = {
      customerId,
      vehicleNumber,
      brand,
      model,
      fuelType,
      variant: optional(vehicleVariant),
      year: optionalInt(vehicleYear),
      odometerReading: optionalInt(vehicleOdometer),
      chassisNumber: optional(vehicleChassisNumber),
      engineNumber: optional(vehicleEngineNumber),
      notes: optional(vehicleNotes),
    };
    const vehicle =
      (await prisma.vehicle.findUnique({ where: { vehicleNumber } })) ??
      (await prisma.vehicle.create({ data: vehicleData }));

    if (vehicle.id && vehicle.vehicleNumber === vehicleNumber) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          brand,
          model,
          fuelType,
          variant: vehicleData.variant,
          year: vehicleData.year,
          odometerReading: vehicleData.odometerReading,
          chassisNumber: vehicleData.chassisNumber,
          engineNumber: vehicleData.engineNumber,
          notes: vehicleData.notes,
        },
      });
    }

    vehicleId = vehicle.id;
    customerId = vehicle.customerId;
  } else if (hasVehicleDetails) {
    if (!vehicleNumber || !brand || !fuelType) {
      throw new Error("Select an existing vehicle or enter vehicle number, car make/model, and fuel type.");
    }

    await ensureVehicleNumberAvailable(vehicleNumber, vehicleId);

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        vehicleNumber,
        brand,
        model,
        fuelType,
        variant: optional(vehicleVariant),
        year: optionalInt(vehicleYear),
        odometerReading: optionalInt(vehicleOdometer),
        chassisNumber: optional(vehicleChassisNumber),
        engineNumber: optional(vehicleEngineNumber),
        notes: optional(vehicleNotes),
      },
    });
  }

  if (!customerId || !vehicleId) {
    throw new Error("Select existing customer and vehicle, or enter new customer and vehicle details.");
  }

  const data = {
    customerId,
    vehicleId,
    dateTime: jobCardDate ?? new Date(),
    serviceAdvisorId: session.id,
    serviceAdvisorName: optional(str(formData, "serviceAdvisorName")) || "Meharban",
    assignedTechnicianId: optional(str(formData, "assignedTechnicianId")),
    technicianName: optional(str(formData, "technicianName")),
    bayNumber: optional(str(formData, "bayNumber")),
    expectedDeliveryAt: optionalDate(deliveryDate),
    priority: (str(formData, "priority") || "NORMAL") as Priority,
    complaints,
    customComplaint: optional(str(formData, "customComplaint")),
    problemFound: optional(str(formData, "problemFound")),
    workSuggested: null,
    partsRequired: null,
    serviceRecommendation: optional(str(formData, "serviceRecommendation")),
    internalNotes: optional(str(formData, "internalNotes")),
    finalQcBy: optional(str(formData, "finalQcBy")),
    estimatedTotalAmount,
    advanceAmount,
    balanceDue,
    paymentMode,
    status,
  };

  const inspectionEntries = parseInspectionItems(formData);

  if (id) {
    const old = await prisma.jobCard.findUniqueOrThrow({ where: { id } });
    await prisma.jobCard.update({
      where: { id },
      data: {
        ...data,
        inspectionItems: {
          deleteMany: {},
          create: inspectionEntries.length ? inspectionEntries : inspectionItemNames.map((name) => ({ name })),
        },
        serviceObservations: {
          deleteMany: {},
          create: serviceObservations,
        },
      },
    });

    if (old.status !== status) {
      await prisma.jobCardStatusLog.create({
        data: {
          jobCardId: id,
          oldStatus: old.status,
          newStatus: status,
          updatedById: session.id,
          remarks: "Status changed while editing job card.",
        },
      });
    }

    revalidatePath(`/job-cards/${id}`);
    redirect(`/job-cards/${id}`);
  }

  const jobCard = await prisma.jobCard.create({
    data: {
      ...data,
      jobCardNumber: await nextJobCardNumber(),
      trackingToken: randomTrackingToken(),
      inspectionItems: {
        create: inspectionEntries.length ? inspectionEntries : inspectionItemNames.map((name) => ({ name })),
      },
      serviceObservations: serviceObservations.length ? { create: serviceObservations } : undefined,
      statusLogs: {
        create: {
          newStatus: JobCardStatus.VEHICLE_RECEIVED,
          updatedById: session.id,
          remarks: "Vehicle received and job card opened.",
        },
      },
    },
  });

  const setting = await prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } });
  if (setting?.autoSendJobCardMessage) {
    await sendJobCardCreatedMessage(await jobCardMessageContext(jobCard.id));
  }

  revalidatePath("/job-cards");
  redirect(`/job-cards/${jobCard.id}`);
  });
}

export async function deleteJobCard(id: string) {
  return runAction("deleteJobCard", `/job-cards/${id}`, async () => {
  await requireUser([UserRole.ADMIN]);
  const jobCard = await prisma.jobCard.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          estimates: true,
          invoices: true,
        },
      },
    },
  });

  if (!jobCard) {
    redirect("/job-cards");
  }

  if (jobCard._count.estimates > 0 || jobCard._count.invoices > 0) {
    throw new Error("Delete linked estimates and invoices before deleting this job card.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.jobCard.delete({ where: { id } });

    const vehicle = await tx.vehicle.findUnique({
      where: { id: jobCard.vehicleId },
      include: {
        _count: {
          select: {
            jobCards: true,
            estimates: true,
            invoices: true,
          },
        },
      },
    });

    if (
      vehicle &&
      vehicle._count.jobCards === 0 &&
      vehicle._count.estimates === 0 &&
      vehicle._count.invoices === 0
    ) {
      await tx.vehicle.delete({ where: { id: vehicle.id } });
    }

    const customer = await tx.customer.findUnique({
      where: { id: jobCard.customerId },
      include: {
        _count: {
          select: {
            vehicles: true,
            jobCards: true,
            estimates: true,
            invoices: true,
            payments: true,
          },
        },
      },
    });

    if (
      customer &&
      customer._count.vehicles === 0 &&
      customer._count.jobCards === 0 &&
      customer._count.estimates === 0 &&
      customer._count.invoices === 0 &&
      customer._count.payments === 0
    ) {
      await tx.customer.delete({ where: { id: customer.id } });
    }
  });

  revalidatePath("/");
  revalidatePath("/job-cards");
  revalidatePath("/job-cards/new");
  redirect("/job-cards");
  });
}

export async function updateJobCardStatus(jobCardId: string, formData: FormData) {
  return runAction("updateJobCardStatus", `/job-cards/${jobCardId}`, async () => {
  const session = await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.TECHNICIAN]);
  const newStatus = str(formData, "newStatus") as JobCardStatus;
  const remarks = optional(str(formData, "remarks"));
  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    include: { customer: true, vehicle: true },
  });

  await prisma.jobCard.update({
    where: { id: jobCardId },
    data: {
      status: newStatus,
      deliveredAt: newStatus === JobCardStatus.DELIVERED ? new Date() : undefined,
    },
  });

  await prisma.jobCardStatusLog.create({
    data: {
      jobCardId,
      oldStatus: jobCard.status,
      newStatus,
      updatedById: session.id,
      remarks,
    },
  });

  if (customerVisibleStatuses.has(newStatus)) {
    await sendStatusUpdateMessage(await jobCardMessageContext(jobCardId), newStatus);
  }

  revalidatePath(`/job-cards/${jobCardId}`);
  redirect(`/job-cards/${jobCardId}`);
  });
}

export async function sendJobCardStatusMessage(jobCardId: string, formData: FormData) {
  return runAction("sendJobCardStatusMessage", "/", async () => {
  const session = await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.TECHNICIAN, UserRole.BILLING_STAFF]);
  const newStatus = str(formData, "newStatus") as JobCardStatus;
  const returnTo = str(formData, "returnTo");
  const redirectTo = returnTo.startsWith("/") ? returnTo : "/";

  if (!Object.values(JobCardStatus).includes(newStatus)) {
    throw new Error("Select a valid job card status.");
  }

  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    select: { status: true },
  });

  await prisma.jobCard.update({
    where: { id: jobCardId },
    data: {
      status: newStatus,
      deliveredAt: newStatus === JobCardStatus.DELIVERED ? new Date() : undefined,
    },
  });

  if (jobCard.status !== newStatus) {
    await prisma.jobCardStatusLog.create({
      data: {
        jobCardId,
        oldStatus: jobCard.status,
        newStatus,
        updatedById: session.id,
        remarks: "WhatsApp status message sent from Home.",
      },
    });
  }

  await sendStatusUpdateMessage(await jobCardMessageContext(jobCardId), newStatus);

  revalidatePath("/");
  revalidatePath(`/job-cards/${jobCardId}`);
  revalidatePath("/settings/whatsapp-logs");
  redirect(redirectTo);
  });
}

export async function saveInspection(jobCardId: string, formData: FormData) {
  return runAction("saveInspection", `/job-cards/${jobCardId}`, async () => {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.TECHNICIAN]);
  const items = await prisma.jobCardInspectionItem.findMany({ where: { jobCardId } });

  for (const item of items) {
    await prisma.jobCardInspectionItem.update({
      where: { id: item.id },
      data: {
        status: str(formData, `status-${item.id}`) as InspectionStatus,
        remarks: optional(str(formData, `remarks-${item.id}`)),
      },
    });
  }

  revalidatePath(`/job-cards/${jobCardId}`);
  redirect(`/job-cards/${jobCardId}`);
  });
}

export async function saveEstimate(id: string | null, formData: FormData) {
  return runAction("saveEstimate", id ? `/estimates/${id}/edit` : "/estimates/new", async () => {
  const session = await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR]);
  const jobCardId = str(formData, "jobCardId");
  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    include: { customer: true, vehicle: true },
  });
  const items = parseLineItems(formData);
  if (items.length === 0) {
    throw new Error("Add at least one parts/materials or labour item.");
  }

  const subtotal = items.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
  const discount = decimal(str(formData, "discount"));
  const advanceReceived = decimal(str(formData, "advanceReceived"));
  const totalAmount = nonNegative(subtotal.sub(discount));
  const balanceAmount = nonNegative(totalAmount.sub(advanceReceived));
  const status = (str(formData, "status") || "DRAFT") as EstimateStatus;
  const estimateDate = optionalDocumentDate(str(formData, "estimateDate"));
  const problemSummary =
    optional(str(formData, "problemSummary")) ||
    [...jobCard.complaints, jobCard.customComplaint].filter(Boolean).join(", ") ||
    "Estimation prepared from job card.";

  const data = {
    jobCardId,
    customerId: jobCard.customerId,
    vehicleId: jobCard.vehicleId,
    date: estimateDate,
    validTill: optionalDate(str(formData, "validTill")),
    serviceAdvisorId: session.id,
    problemSummary,
    discount,
    totalAmount,
    advanceReceived,
    balanceAmount,
    status,
  };

  if (id) {
    await prisma.estimate.update({
      where: { id },
      data: {
        ...data,
        items: {
          deleteMany: {},
          create: items,
        },
      },
    });

    revalidatePath("/");
    revalidatePath(`/estimates/${id}`);
    revalidatePath(`/job-cards/${jobCardId}`);
    redirect(`/estimates/${id}`);
  }

  const estimateNumber = await estimateNumberForJobCard(jobCard.jobCardNumber);
  const existingEstimate = await prisma.estimate.findUnique({
    where: { estimateNumber },
    select: { id: true, jobCardId: true, status: true },
  });

  if (existingEstimate) {
    if (existingEstimate.jobCardId !== jobCardId) {
      await moveEstimateToOwnAvailableNumber(existingEstimate.id, existingEstimate.jobCardId);
    } else {
      await prisma.estimate.update({
        where: { id: existingEstimate.id },
        data: {
          ...data,
          items: {
            deleteMany: {},
            create: items,
          },
        },
      });

      if (status === EstimateStatus.SHARED) {
        await prisma.jobCard.update({
          where: { id: jobCardId },
          data: { status: JobCardStatus.ESTIMATE_SHARED },
        });
      }

      const setting = await prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } });
      if (
        setting?.autoSendEstimateMessage &&
        status === EstimateStatus.SHARED &&
        existingEstimate.status !== EstimateStatus.SHARED
      ) {
        await sendEstimateSharedMessage(await estimateMessageContext(existingEstimate.id));
      }

      revalidatePath("/");
      revalidatePath("/estimates");
      revalidatePath(`/estimates/${existingEstimate.id}`);
      revalidatePath(`/job-cards/${jobCardId}`);
      redirect(`/estimates/${existingEstimate.id}`);
    }
  }

  const estimate = await prisma.estimate.create({
    data: {
      ...data,
      estimateNumber,
      items: { create: items },
    },
  });

  if (status === EstimateStatus.SHARED) {
    await prisma.jobCard.update({
      where: { id: jobCardId },
      data: { status: JobCardStatus.ESTIMATE_SHARED },
    });
  }

  const setting = await prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } });
  if (setting?.autoSendEstimateMessage && status === EstimateStatus.SHARED) {
    await sendEstimateSharedMessage(await estimateMessageContext(estimate.id));
  }

  revalidatePath("/");
  revalidatePath("/estimates");
  revalidatePath(`/job-cards/${jobCardId}`);
  redirect(`/estimates/${estimate.id}`);
  });
}

export async function deleteEstimate(id: string) {
  return runAction("deleteEstimate", `/estimates/${id}`, async () => {
  await requireUser([UserRole.ADMIN]);
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          invoices: true,
        },
      },
    },
  });

  if (!estimate) {
    redirect("/estimates");
  }

  if (estimate._count.invoices > 0) {
    throw new Error("Delete linked invoices before deleting this estimate.");
  }

  await prisma.estimate.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/estimates");
  revalidatePath(`/job-cards/${estimate.jobCardId}`);
  redirect("/estimates");
  });
}

export async function updateEstimateStatus(id: string, status: EstimateStatus) {
  return runAction("updateEstimateStatus", `/estimates/${id}`, async () => {
  const session = await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR]);
  const estimate = await prisma.estimate.update({
    where: { id },
    data: { status },
  });

  if (status === EstimateStatus.SHARED) {
    await prisma.jobCard.update({
      where: { id: estimate.jobCardId },
      data: { status: JobCardStatus.ESTIMATE_SHARED },
    });
    await sendEstimateSharedMessage(await estimateMessageContext(id));
  }

  if (status === EstimateStatus.APPROVED) {
    const oldJobCard = await prisma.jobCard.findUniqueOrThrow({ where: { id: estimate.jobCardId } });
    await prisma.jobCard.update({
      where: { id: estimate.jobCardId },
      data: { status: JobCardStatus.CUSTOMER_APPROVED },
    });
    await prisma.jobCardStatusLog.create({
      data: {
        jobCardId: estimate.jobCardId,
        oldStatus: oldJobCard.status,
        newStatus: JobCardStatus.CUSTOMER_APPROVED,
        updatedById: session.id,
        remarks: "Customer approved estimate.",
      },
    });
  }

  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
  });
}

export async function sendEstimateReminder(id: string) {
  return runAction("sendEstimateReminder", `/estimates/${id}`, async () => {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR]);
  await sendEstimateApprovalReminderMessage(await estimateMessageContext(id));
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
  });
}

export async function saveInvoice(id: string | null, formData: FormData) {
  return runAction("saveInvoice", id ? `/invoices/${id}/edit` : "/invoices/new", async () => {
  const session = await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  const estimateId = optional(str(formData, "estimateId"));
  const estimate = estimateId
    ? await prisma.estimate.findUnique({
        where: { id: estimateId },
        include: { items: true },
      })
    : null;
  const jobCardId = str(formData, "jobCardId") || estimate?.jobCardId || "";
  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    include: { customer: true, vehicle: true },
  });
  const parsedItems = parseLineItems(formData);
  const items =
    parsedItems.length > 0
      ? parsedItems
      : estimate?.items.map((item) => ({
          partService: item.partService || item.description,
          description: item.description,
          remarks: item.remarks,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })) ?? [];
  if (items.length === 0) {
    throw new Error("Add at least one parts/materials or labour item.");
  }

  const subtotal = items.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
  const discount = decimal(str(formData, "discount"));
  const paidAmount = decimal(str(formData, "paidAmount"));
  const totalAmount = nonNegative(subtotal.sub(discount));
  const balanceAmount = nonNegative(totalAmount.sub(paidAmount));
  const invoiceDate = optionalDocumentDate(str(formData, "invoiceDate"));

  const data = {
    jobCardId,
    estimateId,
    customerId: jobCard.customerId,
    vehicleId: jobCard.vehicleId,
    invoiceDate,
    serviceAdvisorId: session.id,
    discount,
    totalAmount,
    paidAmount,
    balanceAmount,
    paymentStatus: paymentStatusFor(totalAmount, paidAmount),
    deliveryStatus: str(formData, "deliveryStatus") || "Pending",
    notes: optional(str(formData, "notes")),
  };

  if (id) {
    await prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        items: {
          deleteMany: {},
          create: items,
        },
      },
    });
    revalidatePath("/");
    revalidatePath(`/invoices/${id}`);
    revalidatePath(`/job-cards/${jobCardId}`);
    if (estimateId) revalidatePath(`/estimates/${estimateId}`);
    redirect(`/invoices/${id}`);
  }

  const invoiceNumber = await invoiceNumberForJobCard(jobCard.jobCardNumber);
  const existingInvoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
    select: { id: true, jobCardId: true },
  });

  if (existingInvoice) {
    if (existingInvoice.jobCardId !== jobCardId) {
      await moveInvoiceToOwnAvailableNumber(existingInvoice.id, existingInvoice.jobCardId);
    } else {
      await prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          ...data,
          items: {
            deleteMany: {},
            create: items,
          },
        },
      });

      await prisma.jobCard.update({
        where: { id: jobCardId },
        data: {
          status:
            balanceAmount.greaterThan(0) ? JobCardStatus.PAYMENT_PENDING : JobCardStatus.INVOICE_GENERATED,
        },
      });

      if (estimateId) {
        await prisma.estimate.update({
          where: { id: estimateId },
          data: { status: EstimateStatus.CONVERTED_TO_INVOICE },
        });
      }

      revalidatePath("/");
      revalidatePath("/invoices");
      revalidatePath(`/invoices/${existingInvoice.id}`);
      revalidatePath(`/job-cards/${jobCardId}`);
      if (estimateId) revalidatePath(`/estimates/${estimateId}`);
      redirect(`/invoices/${existingInvoice.id}`);
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      ...data,
      invoiceNumber,
      items: { create: items },
    },
  });

  await prisma.jobCard.update({
    where: { id: jobCardId },
    data: {
      status:
        balanceAmount.greaterThan(0) ? JobCardStatus.PAYMENT_PENDING : JobCardStatus.INVOICE_GENERATED,
    },
  });

  if (estimateId) {
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { status: EstimateStatus.CONVERTED_TO_INVOICE },
    });
  }

  const setting = await prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } });
  if (setting?.autoSendInvoiceMessage) {
    await sendInvoiceGeneratedMessage(await invoiceMessageContext(invoice.id));
  }

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath(`/job-cards/${jobCardId}`);
  if (estimateId) revalidatePath(`/estimates/${estimateId}`);
  redirect(`/invoices/${invoice.id}`);
  });
}

export async function deleteInvoice(id: string) {
  return runAction("deleteInvoice", `/invoices/${id}`, async () => {
  await requireUser([UserRole.ADMIN]);
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          payments: true,
        },
      },
    },
  });

  if (!invoice) {
    redirect("/invoices");
  }

  if (invoice._count.payments > 0) {
    throw new Error("Delete is blocked because payments are recorded for this invoice.");
  }

  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath(`/job-cards/${invoice.jobCardId}`);
  if (invoice.estimateId) revalidatePath(`/estimates/${invoice.estimateId}`);
  redirect("/invoices");
  });
}

async function recordPaymentMutation(formData: FormData) {
  const session = await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF]);
  const invoiceId = str(formData, "invoiceId");
  if (!invoiceId) {
    throw new Error("Select an invoice before recording payment.");
  }

  const amount = decimal(str(formData, "amount"));
  if (amount.lessThanOrEqualTo(0)) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const paidBefore = invoice.payments.reduce(
    (sum, payment) => sum.add(payment.amount),
    new Prisma.Decimal(0),
  );
  const paidAmount = paidBefore.add(amount);
  if (paidAmount.greaterThan(invoice.totalAmount)) {
    throw new Error("Payment amount cannot be more than the invoice balance due.");
  }

  const balanceAmount = nonNegative(invoice.totalAmount.sub(paidAmount));

  await prisma.payment.create({
    data: {
      invoiceId,
      customerId: invoice.customerId,
      amount,
      mode: str(formData, "mode") as PaymentMode,
      paymentDate: optionalDate(str(formData, "paymentDate")) ?? new Date(),
      referenceNumber: optional(str(formData, "referenceNumber")),
      notes: optional(str(formData, "notes")),
      collectedById: session.id,
    },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount,
      balanceAmount,
      paymentStatus: paymentStatusFor(invoice.totalAmount, paidAmount),
    },
  });

  return invoiceId;
}

export async function recordPayment(formData: FormData) {
  return runAction("recordPayment", "/payments/new", async () => {
  const invoiceId = await recordPaymentMutation(formData);

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
  });
}

export async function recordPaymentWithState(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const values = paymentActionValues(formData);
  let invoiceId = "";

  try {
    invoiceId = await recordPaymentMutation(formData);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[recordPayment]", error);
    const message = friendlyActionError(error);

    return {
      message,
      fieldErrors: paymentFieldErrors(message),
      values,
    };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function deletePayment(id: string) {
  return runAction("deletePayment", `/payments/${id}`, async () => {
  await requireUser([UserRole.ADMIN]);
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: {
        select: {
          id: true,
          estimateId: true,
          jobCardId: true,
          totalAmount: true,
        },
      },
    },
  });

  if (!payment) {
    redirect("/payments");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });

    const remainingPayments = await tx.payment.aggregate({
      where: { invoiceId: payment.invoiceId },
      _sum: { amount: true },
    });
    const paidAmount = remainingPayments._sum.amount ?? new Prisma.Decimal(0);
    const balanceAmount = nonNegative(payment.invoice.totalAmount.sub(paidAmount));

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount,
        balanceAmount,
        paymentStatus: paymentStatusFor(payment.invoice.totalAmount, paidAmount),
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath(`/invoices/${payment.invoiceId}`);
  revalidatePath(`/job-cards/${payment.invoice.jobCardId}`);
  if (payment.invoice.estimateId) revalidatePath(`/estimates/${payment.invoice.estimateId}`);
  redirect(`/invoices/${payment.invoiceId}`);
  });
}

export async function sendInvoiceReminder(id: string) {
  return runAction("sendInvoiceReminder", `/invoices/${id}`, async () => {
  await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  await sendPaymentReminderMessage(await invoiceMessageContext(id));
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
  });
}

export async function markVehicleReady(jobCardId: string) {
  return runAction("markVehicleReady", `/job-cards/${jobCardId}`, async () => {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.TECHNICIAN]);
  await prisma.jobCard.update({
    where: { id: jobCardId },
    data: { status: JobCardStatus.READY_FOR_DELIVERY },
  });
  await sendVehicleReadyMessage(await jobCardMessageContext(jobCardId));
  revalidatePath(`/job-cards/${jobCardId}`);
  redirect(`/job-cards/${jobCardId}`);
  });
}

export async function markVehicleDelivered(jobCardId: string) {
  return runAction("markVehicleDelivered", `/job-cards/${jobCardId}`, async () => {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.BILLING_STAFF]);
  await prisma.jobCard.update({
    where: { id: jobCardId },
    data: { status: JobCardStatus.DELIVERED, deliveredAt: new Date() },
  });
  await sendVehicleDeliveredMessage(await jobCardMessageContext(jobCardId));
  revalidatePath(`/job-cards/${jobCardId}`);
  redirect(`/job-cards/${jobCardId}`);
  });
}

export async function sendCustomWhatsApp(formData: FormData) {
  return runAction("sendCustomWhatsApp", "/settings/whatsapp-logs", async () => {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.BILLING_STAFF]);
  const returnTo = str(formData, "returnTo") || "/settings/whatsapp-logs";
  const mobileNumber = str(formData, "mobileNumber");
  const messageBody = str(formData, "messageBody");
  if (!mobileNumber || !messageBody) {
    throw new Error("Enter customer mobile number and message before sending WhatsApp.");
  }

  await sendWhatsAppMessage({
    mobileNumber,
    messageBody,
    messageType: (str(formData, "messageType") || "CUSTOM") as WhatsAppMessageType,
    customerId: optional(str(formData, "customerId")),
    jobCardId: optional(str(formData, "jobCardId")),
    estimateId: optional(str(formData, "estimateId")),
    invoiceId: optional(str(formData, "invoiceId")),
  });

  revalidatePath("/settings/whatsapp-logs");
  redirect(returnTo);
  });
}

export async function retryWhatsAppLog(logId: string) {
  return runAction("retryWhatsAppLog", "/settings/whatsapp-logs", async () => {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR]);
  const log = await prisma.whatsAppLog.findUniqueOrThrow({ where: { id: logId } });

  await sendWhatsAppMessage({
    mobileNumber: log.mobileNumber,
    messageBody: log.messageBody,
    messageType: log.messageType,
    customerId: log.customerId ?? undefined,
    jobCardId: log.jobCardId ?? undefined,
    estimateId: log.estimateId ?? undefined,
    invoiceId: log.invoiceId ?? undefined,
  });

  revalidatePath("/settings/whatsapp-logs");
  redirect("/settings/whatsapp-logs");
  });
}

export async function createInvoiceFromEstimate(estimateId: string) {
  await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  redirect(`/invoices/new?estimateId=${estimateId}`);
}

export async function saveSettings(formData: FormData) {
  return runAction("saveSettings", "/settings", async () => {
  await requireUser([UserRole.ADMIN]);

  await prisma.workshopSetting.upsert({
    where: { singletonKey: "default" },
    update: {
      workshopName: str(formData, "workshopName"),
      tagline: str(formData, "tagline"),
      phoneNumber: str(formData, "phoneNumber"),
      whatsappNumber: str(formData, "whatsappNumber"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      logoUrl: optional(str(formData, "logoUrl")),
      invoiceFooterNote: str(formData, "invoiceFooterNote"),
      estimateTerms: str(formData, "estimateTerms"),
      jobCardTerms: str(formData, "jobCardTerms"),
      currencySymbol: str(formData, "currencySymbol") || "\u20B9",
      statusMessageTemplates: parseStatusMessageTemplates(formData),
      jobCardPrefix: str(formData, "jobCardPrefix") || "JC",
      estimatePrefix: str(formData, "estimatePrefix") || "EST",
      invoicePrefix: str(formData, "invoicePrefix") || "INV",
      enableWhatsAppApiSending: bool(formData, "enableWhatsAppApiSending"),
      enableManualWhatsAppFallback: bool(formData, "enableManualWhatsAppFallback"),
      autoSendJobCardMessage: bool(formData, "autoSendJobCardMessage"),
      autoSendEstimateMessage: bool(formData, "autoSendEstimateMessage"),
      autoSendInvoiceMessage: bool(formData, "autoSendInvoiceMessage"),
      autoSendDeliveryMessage: bool(formData, "autoSendDeliveryMessage"),
    },
    create: {
      workshopName: str(formData, "workshopName") || "Meharban Car A/C Works",
      tagline: str(formData, "tagline") || "Complete Car A/C Service & Repair Specialist",
      phoneNumber: str(formData, "phoneNumber"),
      whatsappNumber: str(formData, "whatsappNumber"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      logoUrl: optional(str(formData, "logoUrl")),
      invoiceFooterNote:
        str(formData, "invoiceFooterNote") ||
        "Thank you for choosing Meharban Car A/C Works. Drive cool, drive comfortable.",
      estimateTerms:
        str(formData, "estimateTerms") ||
        "This is an estimate only. Final invoice may vary if additional parts or services are required after customer approval.",
      jobCardTerms:
        str(formData, "jobCardTerms") || "Customer approval is required before additional work is started.",
      currencySymbol: str(formData, "currencySymbol") || "\u20B9",
      statusMessageTemplates: parseStatusMessageTemplates(formData),
      jobCardPrefix: str(formData, "jobCardPrefix") || "JC",
      estimatePrefix: str(formData, "estimatePrefix") || "EST",
      invoicePrefix: str(formData, "invoicePrefix") || "INV",
      enableWhatsAppApiSending: bool(formData, "enableWhatsAppApiSending"),
      enableManualWhatsAppFallback: bool(formData, "enableManualWhatsAppFallback"),
      autoSendJobCardMessage: bool(formData, "autoSendJobCardMessage"),
      autoSendEstimateMessage: bool(formData, "autoSendEstimateMessage"),
      autoSendInvoiceMessage: bool(formData, "autoSendInvoiceMessage"),
      autoSendDeliveryMessage: bool(formData, "autoSendDeliveryMessage"),
    },
  });

  revalidatePath("/settings");
  redirect("/settings");
  });
}

export async function preparedInvoiceMessage(invoiceId: string) {
  await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  const context = await invoiceMessageContext(invoiceId);
  return invoiceGeneratedBody(context);
}

export async function createPaymentConfirmationLog(invoiceId: string) {
  return runAction("createPaymentConfirmationLog", `/invoices/${invoiceId}`, async () => {
  await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF]);
  const context = await invoiceMessageContext(invoiceId);

  await sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.CUSTOM,
    messageBody: `Hello ${context.customerName}, payment has been received for vehicle ${context.vehicleNumber}.

Invoice No: ${context.invoiceNumber}
Paid Amount: ${context.paidAmount ? context.paidAmount.toString() : "0"}
Balance Amount: ${context.balanceAmount ? context.balanceAmount.toString() : "0"}`,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
  });
}

export async function approveEstimateFromTracking(estimateId: string, trackingToken: string) {
  return runAction("approveEstimateFromTracking", `/track/${trackingToken}`, async () => {
  const estimate = await prisma.estimate.update({
    where: { id: estimateId },
    data: { status: EstimateStatus.APPROVED },
  });
  await prisma.jobCard.update({
    where: { id: estimate.jobCardId },
    data: { status: JobCardStatus.CUSTOMER_APPROVED },
  });
  revalidatePath(`/track/${trackingToken}`);
  redirect(`/track/${trackingToken}`);
  });
}
