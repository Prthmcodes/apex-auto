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

  services: [] as string[],
  // PLACEHOLDER — add real services once confirmed, e.g. "MOT testing".

  reviews: [] as Array<{ author: string; quote: string }>,
  // PLACEHOLDER — never invent reviews. Add only real, owner-supplied quotes.

  pricing: [] as Array<{ label: string; price: string }>,
  // PLACEHOLDER — never invent prices. Add only real, owner-confirmed prices.
} as const;

export type SiteContent = typeof siteContent;
