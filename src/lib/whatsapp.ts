import "server-only";

import {
  Prisma,
  WhatsAppMessageType,
  WhatsAppSendMethod,
  WhatsAppStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

type MessageContext = {
  customerId?: string;
  jobCardId?: string;
  estimateId?: string;
  invoiceId?: string;
  customerName: string;
  mobileNumber: string;
  vehicleNumber: string;
  jobCardNumber?: string;
  estimateNumber?: string;
  invoiceNumber?: string;
  totalAmount?: number | string | { toString(): string };
  paidAmount?: number | string | { toString(): string };
  balanceAmount?: number | string | { toString(): string };
  trackingToken?: string;
  problemSummary?: string;
};

type SendMessageInput = {
  mobileNumber: string;
  messageBody: string;
  messageType: WhatsAppMessageType;
  customerId?: string;
  jobCardId?: string;
  estimateId?: string;
  invoiceId?: string;
};

export function formatIndianWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length > 10) return `91${digits.slice(-10)}`;
  return digits;
}

export function createWhatsAppLink(mobileNumber: string, messageBody: string) {
  const formatted = formatIndianWhatsAppNumber(mobileNumber);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(messageBody)}`;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function trackingLink(context: MessageContext) {
  return context.trackingToken ? `${appUrl()}/track/${context.trackingToken}` : appUrl();
}

function baseRelations(input: SendMessageInput) {
  return {
    customerId: input.customerId,
    jobCardId: input.jobCardId,
    estimateId: input.estimateId,
    invoiceId: input.invoiceId,
  };
}

export async function sendWhatsAppMessage(input: SendMessageInput) {
  const formattedNumber = formatIndianWhatsAppNumber(input.mobileNumber);
  const settings = await prisma.workshopSetting.findUnique({
    where: { singletonKey: "default" },
  });
  const apiSendingEnabled = settings?.enableWhatsAppApiSending ?? false;
  const apiUrl = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v20.0";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiSendingEnabled || !accessToken || !phoneNumberId) {
    return prisma.whatsAppLog.create({
      data: {
        ...baseRelations(input),
        mobileNumber: formattedNumber,
        messageType: input.messageType,
        messageBody: input.messageBody,
        sendMethod: WhatsAppSendMethod.FALLBACK,
        status: WhatsAppStatus.PENDING,
      },
    });
  }

  const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: formattedNumber,
      type: "text",
      text: {
        body: input.messageBody,
      },
    }),
  });

  const responseJson: unknown = await response.json().catch(() => ({}));
  const apiResponse = JSON.parse(JSON.stringify(responseJson)) as Prisma.InputJsonValue;
  const apiMessageId =
    typeof responseJson === "object" &&
    responseJson !== null &&
    "messages" in responseJson &&
    Array.isArray(responseJson.messages) &&
    typeof responseJson.messages[0]?.id === "string"
      ? responseJson.messages[0].id
      : undefined;

  if (!response.ok) {
    return prisma.whatsAppLog.create({
      data: {
        ...baseRelations(input),
        mobileNumber: formattedNumber,
        messageType: input.messageType,
        messageBody: input.messageBody,
        sendMethod: WhatsAppSendMethod.API,
        status: WhatsAppStatus.FAILED,
        apiResponse,
        failedAt: new Date(),
        errorMessage: JSON.stringify(responseJson),
      },
    });
  }

  return prisma.whatsAppLog.create({
    data: {
      ...baseRelations(input),
      mobileNumber: formattedNumber,
      messageType: input.messageType,
      messageBody: input.messageBody,
      sendMethod: WhatsAppSendMethod.API,
      status: WhatsAppStatus.SENT,
      apiMessageId,
      apiResponse,
      sentAt: new Date(),
    },
  });
}

export async function saveManualWhatsAppMessage(input: SendMessageInput) {
  return prisma.whatsAppLog.create({
    data: {
      ...baseRelations(input),
      mobileNumber: formatIndianWhatsAppNumber(input.mobileNumber),
      messageType: input.messageType,
      messageBody: input.messageBody,
      sendMethod: WhatsAppSendMethod.MANUAL,
      status: WhatsAppStatus.MANUAL,
    },
  });
}

export function jobCardCreatedBody(context: MessageContext) {
  return `Hello ${context.customerName}, your vehicle ${context.vehicleNumber} has been received at Meharban Car A/C Works.

Job Card No: ${context.jobCardNumber}

Track your service status here:
${trackingLink(context)}`;
}

export function inspectionCompletedBody(context: MessageContext) {
  return `Hello ${context.customerName}, inspection has been completed for your vehicle ${context.vehicleNumber}.

Problem found:
${context.problemSummary || "Workshop diagnosis completed."}

Estimate will be shared for your approval.

