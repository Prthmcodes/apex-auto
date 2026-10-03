"use client";

import { useId, useState, type FormEvent } from "react";
import { siteContent } from "@/content/site";
import { theme } from "@/components/scene/theme";

type FieldErrors = Partial<
  Record<"name" | "phone" | "carReg" | "service" | "preferredDate", string>
>;

const SERVICE_OPTIONS = [...siteContent.services.map((s) => s.name), "Not sure"];

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function EnquiryForm() {
  const idPrefix = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [carReg, setCarReg] = useState("");
  const [service, setService] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot — real users leave this blank

  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string>(
    siteContent.enquiryForm.errorMessage
  );

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!phone.trim()) next.phone = "Please enter a phone number.";
    if (!carReg.trim()) next.carReg = "Please enter your car's registration.";
    if (!service) next.service = "Please choose a service.";
    if (!preferredDate) next.preferredDate = "Please choose a preferred date.";
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          carReg,
          service,
          preferredDate,
          message,
          company,
        }),
      });

      const data: { ok: boolean; error?: string } | null = await response
        .json()
        .catch(() => null);

      if (!response.ok || !data?.ok) {
        setErrorMessage(data?.error || siteContent.enquiryForm.errorMessage);
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage(siteContent.enquiryForm.errorMessage);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border p-6 text-center text-base text-white"
        style={{ borderColor: `${theme.primary}4D`, backgroundColor: `${theme.primary}1A` }}
      >
        {siteContent.enquiryForm.successMessage}
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  const labelClass = "mb-1.5 block text-sm font-medium text-white/80";
  const errorClass = "mt-1 text-sm text-red-400";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor={`${idPrefix}-name`} className={labelClass}>
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          autoComplete="name"
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${idPrefix}-name-error` : undefined}
        />
        {errors.name && (
          <p id={`${idPrefix}-name-error`} className={errorClass}>
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-phone`} className={labelClass}>
          Phone number
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          autoComplete="tel"
          className={fieldClass}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? `${idPrefix}-phone-error` : undefined}
        />
        {errors.phone && (
          <p id={`${idPrefix}-phone-error`} className={errorClass}>
            {errors.phone}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-carReg`} className={labelClass}>
          Car registration
        </label>
        <input
          id={`${idPrefix}-carReg`}
          type="text"
          className={`${fieldClass} uppercase`}
          value={carReg}
          onChange={(e) => setCarReg(e.target.value)}
          aria-invalid={Boolean(errors.carReg)}
          aria-describedby={errors.carReg ? `${idPrefix}-carReg-error` : undefined}
        />
        {errors.carReg && (
          <p id={`${idPrefix}-carReg-error`} className={errorClass}>
            {errors.carReg}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-service`} className={labelClass}>
          Service
        </label>
        <select
          id={`${idPrefix}-service`}
          className={fieldClass}
          value={service}
          onChange={(e) => setService(e.target.value)}
          aria-invalid={Boolean(errors.service)}
          aria-describedby={errors.service ? `${idPrefix}-service-error` : undefined}
        >
          <option value="">Choose a service…</option>
          {SERVICE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.service && (
          <p id={`${idPrefix}-service-error`} className={errorClass}>
            {errors.service}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-date`} className={labelClass}>
          Preferred date
        </label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          min={todayISODate()}
          className={fieldClass}
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          aria-invalid={Boolean(errors.preferredDate)}
          aria-describedby={
            errors.preferredDate ? `${idPrefix}-date-error` : undefined
          }
        />
        {errors.preferredDate && (
          <p id={`${idPrefix}-date-error`} className={errorClass}>
            {errors.preferredDate}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-message`} className={labelClass}>
          Anything else? (optional)
        </label>
        <textarea
          id={`${idPrefix}-message`}
          rows={4}
          className={fieldClass}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Honeypot — hidden from real users (including keyboard/screen-reader
          users), left for bots that fill in every field. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor={`${idPrefix}-company`}>Company</label>
        <input
          id={`${idPrefix}-company`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 flex min-h-[52px] items-center justify-center rounded-full px-6 text-base font-semibold uppercase tracking-wide transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
        style={{ backgroundColor: theme.primary, color: theme.background }}
      >
        {status === "submitting"
          ? siteContent.enquiryForm.submittingLabel
          : siteContent.enquiryForm.submitLabel}
      </button>
    </form>
  );
}
