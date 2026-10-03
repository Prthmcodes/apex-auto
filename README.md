# Apex Auto

A demo 3D garage website: a scroll-driven "fly-through" home page built entirely
in code (no 3D model files), plus a plain, fast `/book` page with an enquiry form.

See `CLAUDE.md` for the full project brief and rules, and `PROGRESS.md` for a
phase-by-phase build log.

## How to run it

```bash
npm install
npm run dev
```

Then open the URL it prints (usually [http://localhost:3000](http://localhost:3000),
or the next free port if that one's taken).

Other useful commands:

```bash
npm run build   # production build — also the final check before shipping
npm run lint    # code-quality checks
npm run start   # run a production build locally (after npm run build)
```

## How to edit the business details (`src/content/site.ts`)

Everything specific to this garage — name, area, tagline, address, phone,
opening hours, the services list, button text, scroll-stage captions — lives
in one file: `src/content/site.ts`. Nothing else in the codebase needs to
change to adapt the site for a different garage.

Open that file and replace anything written as `PLACEHOLDER — ...` with the
real value. For example:

```ts
address: "PLACEHOLDER — street address",
```

becomes:

```ts
address: "14 High Street, London E1 1AA",
```

A few things to know:

- **Never invent reviews, prices, or contact details.** If you don't have the
  real value yet, leave the placeholder text in place rather than guessing —
  it's clearly marked so nobody mistakes it for real.
- `services` is a list of `{ name, description }` objects — add, remove, or
  reorder entries freely; the `/book` page's services grid and the booking
  form's dropdown both read from this same list automatically.
- `pricingNote` ("Ask for a quote") is shown instead of a price on every
  service card. Only replace it with real prices once they're confirmed.
- The six home-page scroll stages (captions, titles, scroll ranges) are also
  here, but changing the camera positions themselves requires editing
  `src/components/scene/cameraPath.ts` instead — that's a code change, not a
  content one.

After editing, run `npm run build` once to make sure nothing broke, then
commit the change.

## How to deploy

This is a standard Next.js app, so it deploys anywhere Next.js does — the
simplest path is [Vercel](https://vercel.com/new):

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Import it on [vercel.com/new](https://vercel.com/new). Vercel detects
   Next.js automatically — no configuration needed.
3. **Before the first deploy**, set these environment variables in the
   Vercel project's settings (see `.env.example` for the full list):
   - `NEXT_PUBLIC_SITE_URL` — the real domain the site will live at, e.g.
     `https://apexauto.co.uk`. Without it, the site falls back to a clearly
     fake placeholder domain (used in the sitemap, robots.txt, page metadata,
     and the structured data search engines read) — harmless locally, but it
     must be set to the real domain before launch.
   - `RESEND_API_KEY`, `ENQUIRY_TO_EMAIL`, `ENQUIRY_FROM_EMAIL` — see
     "Setting up enquiry emails" below. Without these, the booking form
     still works but only logs enquiries to the server console instead of
     emailing anyone.
4. Deploy. Vercel rebuilds automatically on every push after that.

## Setting up enquiry emails

The `/book` page's booking form needs these three environment variables to
actually email enquiries instead of just logging them. It uses
[Resend](https://resend.com) to send the email.

1. **Create a Resend account** at [resend.com](https://resend.com) (there's
   a free tier, plenty for a single garage's enquiry volume).
2. **Add and verify your domain** under Domains in the Resend dashboard, by
   adding the DNS records it gives you wherever the domain's DNS is managed.
   (While testing, you can skip this and send from Resend's shared test
   address instead — see their docs — but real customer-facing email should
   come from your own domain.)
3. **Create an API key** under API Keys in the dashboard. Copy it — Resend
   only shows it once.
4. **Set three environment variables** (in Vercel: Project → Settings →
   Environment Variables; locally: your `.env.local`, copied from
   `.env.example`):
   - `RESEND_API_KEY` — the key from step 3. Never commit this anywhere —
     that's exactly what `.env.local`/Vercel's env var UI are for.
   - `ENQUIRY_FROM_EMAIL` — the address enquiries are sent *from*, at your
     verified domain (e.g. `bookings@apexauto.co.uk`).
   - `ENQUIRY_TO_EMAIL` — the address enquiries are sent *to*: wherever the
     garage actually checks (e.g. the owner's own inbox).
5. Redeploy (or restart `npm run dev` locally) so the new environment
   variables take effect.

Until all three are set, the form still works end-to-end for visitors — it
just logs each enquiry to the server console instead, with a clear warning
so it's obvious email isn't wired up yet.

### Before going live, also check

- Every `PLACEHOLDER` value in `src/content/site.ts` has been replaced with
  real details (see above).
- Enquiry emails are actually set up and arriving (see above) — don't launch
  with the booking form silently only logging to a console nobody reads.