Track status:
${trackingLink(context)}`;
}

export function estimateSharedBody(context: MessageContext) {
  return `Hello ${context.customerName}, your service estimate for vehicle ${context.vehicleNumber} is ready.

Estimate No: ${context.estimateNumber}
Estimated Amount: ${formatMoney(context.totalAmount)}

Please review and approve before we start the work.

Track / Approve here:
${trackingLink(context)}`;
}

export function estimateApprovalReminderBody(context: MessageContext) {
  return `Hello ${context.customerName}, your estimate for vehicle ${context.vehicleNumber} is waiting for approval.

Estimate Amount: ${formatMoney(context.totalAmount)}

We will start the work after your confirmation.

Approval link:
${trackingLink(context)}`;
}

export function workStartedBody(context: MessageContext) {
  return `Hello ${context.customerName}, service work has started for your vehicle ${context.vehicleNumber} at Meharban Car A/C Works.

We will update you once the vehicle is ready.

Track status:
${trackingLink(context)}`;
}

export function vehicleReadyBody(context: MessageContext) {
  return `Good news ${context.customerName}! Your vehicle ${context.vehicleNumber} is ready for delivery.

Please visit Meharban Car A/C Works to collect your vehicle.

Track status:
${trackingLink(context)}`;
}

export function invoiceGeneratedBody(context: MessageContext) {
  return `Hello ${context.customerName}, your service bill has been generated for vehicle ${context.vehicleNumber}.

Invoice No: ${context.invoiceNumber}
Total Amount: ${formatMoney(context.totalAmount)}
Paid Amount: ${formatMoney(context.paidAmount)}
Balance Amount: ${formatMoney(context.balanceAmount)}

View bill:
${trackingLink(context)}`;
}

export function paymentReminderBody(context: MessageContext) {
  return `Hello ${context.customerName}, payment is pending for your vehicle ${context.vehicleNumber}.

Invoice No: ${context.invoiceNumber}
Balance Amount: ${formatMoney(context.balanceAmount)}

Please complete the payment at the time of delivery.`;
}

export function vehicleDeliveredBody(context: MessageContext) {
  return `Thank you ${context.customerName} for choosing Meharban Car A/C Works.

Your vehicle ${context.vehicleNumber} has been delivered successfully.

We hope you are satisfied with our service.

Feedback link:
${trackingLink(context)}`;
}

export function feedbackRequestBody(context: MessageContext) {
  return `Hello ${context.customerName}, thank you for visiting Meharban Car A/C Works.

Please share your service feedback:
${trackingLink(context)}`;
}

export async function sendJobCardCreatedMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.JOB_CARD_CREATED,
    messageBody: jobCardCreatedBody(context),
  });
}

export async function sendStatusUpdateMessage(context: MessageContext, status: string) {
  if (status === "ISSUE_DIAGNOSED") {
    return sendWhatsAppMessage({
      ...context,
      messageType: WhatsAppMessageType.INSPECTION_COMPLETED,
      messageBody: inspectionCompletedBody(context),
    });
  }

  if (status === "WORK_IN_PROGRESS") {
    return sendWhatsAppMessage({
      ...context,
      messageType: WhatsAppMessageType.WORK_STARTED,
      messageBody: workStartedBody(context),
    });
  }

  if (status === "READY_FOR_DELIVERY") {
    return sendVehicleReadyMessage(context);
  }

  if (status === "DELIVERED") {
    return sendVehicleDeliveredMessage(context);
  }

  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.CUSTOM,
    messageBody: `Hello ${context.customerName}, service status for ${context.vehicleNumber} is now ${status.replaceAll("_", " ")}.

Track status:
${trackingLink(context)}`,
  });
}

export async function sendEstimateSharedMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.ESTIMATE_SHARED,
    messageBody: estimateSharedBody(context),
  });
}

export async function sendEstimateApprovalReminderMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.APPROVAL_REMINDER,
    messageBody: estimateApprovalReminderBody(context),
  });
}

export async function sendInvoiceGeneratedMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.INVOICE_GENERATED,
    messageBody: invoiceGeneratedBody(context),
  });
}

export async function sendPaymentReminderMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.PAYMENT_REMINDER,
    messageBody: paymentReminderBody(context),
  });
}

export async function sendVehicleReadyMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.VEHICLE_READY,
    messageBody: vehicleReadyBody(context),
  });
}

export async function sendVehicleDeliveredMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.VEHICLE_DELIVERED,
    messageBody: vehicleDeliveredBody(context),
  });
}

export async function sendFeedbackRequestMessage(context: MessageContext) {
  return sendWhatsAppMessage({
    ...context,
    messageType: WhatsAppMessageType.FEEDBACK_REQUEST,
    messageBody: feedbackRequestBody(context),
  });
}
