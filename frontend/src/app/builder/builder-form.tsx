"use client";

import { AnimatePresence } from "framer-motion";
import { Loader2, Wand2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { generateGame, type GenerateState } from "@/app/actions";
import { FadeIn, m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { TEMPLATE_BY_ID, TEMPLATES } from "@/lib/templates";
import type { TemplateId } from "@/lib/types";
import { cn } from "@/lib/utils";

const legendClass = "text-xs font-semibold uppercase tracking-[0.14em] text-muted";

const STAGES = ["Reading your prompt…", "Designing the rules…", "Writing content…", "Validating config…"];

export function BuilderForm({ initialTemplate }: { initialTemplate: TemplateId }) {
  const [state, action, pending] = useActionState<GenerateState, FormData>(generateGame, {});
  const [template, setTemplate] = useState<TemplateId>((state.fields?.template as TemplateId) ?? initialTemplate);
  const meta = TEMPLATE_BY_ID[template];
  const [players, setPlayers] = useState(Number(state.fields?.players) || meta.defaultPlayers);
  const [theme, setTheme] = useState(state.fields?.theme ?? "");

  const pickTemplate = (id: TemplateId) => {
    setTemplate(id);
    const [min, max] = TEMPLATE_BY_ID[id].players;
    setPlayers((p) => Math.min(max, Math.max(min, p)));
  };

  const playerOptions = Array.from({ length: meta.players[1] - meta.players[0] + 1 }, (_, i) => meta.players[0] + i);

  return (
    <form action={action} className="mt-8 space-y-6">
      <FadeIn delay={0.05}>
        <fieldset>
          <legend className="mb-3">
            <span className={legendClass}>1 · Template</span>
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TEMPLATES.map((t) => {
              const active = t.id === template;
              return (
                <label
                  key={t.id}
                  className={cn(
                    "glass relative flex cursor-pointer flex-col items-start gap-2 rounded-xl p-4 transition-all duration-200 hover:border-white/25 has-[:focus-visible]:neon-ring",
                    active && "border-transparent",
                    t.id === "board" && "col-span-2 sm:col-span-1",
                  )}
                  style={active ? { boxShadow: `0 0 0 1.5px ${t.accent}, 0 0 28px -8px ${t.accent}` } : undefined}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={active}
                    onChange={() => pickTemplate(t.id)}
                    className="sr-only"
                  />
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-sm font-semibold">{t.name}</span>
                </label>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <m.p
              key={template}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3 text-sm text-muted"
            >
              {meta.tagline}
            </m.p>
          </AnimatePresence>
        </fieldset>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="space-y-6 p-5 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="theme">2 · Theme</Label>
            <Input
              id="theme"
              name="theme"
              required
              maxLength={80}
              placeholder="e.g. Marvel, deep sea, retro arcade"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {meta.themeIdeas.map((idea) => (
                <button
                  type="button"
                  key={idea}
                  onClick={() => setTheme(idea)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-neon-cyan/50 hover:text-foreground"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className={legendClass}>Players</legend>
            <div className="flex flex-wrap gap-2">
              {playerOptions.map((n) => (
                <label
                  key={n}
                  className={cn(
                    "grid size-11 cursor-pointer place-items-center rounded-xl border border-border bg-input text-sm font-semibold transition-all has-[:focus-visible]:neon-ring",
                    n === players && "border-neon-cyan bg-neon-cyan/15 text-neon-cyan",
                  )}
                >
                  <input
                    type="radio"
                    name="players"
                    value={n}
                    checked={n === players}
                    onChange={() => setPlayers(n)}
                    className="sr-only"
                  />
                  {n}
                </label>
              ))}
            </div>
            {template === "board" && players === 1 && <p className="text-xs text-muted">Solo play is against the CPU.</p>}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="rules">3 · Rules (optional)</Label>
            <Textarea
              id="rules"
              name="rules"
              maxLength={600}
              placeholder={meta.rulesPlaceholder}
              defaultValue={state.fields?.rules}
            />
          </div>

          {state.error && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <PendingLabel /> : (
              <>
                <Wand2 /> Forge my game
              </>
            )}
          </Button>
        </Card>
      </FadeIn>
    </form>
  );
}

function PendingLabel() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="flex items-center gap-2" aria-live="polite">
      <Loader2 className="animate-spin" />
      <AnimatePresence mode="wait">
        <m.span key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          {STAGES[stage]}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
