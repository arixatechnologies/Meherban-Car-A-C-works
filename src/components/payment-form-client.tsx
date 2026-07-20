"use client";

import { useActionState } from "react";
import { paymentModes } from "@/lib/constants";
import { recordPaymentWithState, type PaymentActionState } from "@/lib/actions";
import { formatMoney, toDateInput } from "@/lib/format";
import { cn, label } from "@/lib/utils";
import { Field, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type PaymentInvoiceOption = {
  id: string;
  invoiceNumber: string;
  customer: { name: string };
  balanceAmount: string;
};

const initialState: PaymentActionState = {};

export function PaymentFormClient({
  invoices,
  selectedInvoiceId,
}: {
  invoices: PaymentInvoiceOption[];
  selectedInvoiceId?: string;
}) {
  const [state, formAction] = useActionState(recordPaymentWithState, initialState);
  const selectedValue = state.values?.invoiceId ?? selectedInvoiceId ?? "";
  const inputErrorClass = "border-[#dc2626] bg-[#fff5f5] focus:border-[#dc2626] focus:ring-[#fecaca]";

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-2">
      <Field labelText="Invoice">
        <select
          name="invoiceId"
          required
          defaultValue={selectedValue}
          aria-invalid={Boolean(state.fieldErrors?.invoiceId)}
          className={cn(inputClass, state.fieldErrors?.invoiceId && inputErrorClass)}
        >
          <option value="">Select invoice</option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} - {invoice.customer.name} - Balance {formatMoney(invoice.balanceAmount)}
            </option>
          ))}
        </select>
      </Field>
      <Field labelText="Amount">
        <input
          name="amount"
          required
          type="number"
          step="0.01"
          defaultValue={state.values?.amount ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.amount)}
          className={cn(inputClass, state.fieldErrors?.amount && inputErrorClass)}
        />
      </Field>
      <Field labelText="Payment mode">
        <select name="mode" defaultValue={state.values?.mode ?? "CASH"} className={inputClass}>
          {paymentModes.map((mode) => (
            <option key={mode} value={mode}>
              {label(mode)}
            </option>
          ))}
        </select>
      </Field>
      <Field labelText="Payment date">
        <input
          name="paymentDate"
          type="date"
          defaultValue={state.values?.paymentDate ?? toDateInput(new Date())}
          className={inputClass}
        />
      </Field>
      <Field labelText="Reference number">
        <input name="referenceNumber" defaultValue={state.values?.referenceNumber ?? ""} className={inputClass} />
      </Field>
      <Field labelText="Notes">
        <input name="notes" defaultValue={state.values?.notes ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-3 lg:col-span-2">
        {state.message ? (
          <div className="rounded-lg border border-[#fecaca] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#991b1b]">
            <p className="font-black">Action Failed</p>
            <p className="mt-1">{state.message}</p>
          </div>
        ) : null}
        <div>
          <SubmitButton>Record payment</SubmitButton>
        </div>
      </div>
    </form>
  );
}
