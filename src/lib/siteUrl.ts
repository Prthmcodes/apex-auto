// Set NEXT_PUBLIC_SITE_URL in the real deployment's environment to the
// actual domain (e.g. https://apexauto.co.uk). Falls back to a clearly
// fake placeholder — ".example" is the IANA/RFC 2606 reserved TLD for
// exactly this purpose, so it can't accidentally resolve to a real site.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://apex-auto.example";
