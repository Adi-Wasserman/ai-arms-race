import type { Lab } from './lab';

export type BenchmarkKey =
  | 'aaIndex'
  | 'gpqa'
  | 'swebench'
  | 'swebenchPro'
  | 'arcAgi2'
  | 'aime'
  | 'mmmuPro'
  | 'hle'
  | 'gdpval'
  | 'osworld'
  | 'browsecomp';

export type Domain =
  | 'Overall'
  | 'Science'
  | 'Coding'
  | 'Reasoning'
  | 'Math'
  | 'Multimodal'
  | 'Frontier'
  | 'Work'
  | 'Agents';

export interface BenchmarkMeta {
  label: string;
  domain: Domain;
  max: number;
  desc: string;
  source: string;
}

export type BenchmarkMetaMap = Readonly<Record<BenchmarkKey, BenchmarkMeta>>;

/** Benchmark score: `null` means not reported. */
export type BenchmarkScore = number | null;

export interface Model {
  name: string;
  lab: Lab;
  released: string;
  aaIndex: BenchmarkScore;
  gpqa: BenchmarkScore;
  swebench: BenchmarkScore;
  swebenchPro: BenchmarkScore;
  arcAgi2: BenchmarkScore;
  aime: BenchmarkScore;
  mmmuPro: BenchmarkScore;
  hle: BenchmarkScore;
  gdpval: BenchmarkScore;
  osworld: BenchmarkScore;
  browsecomp: BenchmarkScore;
  /** Tokens/sec through provider API; null = not measured. */
  speed: number | null;
  /** USD per million input tokens. */
  costIn: number;
  /** USD per million output tokens. */
  costOut: number;
  /** Context window in thousand tokens. */
  context: number;
  notes: string;
}

export interface DomainGroup {
  key: string;
  label: string;
  benchmarks: readonly BenchmarkKey[];
  icon: string;
}
