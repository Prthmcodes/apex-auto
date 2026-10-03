import { Resend } from "resend";
import { siteContent } from "@/content/site";

export type EnquiryDetails = {
  name: string;
  phone: string;
  carReg: string;
  service: string;
  preferredDate: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSubject() {
  return `New enquiry — ${siteContent.business.name}`;
}

function buildPlainText(details: EnquiryDetails) {
  return [
    `New booking enquiry — ${siteContent.business.name}`,
    "",
    `Name: ${details.name}`,
    `Phone: ${details.phone}`,
    `Car registration: ${details.carReg}`,
    `Service: ${details.service}`,
    `Preferred date: ${details.preferredDate}`,
    `Message: ${details.message || "(none)"}`,
    "",
    `Received: ${new Date().toISOString()}`,
  ].join("\n");
}

function buildHtml(details: EnquiryDetails) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#667;font-weight:600;white-space:nowrap;">${escapeHtml(
      label
    )}</td><td style="padding:4px 0;">${escapeHtml(value)}</td></tr>`;

  return `
    <div style="font-family:sans-serif;font-size:15px;color:#111;">
      <h2 style="margin:0 0 12px;">New booking enquiry — ${escapeHtml(
        siteContent.business.name
      )}</h2>
      <table cellpadding="0" cellspacing="0">
        ${row("Name", details.name)}
        ${row("Phone", details.phone)}
        ${row("Car registration", details.carReg)}
        ${row("Service", details.service)}
        ${row("Preferred date", details.preferredDate)}
        ${row("Message", details.message || "(none)")}
      </table>
      <p style="margin-top:16px;color:#888;font-size:12px;">
        Received ${new Date().toISOString()}
      </p>
    </div>
  `;
}

function logEnquiryToConsole(details: EnquiryDetails) {
  console.log("[enquiry]", { ...details, receivedAt: new Date().toISOString() });
}

/**
 * Sends the enquiry by email via Resend. If RESEND_API_KEY, ENQUIRY_TO_EMAIL
 * or ENQUIRY_FROM_EMAIL aren't set (e.g. local dev), or if sending fails for
 * any reason, falls back to logging the enquiry to the console with a clear
 * warning — the enquiry is never silently lost, and the caller still treats
 * this as a success so a transient email problem doesn't block a genuine
 * customer enquiry.
 */
export async function sendEnquiryEmail(details: EnquiryDetails): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_TO_EMAIL;
  const from = process.env.ENQUIRY_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn(
      "[enquiry] RESEND_API_KEY/ENQUIRY_TO_EMAIL/ENQUIRY_FROM_EMAIL not fully set — logging enquiry instead of emailing it."
    );
    logEnquiryToConsole(details);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: buildSubject(),
      text: buildPlainText(details),
      html: buildHtml(details),
    });

    if (error) {
      console.error("[enquiry] Resend send failed, logging enquiry instead:", error);
      logEnquiryToConsole(details);
    }
  } catch (error) {
    console.error("[enquiry] Unexpected error sending email, logging enquiry instead:", error);
    logEnquiryToConsole(details);
  }
}
