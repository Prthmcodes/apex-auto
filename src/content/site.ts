// Single source of truth for every real-world business fact on the site.
// Anything prefixed PLACEHOLDER must be replaced with the real value before
// this site goes anywhere near a customer. Never invent reviews, prices, or
// contact details to fill these in — leave them as placeholders instead.

export const siteContent = {
  business: {
    name: "Apex Auto",
    area: "East London",
    tagline: "PLACEHOLDER — one-line tagline for the garage",
    address: "PLACEHOLDER — street address",
    phone: "PLACEHOLDER — phone number",
    email: "PLACEHOLDER — email address",
    hours: "PLACEHOLDER — opening hours",
  },

  cta: {
    callNowLabel: "Call us",
    callNowHref: "tel:PLACEHOLDER_PHONE_NUMBER",
    bookNowLabel: "Book a service",
    bookNowHref: "/book",
    topBarBookLabel: "Book",
  },

  // The six scroll stages of the home page fly-through. "range" is the
  // [start, end] slice of scroll progress (0 to 1) each stage owns —
  // used to fade its caption in/out and to pick its camera position.
  stages: [
    {
      id: "arrive",
      title: "Arrive",
      caption: "Rolling up to the forecourt.",
      range: [0, 0.1],
    },
    {
      id: "inspect",
      title: "Inspect / MOT",
      caption: "A first look over, before the MOT check.",
      range: [0.1, 0.3],
    },
    {
      id: "wheels",
      title: "Wheels & brakes",
      caption: "Tyres, brakes and the running gear.",
      range: [0.3, 0.5],
    },
    {
      id: "engine",
      title: "Engine & servicing",
      caption: "Under the bonnet for a full service check.",
      range: [0.5, 0.7],
    },
    {
      id: "diagnostics",
      title: "Diagnostics",
      caption: "Full diagnostics, line by line.",
      range: [0.7, 0.9],
    },
    {
      id: "done",
      title: "Done",
      caption: "All done — ready when you are.",
      range: [0.9, 1],
    },
  ],

  // The engine-bay check points highlighted in turn during the "engine"
  // stage. These are framed as the real checks the garage performs, not a
  // fake readout — see EngineBay.tsx.
  engineChecks: {
    intro: "We check:",
    points: ["Oil level", "Coolant", "Battery", "Brake fluid"] as string[],
  },

  // The real-world body colour of the car model, applied with clearcoat in
  // CarModel.tsx. Change this one value to re-colour the car.
  carColor: "#0b0b0d",

  // The /book page's services list. Names are fixed (given directly, not
  // invented); descriptions are placeholders pending real copy.
  services: [
    {
      name: "MOT",
      description: "PLACEHOLDER — one-line description of the MOT testing service.",
    },
    {
      name: "Servicing",
      description: "PLACEHOLDER — one-line description of the servicing options on offer.",
    },
    {
      name: "Brakes and tyres",
      description: "PLACEHOLDER — one-line description of brake and tyre work.",
    },
    {
      name: "Diagnostics",
      description: "PLACEHOLDER — one-line description of the diagnostics service.",
    },
  ],

  // Shown instead of a price on every service card. Never replace this with
  // an invented number — only a real, owner-confirmed price list.
  pricingNote: "Ask for a quote",

  reviews: [] as Array<{ author: string; quote: string }>,
  // PLACEHOLDER — never invent reviews. Add only real, owner-supplied quotes.

  pricing: [] as Array<{ label: string; price: string }>,
  // PLACEHOLDER — never invent prices. Add only real, owner-confirmed prices.

  enquiryForm: {
    submitLabel: "Send enquiry",
    submittingLabel: "Sending…",
    successMessage:
      "Thanks — we've got your enquiry and will be in touch shortly.",
    errorMessage: "Something went wrong sending that. Please try calling us instead.",
    rateLimitMessage:
      "You've sent a few of these already — please wait a few minutes and try again, or call us instead.",
  },

  seo: {
    home: {
      title: "Apex Auto — East London",
      description:
        "A scroll-driven 3D look under the bonnet at Apex Auto, East London.",
    },
    book: {
      title: "Book a service — Apex Auto",
      description:
        "Book a service with Apex Auto in East London — MOT, servicing, brakes and tyres, diagnostics.",
    },
  },
} as const;

export type SiteContent = typeof siteContent;
