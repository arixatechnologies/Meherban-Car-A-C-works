"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { normalizeMobile } from "@/lib/utils";
import {
  invoiceGeneratedBody,
  sendEstimateApprovalReminderMessage,
  sendEstimateSharedMessage,
  sendInvoiceGeneratedMessage,
  sendJobCardCreatedMessage,
  sendPaymentReminderMessage,
  sendStatusUpdateMessage,
  sendVehicleDeliveredMessage,
  sendVehicleReadyMessage,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

export type AuthActionState = {
  message?: string;
};

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

function decimal(value: string) {
  const parsed = Number(value || "0");
  return Number.isFinite(parsed) ? new Prisma.Decimal(parsed) : new Prisma.Decimal(0);
}

function looseDecimal(value: string) {
  const match = value.replaceAll(",", "").match(/-?\d+(\.\d+)?/);
  return decimal(match?.[0] ?? "");
}

function nonNegative(value: Prisma.Decimal) {
  return value.lessThan(0) ? new Prisma.Decimal(0) : value;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
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
  const partServices = formData.getAll("observationPartService");
  const descriptions = formData.getAll("observationDescription");
  const quantities = formData.getAll("observationQuantity");
  const unitPrices = formData.getAll("observationUnitPrice");
  const amounts = formData.getAll("observationAmount");

  return partServices
    .map((partService, index) => {
      const partServiceText = typeof partService === "string" ? partService.trim() : "";
      const description = typeof descriptions[index] === "string" ? descriptions[index].trim() : "";
      const quantity = looseDecimal(typeof quantities[index] === "string" ? quantities[index] : "");
      const unitPrice = decimal(typeof unitPrices[index] === "string" ? unitPrices[index] : "");
      const enteredAmount = decimal(typeof amounts[index] === "string" ? amounts[index] : "");
      const amount = enteredAmount.greaterThan(0) ? enteredAmount : quantity.mul(unitPrice);

      return {
        sortOrder: index + 1,
        partService: partServiceText || description,
        description: optional(description),
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
  const count = await prisma.jobCard.count({
    where: { jobCardNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

async function nextEstimateNumber() {
  const { estimatePrefix } = await getSettingPrefixes();
  const year = new Date().getFullYear();
  const prefix = `${estimatePrefix}-${year}-`;
  const count = await prisma.estimate.count({
    where: { estimateNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

async function nextInvoiceNumber() {
  const { invoicePrefix } = await getSettingPrefixes();
  const year = new Date().getFullYear();
  const prefix = `${invoicePrefix}-${year}-`;
  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

function randomTrackingToken() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "").slice(0, 8);
}

async function jobCardMessageContext(jobCardId: string) {
  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    include: {
      customer: true,
      vehicle: true,
    },
  });

  return {
    customerId: jobCard.customerId,
    jobCardId: jobCard.id,
    customerName: jobCard.customer.name,
    mobileNumber: jobCard.customer.whatsapp || jobCard.customer.mobile,
    vehicleNumber: jobCard.vehicle.vehicleNumber,
    jobCardNumber: jobCard.jobCardNumber,
    trackingToken: jobCard.trackingToken,
    problemSummary: jobCard.problemFound || jobCard.workSuggested || undefined,
  };
}

async function estimateMessageContext(estimateId: string) {
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
  };
}

async function invoiceMessageContext(invoiceId: string) {
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
  };
}

function parseLineItems(formData: FormData) {
  const descriptions = formData.getAll("itemDescription");
  const categories = formData.getAll("itemCategory");
  const quantities = formData.getAll("itemQuantity");
  const unitPrices = formData.getAll("itemUnitPrice");

  return descriptions
    .map((description, index) => ({
      description: typeof description === "string" ? description.trim() : "",
      category:
        typeof categories[index] === "string"
          ? (categories[index] as ItemCategory)
          : ItemCategory.SERVICE,
      quantity: decimal(typeof quantities[index] === "string" ? quantities[index] : "0"),
      unitPrice: decimal(typeof unitPrices[index] === "string" ? unitPrices[index] : "0"),
    }))
    .filter((item) => item.description)
    .map((item) => ({
      ...item,
      amount: item.quantity.mul(item.unitPrice),
    }));
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
    return { message: "Email and password are required." };
  }

  const user = await verifyLogin(email, password);

  if (!user) {
    return { message: "Invalid login details." };
  }

  await setSessionCookie(user);
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function saveJobCard(id: string | null, formData: FormData) {
  const session = await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.TECHNICIAN]);
  const complaints = selectedArray(formData, "complaints").filter((value) =>
    complaintOptions.includes(value as (typeof complaintOptions)[number]),
  );
  const status = (str(formData, "status") || "VEHICLE_RECEIVED") as JobCardStatus;
  const deliveryDate = str(formData, "expectedDeliveryAt") || str(formData, "expectedDeliveryDate");
  let customerId = str(formData, "customerId");
  let vehicleId = str(formData, "vehicleId");
  const serviceObservations = parseJobCardServiceObservations(formData);
  const observationsTotal = serviceObservations.reduce(
    (sum, item) => sum.add(item.amount),
    new Prisma.Decimal(0),
  );
  const submittedTotalAmount = decimal(str(formData, "estimatedTotalAmount"));
  const estimatedTotalAmount = submittedTotalAmount.greaterThan(0)
    ? submittedTotalAmount
    : observationsTotal;
  const advanceAmount = decimal(str(formData, "advanceAmount"));
  const submittedBalanceDue = str(formData, "balanceDue");
  const balanceDue = submittedBalanceDue
    ? decimal(submittedBalanceDue)
    : nonNegative(estimatedTotalAmount.sub(advanceAmount));
  const paymentModeValue = str(formData, "jobCardPaymentMode");
  const paymentMode = Object.values(PaymentMode).includes(paymentModeValue as PaymentMode)
    ? (paymentModeValue as PaymentMode)
    : undefined;

  if (!customerId && !id) {
    const customerName = str(formData, "customerName");
    const customerMobile = normalizeMobile(str(formData, "customerMobile"));

    if (!customerName || !customerMobile) {
      throw new Error("Select an existing customer or enter new customer name and mobile number.");
    }

    const customerData = {
      name: customerName,
      mobile: customerMobile,
      whatsapp: optional(normalizeMobile(str(formData, "customerWhatsapp"))),
      email: optional(str(formData, "customerEmail")),
      address: optional(str(formData, "customerAddress")),
      city: optional(str(formData, "customerCity")),
    };
    const customer =
      (await prisma.customer.findUnique({ where: { mobile: customerMobile } })) ??
      (await prisma.customer.create({ data: customerData }));

    if (customer.id && customer.mobile === customerMobile) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          whatsapp: customerData.whatsapp,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
        },
      });
    }

    customerId = customer.id;
  }

  if (!vehicleId && !id) {
    const vehicleNumber = str(formData, "newVehicleNumber").toUpperCase().replace(/\s/g, "");
    const makeModel = str(formData, "newVehicleMakeModel");
    let brand = str(formData, "newVehicleBrand");
    let model = str(formData, "newVehicleModel");
    const fuelType = str(formData, "newVehicleFuelType");

    if ((!brand || !model) && makeModel) {
      const [firstPart, ...remainingParts] = makeModel.split(/\s+/);
      brand = brand || firstPart || makeModel;
      model = model || remainingParts.join(" ") || makeModel;
    }

    if (!customerId || !vehicleNumber || !brand || !model || !fuelType) {
      throw new Error("Select an existing vehicle or enter new vehicle number, brand, model, and fuel type.");
    }

    const vehicleData = {
      customerId,
      vehicleNumber,
      brand,
      model,
      fuelType,
      variant: optional(str(formData, "newVehicleVariant")),
      year: optionalInt(str(formData, "newVehicleYear")),
      odometerReading: optionalInt(str(formData, "newVehicleOdometer")),
      chassisNumber: optional(str(formData, "newVehicleChassisNumber")),
      engineNumber: optional(str(formData, "newVehicleEngineNumber")),
      notes: optional(str(formData, "newVehicleNotes")),
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
  }

  if (vehicleId && !customerId) {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    customerId = vehicle.customerId;
  }

  if (!customerId || !vehicleId) {
    throw new Error("Select existing customer and vehicle, or enter new customer and vehicle details.");
  }

  const data = {
    customerId,
    vehicleId,
    serviceAdvisorId: session.id,
    serviceAdvisorName: optional(str(formData, "serviceAdvisorName")) || "Meherban",
    assignedTechnicianId: optional(str(formData, "assignedTechnicianId")),
    technicianName: optional(str(formData, "technicianName")),
    bayNumber: optional(str(formData, "bayNumber")),
    expectedDeliveryAt: optionalDate(deliveryDate),
    priority: (str(formData, "priority") || "NORMAL") as Priority,
    complaints,
    customComplaint: optional(str(formData, "customComplaint")),
    problemFound: optional(str(formData, "problemFound")),
    workSuggested: optional(str(formData, "workSuggested")),
    partsRequired: optional(str(formData, "partsRequired")),
    serviceRecommendation: optional(str(formData, "serviceRecommendation")),
    internalNotes: optional(str(formData, "internalNotes")),
    finalQcBy: optional(str(formData, "finalQcBy")),
    estimatedTotalAmount,
    advanceAmount,
    balanceDue,
    paymentMode,
    status,
  };

  if (id) {
    const old = await prisma.jobCard.findUniqueOrThrow({ where: { id } });
    await prisma.jobCard.update({
      where: { id },
      data: {
        ...data,
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

  const inspectionEntries = parseInspectionItems(formData);
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
}

export async function deleteJobCard(id: string) {
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

  await prisma.jobCard.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/job-cards");
  redirect("/job-cards");
}

export async function updateJobCardStatus(jobCardId: string, formData: FormData) {
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
}

export async function saveInspection(jobCardId: string, formData: FormData) {
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
}

export async function saveEstimate(id: string | null, formData: FormData) {
  const session = await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR]);
  const jobCardId = str(formData, "jobCardId");
  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    include: { customer: true, vehicle: true },
  });
  const items = parseLineItems(formData);
  const subtotal = items.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
  const discount = decimal(str(formData, "discount"));
  const advanceReceived = decimal(str(formData, "advanceReceived"));
  const totalAmount = nonNegative(subtotal.sub(discount));
  const balanceAmount = nonNegative(totalAmount.sub(advanceReceived));
  const status = (str(formData, "status") || "DRAFT") as EstimateStatus;

  const data = {
    jobCardId,
    customerId: jobCard.customerId,
    vehicleId: jobCard.vehicleId,
    validTill: optionalDate(str(formData, "validTill")),
    serviceAdvisorId: session.id,
    problemSummary: str(formData, "problemSummary"),
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

    revalidatePath(`/estimates/${id}`);
    redirect(`/estimates/${id}`);
  }

  const estimate = await prisma.estimate.create({
    data: {
      ...data,
      estimateNumber: await nextEstimateNumber(),
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

  revalidatePath("/estimates");
  redirect(`/estimates/${estimate.id}`);
}

export async function deleteEstimate(id: string) {
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
}

export async function updateEstimateStatus(id: string, status: EstimateStatus) {
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
}

export async function sendEstimateReminder(id: string) {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR]);
  await sendEstimateApprovalReminderMessage(await estimateMessageContext(id));
  revalidatePath(`/estimates/${id}`);
  redirect(`/estimates/${id}`);
}

export async function saveInvoice(id: string | null, formData: FormData) {
  const session = await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  const jobCardId = str(formData, "jobCardId");
  const estimateId = optional(str(formData, "estimateId"));
  const jobCard = await prisma.jobCard.findUniqueOrThrow({
    where: { id: jobCardId },
    include: { customer: true, vehicle: true },
  });
  const estimate = estimateId
    ? await prisma.estimate.findUnique({
        where: { id: estimateId },
        include: { items: true },
      })
    : null;
  const parsedItems = parseLineItems(formData);
  const items =
    parsedItems.length > 0
      ? parsedItems
      : estimate?.items.map((item) => ({
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })) ?? [];
  const subtotal = items.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
  const discount = decimal(str(formData, "discount"));
  const paidAmount = decimal(str(formData, "paidAmount"));
  const totalAmount = nonNegative(subtotal.sub(discount));
  const balanceAmount = nonNegative(totalAmount.sub(paidAmount));

  const data = {
    jobCardId,
    estimateId,
    customerId: jobCard.customerId,
    vehicleId: jobCard.vehicleId,
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
    revalidatePath(`/invoices/${id}`);
    redirect(`/invoices/${id}`);
  }

  const invoice = await prisma.invoice.create({
    data: {
      ...data,
      invoiceNumber: await nextInvoiceNumber(),
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

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function deleteInvoice(id: string) {
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
  redirect("/invoices");
}

export async function recordPayment(formData: FormData) {
  const session = await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF]);
  const invoiceId = str(formData, "invoiceId");
  const amount = decimal(str(formData, "amount"));
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const paidBefore = invoice.payments.reduce(
    (sum, payment) => sum.add(payment.amount),
    new Prisma.Decimal(0),
  );
  const paidAmount = paidBefore.add(amount);
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

  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function sendInvoiceReminder(id: string) {
  await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  await sendPaymentReminderMessage(await invoiceMessageContext(id));
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function markVehicleReady(jobCardId: string) {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.TECHNICIAN]);
  await prisma.jobCard.update({
    where: { id: jobCardId },
    data: { status: JobCardStatus.READY_FOR_DELIVERY },
  });
  await sendVehicleReadyMessage(await jobCardMessageContext(jobCardId));
  revalidatePath(`/job-cards/${jobCardId}`);
  redirect(`/job-cards/${jobCardId}`);
}

export async function markVehicleDelivered(jobCardId: string) {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.BILLING_STAFF]);
  await prisma.jobCard.update({
    where: { id: jobCardId },
    data: { status: JobCardStatus.DELIVERED, deliveredAt: new Date() },
  });
  await sendVehicleDeliveredMessage(await jobCardMessageContext(jobCardId));
  revalidatePath(`/job-cards/${jobCardId}`);
  redirect(`/job-cards/${jobCardId}`);
}

export async function sendCustomWhatsApp(formData: FormData) {
  await requireUser([UserRole.ADMIN, UserRole.SERVICE_ADVISOR, UserRole.BILLING_STAFF]);
  const returnTo = str(formData, "returnTo") || "/whatsapp-logs";

  await sendWhatsAppMessage({
    mobileNumber: str(formData, "mobileNumber"),
    messageBody: str(formData, "messageBody"),
    messageType: (str(formData, "messageType") || "CUSTOM") as WhatsAppMessageType,
    customerId: optional(str(formData, "customerId")),
    jobCardId: optional(str(formData, "jobCardId")),
    estimateId: optional(str(formData, "estimateId")),
    invoiceId: optional(str(formData, "invoiceId")),
  });

  revalidatePath("/whatsapp-logs");
  redirect(returnTo);
}

export async function retryWhatsAppLog(logId: string) {
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

  revalidatePath("/whatsapp-logs");
  redirect("/whatsapp-logs");
}

export async function createInvoiceFromEstimate(estimateId: string) {
  await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  redirect(`/invoices/new?estimateId=${estimateId}`);
}

export async function saveSettings(formData: FormData) {
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
      workshopName: str(formData, "workshopName") || "Meherban Car A/C Works",
      tagline: str(formData, "tagline") || "Complete Car A/C Service & Repair Specialist",
      phoneNumber: str(formData, "phoneNumber"),
      whatsappNumber: str(formData, "whatsappNumber"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      logoUrl: optional(str(formData, "logoUrl")),
      invoiceFooterNote:
        str(formData, "invoiceFooterNote") ||
        "Thank you for choosing Meherban Car A/C Works. Drive cool, drive comfortable.",
      estimateTerms:
        str(formData, "estimateTerms") ||
        "This is an estimate only. Final invoice may vary if additional parts or services are required after customer approval.",
      jobCardTerms:
        str(formData, "jobCardTerms") || "Customer approval is required before additional work is started.",
      currencySymbol: str(formData, "currencySymbol") || "\u20B9",
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
}

export async function preparedInvoiceMessage(invoiceId: string) {
  await requireUser([UserRole.ADMIN, UserRole.BILLING_STAFF, UserRole.SERVICE_ADVISOR]);
  const context = await invoiceMessageContext(invoiceId);
  return invoiceGeneratedBody(context);
}

export async function createPaymentConfirmationLog(invoiceId: string) {
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
}

export async function approveEstimateFromTracking(estimateId: string, trackingToken: string) {
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
}
