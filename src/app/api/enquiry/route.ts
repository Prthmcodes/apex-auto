import { NextResponse } from "next/server";

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

  // No email integration yet — just log it server-side for now.
  console.log("[enquiry]", {
    name: body.name,
    phone: body.phone,
    carReg: body.carReg,
    service: body.service,
    preferredDate: body.preferredDate,
    message: typeof body.message === "string" ? body.message : "",
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
