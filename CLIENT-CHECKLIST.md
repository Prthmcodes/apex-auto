# Client checklist

A step-by-step guide for turning this demo into a pitch (or a live site) for
a *different* garage. Written for someone who isn't a developer — every step
is either "copy a file," "edit some text," or "click a button."

## Before you start

You'll need: a GitHub account, a [Vercel](https://vercel.com) account (free
tier is fine), and the real business details for the garage you're pitching
to (or clearly-marked placeholders if you don't have them all yet — see
"Never do" below).

## Step by step

1. **Copy the repository.** On GitHub, use "Use this template" (or just
   duplicate the repo) to create a new repository for this client. Don't
   edit the original — each client gets their own copy.
2. **Edit the business details.** Open `src/content/site.ts`. Replace every
   value written as `PLACEHOLDER — ...` with the real detail: business
   name, area, tagline, address, phone, email, opening hours. See the
   "Never do" list below before you fill in anything you're not 100% sure
   of.
3. **Edit the services.** Still in `site.ts`, update the `services` list —
   names and short descriptions. Add, remove, or reorder entries freely;
   the `/book` page and the booking form both update automatically.
4. **Pick a theme.** Open `src/components/scene/theme.ts` and change the
   `ACTIVE_THEME_NAME` line near the top to one of `"teal"`, `"amber-red"`,
   or `"ice-blue"`. That one line re-colours the entire site — the 3D
   scene, the overlay buttons, and the `/book` page.
   - Want to compare them quickly before committing? Run the site locally
     (`npm run dev`) and visit `http://localhost:3000/?theme=amber-red` (or
     `ice-blue`, or `teal`) — this only works while developing, not on the
     live site, and only changes the home page's 3D scene, not `/book`.
5. **Replace any remaining placeholder text.** Search the project for the
   word `PLACEHOLDER` (your editor's "find in files" works for this) and
   make sure nothing is left before this goes anywhere near a real client.
6. **Set the environment variables.** Copy `.env.example` to `.env.local`
   and fill in:
   - `NEXT_PUBLIC_SITE_URL` — the domain this will live at.
   - `RESEND_API_KEY`, `ENQUIRY_TO_EMAIL`, `ENQUIRY_FROM_EMAIL` — see the
     README's "Setting up enquiry emails" section for how to get these from
     [Resend](https://resend.com). Without them, the booking form still
     works, it just won't email anyone yet.
7. **Deploy to a new Vercel project.** On [vercel.com/new](https://vercel.com/new),
   import the new repository (from step 1). Vercel detects Next.js
   automatically. Add the same environment variables from step 6 in the
   project's settings before the first deploy.
8. **Connect a custom domain.** In the Vercel project's Settings → Domains,
   add the client's real domain and follow Vercel's instructions for
   pointing their DNS at it. Once that's done, update
   `NEXT_PUBLIC_SITE_URL` to match and redeploy.
9. **Test the booking form on an actual phone.** Open the live site on your
   own phone, fill in the form, and submit it. Confirm the email actually
   arrives wherever `ENQUIRY_TO_EMAIL` points. Don't skip this — it's the
   one thing that directly costs the client a lead if it's broken.
10. **Run through the Pre-flight list below** before sending anyone the
    link.

## Never do

- **Never invent reviews.** No quotes, no star ratings, no "customers say"
  copy unless the client gave you the actual words.
- **Never invent prices.** Leave `pricingNote` as "Ask for a quote" (or
  whatever equivalent you've agreed) until the client confirms real prices.
- **Never make claims the client hasn't approved** — turnaround times,
  guarantees, certifications, "best in [area]," anything that sounds like a
  fact about their business you didn't get directly from them.
- **Never leave real secrets in a file that gets committed.** API keys and
  the like go in `.env.local` or Vercel's environment variable settings —
  never in `site.ts`, never in a commit.

If you don't have a real value yet, leave the clearly-marked placeholder
text in place rather than guessing. A visible placeholder is an honest gap;
an invented detail is a claim with your name on it.

## Pre-flight: 10 things to check before sending the link

1. Every `PLACEHOLDER` in `src/content/site.ts` has been replaced or is one
   you've deliberately left for the client to confirm later.
2. The theme (`ACTIVE_THEME_NAME`) actually suits this client — not just
   left on whatever it was before.
3. `npm run build` passes with no errors.
4. The home page's scroll fly-through works start to finish, on both a
   phone-sized and a desktop-sized screen.
5. The `/book` page's booking form submits successfully, and the email
   actually arrives at `ENQUIRY_TO_EMAIL`.
6. The "Call us" button's phone number is correct and actually rings the
   right phone when tapped on a real phone.
7. The site title (the browser tab) and the page you see when you share the
   link in a chat app (the social preview) show the right business name —
   not "Apex Auto."
8. `NEXT_PUBLIC_SITE_URL` matches the real domain the client will see.
9. The custom domain resolves and shows a valid HTTPS padlock, not a
   Vercel-generated `*.vercel.app` URL (unless that's genuinely the plan).
10. You've personally scrolled the whole site on your own phone, on mobile
    data, at least once — not just in a desktop browser's device preview.
