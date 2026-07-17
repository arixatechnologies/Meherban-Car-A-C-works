"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type Decimalish = number | string | { toString(): string } | null | undefined;

export type EditableLineItem = {
  partService?: string | null;
  description: string;
  remarks?: string | null;
  category: string;
  quantity: Decimalish;
  unitPrice: Decimalish;
  amount?: Decimalish;
};

type Row = {
  id: string;
  partService: string;
  description: string;
  remarks: string;
  category: "PARTS" | "LABOUR";
  quantity: string;
  unitPrice: string;
  amount: string;
};

function valueOf(value: Decimalish) {
  if (value == null) return "";
  return value.toString();
}

function numberFrom(value: string) {
  const match = value.replaceAll(",", "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function strictNumber(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyInput(value: number) {
  return value ? value.toFixed(2) : "";
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function normalizeCategory(category: string): Row["category"] {
  return category === "PARTS" || category === "OTHER" ? "PARTS" : "LABOUR";
}

function normalizeItem(item: EditableLineItem, index: number): Row {
  const category = normalizeCategory(item.category);
  const partService = item.partService || item.description;
  const quantity = valueOf(item.quantity) || "1";
  const unitPrice = valueOf(item.unitPrice);
  const amount = valueOf(item.amount) || moneyInput(strictNumber(quantity) * strictNumber(unitPrice));

  return {
    id: `${category}-${index}-${partService}`,
    partService,
    description: item.partService ? item.description : "",
    remarks: item.remarks ?? "",
    category,
    quantity,
    unitPrice,
    amount,
  };
}

function blankRow(category: Row["category"]): Row {
  return {
    id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    partService: "",
    description: "",
    remarks: "",
    category,
    quantity: "",
    unitPrice: "",
    amount: "",
  };
}

const inputClass =
  "h-10 w-full rounded-md border-[1.5px] border-[#e3c0c9] bg-white px-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#8b0f2f] focus:ring-4 focus:ring-[#8b0f2f]/10";

export function LineItemsEditor({
  items = [],
  showRemarks = false,
}: {
  items?: EditableLineItem[];
  showRemarks?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(items.length ? items.map(normalizeItem) : []);

  const totals = useMemo(() => {
    return rows.reduce(
      (result, row) => {
        const amount = numberFrom(row.amount);
        if (row.category === "PARTS") result.parts += amount;
        if (row.category === "LABOUR") result.labour += amount;
        return result;
      },
      { parts: 0, labour: 0 },
    );
  }, [rows]);

  function addRow(category: Row["category"]) {
    setRows((current) => [...current, blankRow(category)]);
  }

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;

        const nextRow = { ...row, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          nextRow.amount = moneyInput(strictNumber(nextRow.quantity) * strictNumber(nextRow.unitPrice));
        }

        return nextRow;
      }),
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function section(category: Row["category"], title: string, empty: string) {
    const sectionRows = rows.filter((row) => row.category === category);
    const amountColSpan = 5;

    return (
      <section className="overflow-hidden rounded-lg border-[1.5px] border-[#d9a5b3] bg-white">
        <div className="inline-flex min-h-10 items-center rounded-br-md bg-[#8b0f2f] px-4 text-sm font-black uppercase tracking-wide text-white">
          {title}
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#fff3f6] text-[#650820]">
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Sr. No.</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Part / Service</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Description</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Qty.</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Unit Price</th>
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Amount</th>
                {showRemarks ? <th className="border border-[#ead0d7] px-2 py-2 uppercase">Remarks</th> : null}
                <th className="border border-[#ead0d7] px-2 py-2 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.length ? (
                sectionRows.map((row, index) => {
                  return (
                    <tr key={row.id}>
                      <td className="border border-[#ead0d7] px-2 py-2 text-center font-semibold">{index + 1}</td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input type="hidden" name="itemCategory" value={row.category === "PARTS" ? "PARTS" : "LABOUR"} />
                        <input
                          name="itemPartService"
                          value={row.partService}
                          onChange={(event) => updateRow(row.id, "partService", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="itemDescription"
                          value={row.description}
                          onChange={(event) => updateRow(row.id, "description", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="itemQuantity"
                          value={row.quantity}
                          onChange={(event) => updateRow(row.id, "quantity", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="itemUnitPrice"
                          type="text"
                          inputMode="decimal"
                          value={row.unitPrice}
                          onChange={(event) => updateRow(row.id, "unitPrice", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="border border-[#ead0d7] px-2 py-2">
                        <input
                          name="itemAmount"
                          type="text"
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(event) => updateRow(row.id, "amount", event.target.value)}
                          className={inputClass}
                        />
                      </td>
                      {showRemarks ? (
                        <td className="border border-[#ead0d7] px-2 py-2">
                          <input
                          name="itemRemarks"
                          value={row.remarks}
                          onChange={(event) => updateRow(row.id, "remarks", event.target.value)}
                          className={inputClass}
                        />
                        </td>
                      ) : null}
                      <td className="border border-[#ead0d7] px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe5ec] text-[#650820] transition hover:bg-[#8b0f2f] hover:text-white"
                          aria-label={`Remove ${title}`}
                          title="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="border border-[#ead0d7] px-3 py-5 text-center text-sm font-semibold text-slate-500" colSpan={showRemarks ? 8 : 7}>
                    {empty}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#fff3f6] font-black text-[#650820]">
                <td className="border border-[#ead0d7] px-3 py-2 text-right uppercase" colSpan={amountColSpan}>
                  Total
                </td>
                <td className="border border-[#ead0d7] px-3 py-2 text-right">{money(category === "PARTS" ? totals.parts : totals.labour)}</td>
                <td className="border border-[#ead0d7]" colSpan={showRemarks ? 2 : 1} />
              </tr>
            </tfoot>
          </table>

          <div className="mt-3 flex justify-start">
            <button
              type="button"
              onClick={() => addRow(category)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#8b0f2f] px-4 text-sm font-black text-white transition hover:bg-[#650820]"
            >
              <Plus className="h-4 w-4" />
              Add {category === "PARTS" ? "Part / Material" : "Labour / Service"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {section("PARTS", "Parts / Materials", "Click Add Part / Material to enter items.")}
      {section("LABOUR", "Labour / Services", "Click Add Labour / Service to enter items.")}
      <div className="ml-auto grid w-full max-w-sm gap-2 rounded-lg border-[1.5px] border-[#d9a5b3] bg-[#fff3f6] p-4 text-sm font-bold text-[#650820]">
        <div className="flex justify-between">
          <span>Parts Total</span>
          <strong>{money(totals.parts)}</strong>
        </div>
        <div className="flex justify-between">
          <span>Labour Total</span>
          <strong>{money(totals.labour)}</strong>
        </div>
        <div className="flex justify-between border-t border-[#d9a5b3] pt-2 text-base">
          <span>Grand Total</span>
          <strong>{money(totals.parts + totals.labour)}</strong>
        </div>
      </div>
    </div>
  );
}
