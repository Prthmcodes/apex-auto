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
    callNowLabel: "Call now",
    callNowHref: "tel:PLACEHOLDER_PHONE_NUMBER",
    bookNowLabel: "Book now",
    bookNowHref: "/book",
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

  // Floating labels on the engine block during the "engine" stage. Generic
  // part names only — not a claim about what's actually serviced.
  engineLabels: ["Oil", "Filter", "Battery"] as string[],

  // Decorative readout chips shown beside the car during the "diagnostics"
  // stage. These are fake/placeholder UI dressing, not real inspection
  // results — see the code comment in Diagnostics.tsx.
  diagnosticsReadouts: [
    "Brakes OK",
    "Tyres OK",
    "Fluids OK",
    "Lights OK",
  ] as string[],

  services: [] as string[],
  // PLACEHOLDER — add real services once confirmed, e.g. "MOT testing".

  reviews: [] as Array<{ author: string; quote: string }>,
  // PLACEHOLDER — never invent reviews. Add only real, owner-supplied quotes.

  pricing: [] as Array<{ label: string; price: string }>,
  // PLACEHOLDER — never invent prices. Add only real, owner-confirmed prices.
} as const;

export type SiteContent = typeof siteContent;
