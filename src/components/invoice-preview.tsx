import { BadgeIndianRupee, MessageCircle, Package } from "lucide-react";
import { notFound } from "next/navigation";
import {
  CustomerVehicleBlocks,
  DocBox,
  DocumentFooter,
  DocumentHeader,
  InfoRow,
  NotesAndTerms,
  SignatureRow,
  maroon,
  maroonBorder,
  moneyText,
} from "@/components/document-preview-ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { label } from "@/lib/utils";

export async function InvoicePreview({ id }: { id: string }) {
  const [invoice, setting] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        serviceAdvisor: true,
        jobCard: true,
        items: true,
        payments: { orderBy: { paymentDate: "desc" } },
      },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!invoice) notFound();

  const serviceAdvisorName = invoice.jobCard.serviceAdvisorName || invoice.serviceAdvisor?.name || "Meharban";
  const workshopName = setting?.workshopName || "Meharban Car A/C Works";
  const complaints = [...invoice.jobCard.complaints, invoice.jobCard.customComplaint].filter(Boolean).join(", ");
  const paymentModes = invoice.payments.length
    ? Array.from(new Set(invoice.payments.map((payment) => label(payment.mode)))).join(" / ")
    : "-";
  const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <article className="document-lock-font print-page mx-auto max-w-[1120px] rounded-xl border border-[#d8a1b1] bg-white p-5 text-slate-950 shadow-sm print:rounded-none print:p-4">
      <DocumentHeader
        title="Invoice Bill"
        infoTitle="Invoice Information"
        setting={setting}
        rows={[
          { label: "Invoice No.", value: invoice.invoiceNumber },
          { label: "Date", value: formatDate(invoice.invoiceDate) },
          { label: "Payment Mode", value: paymentModes },
          { label: "Service Advisor", value: serviceAdvisorName },
        ]}
      />

      <CustomerVehicleBlocks
        customer={invoice.customer}
        vehicle={invoice.vehicle}
        deliveryDate={invoice.jobCard.expectedDeliveryAt ? formatDate(invoice.jobCard.expectedDeliveryAt) : "-"}
      />

      <DocBox title="Service Summary" icon={<MessageCircle className="h-5 w-5" />} className="mt-3">
        <p className="text-[14px] leading-6">
          {invoice.notes || `${complaints || "Service completed"}${complaints ? ". " : " "}Service completed and billed as below.`}
        </p>
      </DocBox>

      <section className={`mt-3 overflow-hidden rounded-lg border ${maroonBorder}`}>
        <div className={`${maroon} flex min-h-11 items-center gap-2 px-4 text-xl font-black uppercase tracking-wide text-white`}>
          <Package className="h-6 w-6" />
          Spare Parts / Service Invoice
        </div>
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-[#fbedf2] text-[#7a0d2b]">
            <tr>
              <th className="border border-[#ead0d8] px-2 py-2">Sr. No.</th>
              <th className="border border-[#ead0d8] px-2 py-2">Part / Service</th>
              <th className="border border-[#ead0d8] px-2 py-2">Description</th>
              <th className="border border-[#ead0d8] px-2 py-2">Qty.</th>
              <th className="border border-[#ead0d8] px-2 py-2">Unit Price (₹)</th>
              <th className="border border-[#ead0d8] px-2 py-2">Amount (₹)</th>
              <th className="border border-[#ead0d8] px-2 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length ? (
              invoice.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{index + 1}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5">{item.partService || item.description}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5">{item.partService ? item.description : label(item.category)}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{item.quantity.toString()}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-right">{moneyText(item.unitPrice)}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-right">{moneyText(item.amount)}</td>
                  <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{item.remarks || label(item.category)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-[#ead0d8] px-2 py-4 text-center" colSpan={7}>
                  No invoice items added.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-[#ead0d8] px-2 py-2" colSpan={4} rowSpan={4} />
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right font-bold text-[#7a0d2b]" colSpan={2}>Sub Total (₹)</td>
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right">{moneyText(subtotal)}</td>
            </tr>
            <tr className={`${maroon} text-base font-black text-white`}>
              <td className="border border-[#ead0d8] px-3 py-2 text-right uppercase" colSpan={2}>Grand Total (₹)</td>
              <td className="border border-[#ead0d8] px-3 py-2 text-right">{moneyText(invoice.totalAmount)}</td>
            </tr>
            <tr>
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right font-bold text-[#7a0d2b]" colSpan={2}>Advance Paid (₹)</td>
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right">{moneyText(invoice.paidAmount)}</td>
            </tr>
            <tr>
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right font-bold text-[#7a0d2b]" colSpan={2}>Balance Due (₹)</td>
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right">{moneyText(invoice.balanceAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className={`mt-3 grid overflow-hidden rounded-lg border ${maroonBorder} md:grid-cols-[190px_1fr]`}>
        <div className={`${maroon} flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase text-white`}>
          <BadgeIndianRupee className="h-5 w-5" />
          Payment Details
        </div>
        <dl className="grid gap-3 px-4 py-3 text-[12px] font-semibold sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2">
          <InfoRow labelText="Total Amount" value={moneyText(invoice.totalAmount)} />
          <InfoRow labelText="Paid Via" value={paymentModes} />
          <InfoRow labelText="Advance" value={moneyText(invoice.paidAmount)} />
          <InfoRow labelText="Balance Due" value={moneyText(invoice.balanceAmount)} />
        </dl>
      </section>

      <NotesAndTerms
        notes={[
          "Invoice generated after service completion.",
          "No GST applicable.",
          "Parts once fitted will not be taken back.",
          "Payment to be completed before vehicle delivery.",
        ]}
        terms={[
          "All parts are genuine / good quality.",
          "Workshop not liable for valuables left inside the vehicle.",
          "No warranty on A/C gas refilling.",
          "Rework will be chargeable if due to misuse.",
        ]}
      />

      <SignatureRow />
      <DocumentFooter workshopName={workshopName} />
    </article>
  );
}
