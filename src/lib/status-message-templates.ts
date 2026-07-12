export type StatusTemplateKey =
  | "VEHICLE_RECEIVED"
  | "INSPECTION_STARTED"
  | "ISSUE_DIAGNOSED"
  | "ESTIMATE_SHARED"
  | "WORK_IN_PROGRESS"
  | "QUALITY_CHECK"
  | "READY_FOR_DELIVERY"
  | "PAYMENT_PENDING"
  | "INVOICE_GENERATED"
  | "DELIVERED";

export const statusMessageTemplateFields: {
  status: StatusTemplateKey;
  title: string;
  defaultTemplate: string;
}[] = [
  {
    status: "VEHICLE_RECEIVED",
    title: "Job Card Created",
    defaultTemplate: `*Status: Job Card Created*

Hello {{customer_name}},

Your job card for vehicle *{{vehicle_number}}* has been created at *Meharban Car A/C Works*. Our team will begin the vehicle inspection shortly.

*Job Card No.:* {{job_card_number}}

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "INSPECTION_STARTED",
    title: "Vehicle Inspection Started",
    defaultTemplate: `*Status: Vehicle Inspection Started*

Hello {{customer_name}},

The inspection of your vehicle *{{vehicle_number}}* has started. Our team is checking the vehicle to identify the issue.

We will update you once the inspection is completed.

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "ISSUE_DIAGNOSED",
    title: "Issue Identified",
    defaultTemplate: `*Status: Issue Identified*

Hello {{customer_name}},

The inspection of your vehicle *{{vehicle_number}}* has been completed.

We have identified an issue with:

*Issue:* {{issue_name}}

Your service estimate will be prepared and shared with you shortly.

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "ESTIMATE_SHARED",
    title: "Estimate Sent",
    defaultTemplate: `*Status: Estimate Sent*

Hello {{customer_name}},

The service estimate for your vehicle *{{vehicle_number}}* has been prepared.

Please review and approve the estimate so that we can begin the service work.

*Estimate No.:* {{estimate_number}}

*View Estimate:*
{{estimate_link}}

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "WORK_IN_PROGRESS",
    title: "Work in Progress",
    defaultTemplate: `*Status: Work in Progress*

Hello {{customer_name}},

Service work on your vehicle *{{vehicle_number}}* is now in progress.

Our team is working on the approved service and repair work. We will update you once the work is completed and final checking begins.

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "QUALITY_CHECK",
    title: "Final Checking and Testing",
    defaultTemplate: `*Status: Final Checking and Testing*

Hello {{customer_name}},

The service work on your vehicle *{{vehicle_number}}* has been completed.

Final checking and performance testing of *{{issue_name}}* are currently in progress.

We will update you once your vehicle is ready for delivery.

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "READY_FOR_DELIVERY",
    title: "Ready for Delivery",
    defaultTemplate: `*Status: Ready for Delivery*

Hello {{customer_name}},

Your vehicle *{{vehicle_number}}* is ready for delivery.

Please visit *Meharban Car A/C Works* to collect your vehicle.

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "PAYMENT_PENDING",
    title: "Payment Pending",
    defaultTemplate: `*Status: Payment Pending*

Hello {{customer_name}},

The service work for your vehicle *{{vehicle_number}}* has been completed.

Your payment is currently pending. Once the payment is received, your invoice will be generated and sent to you.

*Amount Due:* ₹{{amount}}

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "INVOICE_GENERATED",
    title: "Invoice Sent",
    defaultTemplate: `*Status: Invoice Sent*

Hello {{customer_name}},

Payment has been received successfully for your vehicle *{{vehicle_number}}*.

Your service invoice is now ready.

*Invoice No.:* {{invoice_number}}

*Download Invoice:*
{{invoice_link}}

Thank you,
*Meharban Car A/C Works*`,
  },
  {
    status: "DELIVERED",
    title: "Vehicle Delivered",
    defaultTemplate: `*Status: Vehicle Delivered*

Hello {{customer_name}},

Your vehicle *{{vehicle_number}}* has been delivered successfully.

Thank you for choosing *Meharban Car A/C Works*. We appreciate your trust and support.`,
  },
];

export function statusTemplateTitle(status: string) {
  return statusMessageTemplateFields.find((template) => template.status === status)?.title ?? status;
}

export function statusTemplatesFromJson(value: unknown) {
  const storedTemplates =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    statusMessageTemplateFields.map((template) => {
      const stored = storedTemplates[template.status];
      return [template.status, typeof stored === "string" && stored.trim() ? stored : template.defaultTemplate];
    }),
  ) as Record<StatusTemplateKey, string>;
}
