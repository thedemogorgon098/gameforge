import type { TemplateId } from "./types";

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  tagline: string;
  emoji: string;
  players: [min: number, max: number];
  defaultPlayers: number;
  themeIdeas: string[];
  rulesPlaceholder: string;
  accent: string;
}

// Keep player ranges in sync with PLAYER_LIMITS in backend/app/schemas.py.
export const TEMPLATES: TemplateMeta[] = [
  {
    id: "quiz",
    name: "Quiz",
    tagline: "Timed multiple-choice trivia, hot-seat multiplayer.",
    emoji: "🧠",
    players: [1, 8],
    defaultPlayers: 2,
    themeIdeas: ["Marvel", "World capitals", "90s music", "Space"],
    rulesPlaceholder: "20 questions, 60 sec timer, hard difficulty",
    accent: "#22d3ee",
  },
  {
    id: "memory",
    name: "Memory Match",
    tagline: "Flip cards, find pairs, keep your turn on a match.",
    emoji: "🃏",
    players: [1, 4],
    defaultPlayers: 1,
    themeIdeas: ["Ocean life", "Pokémon types", "Fruits", "Dinosaurs"],
    rulesPlaceholder: "12 pairs, 2 minute time limit",
    accent: "#a855f7",
  },
  {
    id: "word",
    name: "Word Puzzle",
    tagline: "Unscramble themed words from hints against the clock.",
    emoji: "🔤",
    players: [1, 4],
    defaultPlayers: 1,
    themeIdeas: ["Harry Potter", "Kitchen", "Programming", "Olympics"],
    rulesPlaceholder: "10 words, 30 seconds each, show first letter",
    accent: "#a3e635",
  },
  {
    id: "runner",
    name: "Endless Runner",
    tagline: "Tap to jump, dodge hazards, chase the high score.",
    emoji: "🏃",
    players: [1, 4],
    defaultPlayers: 1,
    themeIdeas: ["Cyberpunk city", "Jungle temple", "Mario-style", "Arctic"],
    rulesPlaceholder: "fast, 1 life, finish at 5000 points",
    accent: "#f472b6",
  },
  {
    id: "board",
    name: "Board Game",
    tagline: "Turn-based connect-N on any grid, vs friends or CPU.",
    emoji: "♟️",
    players: [1, 4],
    defaultPlayers: 2,
    themeIdeas: ["Pirates vs Ninjas", "Cats vs Dogs", "Chess pieces", "Planets"],
    rulesPlaceholder: "tic-tac-toe on 5x5, need 4 in a row",
    accent: "#facc15",
  },
];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<TemplateId, TemplateMeta>;

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && value in TEMPLATE_BY_ID;
}
