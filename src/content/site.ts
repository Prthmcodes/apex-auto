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

  // Wording on the building and the forecourt, for the exterior shot. The
  // service names are the ones given for this site (same list as
  // `services` below) — nothing here is an invented claim about a garage.
  exterior: {
    // The smaller line under the business name on the fascia board.
    fasciaServices: "MOT · SERVICING · REPAIRS · TYRES",
    // PLACEHOLDER — only used when `business.phone` above is still a
    // placeholder, so the sign has something phone-shaped on it. All zeros
    // on purpose: it is visibly not a real number, so no one can ring a
    // stranger off the back of a demo. Fill in `business.phone` and the
    // sign picks the real one up on its own.
    fasciaPhonePlaceholder: "020 0000 0000",
    // A generic blue trade sign. Wording only — no official MOT logo or
    // crest is used anywhere, and none should be added without permission.
    motSign: "MOT TESTING STATION",
    // The A-frame board on the forecourt. Two short lines.
    pavementSign: { line1: "MOTs", line2: "while you wait" },
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

  // DEMO COPY — the short story shown when a visitor taps one of the six
  // floating tools. These are illustrative placeholders written to show
  // the feature working, NOT claims about a real garage: no prices, no
  // qualifications, no opening hours. Replace every one of them with the
  // client's own words before this goes in front of their customers.
  // `id` must match the tool's `name` in scene/FloatingTools.tsx.
  toolStories: [
    {
      id: "spanner",
      title: "General servicing",
      body: "DEMO COPY — routine servicing, from a basic oil-and-filter change to a full inspection. Describe here what a standard service covers.",
    },
    {
      id: "oil bottle",
      title: "Oil & filter changes",
      body: "DEMO COPY — fresh oil and a new filter, matched to what the engine actually asks for. Mention the grades stocked and how long it takes.",
    },
    {
      id: "brake disc and caliper",
      title: "Brakes",
      body: "DEMO COPY — pads, discs and fluid checked and replaced when they need it. Say how brake wear is assessed and what gets reported back.",
    },
    {
      id: "tyre pressure gauge",
      title: "Tyres & pressures",
      body: "DEMO COPY — tread depth, pressures and wear patterns checked on every visit. List the tyre work offered and anything done free of charge.",
    },
    {
      id: "spark plug",
      title: "Diagnostics",
      body: "DEMO COPY — a fault code read and explained in plain English, not jargon. Describe the diagnostic equipment and what the report includes.",
    },
    {
      id: "torque wrench",
      title: "About the shop",
      body: "DEMO COPY — a family-run garage in East London, giving honest quotes with no surprises. Replace this with the real story of the business.",
    },
  ] as { id: string; title: string; body: string }[],

  // The one-off nudge telling a first-time visitor the tools can be
  // tapped. Fades on its own after a few seconds.
  toolHint: "Tap a tool to learn more",

  // The real-world body colour of the car model, applied with clearcoat in
  // CarModel.tsx. Change this one value to re-colour the car.
  carColor: "#0b0b0d",

  // Credit for the 3D car model, shown as a small line on the home page's
  // final screen. Its licence (CC BY 4.0) requires a visible credit naming
  // the title, author, source and licence, and saying it was modified. See
  // CREDITS.md. If you swap car.glb for a different model, update this.
  carModelCredit: {
    prefix: "3D car model",
    title: "Range Rover Sport 2018",
    titleUrl:
      "https://sketchfab.com/3d-models/range-rover-sport-2018-d1fe581b3baf4af89275e9aa9a1392e2",
    author: "diw3d",
    authorUrl: "https://sketchfab.com/diwdiw",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    changes: "compressed and re-lit for this site",
  },

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
