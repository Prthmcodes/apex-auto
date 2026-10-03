import { siteContent } from "@/content/site";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * schema.org AutoRepair/LocalBusiness structured data, built from
 * site.ts. Every value here is the same placeholder content already on
 * the page — this just marks it up semantically, it doesn't invent
 * anything new.
 */
export default function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: siteContent.business.name,
    url: SITE_URL,
    telephone: siteContent.business.phone,
    email: siteContent.business.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteContent.business.address,
      addressLocality: siteContent.business.area,
      addressCountry: "GB",
    },
    areaServed: siteContent.business.area,
    openingHours: siteContent.business.hours,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
