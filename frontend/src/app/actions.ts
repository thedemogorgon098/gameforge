"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiPost, gameTag } from "@/lib/api";
import { isTemplateId, TEMPLATE_BY_ID } from "@/lib/templates";
import type { Game } from "@/lib/types";

export interface GenerateState {
  error?: string;
  fields?: { template?: string; theme?: string; players?: string; rules?: string };
}

async function forwardedFor(): Promise<HeadersInit> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  return ip ? { "X-Forwarded-For": ip } : {};
}

export async function generateGame(_prev: GenerateState, form: FormData): Promise<GenerateState> {
  const fields = {
    template: String(form.get("template") ?? ""),
    theme: String(form.get("theme") ?? "").trim(),
    players: String(form.get("players") ?? ""),
    rules: String(form.get("rules") ?? "").trim(),
  };

  if (!isTemplateId(fields.template)) return { error: "Pick a template.", fields };
  if (!fields.theme) return { error: "Give your game a theme.", fields };
  if (fields.theme.length > 80) return { error: "Keep the theme under 80 characters.", fields };
  if (fields.rules.length > 600) return { error: "Keep the rules under 600 characters.", fields };
  const players = Number(fields.players);
  const [min, max] = TEMPLATE_BY_ID[fields.template].players;
  if (!Number.isInteger(players) || players < min || players > max) {
    return { error: `${TEMPLATE_BY_ID[fields.template].name} supports ${min}–${max} players.`, fields };
  }

  let game: Game;
  try {
    game = await apiPost<Game>(
      "/generate",
      { template: fields.template, theme: fields.theme, players, rules: fields.rules },
      await forwardedFor(),
    );
  } catch (e) {
    const message = e instanceof ApiError ? e.message : "Couldn't reach the game forge. Try again.";
    return { error: message, fields };
  }
  redirect(`/preview/${game.id}`);
}

export interface PublishState {
  url?: string;
  error?: string;
}

export async function publishGame(id: string): Promise<PublishState> {
  try {
    const res = await apiPost<{ id: string; url: string }>("/publish", { id });
    // The play page may have cached a "not published" 404 for this id — refresh it.
    revalidateTag(gameTag(id));
    revalidatePath(`/play/${id}`);
    return { url: res.url };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Publishing failed. Try again." };
  }
}
