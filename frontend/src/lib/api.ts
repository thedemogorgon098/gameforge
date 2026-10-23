import "server-only";

import type { Game } from "./types";

const API_URL = (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((d: { msg?: string }) => d.msg).join("; ");
  } catch {
    /* non-JSON error body */
  }
  return `Request failed (${res.status})`;
}

export async function apiPost<T>(path: string, body: unknown, headers?: HeadersInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return res.json() as Promise<T>;
}

export const gameTag = (id: string) => `game:${id}`;

/**
 * Published games are immutable, so the play page caches them indefinitely (tag-invalidated on publish).
 * Drafts are always fetched fresh.
 */
export async function getGame(id: string, { fresh = false } = {}): Promise<Game | null> {
  if (!/^[A-Za-z0-9]{1,16}$/.test(id)) return null;
  const res = await fetch(
    `${API_URL}/game/${id}`,
    fresh ? { cache: "no-store" } : { next: { revalidate: false, tags: [gameTag(id)] } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return res.json() as Promise<Game>;
}
