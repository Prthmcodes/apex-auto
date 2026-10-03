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
3. **Before the first deploy**, set one environment variable in the Vercel
   project's settings:
   - `NEXT_PUBLIC_SITE_URL` — the real domain the site will live at, e.g.
     `https://apexauto.co.uk`. Without it, the site falls back to a clearly
     fake placeholder domain (used in the sitemap, robots.txt, page metadata,
     and the structured data search engines read) — harmless locally, but it
     must be set to the real domain before launch.
4. Deploy. Vercel rebuilds automatically on every push after that.

### Before going live, also check

- Every `PLACEHOLDER` value in `src/content/site.ts` has been replaced with
  real details (see above).
- The `/api/enquiry` endpoint (the booking form's submit target) currently
  only logs enquiries to the server console — there's no email or database
  behind it yet. See the TODO note in `PROGRESS.md` for what's needed before
  real customers rely on it.
