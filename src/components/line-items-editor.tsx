"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { label } from "@/lib/utils";

type Decimalish = number | string | { toString(): string } | null | undefined;

export type EditableLineItem = {
  description: string;
  category: string;
  quantity: Decimalish;
  unitPrice: Decimalish;
};

type Row = {
  id: string;
  description: string;
  category: "PARTS" | "LABOUR";
  quantity: string;
  unitPrice: string;
};

function valueOf(value: Decimalish) {
  if (value == null) return "";
  return value.toString();
}

function numberFrom(value: string) {
  const match = value.replaceAll(",", "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function normalizeItem(item: EditableLineItem, index: number): Row {
  const category = item.category === "PARTS" || item.category === "OTHER" ? "PARTS" : "LABOUR";
  return {
    id: `${category}-${index}-${item.description}`,
    description: item.description,
    category,
    quantity: valueOf(item.quantity),
    unitPrice: valueOf(item.unitPrice),
  };
}

const inputClass =
  "h-10 w-full rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-3 text-sm font-semibold text-[#2f1233] outline-none transition placeholder:text-[#a88996] focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]";

export function LineItemsEditor({ items = [] }: { items?: EditableLineItem[] }) {
  const initialRows = items.length ? items.map(normalizeItem) : [];
  const [rows, setRows] = useState<Row[]>(initialRows);

  const totals = useMemo(() => {
    return rows.reduce(
      (result, row) => {
        const amount = numberFrom(row.quantity) * numberFrom(row.unitPrice);
        if (row.category === "PARTS") result.parts += amount;
        if (row.category === "LABOUR") result.labour += amount;
        return result;
      },
      { parts: 0, labour: 0 },
    );
  }, [rows]);

  function addRow(category: Row["category"]) {
    setRows((current) => [
      ...current,
      {
        id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        description: "",
        category,
        quantity: "1",
        unitPrice: "",
      },
    ]);
  }

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function section(category: Row["category"], title: string, empty: string) {
    const sectionRows = rows.filter((row) => row.category === category);

    return (
      <section className="overflow-hidden rounded-lg border border-[#e7c9c1] bg-[#fffaf5]">
        <div className="bg-[#f8e7df] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#5a173b]">
          {title}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-[#fff1e8] text-xs uppercase text-[#a55667]">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">{category === "PARTS" ? "Part Name" : "Service Name"}</th>
                <th className="px-3 py-2 text-left">Qty</th>
                <th className="px-3 py-2 text-left">Unit Price</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.length ? (
                sectionRows.map((row, index) => {
                  const amount = numberFrom(row.quantity) * numberFrom(row.unitPrice);
                  return (
                    <tr key={row.id} className="border-t border-[#f1ddd6]">
                      <td className="px-3 py-2 font-bold text-[#a55667]">{index + 1}</td>
                      <td className="px-3 py-2">
                        <input type="hidden" name="itemCategory" value={row.category === "PARTS" ? "PARTS" : "LABOUR"} />
                        <input
                          name="itemDescription"
                          value={row.description}
                          onChange={(event) => updateRow(row.id, "description", event.target.value)}
                          placeholder={category === "PARTS" ? "Cabin Air Filter" : "General Labour"}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          name="itemQuantity"
                          value={row.quantity}
                          onChange={(event) => updateRow(row.id, "quantity", event.target.value)}
                          placeholder="1"
                          className={inputClass}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          name="itemUnitPrice"
                          value={row.unitPrice}
                          onChange={(event) => updateRow(row.id, "unitPrice", event.target.value)}
                          placeholder="0.00"
                          className={inputClass}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#2f1233]">Rs. {money(amount)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-[#efb6bd] px-3 text-sm font-bold text-[#9d2f47] hover:bg-[#fde2e2]"
                          aria-label={`Remove ${label(category)}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm font-semibold italic text-[#a88996]">
                    {empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#f1ddd6] px-4 py-3">
          <button
            type="button"
            onClick={() => addRow(category)}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-black text-[#5a173b] hover:bg-[#fff1e8]"
          >
            <Plus className="h-4 w-4" />
            Add {category === "PARTS" ? "Part" : "Service"}
          </button>
          <p className="text-sm font-black text-[#4b1737]">Total: Rs. {money(category === "PARTS" ? totals.parts : totals.labour)}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      {section("PARTS", "Parts / Materials", "No parts added yet")}
      {section("LABOUR", "Labour / Services", "No services added yet")}
      <div className="ml-auto grid w-full max-w-sm gap-2 rounded-lg border border-[#e7c9c1] bg-[#f8e7df] p-4 text-sm font-semibold text-[#4b1737]">
        <div className="flex justify-between"><span>Parts Total</span><strong>Rs. {money(totals.parts)}</strong></div>
        <div className="flex justify-between"><span>Labour Total</span><strong>Rs. {money(totals.labour)}</strong></div>
        <div className="flex justify-between border-t border-[#d7a9ad] pt-2 text-base"><span>Grand Total</span><strong>Rs. {money(totals.parts + totals.labour)}</strong></div>
      </div>
    </div>
  );
}
