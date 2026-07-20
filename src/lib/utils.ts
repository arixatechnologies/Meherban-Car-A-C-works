import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function label(value: string | null | undefined) {
  if (!value) return "-";
  if (value === "CARD") return "Cards";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

export function vehicleMakeModel(brand: string | null | undefined, model: string | null | undefined) {
  const cleanBrand = (brand ?? "").trim();
  const cleanModel = (model ?? "").trim();

  if (!cleanBrand && !cleanModel) return "-";
  if (!cleanBrand) return cleanModel;
  if (!cleanModel) return cleanBrand;
  if (cleanBrand.toLowerCase() === cleanModel.toLowerCase()) return cleanBrand;

  return `${cleanBrand} ${cleanModel}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function statusTone(status: string) {
  if (["PAID", "APPROVED", "DELIVERED", "READY_FOR_DELIVERY", "SENT", "DELIVERED", "READ", "ACTIVE"].includes(status)) {
    return "success";
  }
  if (["HIGH", "URGENT", "FAILED", "REJECTED", "CANCELLED", "NOT_OK", "UNPAID"].includes(status)) {
    return "danger";
  }
  if (
    [
      "PENDING",
      "PARTIALLY_PAID",
      "WAITING_FOR_CUSTOMER_APPROVAL",
      "NEEDS_REVISION",
      "ATTENTION",
      "PAYMENT_PENDING",
      "PARTS_REQUIRED",
      "SHARED",
    ].includes(status)
  ) {
    return "warning";
  }
  return "neutral";
}
