import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { LAB_OWNERSHIP_CONFIG } from '@/config/labOwnershipMapping';
import { LAB_COLORS, LAB_NAMES } from '@/config/labs';
import { FLEET_ESTIMATES } from '@/data/fleet';

import styles from './TruthModal.module.css';

/* ─────────────────────────────────────────────────────────────
   Truth & Data Limitations modal.

   Surfaces every methodological caveat that the dashboard's
   editorial UX deliberately under-emphasizes elsewhere — sources
   with direct download links, the full LAB_OWNERSHIP_CONFIG table
   so users can verify exactly which numbers use overrides,
   uncertainty bands carried over from Epoch's documentation, and
   a one-line summary that anchors the whole thing.

   Mounted at the document root via Portal so the backdrop covers
   the fixed nav bar. Closes on Escape, backdrop click, or × button.
   No focus trap (single button + scrollable content — keyboard
   users can tab out without surprises) but the close button is
   auto-focused on open for keyboard recovery.
   ───────────────────────────────────────────────────────────── */

interface TruthModalProps {
  open: boolean;
  onClose: () => void;
}

const EPOCH_FACILITIES_URL = 'https://epoch.ai/data/data-centers';
const EPOCH_FACILITIES_CSV =
  'https://epoch.ai/data/ai_data_centers.csv';
const EPOCH_CHIPOWNERS_URL =
  'https://epoch.ai/blog/introducing-the-ai-chip-owners-explorer';
const EPOCH_CHIPOWNERS_ZIP = 'https://epoch.ai/data/ai_chip_owners.zip';

/* ── Per-section data source listings ── */

interface SectionSource {
  name: string;
  url?: string;
  desc: string;
  priority: number; // 1 = primary, 2 = secondary, 3 = supplementary
}

interface SectionSources {
  section: string;
  anchor: string;
  sources: readonly SectionSource[];
}

