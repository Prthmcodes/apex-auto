import { notFound } from "next/navigation";
import { siteContent } from "@/content/site";
import { theme } from "@/components/scene/theme";

// A ~30-second spoken script per stage, for reading aloud while
// screen-recording the home page scroll. Mentions what's happening on
// screen and why, not business claims — safe to reuse for any client.
const WALKTHROUGH: Record<string, string> = {
  arrive: `We open wide, outside ${siteContent.business.name}'s forecourt at dusk. The grid, the glow, the garage — all of it is generated in code, not photos or a 3D model file, so it loads fast and re-skins instantly for a different brand. Keep scrolling and we roll straight toward the open door.`,
  inspect: `Now we're approaching the door, and the car inside starts to resolve — right now it's a hologram, because nothing's been inspected yet. This is the "first look over" a customer's car gets before anything happens. Notice the top bar appearing with a direct Book link, available from here on.`,
  wheels: `We're in close on the front wheel now — watch it actually spinning as you scroll, tied to scroll position, not just looping on its own. A brake disc and caliper fade in to show the kind of per-part detail we can call out, stage by stage.`,
  engine: `Rising up over the bonnet, the body dims slightly and a simple engine block appears underneath with floating labels — oil, filter, battery. This is where you'd highlight whatever service matters most: an MOT, a full service, whatever story the client wants told first.`,
  diagnostics: `Pulling back to a full side view, a scan line sweeps the length of the car and each part lights up as it passes, with a few "all OK" readouts beside it. By now the car's fully solidified from hologram to a solid-looking model — hologram to real, mirroring "before we look" to "after we've checked."`,
  done: `We land back outside, facing the door, sign lit, and now two real buttons: Book a service, and Call us — both live from here on, no hunting for a contact page. That's the whole pitch: a fly-through that's fully re-skinnable, and ends on a clear next step.`,
};

export default function DemoNotesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div
      className="min-h-screen px-6 py-12 text-white"
      style={{ backgroundColor: theme.background }}
    >
      <div className="mx-auto max-w-2xl">
        <p
          className="text-xs font-semibold uppercase tracking-[0.3em]"
          style={{ color: theme.primary }}
        >
          Dev only — hidden in production
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Demo walkthrough script</h1>
        <p className="mt-3 text-white/65">
          A ~30-second script per stage, for reading aloud while
          screen-recording the home page scroll. Scroll percentages match
          the stage ranges in <code>site.ts</code>.
        </p>

        <ol className="mt-10 flex flex-col gap-8">
          {siteContent.stages.map((stage, i) => (
            <li
              key={stage.id}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold">
                  {i + 1}. {stage.title}
                </h2>
                <span className="whitespace-nowrap text-sm text-white/50">
                  {Math.round(stage.range[0] * 100)}–
                  {Math.round(stage.range[1] * 100)}% scroll
                </span>
              </div>
              <p className="mt-1 text-sm italic text-white/50">
                On-screen caption: &ldquo;{stage.caption}&rdquo;
              </p>
              <p className="mt-3 text-white/90">{WALKTHROUGH[stage.id]}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
