// Mirrors backend/app/schemas.py — the backend validates every config before the frontend sees it.

export type TemplateId = "quiz" | "memory" | "word" | "runner" | "board";

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
}

interface BaseConfig {
  title: string;
  theme: string;
  players: number;
  intro: string;
  palette: Palette;
}

export interface QuizConfig extends BaseConfig {
  template: "quiz";
  questions: { prompt: string; choices: string[]; answer_index: number; explanation: string }[];
  timer_seconds: number;
  timer_scope: "per_question" | "total";
  points_per_correct: number;
  shuffle_choices: boolean;
}

export interface MemoryConfig extends BaseConfig {
  template: "memory";
  cards: { symbol: string; label: string }[];
  columns: number;
  time_limit_seconds: number;
  reveal_ms: number;
}

export interface WordConfig extends BaseConfig {
  template: "word";
  words: { word: string; hint: string }[];
  time_per_word_seconds: number;
  max_mistakes: number;
  reveal_first_letter: boolean;
}

export interface RunnerConfig extends BaseConfig {
  template: "runner";
  hero: string;
  obstacles: string[];
  collectibles: string[];
  base_speed: number;
  speed_increase_per_10s: number;
  gravity: number;
  jump_velocity: number;
  spawn_interval_ms: number;
  lives: number;
  target_score: number;
}

export interface BoardConfig extends BaseConfig {
  template: "board";
  rows: number;
  columns: number;
  win_length: number;
  gravity: boolean;
  pieces: { name: string; symbol: string }[];
}

export type GameConfig = QuizConfig | MemoryConfig | WordConfig | RunnerConfig | BoardConfig;

export interface Game {
  id: string;
  template: TemplateId;
  status: "draft" | "published";
  config: GameConfig;
  request: { template: TemplateId; theme: string; players: number; rules: string };
  created_at: string;
  published_at: string | null;
  url: string | null;
}
