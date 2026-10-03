import type { Metadata } from "next";
import Link from "next/link";
import { siteContent } from "@/content/site";
import { theme } from "@/components/scene/theme";
import EnquiryForm from "@/components/book/EnquiryForm";

export const metadata: Metadata = {
  title: siteContent.seo.book.title,
  description: siteContent.seo.book.description,
  openGraph: {
    title: siteContent.seo.book.title,
    description: siteContent.seo.book.description,
    type: "website",
  },
};

export default function BookPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: theme.background }}
    >
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.25em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {siteContent.business.name}
        </Link>
        <a
          href={siteContent.cta.callNowHref}
          className="rounded-full border-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ borderColor: theme.accent, color: theme.accent }}
        >
          {siteContent.cta.callNowLabel}
        </a>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-16 px-4 pb-24 pt-8 sm:px-8">
        {/* Hero */}
        <section className="flex flex-col gap-3">
          <p
            className="text-xs font-semibold uppercase tracking-[0.4em]"
            style={{ color: theme.primary }}
          >
            {siteContent.business.area}
          </p>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            {siteContent.business.name}
          </h1>
          <p className="max-w-xl text-lg text-white/75">
            {siteContent.business.tagline}
          </p>
        </section>

        {/* Services */}
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold">Services</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {siteContent.services.map((service) => (
              <div
                key={service.name}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="mt-1 text-sm text-white/65">{service.description}</p>
                <p
                  className="mt-3 text-sm font-semibold"
                  style={{ color: theme.accent }}
                >
                  {siteContent.pricingNote}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Hours, area, contact */}
        <section className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Opening hours</h2>
            <p className="mt-2 text-white/75">{siteContent.business.hours}</p>
            <h2 className="mt-6 text-2xl font-semibold">Area served</h2>
            <p className="mt-2 text-white/75">{siteContent.business.area}</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Find us</h2>
            <p className="mt-2 text-white/75">{siteContent.business.address}</p>
            <p className="mt-1 text-white/75">{siteContent.business.phone}</p>

            {/* Map placeholder — no real address yet, so no real embed. */}
            <div
              className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/20 text-sm text-white/40"
              aria-hidden="true"
            >
              Map placeholder
            </div>
          </div>
        </section>

        {/* Enquiry form */}
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold">Book a service</h2>
          <p className="text-white/65">
            Tell us a bit about what you need and we&apos;ll get back to you to
            confirm.
          </p>
          <EnquiryForm />
        </section>
      </main>
    </div>
  );
}
