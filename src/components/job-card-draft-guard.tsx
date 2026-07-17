"use client";

import { useEffect, useRef, useState } from "react";

type DraftFields = Record<string, string | string[]>;

type DraftPayload = {
  version: 1;
  savedAt: number;
  fields: DraftFields;
};

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isFormControl(element: unknown): element is FormControl {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}

function namedControls(form: HTMLFormElement) {
  return Array.from(form.elements).filter((element): element is FormControl => {
    if (!isFormControl(element)) return false;
    if (!element.name || element.disabled || element.type === "hidden" || element.type === "button" || element.type === "submit") {
      return false;
    }
    return true;
  });
}

function fieldValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
    return field.value.trim();
  }
  return "";
}

function firstField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof RadioNodeList) {
    const item = Array.from({ length: field.length }, (_, index) => field.item(index)).find(isFormControl);
    return item ?? null;
  }
  return isFormControl(field) ? field : null;
}

function mobileDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizePhoneInput(value: string) {
  return mobileDigits(value).replace(/^91(?=\d{10}$)/, "").slice(0, 10);
}

function sanitizePhoneFields(form: HTMLFormElement) {
  for (const name of ["customerMobile", "customerWhatsapp"]) {
    const field = firstField(form, name);
    if (!(field instanceof HTMLInputElement)) continue;

    const nextValue = normalizePhoneInput(field.value);
    if (field.value !== nextValue) {
      field.value = nextValue;
    }
  }
}

function readDraft(storageKey: string): DraftPayload | null {
  try {
    const rawDraft = window.localStorage.getItem(storageKey);
    if (!rawDraft) return null;
    const draft = JSON.parse(rawDraft) as DraftPayload;
    return draft?.fields ? draft : null;
  } catch {
    return null;
  }
}

function serializeForm(form: HTMLFormElement): DraftFields {
  const fields: DraftFields = {};
  const counters = new Map<string, number>();

  for (const control of namedControls(form)) {
    const index = counters.get(control.name) ?? 0;
    counters.set(control.name, index + 1);

    if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
      if (!control.checked) continue;
    }

    const existing = fields[control.name];
    if (index > 0 || Array.isArray(existing)) {
      fields[control.name] = [...(Array.isArray(existing) ? existing : existing ? [existing] : []), control.value];
    } else {
      fields[control.name] = control.value;
    }
  }

  return fields;
}

function saveDraft(form: HTMLFormElement, storageKey: string) {
  const fields = serializeForm(form);
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      fields,
    } satisfies DraftPayload),
  );
}

function restoreDraft(form: HTMLFormElement, draft: DraftPayload) {
  const counters = new Map<string, number>();

  for (const control of namedControls(form)) {
    const value = draft.fields[control.name];
    if (value == null) continue;

    const index = counters.get(control.name) ?? 0;
    counters.set(control.name, index + 1);

    const nextValue = Array.isArray(value) ? value[index] : value;
    if (nextValue == null) continue;

    if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
      control.checked = Array.isArray(value) ? value.includes(control.value) : value === control.value;
    } else {
      control.value = nextValue;
    }

    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function setFieldError(field: FormControl | null, message: string) {
  if (!field) return;

  field.classList.add("job-card-invalid-field");
  field.setAttribute("aria-invalid", "true");

  const existing = field.parentElement?.querySelector<HTMLElement>(".job-card-field-error");
  if (existing) {
    existing.textContent = message;
    return;
  }

  const error = document.createElement("p");
  error.className = "job-card-field-error";
  error.textContent = message;
  field.insertAdjacentElement("afterend", error);
}

function clearFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll(".job-card-invalid-field").forEach((element) => {
    element.classList.remove("job-card-invalid-field");
    element.removeAttribute("aria-invalid");
  });
  form.querySelectorAll(".job-card-field-error").forEach((element) => element.remove());
}

