import { notFound } from "next/navigation";
import { siteContent } from "@/content/site";
import { theme } from "@/components/scene/theme";

// A ~30-second spoken script per stage, for reading aloud while
// screen-recording the home page scroll. Mentions what's happening on
// screen and why, not business claims — safe to reuse for any client.
const WALKTHROUGH: Record<string, string> = {
  arrive: `We open wide, outside ${siteContent.business.name}'s forecourt at dusk, with the workshop lit up and a car waiting inside. The garage, the lighting and the animation are all built in code, so it loads fast and re-skins instantly for a different brand. Keep scrolling and we roll straight toward the open door.`,
  inspect: `Now we're at the door, looking at the car under the workshop lights. This is the "first look over" a customer's car gets before anything happens. Notice the top bar appearing with a direct Book link, available from here on.`,
  wheels: `We drop down low on the front wheel. It turns as you scroll, tied to scroll position rather than looping on its own, and a soft ring highlights the brake disc behind the spokes. That's the kind of per-part detail we can call out, stage by stage.`,
  engine: `Rising up over the bonnet, it turns see-through to show the engine bay underneath, and the checks light up one by one: ${siteContent.engineChecks.points.join(", ")}. Workshop tools drift in either side of the car. This is where you'd highlight whatever service matters most: an MOT, a full service, whatever story the client wants told first.`,
  diagnostics: `Swinging round to a side view, a soft band of light travels along the bodywork from nose to tail, and the tools float overhead. It's the "line by line" diagnostics idea, shown without fake test results.`,
  done: `We land back outside, facing the door, sign lit, and now two real buttons: Book a service, and Call us, both live from here on, no hunting for a contact page. That's the whole pitch: a fly-through that's fully re-skinnable, and ends on a clear next step.`,
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
