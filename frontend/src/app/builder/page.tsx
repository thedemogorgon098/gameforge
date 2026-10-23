import type { Metadata } from "next";

import { FadeIn } from "@/components/motion";
import { SiteHeader } from "@/components/site-header";
import { isTemplateId } from "@/lib/templates";

import { BuilderForm } from "./builder-form";

export const metadata: Metadata = { title: "Builder" };

export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <FadeIn>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Build a <span className="text-gradient">game</span>
          </h1>
          <p className="mt-2 text-muted">Three inputs. The AI writes the config; the engine makes it playable.</p>
        </FadeIn>
        <BuilderForm initialTemplate={isTemplateId(template) ? template : "quiz"} />
      </main>
    </>
  );
}
