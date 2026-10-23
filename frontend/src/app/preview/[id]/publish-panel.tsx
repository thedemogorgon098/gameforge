"use client";

import { Check, Copy, ExternalLink, Loader2, Rocket } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { publishGame } from "@/app/actions";
import { m } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PublishPanel({ id, initialUrl }: { id: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const publish = () =>
    startTransition(async () => {
      const res = await publishGame(id);
      if (res.url) setUrl(res.url);
      setError(res.error ?? null);
    });

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy — select the link manually.");
    }
  };

  return (
    <Card className={url ? "border-emerald-400/30" : undefined}>
      <CardHeader>
        <CardTitle>{url ? "Live!" : "Happy with it?"}</CardTitle>
        <CardDescription>
          {url ? "Anyone with this link can play — no account needed." : "Publish to get a permanent, shareable link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {url ? (
          <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-input p-1 pl-3">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none"
                aria-label="Share link"
              />
              <Button size="icon" variant="ghost" onClick={copy} aria-label="Copy link">
                {copied ? <Check className="text-emerald-400" /> : <Copy />}
              </Button>
            </div>
            <Button asChild variant="outline">
              <Link href={`/play/${id}`} target="_blank">
                Open play page <ExternalLink />
              </Link>
            </Button>
          </m.div>
        ) : (
          <Button onClick={publish} disabled={pending} size="lg">
            {pending ? <Loader2 className="animate-spin" /> : <Rocket />} Publish game
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