const SECTION_SOURCES: readonly SectionSources[] = [
  {
    section: 'The Race',
    anchor: '#race',
    sources: [
      {
        name: 'Epoch AI · Frontier Data Centers CSV',
        url: 'https://epoch.ai/data/data_centers/data_centers.csv',
        desc: 'Satellite-verified facility capacity (H100e, power MW, status). Fetched live on every page load.',
        priority: 1,
      },
      {
        name: 'Epoch AI · Data Center Timelines CSV',
        url: 'https://epoch.ai/data/data_centers/data_center_timelines.csv',
        desc: 'Historical capacity ramp per facility over time.',
        priority: 1,
      },
      {
        name: 'Epoch AI · Chip Owners ZIP',
        url: 'https://epoch.ai/data/ai_chip_owners.zip',
        desc: 'Three CSVs: cumulative by designer, cumulative by chip type, quarters by chip type. H100e medians + Monte Carlo 5th/95th. Cached 24h.',
        priority: 1,
      },
      {
        name: 'Amazon — Project Rainier (AWS Trainium2)',
        url: 'https://www.aboutamazon.com/news/aws/aws-project-rainier-ai-trainium-chips-compute-cluster',
        desc: 'Anthropic cloud-lease leg on AWS. ~500K Trn2 chips live Oct 2025, scaling to >1M. Trn2 ≈ 0.93 H100e.',
        priority: 2,
      },
      {
        name: 'Anthropic — Google Cloud TPU expansion',
        url: 'https://www.anthropic.com/news/expanding-our-use-of-google-cloud-tpus-and-services',
        desc: 'Anthropic cloud-lease leg on GCP. Up to 1M TPUs, "well over a gigawatt" online 2026. Blended ~1.4 H100e/chip.',
        priority: 2,
      },
      {
        name: 'NVIDIA — Microsoft–NVIDIA–Anthropic partnership',
        url: 'https://blogs.nvidia.com/blog/microsoft-nvidia-anthropic-announce-partnership/',
        desc: 'Anthropic cloud-lease leg on Azure. $30B commitment, up to 1GW with Grace Blackwell + Vera Rubin. GB200 ≈ 2.5 H100e.',
        priority: 2,
      },
      {
        name: 'Google Cloud — Ironwood TPU',
        url: 'https://cloud.google.com/blog/products/ai-machine-learning/ironwood-tpu-age-of-inference',
        desc: 'Gemini internal TPU fleet estimate. Ironwood ~2.3 H100e/chip. Used for EGC (Estimated Gemini Compute) leg.',
        priority: 2,
      },
      {
        name: 'SemiAnalysis — Multi-Datacenter Training',
        url: 'https://semianalysis.com/2024/09/13/google-multi-datacenter-training/',
        desc: 'Google TPU fleet size + multi-site training analysis. Basis for estimating Gemini-dedicated fraction.',
        priority: 2,
      },
      {
        name: 'Fubon Securities — TPU production forecast (Jan 2026)',
        url: 'https://www.investing.com/news/stock-market-news/2026-tpu-server-outlook-google-takes-swing-at-the-king-4423670',
        desc: 'Arthur Liao (Fubon Research): 3.1–3.2M TPU production in 2026, constrained by TSMC CoWoS capacity. Cross-checks Gemini fleet ramp.',
        priority: 2,
      },
      {
        name: 'Anthropic — Google + Broadcom TPU deal (Apr 2026)',
        url: 'https://www.anthropic.com/news/google-broadcom-partnership-compute',
        desc: 'Multi-GW TPU deal (~3.5 GW per Broadcom filing) for 2027+ delivery. Rented capacity — does not change ownership ratios.',
        priority: 2,
      },
      {
        name: '2029 projection targets',
        desc: 'Per-lab power-constrained H100e + power targets derived from Epoch satellite ramps and announced cloud-lease growth. Ease-out interpolation with ±8% base + 6%/yr uncertainty.',
        priority: 3,
      },
    ],
  },
  {
    section: 'Geo Map',
    anchor: '#geomap',
    sources: [
      {
        name: 'Epoch AI · Frontier Data Centers',
        url: 'https://epoch.ai/data/data-centers',
        desc: 'Facility locations, ownership, construction status, and satellite-verified metadata.',
        priority: 1,
      },
      {
        name: 'ESRI World Imagery',
        url: 'https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9',
        desc: 'Satellite imagery basemap tiles for facility location visualization.',
        priority: 2,
      },
      {
        name: 'CARTO Voyager Labels',
        url: 'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
        desc: 'Label overlay (city names, roads) rendered on top of satellite imagery.',
        priority: 3,
      },
      {
        name: 'Facility coordinate overrides',
        desc: 'Hardcoded lat/lon corrections for facilities where Epoch-published coordinates are inaccurate (e.g. Fluidstack Lake Mariner).',
        priority: 3,
      },
    ],
  },
  {
    section: 'Intel',
    anchor: '#sites',
    sources: [
      {
        name: 'Epoch AI · Frontier Data Centers',
        url: 'https://epoch.ai/data/data-centers',
        desc: 'Full facility metadata: construction status, satellite-verified observations, capacity estimates, timeline signals.',
        priority: 1,
      },
      {
        name: 'Epoch AI · Data Center Timelines CSV',
        url: 'https://epoch.ai/data/data_centers/data_center_timelines.csv',
        desc: 'Per-facility capacity ramp over time for timeline drawer visualization.',
        priority: 1,
      },
      {
        name: 'Lab-to-facility mapping',
        desc: 'Hardcoded handle-to-lab associations linking Epoch facility handles to the 5 frontier labs.',
        priority: 3,
      },
    ],
  },
  {
    section: 'Models',
    anchor: '#models',
    sources: [
      {
        name: 'Epoch AI · Notable AI Models',
        url: 'https://epoch.ai/data/notable-ai-models',
        desc: 'Training compute (FLOPs) for frontier models — powers the Training Compute Growth and Within-Lab Scaling charts.',
        priority: 1,
      },
      {
        name: 'Artificial Analysis · Intelligence Index v4.0',
        url: 'https://artificialanalysis.ai/leaderboards/models',
        desc: 'Composite ranking across 10 evaluations. Independent third-party measurement.',
        priority: 1,
      },
      {
        name: 'METR · Time Horizons',
        url: 'https://metr.org/time-horizons/',
        desc: '50% task-completion time horizon per model. Some data from secondary write-ups (LessWrong, OfficeChai).',
        priority: 1,
      },
      {
        name: 'SWE-bench Verified + Pro',
        url: 'https://www.swebench.com',
        desc: 'Real-world GitHub bug fixes (500 issues). Princeton NLP.',
        priority: 2,
      },
      {
        name: 'GPQA Diamond',
        url: 'https://gpqa-diamond.github.io',
        desc: 'PhD-level science questions. Human expert accuracy ~65%. Verified by Epoch AI + AA.',
        priority: 2,
      },
      {
        name: 'ARC-AGI-2',
        url: 'https://arcprize.org',
        desc: 'Abstract visual reasoning, resists memorization. ARC Prize Foundation.',
        priority: 2,
      },
      {
        name: "AIME '25",
        url: 'https://artofproblemsolving.com/wiki/index.php/2025_AIME',
        desc: 'Competition math (45 problems, answers 0–999). AMC/MAA, independently evaluated by AA.',
        priority: 2,
      },
      {
        name: "Humanity's Last Exam (HLE)",
        url: 'https://last-exam.ai',
        desc: '2,500 expert questions — intended as final academic eval. CAIS (Dan Hendrycks).',
        priority: 2,
      },
      {
        name: 'MMMU-Pro',
        url: 'https://mmmu-benchmark.github.io',
        desc: 'Expert-level multimodal visual reasoning.',
        priority: 2,
      },
      {
        name: 'OSWorld',
        url: 'https://os-world.github.io',
        desc: 'Desktop computer-use evaluation. Human baseline 72.4%.',
        priority: 3,
      },
      {
        name: 'BrowseComp',
        url: 'https://openai.com/index/browsecomp',
        desc: 'Web browsing and information retrieval evaluation. OpenAI.',
        priority: 3,
      },
      {
        name: 'GDPval',
        url: 'https://openai.com/index/gdpval',
        desc: 'Real-world knowledge work across 44 occupations. OpenAI + AA independent verification.',
        priority: 3,
      },
    ],
  },
];

