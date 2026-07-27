"use client";

import { useEffect, useState } from "react";

type FieldError = {
  name: string;
  message: string;
};

const customerDetailNames = ["customerName", "customerMobile", "customerWhatsapp", "customerAddress"];
const vehicleDetailNames = [
  "newVehicleNumber",
  "newVehicleMakeModel",
  "newVehicleFuelType",
  "newVehicleVariant",
  "newVehicleYear",
  "newVehicleOdometer",
];

function namedControl(form: HTMLFormElement, name: string) {
  const element = form.elements.namedItem(name);
  if (!element) return null;
  if (element instanceof RadioNodeList) {
    const item = element.item(0) as Element | null;
    return item instanceof HTMLInputElement || item instanceof HTMLSelectElement || item instanceof HTMLTextAreaElement ? item : null;
  }
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
    ? element
    : null;
}

function valueOf(form: HTMLFormElement, name: string) {
  return namedControl(form, name)?.value.trim() ?? "";
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function hasAnyValue(form: HTMLFormElement, names: string[]) {
  return names.some((name) => valueOf(form, name));
}

function isExistingEdit(form: HTMLFormElement) {
  return Boolean(form.querySelector('input[type="hidden"][name="customerId"]'));
}

function isFormControl(target: EventTarget | null): target is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

function clearSelectValue(form: HTMLFormElement, name: string) {
  const control = namedControl(form, name);
  if (control instanceof HTMLSelectElement) {
    control.value = "";
  }
}

function clearStaleExistingSelections(form: HTMLFormElement, target: EventTarget | null) {
  if (isExistingEdit(form) || !isFormControl(target) || target instanceof HTMLSelectElement || !target.value.trim()) {
    return;
  }

  if (customerDetailNames.includes(target.name)) {
    clearSelectValue(form, "customerId");
    clearSelectValue(form, "vehicleId");
  }

  if (vehicleDetailNames.includes(target.name)) {
    clearSelectValue(form, "vehicleId");
  }
}

function clearSelectionsForEnteredDetails(form: HTMLFormElement) {
  if (isExistingEdit(form)) return;

  const hasCustomerDetails = hasAnyValue(form, customerDetailNames);
  const hasVehicleDetails = hasAnyValue(form, vehicleDetailNames);

  if (hasCustomerDetails) {
    clearSelectValue(form, "customerId");
    if (!hasVehicleDetails) {
      clearSelectValue(form, "vehicleId");
    }
  }

  if (hasVehicleDetails) {
    clearSelectValue(form, "vehicleId");
  }
}

function clearFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll(".job-card-field-error[data-validation-generated='true']").forEach((node) => node.remove());
  form.querySelectorAll(".job-card-invalid-field").forEach((node) => {
    node.classList.remove("job-card-invalid-field");
    if (node instanceof HTMLElement) node.removeAttribute("aria-invalid");
  });
}

function showFieldError(form: HTMLFormElement, error: FieldError) {
  const control = namedControl(form, error.name);
  if (!control) return;

  control.classList.add("job-card-invalid-field");
  control.setAttribute("aria-invalid", "true");

  const message = document.createElement("p");
  message.className = "job-card-field-error";
  message.dataset.validationGenerated = "true";
  message.textContent = error.message;
  control.insertAdjacentElement("afterend", message);
}

function validateJobCardForm(form: HTMLFormElement) {
  const errors: FieldError[] = [];
  const customerId = valueOf(form, "customerId");
  const vehicleId = valueOf(form, "vehicleId");
  const editing = isExistingEdit(form);
  const shouldValidateCustomer = editing || (!customerId && !vehicleId) || hasAnyValue(form, customerDetailNames);
  const shouldValidateVehicle = editing || !vehicleId || hasAnyValue(form, vehicleDetailNames);
  const customerMobile = digits(valueOf(form, "customerMobile"));
  const alternateMobile = digits(valueOf(form, "customerWhatsapp"));

  if (shouldValidateCustomer && !customerMobile) {
    errors.push({ name: "customerMobile", message: "Enter customer contact number." });
  } else if (customerMobile && customerMobile.length !== 10) {
    errors.push({ name: "customerMobile", message: "Enter valid 10 digit contact number." });
  }

  if (alternateMobile && alternateMobile.length !== 10) {
    errors.push({ name: "customerWhatsapp", message: "Enter valid 10 digit alternate number." });
  }

  if (shouldValidateVehicle && !valueOf(form, "newVehicleNumber")) {
    errors.push({ name: "newVehicleNumber", message: "Enter vehicle registration number." });
  }

  if (shouldValidateVehicle && !valueOf(form, "newVehicleFuelType")) {
    errors.push({ name: "newVehicleFuelType", message: "Select fuel type." });
  }

  if (shouldValidateVehicle && !valueOf(form, "newVehicleMakeModel")) {
    errors.push({ name: "newVehicleMakeModel", message: "Enter car make / model." });
  }

  const jobCardDate = valueOf(form, "jobCardDate");
  if (jobCardDate && !/^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(jobCardDate)) {
    errors.push({ name: "jobCardDate", message: "Enter date in DD/MM/YYYY format." });
  }

  return errors;
}

export function JobCardValidationGuard() {
  const [errors, setErrors] = useState<FieldError[]>([]);

  useEffect(() => {
    const form = document.getElementById("job-card-form");
    if (!(form instanceof HTMLFormElement)) return;
    const jobCardForm = form;

    function handleSubmit(event: SubmitEvent) {
      if (!(event.currentTarget instanceof HTMLFormElement)) return;
      clearSelectionsForEnteredDetails(event.currentTarget);
      clearFieldErrors(event.currentTarget);
      const nextErrors = validateJobCardForm(event.currentTarget);
      setErrors(nextErrors);

      if (!nextErrors.length) return;

      event.preventDefault();
      nextErrors.forEach((error) => showFieldError(event.currentTarget as HTMLFormElement, error));
      const firstControl = namedControl(event.currentTarget, nextErrors[0].name);
      firstControl?.focus();
      firstControl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function handleInput(event: Event) {
      const target = event.target;
      clearStaleExistingSelections(jobCardForm, target);
      if (!(target instanceof HTMLElement) || !target.classList.contains("job-card-invalid-field")) return;
      clearFieldErrors(jobCardForm);
      const nextErrors = validateJobCardForm(jobCardForm);
      setErrors(nextErrors);
      nextErrors.forEach((error) => showFieldError(jobCardForm, error));
    }

    jobCardForm.addEventListener("submit", handleSubmit);
    jobCardForm.addEventListener("input", handleInput);
    jobCardForm.addEventListener("change", handleInput);

    return () => {
      jobCardForm.removeEventListener("submit", handleSubmit);
      jobCardForm.removeEventListener("input", handleInput);
      jobCardForm.removeEventListener("change", handleInput);
    };
  }, []);

  if (!errors.length) return null;

  return (
    <section className="mb-4 rounded-lg border-2 border-[#dc2626] bg-[#fff1f2] p-4 text-sm font-bold text-[#991b1b]">
      <p className="text-base font-black">Please fill the mandatory fields below.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={`${error.name}-${error.message}`}>{error.message}</li>
        ))}
      </ul>
    </section>
  );
}
