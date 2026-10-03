import { NextResponse } from "next/server";
import { siteContent } from "@/content/site";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";
import { sendEnquiryEmail } from "@/lib/enquiryMailer";

type EnquiryPayload = {
  name?: unknown;
  phone?: unknown;
  carReg?: unknown;
  service?: unknown;
  preferredDate?: unknown;
  message?: unknown;
  company?: unknown; // honeypot
};

const REQUIRED_FIELDS = ["name", "phone", "carReg", "service", "preferredDate"] as const;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export async function POST(request: Request) {
  // Rate limit first, before any parsing/validation work, so it also
  // covers malformed or honeypot-triggering requests, not just valid ones.
  if (!checkRateLimit(getClientKey(request))) {
    return NextResponse.json(
      { ok: false, error: siteContent.enquiryForm.rateLimitMessage },
      { status: 429 }
    );
  }

  let body: EnquiryPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: real users never see or fill this field. A bot that fills in
  // every field gets a plain success response — no log, no tell that it
  // was caught.
  if (isNonEmptyString(body.company, 500)) {
    return NextResponse.json({ ok: true });
  }

  const missing = REQUIRED_FIELDS.filter((field) => !isNonEmptyString(body[field], 200));
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Missing required field(s): ${missing.join(", ")}.` },
      { status: 400 }
    );
  }

  if (body.message !== undefined && !isNonEmptyString(body.message, 2000) && body.message !== "") {
    return NextResponse.json({ ok: false, error: "Message is too long." }, { status: 400 });
  }

  await sendEnquiryEmail({
    name: body.name as string,
    phone: body.phone as string,
    carReg: body.carReg as string,
    service: body.service as string,
    preferredDate: body.preferredDate as string,
    message: typeof body.message === "string" ? body.message : "",
  });

  return NextResponse.json({ ok: true });
}
