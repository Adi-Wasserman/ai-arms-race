import type { BenchmarkMetaMap, DomainGroup } from '@/types';

export const BENCHMARK_META: BenchmarkMetaMap = {
  aaIndex: {
    label: 'AA INDEX',
    domain: 'Overall',
    max: 100,
    desc: 'Artificial Analysis Intelligence Index v4.0 — composite of 10 evaluations',
    source: 'Artificial Analysis (independent)',
  },
  gpqa: {
    label: 'GPQA ◇',
    domain: 'Science',
    max: 100,
    desc: 'GPQA Diamond — PhD-level science questions, expert accuracy ~65%',
    source: 'GPQA Dataset · Verified by Epoch AI + AA',
  },
  swebench: {
    label: 'SWE-BENCH',
    domain: 'Coding',
    max: 100,
    desc: 'SWE-bench Verified — real GitHub bug fixes, 500 issues',
    source: 'Princeton NLP · swebench.com',
  },
  swebenchPro: {
    label: 'SWE-BENCH PRO',
    domain: 'Coding',
    max: 100,
    desc: 'SWE-bench Pro — multi-language extension of SWE-bench Verified',
    source: 'Princeton NLP · swebench.com',
  },
  arcAgi2: {
    label: 'ARC-AGI-2',
    domain: 'Reasoning',
    max: 100,
    desc: 'ARC-AGI-2 — abstract visual reasoning, resists memorization',
    source: 'ARC Prize Foundation · arcprize.org',
  },
  aime: {
    label: "AIME '25",
    domain: 'Math',
    max: 100,
    desc: 'AIME 2025 — competition math, 45 problems, answers 0-999',
    source: 'AMC/MAA · AA independent eval',
  },
  mmmuPro: {
    label: 'MMMU-PRO',
    domain: 'Multimodal',
    max: 100,
    desc: 'MMMU-Pro — expert-level multimodal visual reasoning',
    source: 'mmmu-benchmark.github.io',
  },
  hle: {
    label: 'HLE',
    domain: 'Frontier',
    max: 100,
    desc: "Humanity's Last Exam — 2,500 expert questions, intended as final academic eval",
    source: 'CAIS (Dan Hendrycks) · last-exam.ai',
  },
  gdpval: {
    label: 'GDPval',
    domain: 'Work',
    max: 100,
    desc: 'GDPval — real-world knowledge work across 44 occupations, 9 industries',
    source: 'OpenAI · AA independent verification via GDPval-AA',
  },
  osworld: {
    label: 'OSWorld',
    domain: 'Agents',
    max: 100,
    desc: 'OSWorld — desktop computer use, human baseline 72.4%',
    source: 'osworld.ai · Provider system cards',
  },
  browsecomp: {
    label: 'BROWSE',
    domain: 'Agents',
    max: 100,
    desc: 'BrowseComp — web browsing and information retrieval',
    source: 'browsecomp.github.io · Provider system cards',
  },
} as const;

export const DOMAIN_GROUPS: readonly DomainGroup[] = [
  { key: 'science',    label: 'SCIENTIFIC REASONING', benchmarks: ['gpqa'],                           icon: '🔬' },
  { key: 'coding',     label: 'CODING',                benchmarks: ['swebench'],                       icon: '💻' },
  { key: 'reasoning',  label: 'ABSTRACT REASONING',    benchmarks: ['arcAgi2'],                        icon: '🧩' },
  { key: 'math',       label: 'MATHEMATICS',           benchmarks: ['aime'],                           icon: '📐' },
  { key: 'multimodal', label: 'MULTIMODAL',            benchmarks: ['mmmuPro'],                        icon: '👁️' },
  { key: 'agents',     label: 'AGENTS & TOOL USE',     benchmarks: ['osworld', 'browsecomp', 'gdpval'], icon: '🤖' },
  { key: 'frontier',   label: 'FRONTIER DIFFICULTY',   benchmarks: ['hle'],                            icon: '🎯' },
] as const;