interface UncertaintyNote {
  metric: string;
  band: string;
  source: string;
}

const UNCERTAINTY_NOTES: readonly UncertaintyNote[] = [
  {
    metric: 'Facility online dates',
    band: '± 6 months',
    source:
      "Epoch's satellite-verified construction signals (cooling towers, " +
      'roof completion, substation status) infer schedules from imagery, ' +
      'not insider commit dates.',
  },
  {
    metric: 'H100e capacity per facility',
    band: '× 0.7 / × 1.4',
    source:
      "Epoch's Monte Carlo 5th–95th percentile range, propagated from " +
      'unit-count uncertainty + chip-mix assumptions per site.',
  },
  {
    metric: 'Cloud-lease fleet (Anthropic + Gemini)',
    band: 'analyst estimate',
    source:
      'Sourced from announced multi-cloud agreements (AWS Trainium, ' +
      'Google + Broadcom multi-GW TPU deal, Azure Stargate). Not satellite-' +
      'verifiable — treat as a rough envelope, not a precise number.',
  },
  {
    metric: '2029 projections',
    band: '± 8% base + 6%/yr',
    source:
      'Power-constrained per-lab targets from Epoch satellite ramps + ' +
      'sourced cloud-lease fleet, ease-out interpolation. Compounds to ' +
      '±24% by Jan 2029 → range 29M–47M H100e total.',
  },
  {
    metric: 'Owner → Lab attribution',
    band: 'over-attributed',
    source:
      "Epoch's `Microsoft` operator total includes Bing/Office/Azure " +
      "customer workloads, not just OpenAI. Same for `Amazon` (general AWS, " +
      "not just Anthropic). The dashboard's % Owned column uses the override " +
      'path for these two labs to avoid silent over-attribution.',
  },
  {
    metric: 'METR Time Horizons',
    band: 'mixed-source',
    source:
      'Some data points come from secondary write-ups (LessWrong, OfficeChai) ' +
      'rather than the primary METR YAML. Newer measurements (post-2025-Q3) ' +
      'should be treated as preliminary until back-validated.',
  },
];

/* ── Derive live conversion ratios from fleet.ts ── */

interface LeaseLeg {
  label: string;
  handle: string;
  lab: string;
  h100eRatio: string;
  chipType: string;
  latestH100e: number;
}

