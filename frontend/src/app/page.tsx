import { ArrowRight, Braces, Gamepad2, Share2, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";

import { FadeIn } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { TEMPLATES } from "@/lib/templates";

const FLOW = [
  { icon: Gamepad2, label: "Pick a template" },
  { icon: Wand2, label: "Describe theme & rules" },
  { icon: Braces, label: "AI writes JSON config" },
  { icon: Sparkles, label: "Engine renders the game" },
  { icon: Share2, label: "Share a link" },
];

const SAMPLE = `{
  "template": "quiz",
  "theme": "Marvel",
  "players": 4,
  "timer_seconds": 60,
  "questions": [ …20 items ]
}`;

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <FadeIn>
              <Badge className="border-neon-cyan/30 text-neon-cyan">
                <Sparkles className="size-3" /> Config-only AI · no generated code
              </Badge>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Forge a <span className="text-gradient">playable game</span> from one prompt.
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-5 max-w-xl text-lg text-muted">
                Choose a template, name a theme, set the rules. GameForge turns it into a strict JSON config and a
                battle-tested engine does the rest — instantly shareable, phone-ready.
              </p>
            </FadeIn>
            <FadeIn delay={0.15} className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/builder">
                  Start building <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#templates">See templates</Link>
              </Button>
            </FadeIn>
          </div>

          <FadeIn delay={0.2}>
            <Card className="relative overflow-hidden p-1">
              <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
                <span className="size-2.5 rounded-full bg-neon-pink/70" />
                <span className="size-2.5 rounded-full bg-neon-violet/70" />
                <span className="size-2.5 rounded-full bg-neon-cyan/70" />
                <span className="ml-3 font-mono text-xs text-muted">config.json</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-neon-cyan/90">{SAMPLE}</pre>
            </Card>
          </FadeIn>
        </section>

        <section className="mt-20">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {FLOW.map(({ icon: Icon, label }, i) => (
              <li key={label} className={i === FLOW.length - 1 ? "col-span-2 sm:col-span-1" : undefined}>
                <FadeIn delay={0.05 * i} className="glass flex h-full flex-col gap-3 rounded-xl p-4">
                  <span className="flex items-center gap-2 font-mono text-xs text-muted">
                    <Icon className="size-4 text-neon-cyan" /> 0{i + 1}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </FadeIn>
              </li>
            ))}
          </ol>
        </section>

        <section id="templates" className="mt-24 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Five engines. Infinite themes.</h2>
          <p className="mt-2 text-muted">Every game runs on a hand-built, tested template — the AI only fills in the data.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((t, i) => (
              <FadeIn key={t.id} delay={0.05 * i}>
                <Link href={`/builder?template=${t.id}`} className="group block h-full">
                  <Card className="h-full p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/25">
                    <div
                      className="grid size-12 place-items-center rounded-xl text-2xl"
                      style={{ background: `${t.accent}22`, boxShadow: `0 0 28px -8px ${t.accent}` }}
                    >
                      {t.emoji}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{t.name}</h3>
                    <p className="mt-1 text-sm text-muted">{t.tagline}</p>
                    <p className="mt-4 flex items-center gap-1 text-sm font-medium" style={{ color: t.accent }}>
                      Build one <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </p>
                  </Card>
                </Link>
              </FadeIn>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