function validateJobCardForm(form: HTMLFormElement) {
  clearFieldErrors(form);

  const missing: FormControl[] = [];
  const customerId = fieldValue(form, "customerId");
  const vehicleId = fieldValue(form, "vehicleId");
  const customerName = fieldValue(form, "customerName");
  const customerMobile = fieldValue(form, "customerMobile");
  const customerWhatsapp = fieldValue(form, "customerWhatsapp");
  const vehicleNumber = fieldValue(form, "newVehicleNumber");
  const makeModel = fieldValue(form, "newVehicleMakeModel");
  const fuelType = fieldValue(form, "newVehicleFuelType");

  if (!customerId && !vehicleId) {
    if (!customerName) {
      const field = firstField(form, "customerName");
      setFieldError(field, "Enter customer name.");
      if (field) missing.push(field);
    }
    if (!customerMobile) {
      const field = firstField(form, "customerMobile");
      setFieldError(field, "Enter mobile number.");
      if (field) missing.push(field);
    } else if (mobileDigits(customerMobile).length !== 10) {
      const field = firstField(form, "customerMobile");
      setFieldError(field, "Enter exactly 10 digits.");
      if (field) missing.push(field);
    }
  }

  if (customerWhatsapp && mobileDigits(customerWhatsapp).length !== 10) {
    const field = firstField(form, "customerWhatsapp");
    setFieldError(field, "Enter exactly 10 digits.");
    if (field) missing.push(field);
  }

  if (!vehicleId) {
    if (!vehicleNumber) {
      const field = firstField(form, "newVehicleNumber");
      setFieldError(field, "Enter vehicle registration number.");
      if (field) missing.push(field);
    }
    if (!makeModel) {
      const field = firstField(form, "newVehicleMakeModel");
      setFieldError(field, "Enter car make and model.");
      if (field) missing.push(field);
    }
    if (!fuelType) {
      const field = firstField(form, "newVehicleFuelType");
      setFieldError(field, "Select fuel type.");
      if (field) missing.push(field);
    }
  }

  return missing;
}

export function JobCardDraftGuard({ enabled, storageKey }: { enabled: boolean; storageKey: string }) {
  const markerRef = useRef<HTMLDivElement | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const form = markerRef.current?.closest("form");
    if (!(form instanceof HTMLFormElement)) return;
    form.dataset.jobCardGuardReady = "true";

    const draft = readDraft(storageKey);
    if (draft) {
      restoreDraft(form, draft);
      window.setTimeout(() => setDraftRestored(true), 0);
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleSave = () => {
      sanitizePhoneFields(form);
      if (timeout) window.clearTimeout(timeout);
      timeout = setTimeout(() => saveDraft(form, storageKey), 50);
    };

    const handleSubmit = (event: SubmitEvent) => {
      sanitizePhoneFields(form);
      const missing = validateJobCardForm(form);
      saveDraft(form, storageKey);

      if (!missing.length) return;

      event.preventDefault();
      missing[0].focus({ preventScroll: true });
      missing[0].scrollIntoView({ block: "center", behavior: "smooth" });
    };

    const handleReset = () => {
      window.localStorage.removeItem(storageKey);
      setDraftRestored(false);
      setTimeout(() => clearFieldErrors(form), 0);
    };

    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);
    form.addEventListener("click", scheduleSave);
    form.addEventListener("submit", handleSubmit, { capture: true });
    form.addEventListener("reset", handleReset);

    return () => {
      if (timeout) window.clearTimeout(timeout);
      delete form.dataset.jobCardGuardReady;
      form.removeEventListener("input", scheduleSave);
      form.removeEventListener("change", scheduleSave);
      form.removeEventListener("click", scheduleSave);
      form.removeEventListener("submit", handleSubmit, { capture: true });
      form.removeEventListener("reset", handleReset);
    };
  }, [enabled, storageKey]);

  return (
    <>
      <div ref={markerRef} hidden />
      {enabled && draftRestored ? (
        <div className="mb-4 rounded-lg border border-[#f0cf8f] bg-[#fff7df] px-4 py-3 text-sm font-bold text-[#7a4b0b]">
          Draft restored. Continue editing, or use Clear Form to remove this draft.
        </div>
      ) : null}
    </>
  );
}