const LEASE_LEGS: readonly LeaseLeg[] = [
  {
    label: 'Anthropic on AWS — Trainium2 chip (Project Rainier program)',
    handle: 'EAI-AWS',
    lab: 'Anthropic',
    h100eRatio: '0.93 H100e/Trn2',
    chipType: 'Trainium2 (Amazon custom chip)',
    latestH100e: Math.max(
      ...FLEET_ESTIMATES.filter(([, h]) => h === 'EAI-AWS').map(([, , v]) => v),
    ),
  },
  {
    label: 'Anthropic on Google Cloud — TPU v6e / Ironwood chips',
    handle: 'EAI-GCP',
    lab: 'Anthropic',
    h100eRatio: '~1.4 H100e/chip (blended v6e + Ironwood)',
    chipType: 'TPU v6e / Ironwood (Google custom chips)',
    latestH100e: Math.max(
      ...FLEET_ESTIMATES.filter(([, h]) => h === 'EAI-GCP').map(([, , v]) => v),
    ),
  },
  {
    label: 'Anthropic on Microsoft Azure — GB200 chip (NVIDIA Grace Blackwell)',
    handle: 'EAI-AZR',
    lab: 'Anthropic',
    h100eRatio: '~2.5 H100e/GB200',
    chipType: 'GB200 (NVIDIA Grace Blackwell)',
    latestH100e: Math.max(
      ...FLEET_ESTIMATES.filter(([, h]) => h === 'EAI-AZR').map(([, , v]) => v),
    ),
  },
  {
    label: 'Gemini on Google internal — TPU v4/v5/v6 chips',
    handle: 'EGC',
    lab: 'Gemini',
    h100eRatio: '~1.2 H100e/chip (older v4/v5 fleet avg)',
    chipType: 'TPU v4/v5/v6 (Google custom chips)',
    latestH100e: Math.max(
      ...FLEET_ESTIMATES.filter(([, h]) => h === 'EGC').map(([, , v]) => v),
    ),
  },
];

