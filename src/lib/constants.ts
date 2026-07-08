export const complaintOptions = [
  "A/C not cooling",
  "Cooling low",
  "No air flow",
  "Bad smell from vents",
  "Compressor noise",
  "Gas leakage",
  "Blower not working",
  "Electrical issue",
  "Water leakage",
  "Other custom complaint",
] as const;

export const inspectionItemNames = [
  "Compressor",
  "Condenser",
  "Cooling Coil",
  "Blower",
  "Cabin Filter",
  "Gas Level",
  "Suction Pipe",
  "Discharge Pipe",
  "Liquid Pipe",
  "RD Bottle",
  "Condenser Fan",
  "Radiator Fan",
  "Coolant",
  "Compressor Oil",
  "Fuse and Relay",
  "Blower Resistor",
  "Electricals / Wiring",
  "Thermostat",
  "Pressure Test Done",
  "Pipe Lines",
  "Pressure Switch",
  "Clutch Assembly",
] as const;

export const jobCardStatuses = [
  "VEHICLE_RECEIVED",
  "INSPECTION_STARTED",
  "ISSUE_DIAGNOSED",
  "ESTIMATE_SHARED",
  "WAITING_FOR_CUSTOMER_APPROVAL",
  "CUSTOMER_APPROVED",
  "WORK_IN_PROGRESS",
  "PARTS_REQUIRED",
  "AC_GAS_FILLING",
  "COOLING_TEST",
  "QUALITY_CHECK",
  "READY_FOR_DELIVERY",
  "INVOICE_GENERATED",
  "PAYMENT_PENDING",
  "DELIVERED",
  "CANCELLED",
] as const;

export const customerVisibleStatuses = new Set([
  "VEHICLE_RECEIVED",
  "ISSUE_DIAGNOSED",
  "ESTIMATE_SHARED",
  "WAITING_FOR_CUSTOMER_APPROVAL",
  "WORK_IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "INVOICE_GENERATED",
  "PAYMENT_PENDING",
  "DELIVERED",
]);

export const priorityOptions = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const inspectionStatuses = ["OK", "ATTENTION", "NOT_OK"] as const;
export const estimateStatuses = [
  "DRAFT",
  "SHARED",
  "APPROVED",
  "REJECTED",
  "NEEDS_REVISION",
  "CONVERTED_TO_INVOICE",
] as const;
export const invoicePaymentStatuses = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export const paymentModes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CREDIT_PAY_LATER"] as const;
export const itemCategories = ["SERVICE", "PARTS", "LABOUR", "OTHER"] as const;
export const userRoles = ["ADMIN", "SERVICE_ADVISOR", "TECHNICIAN", "BILLING_STAFF"] as const;
export const staffStatuses = ["ACTIVE", "INACTIVE"] as const;

export const whatsappMessageTypes = [
  "JOB_CARD_CREATED",
  "INSPECTION_COMPLETED",
  "ESTIMATE_SHARED",
  "APPROVAL_REMINDER",
  "WORK_STARTED",
  "VEHICLE_READY",
  "INVOICE_GENERATED",
  "PAYMENT_REMINDER",
  "VEHICLE_DELIVERED",
  "FEEDBACK_REQUEST",
  "CUSTOM",
] as const;
