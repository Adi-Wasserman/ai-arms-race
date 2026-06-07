import type { FleetEntry } from '@/types';

/**
 * Fleet estimates: cloud-lease capacity that sits ON TOP of Epoch satellite data.
 * These correct for the structural undercount of distributed/multi-cloud strategies.
 * Tuple format: [date (YYYY-MM-DD), leg handle, h100e, powerMW].
 *
 * ── ANTHROPIC CLOUD-LEASE LEGS ──
 *
 * EAI-AWS: Project Rainier / AWS Trainium2
 *   Source: https://www.aboutamazon.com/news/aws/aws-project-rainier-ai-trainium-chips-compute-cluster
 *   ~500K Trn2 chips live (Oct 2025), scaling to >1M by end 2025.
 *   H100e conversion: Trn2 ≈ 0.93 H100e (918 vs 989 BF16 TFLOPS).
 *   NOTE: Epoch tracks New Carlisle + Canton + Ridgeland via satellite.
 *   These entries add ONLY the distributed AWS capacity NOT in those tracked sites.
 *
 * EAI-GCP: Anthropic's Google Cloud TPU allocation
 *   Source: https://www.anthropic.com/news/expanding-our-use-of-google-cloud-tpus-and-services
 *   Up to 1M TPUs, "well over a gigawatt" online in 2026.
 *   H100e conversion: blended ~1.4 H100e/chip (v6e ~0.93x, Ironwood ~2.3x).
 *   NOTE: Entirely invisible to Epoch satellite tracking.
 *
 * EAI-AZR: Anthropic's Microsoft Azure / NVIDIA allocation
 *   Source: https://blogs.nvidia.com/blog/microsoft-nvidia-anthropic-announce-partnership/
 *   $30B Azure commitment, up to 1GW with Grace Blackwell + Vera Rubin.
 *   H100e conversion: GB200 ≈ 2.5 H100e, ~1.2KW/system.
 *   NOTE: Entirely invisible to Epoch satellite tracking.
 *
 * ── GOOGLE DEEPMIND / GEMINI TPU FLEET ──
 *
 * EGC: Estimated Gemini Compute (Google's internal TPU fleet)
 *   Sources: SemiAnalysis "Multi-Datacenter Training" (Sep 2024);
 *     Fubon (Jan 2026) — 3.1-3.2M TPU production in 2026;
 *     Google Cloud Ironwood blog (Nov 2025).
 *   Estimates the fraction of Google's internal TPU fleet dedicated to Gemini
 *   that is NOT visible in Epoch's tracked new-construction sites.
 *   H100e conversion: blended ~1.2 H100e/chip (older v4/v5 fleet average).
 */
export const FLEET_ESTIMATES: readonly FleetEntry[] = [
  // ── EAI-AWS: Anthropic on AWS Trainium2 ──
  ['2025-10-01', 'EAI-AWS', 465000, 140],
  ['2026-01-01', 'EAI-AWS', 700000, 210],
  ['2026-06-01', 'EAI-AWS', 840000, 252],
  ['2027-01-01', 'EAI-AWS', 930000, 279],

  // ── EAI-GCP: Anthropic on Google Cloud TPUs ──
  ['2026-03-01', 'EAI-GCP', 280000, 200],
  ['2026-06-01', 'EAI-GCP', 560000, 400],
  ['2026-09-01', 'EAI-GCP', 840000, 600],
  ['2026-12-01', 'EAI-GCP', 1120000, 800],
  ['2027-06-01', 'EAI-GCP', 1400000, 1000],

  // ── EAI-AZR: Anthropic on Microsoft Azure / NVIDIA ──
  ['2026-06-01', 'EAI-AZR', 200000, 120],
  ['2026-12-01', 'EAI-AZR', 500000, 300],
  ['2027-06-01', 'EAI-AZR', 1000000, 600],
  ['2027-12-01', 'EAI-AZR', 1650000, 1000],

  // ── EGC: Estimated Gemini Compute ──
  ['2026-06-01', 'EGC', 600000, 265],
  ['2026-09-01', 'EGC', 1500000, 653],
  ['2026-12-01', 'EGC', 2500000, 1080],
  ['2027-06-01', 'EGC', 3070000, 1330],

  // ── COL-ANT: Anthropic tenant allocation on xAI Colossus ──
  // Source: ~$1.25B/mo deal announced May 2026, ~300 MW initially, ramping.
  // Conversion: 300 MW / 1,086 MW total Colossus × 832K H100e ≈ 230K.
  // Power: 300 MW initial block, growing with Colossus expansion.
  // NOTE: This capacity is ALREADY in xAI's satellite total — COL-XAI-ADJ
  // subtracts it from xAI to avoid double-counting.
  ['2026-06-01', 'COL-ANT', 230000, 170],
  ['2027-01-01', 'COL-ANT', 300000, 220],
  ['2027-06-01', 'COL-ANT', 380000, 280],

  // ── COL-GGL: Google/Gemini tenant allocation on xAI Colossus ──
  // Source: SEC filing Jun 5 2026, ~$920M/mo, ~110K NVIDIA GPUs.
  // Conversion: 110K GPUs × 1.0 H100e/GPU = 110K H100e (conservative,
  // assumes H100/H200 mix — actual may be higher if GB200s).
  // Timeline: reduced rate through Sep 2026, full from Oct 2026.
  ['2026-10-01', 'COL-GGL', 110000, 77],
  ['2027-01-01', 'COL-GGL', 110000, 77],

  // ── COL-XAI-ADJ: Subtract rented Colossus capacity from xAI ──
  // This is the balancing entry — ensures the H100e rented to Anthropic
  // and Google are not double-counted under xAI's satellite total.
  // Values are negative: -(COL-ANT + COL-GGL) at each date.
  ['2026-06-01', 'COL-XAI-ADJ', -230000, -170],
  ['2026-10-01', 'COL-XAI-ADJ', -340000, -247],
  ['2027-01-01', 'COL-XAI-ADJ', -410000, -297],
  ['2027-06-01', 'COL-XAI-ADJ', -490000, -357],
] as const;