function formatH100e(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${Math.round(n / 1000)}K`;
}

/* ── Methodology & Limitations (collapsible inner section) ── */

function MethodologySection(): JSX.Element {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>
        4 · Methodology &amp; Limitations
      </h3>
      <div className={styles.methodologyBody}>
          {/* ── Confidence tier 1: self-operated ── */}
          <div className={styles.tierBlock}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadgePrimary}>HIGH CONFIDENCE</span>
              <span className={styles.tierLabel}>
                Self-operated labs (Meta, xAI)
              </span>
            </div>
            <p className={styles.tierDesc}>
              Meta and xAI built and operate their own dedicated facilities —
              Colossus 1+2 (xAI), Hyperion, Prometheus, Temple (Meta). The
              operator <em>is</em> the lab, so 100% of satellite-verified
              capacity maps directly to frontier model training. Epoch AI
              confirms physical capacity via satellite imagery + power signals
              → facility MW → H100e (typical 2–2.5× overhead). Accuracy:
              ~90–95% within Epoch&apos;s ±1.4× capacity bands.
            </p>
          </div>

          {/* ── Confidence tier 2: hyperscaler-attributed ── */}
          <div className={styles.tierBlock}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadgeSecondary}>
                EDITORIAL ATTRIBUTION
              </span>
              <span className={styles.tierLabel}>
                Satellite-tracked facilities → frontier lab mapping
              </span>
            </div>
            <p className={styles.tierDesc}>
              For <strong>OpenAI</strong>, <strong>Anthropic</strong>, and{' '}
              <strong>Gemini</strong>, Epoch&apos;s satellite data tells us the{' '}
              <em>total physical capacity</em> of each new-construction AI data
              center — but not how that capacity splits between tenants. These
              are purpose-built AI facilities, but they are owned and operated
              by cloud providers (Microsoft, Amazon, Google) that also serve
              their own products and cloud customers from the same sites.
              The dashboard attributes 100% of each facility to a single
              frontier lab based on editorial judgment:
            </p>
            <ul className={styles.limitationsList}>
              <li>
                <strong>Microsoft / Oracle facilities → OpenAI</strong> — but
                Microsoft also serves Azure AI customers, Copilot, and Bing
                from the same campuses.
              </li>
              <li>
                <strong>Amazon facilities → Anthropic</strong> — based on the
                Project Rainier partnership, but Amazon serves all AWS customers
                from shared infrastructure.
              </li>
              <li>
                <strong>Google facilities → Gemini</strong> — but Google uses
                these TPU clusters for Search, YouTube, Ads, Cloud customers,
                and Gemini simultaneously. Only a fraction goes to frontier
                training.
              </li>
            </ul>
            <p className={styles.tierNote}>
              This editorial 100% attribution likely{' '}
              <strong>over-attributes</strong> frontier-training compute because
              hyperscaler facilities also serve Copilot, Search, YouTube, Ads,
              general cloud customers, and other internal workloads. The true
              per-tenant allocation is proprietary.
            </p>
          </div>

          {/* ── Confidence tier 3: cloud-lease estimates ── */}
          <div className={styles.tierBlock}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadgeSecondary}>ESTIMATE RANGE</span>
              <span className={styles.tierLabel}>
                Cloud-lease adjustments
              </span>
            </div>
            <p className={styles.tierDesc}>
              Cloud tenants also train on chips housed in{' '}
              <strong>pre-existing hyperscaler facilities</strong> — data
              centers that were not purpose-built for AI. These campuses host a
              mix of AI accelerators alongside traditional cloud infrastructure
              (storage, networking, general compute) serving many customers and
              workloads. The AI chips inside them are shared across frontier
              training, inference, and cloud-customer jobs — the
              frontier-dedicated fraction is itself an estimate.
            </p>
            <p className={styles.tierDesc}>
              We attempt to count only the capacity{' '}
              <strong>not already captured</strong> by the satellite-tracked
              facilities above. For example, Epoch already tracks some Project
              Rainier sites (New Carlisle, Canton, Ridgeland) — our AWS
              cloud-lease leg tries to add only the distributed capacity beyond
              those. But this boundary is editorial, not verified — we cannot
              confirm exactly what Epoch has already counted vs. what remains
              invisible.
            </p>
            <p className={styles.tierDesc}>
              We estimate from public announcements and convert to H100e using
              published specs. <strong>Note:</strong> the names below refer to
              chip architectures and partnership programs, not physical
              facilities. The specific data centers hosting this capacity are
              not publicly disclosed.
            </p>
            <ul className={styles.leaseLegList}>
              {LEASE_LEGS.map((leg) => (
                <li key={leg.handle} className={styles.leaseLegItem}>
                  <div className={styles.leaseLegRow}>
                    <span className={styles.leaseLegName}>{leg.label}</span>
                    <span className={styles.leaseLegH100e}>
                      → {formatH100e(leg.latestH100e)} H100e
                    </span>
                  </div>
                  <div className={styles.leaseLegMeta}>
                    {leg.lab} · {leg.chipType} · {leg.h100eRatio}
                  </div>
                </li>
              ))}
            </ul>
            <p className={styles.tierNote}>
              None of these H100e numbers are directly stated in announcements.
              We convert using estimated ratios and interpolate ramp schedules
              from <code className={styles.code}>fleet.ts</code>.
            </p>
          </div>

          {/* ── Double-count risk ── */}
          <div className={styles.limitationsBlock}>
            <h4 className={styles.limitationsTitle}>
              Potential double-count risk
            </h4>
            <p className={styles.tierDesc}>
              Anthropic&apos;s Google Cloud TPU lease (EAI-GCP) could physically
              reside inside the same Google facilities we attribute to Gemini
              (New Albany, Council Bluffs, Cedar Rapids, etc.). If so, some
              capacity would be counted twice — once as Gemini satellite-tracked
              and again as Anthropic cloud-lease. We cannot verify this from
              public data. The same risk applies to any Amazon facility
              attributed to Anthropic that also serves general AWS workloads.
            </p>
          </div>

          {/* ── Projections ── */}
          <div className={styles.tierBlock}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadgeSupp}>PROJECTION</span>
              <span className={styles.tierLabel}>
                2029 targets
              </span>
            </div>
            <p className={styles.tierDesc}>
              Power-constrained linear interpolation of Epoch ramps + announced
              cloud growth. Ease-out curve (1-(1-t)^1.8) with ±8% base + 6%/yr
              uncertainty → displayed as ±20–24% bands by Jan 2029.
            </p>
          </div>

          {/* ── Key limitations ── */}
          <div className={styles.limitationsBlock}>
            <h4 className={styles.limitationsTitle}>
              Key limitations (not fixable with public data)
            </h4>
            <ul className={styles.limitationsList}>
              <li>
                Exact chip allocation between tenants inside hyperscaler
                facilities is proprietary — no public source breaks this out.
              </li>
              <li>
                Satellite-tracked capacity is attributed 100% to a single
                frontier lab per facility, even when the operator serves
                multiple tenants and its own products.
              </li>
              <li>Facility timelines have ±6 months uncertainty.</li>
              <li>Non-U.S. and smaller sites are underrepresented in satellite data.</li>
              <li>
                Future efficiency gains, cancellations, or new partnerships
                could shift numbers materially.
              </li>
            </ul>
          </div>

          {/* ── How to cite ── */}
          <div className={styles.tierBlock}>
            <div className={styles.tierHeader}>
              <span className={styles.tierLabel}>How to cite</span>
            </div>
            <p className={styles.tierDesc}>
              AI Arms Race Dashboard by Adi Wasserman. Primary data: Epoch AI
              (live-fetched). Methodology &amp; Limitations last updated April
              2026. Full sources in this modal.{' '}
              <a
                href="https://adi-wasserman.github.io/ai-arms-race/"
                target="_blank"
                rel="noreferrer"
                className={styles.citeLink}
              >
                adi-wasserman.github.io/ai-arms-race
              </a>
            </p>
          </div>

          <p className={styles.tierNote}>
            All raw sources and Epoch methodology links are listed in section 5
            below. Data refreshes on every page load.
          </p>
      </div>
    </section>
  );
}

export function TruthModal({ open, onClose }: TruthModalProps): JSX.Element | null {
  // Escape-key dismissal + body-scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="truth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>About this dashboard</div>
            <h2 id="truth-modal-title" className={styles.title}>
              Truth &amp; Data Limitations
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
            autoFocus
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {/* ─── Summary ─── */}
          <p className={styles.summary}>
            This is the <strong>most accurate public picture possible</strong>{' '}
            of the AI compute race. The only non-derived numbers are the two
            documented overrides for <strong>OpenAI</strong> and{' '}
            <strong>Anthropic</strong> — every other value flows directly from
            Epoch AI&apos;s live datasets.
          </p>

          {/* ─── Sources ─── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>1 · Sources</h3>
            <ul className={styles.sourceList}>
              <li>
                <div className={styles.sourceLabel}>
                  Epoch AI · Frontier Data Centers
                </div>
                <div className={styles.sourceLinks}>
                  <a
                    href={EPOCH_FACILITIES_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer →
                  </a>
                  <a
                    href={EPOCH_FACILITIES_CSV}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.sourceCsv}
                  >
                    ai_data_centers.csv ↓
                  </a>
                </div>
                <div className={styles.sourceMeta}>
                  Satellite-verified construction signals + facility metadata.
                  CC BY 4.0. Pulled live on every page load with a CORS-proxy
                  fallback for offline-cached display.
                </div>
              </li>
              <li>
                <div className={styles.sourceLabel}>
                  Epoch AI · Chip Owners Explorer
                </div>
                <div className={styles.sourceLinks}>
                  <a
                    href={EPOCH_CHIPOWNERS_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer →
                  </a>
                  <a
                    href={EPOCH_CHIPOWNERS_ZIP}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.sourceCsv}
                  >
                    ai_chip_owners.zip ↓
                  </a>
                </div>
                <div className={styles.sourceMeta}>
                  Three CSVs in one ZIP: cumulative_by_designer,
                  cumulative_by_chip_type, quarters_by_chip_type. Sourced
                  H100e medians + Monte Carlo 5th/95th percentiles. CC BY 4.0,
                  cached locally for 24h after first fetch.
                </div>
              </li>
            </ul>
          </section>

          {/* ─── Why cloud providers appear as owners + LAB_OWNERSHIP_CONFIG table ─── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              2 · Why we show cloud providers as the owners
            </h3>
            <p className={styles.methodologyText}>
              Epoch&apos;s Chip Owners dataset attributes every chip to{' '}
              <strong>whoever bought it</strong>, not whoever trains on it.
              That means Microsoft&apos;s 3M+ H100e includes capacity sold to
              OpenAI, Bing, Copilot, and every Azure customer — Epoch does
              not publish the per-tenant breakdown. The dashboard mirrors
              this 1:1 in the operator-row table, then layers a documented
              override path on top for the two frontier labs that own none
              of their own silicon (OpenAI, Anthropic). The full surface
              area of those overrides is below — every other lab&apos;s
              percentage is 100% derived from the live ZIP.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lab</th>
                    <th>Self-owned (Epoch operator names)</th>
                    <th className={styles.right}>Override %</th>
                    <th>Resolution path</th>
                  </tr>
                </thead>
                <tbody>
                  {LAB_NAMES.map((lab) => {
                    const cfg = LAB_OWNERSHIP_CONFIG[lab];
                    const usesOverride = cfg.selfOwned.length === 0;
                    const labColor = LAB_COLORS[lab];
                    return (
                      <tr
                        key={lab}
                        className={
                          usesOverride ? styles.rowOverride : undefined
                        }
                      >
                        <td>
                          <span
                            className={styles.labName}
                            style={{ color: labColor }}
                          >
                            {lab}
                          </span>
                        </td>
                        <td>
                          {cfg.selfOwned.length > 0 ? (
                            <code className={styles.code}>
                              {cfg.selfOwned.join(', ')}
                            </code>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </td>
                        <td className={styles.right}>
                          {cfg.overridePct !== undefined ? (
                            <span className={styles.overrideBadge}>
                              {cfg.overridePct}%
                            </span>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </td>
                        <td className={styles.resolution}>
                          {cfg.selfOwned.length > 0
                            ? 'Sum of selfOwned medians from live Epoch ZIP ÷ effective fleet'
                            : cfg.overridePct === 0
                              ? 'Pure cloud tenant — no first-party chip ownership'
                              : 'Manual override (transition case — see footnote)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className={styles.tableNote}>
              <strong>Read order in</strong>{' '}
              <code className={styles.code}>computePctOwned()</code>:{' '}
              selfOwned has entries → derived from Epoch · selfOwned empty +
              overridePct set → use override · selfOwned empty + no override
              → 0%.
            </p>
          </section>

          {/* ─── Uncertainty notes ─── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>3 · Uncertainty</h3>
            <ul className={styles.uncertaintyList}>
              {UNCERTAINTY_NOTES.map((u) => (
                <li key={u.metric}>
                  <div className={styles.uncMetric}>
                    <span className={styles.uncLabel}>{u.metric}</span>
                    <span className={styles.uncBand}>{u.band}</span>
                  </div>
                  <div className={styles.uncSource}>{u.source}</div>
                </li>
              ))}
            </ul>
          </section>

          {/* ─── Methodology & Limitations (collapsible) ─── */}
          <MethodologySection />

          {/* ─── Data sources by section ─── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>5 · Data Sources by Section</h3>
            {SECTION_SOURCES.map((s) => (
              <div key={s.anchor} className={styles.sectionBlock}>
                <h4 className={styles.sectionBlockTitle}>
                  <a href={s.anchor} onClick={onClose}>
                    {s.section}
                  </a>
                </h4>
                <ol className={styles.priorityList}>
                  {s.sources.map((src) => (
                    <li key={src.name} className={styles.priorityItem}>
                      <div className={styles.priorityRow}>
                        <span
                          className={
                            src.priority === 1
                              ? styles.priorityBadgePrimary
                              : src.priority === 2
                                ? styles.priorityBadgeSecondary
                                : styles.priorityBadgeSupp
                          }
                        >
                          {src.priority === 1
                            ? 'PRIMARY'
                            : src.priority === 2
                              ? 'SECONDARY'
                              : 'SUPPLEMENTARY'}
                        </span>
                        <span className={styles.priorityName}>
                          {src.url ? (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {src.name}
                            </a>
                          ) : (
                            src.name
                          )}
                        </span>
                      </div>
                      <div className={styles.priorityDesc}>{src.desc}</div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>

          {/* ─── Closing summary ─── */}
          <p className={styles.closing}>
            If you spot a number that looks wrong,{' '}
            <a
              href="https://github.com/Adi-Wasserman/ai-arms-race/issues"
              target="_blank"
              rel="noreferrer"
            >
              open an issue on GitHub
            </a>
            . Every value in this dashboard is traceable to one of the two
            Epoch CSVs above or to a clearly-documented override row in the
            table.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
