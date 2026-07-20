import { Fragment } from "react";
import { ClipboardList, MessageCircle, Package, Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import {
  CustomerVehicleBlocks,
  DocBox,
  DocumentFooter,
  DocumentHeader,
  NotesAndTerms,
  SignatureRow,
  maroon,
  maroonBorder,
  moneyText,
} from "@/components/document-preview-ui";
import { ItemCategory } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export async function EstimatePreview({ id }: { id: string }) {
  const [estimate, setting] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        serviceAdvisor: true,
        jobCard: true,
        items: true,
      },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!estimate) notFound();

  const serviceAdvisorName = estimate.jobCard.serviceAdvisorName || estimate.serviceAdvisor?.name || "Meharban";
  const workshopName = setting?.workshopName || "Meharban Car A/C Works";
  const complaints = [...estimate.jobCard.complaints, estimate.jobCard.customComplaint].filter(Boolean).join(", ");
  const partsItems = estimate.items.filter((item) => item.category === ItemCategory.PARTS || item.category === ItemCategory.OTHER);
  const labourItems = estimate.items.filter((item) => item.category === ItemCategory.SERVICE || item.category === ItemCategory.LABOUR);
  const partsTotal = partsItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const labourTotal = labourItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const discountAmount = Number(estimate.discount);
  const hasDiscount = discountAmount > 0;
  const allRows = [
    { heading: "Parts / Materials", icon: <Package className="h-5 w-5" />, items: partsItems },
    { heading: "Labour / Services", icon: <Wrench className="h-5 w-5" />, items: labourItems },
  ];
  let rowNumber = 0;

  return (
    <article className="document-lock-font print-page mx-auto max-w-[1120px] rounded-xl border border-[#d8a1b1] bg-white p-5 text-slate-950 shadow-sm print:rounded-none print:p-4">
      <DocumentHeader
        title="Estimation"
        infoTitle="Estimation Information"
        setting={setting}
        rows={[
          { label: "Estimate No.", value: estimate.estimateNumber },
          { label: "Date", value: formatDate(estimate.date) },
          { label: "Service Advisor", value: serviceAdvisorName },
        ]}
      />

      <CustomerVehicleBlocks
        customer={estimate.customer}
        vehicle={estimate.vehicle}
        deliveryDate={estimate.jobCard.expectedDeliveryAt ? `${formatDate(estimate.jobCard.expectedDeliveryAt)} (Expected)` : "-"}
      />

      <DocBox
        title="Complaint / Issue Reported By Customer"
        icon={<MessageCircle className="h-5 w-5" />}
        className="mt-3"
      >
        <p className="text-[14px] leading-6">{estimate.problemSummary || complaints || "-"}</p>
      </DocBox>

      <section className={`mt-3 overflow-hidden rounded-lg border ${maroonBorder}`}>
        <div className={`inline-flex min-h-10 items-center gap-2 rounded-br-md ${maroon} px-4 text-sm font-bold uppercase tracking-wide text-white`}>
          <ClipboardList className="h-5 w-5" />
          Estimated Parts / Materials & Labour
        </div>
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-[#fbedf2] text-[#7a0d2b]">
            <tr>
              <th className="border border-[#ead0d8] px-2 py-2">Sr. No.</th>
              <th className="border border-[#ead0d8] px-2 py-2">Part / Service</th>
              <th className="border border-[#ead0d8] px-2 py-2">Description</th>
              <th className="border border-[#ead0d8] px-2 py-2">Qty</th>
              <th className="border border-[#ead0d8] px-2 py-2">Unit Price (₹)</th>
              <th className="border border-[#ead0d8] px-2 py-2">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((group) =>
              group.items.length ? (
                <Fragment key={group.heading}>
                  <tr className="bg-white text-[#7a0d2b]">
                    <td className="border border-[#ead0d8] px-3 py-2 font-bold" colSpan={6}>
                      <span className="inline-flex items-center gap-2">
                        {group.icon}
                        {group.heading}
                      </span>
                    </td>
                  </tr>
                  {group.items.map((item) => {
                    rowNumber += 1;
                    const isLabour = item.category === ItemCategory.SERVICE || item.category === ItemCategory.LABOUR;
                    return (
                      <tr key={item.id}>
                        <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{rowNumber}</td>
                        <td className="border border-[#ead0d8] px-2 py-1.5">{item.partService || item.description}</td>
                        <td className="border border-[#ead0d8] px-2 py-1.5">
                          {item.partService ? item.description : item.category === ItemCategory.PARTS ? "Parts / Materials" : "Labour / Service"}
                        </td>
                        <td className="border border-[#ead0d8] px-2 py-1.5 text-center">{isLabour ? "-" : item.quantity.toString()}</td>
                        <td className="whitespace-nowrap border border-[#ead0d8] px-2 py-1.5 text-right tabular-nums">{isLabour ? "-" : moneyText(item.unitPrice)}</td>
                        <td className="whitespace-nowrap border border-[#ead0d8] px-2 py-1.5 text-right tabular-nums">{moneyText(item.amount)}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ) : null,
            )}
            {!estimate.items.length ? (
              <tr>
                <td className="border border-[#ead0d8] px-2 py-4 text-center" colSpan={6}>
                  No estimation items added.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-[#ead0d8] px-2 py-2" colSpan={3} rowSpan={hasDiscount ? 5 : 4} />
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right font-bold text-[#7a0d2b]" colSpan={2}>Total Parts Amount (₹)</td>
              <td className="whitespace-nowrap border border-[#ead0d8] px-3 py-1.5 text-right tabular-nums">{moneyText(partsTotal)}</td>
            </tr>
            <tr>
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right font-bold text-[#7a0d2b]" colSpan={2}>Total Labour Amount (₹)</td>
              <td className="whitespace-nowrap border border-[#ead0d8] px-3 py-1.5 text-right tabular-nums">{moneyText(labourTotal)}</td>
            </tr>
            <tr>
              <td className="border border-[#ead0d8] px-3 py-1.5 text-right font-bold text-[#7a0d2b]" colSpan={2}>Sub Total (₹)</td>
              <td className="whitespace-nowrap border border-[#ead0d8] px-3 py-1.5 text-right tabular-nums">{moneyText(partsTotal + labourTotal)}</td>
            </tr>
            {hasDiscount ? (
              <tr>
                <td className="border border-[#ead0d8] px-3 py-1.5 text-right font-bold text-[#7a0d2b]" colSpan={2}>Discount (₹)</td>
                <td className="whitespace-nowrap border border-[#ead0d8] px-3 py-1.5 text-right tabular-nums">- {moneyText(estimate.discount)}</td>
              </tr>
            ) : null}
            <tr className={`${maroon} text-base font-black text-white`}>
              <td className="border border-[#ead0d8] px-3 py-2 text-right uppercase" colSpan={2}>Grand Total (₹)</td>
              <td className="whitespace-nowrap border border-[#ead0d8] px-3 py-2 text-right tabular-nums">{moneyText(estimate.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <NotesAndTerms
        notes={[
          "This estimation is valid up to the date mentioned above.",
          "Additional parts or labour may be required after inspection.",
          "Work will be started only after your confirmation.",
          "No GST applicable.",
        ]}
        terms={[
          "All parts are genuine / good quality.",
          "Warranty is applicable as per our policy.",
          "Estimate may change if new issues are found.",
          "Payment to be made after job completion.",
        ]}
      />

      <SignatureRow approvalText />

      <DocumentFooter workshopName={workshopName} />
    </article>
  );
}
