import { useEffect, useRef } from 'react';

import { LAB_NAMES } from '@/config/labs';
import { useDashboard } from '@/store';
import type {
  Lab,
  LabFilter,
  MetricMode,
  ProjMode,
  RaceMode,
  ScatterView,
  ScopeMode,
} from '@/types';

/* ─────────────────────────────────────────────────────────────
   URL hash schema (matches CLAUDE.md "URL Hash State" table):

     #section?metric=h100e|power
             &scope=tracked|fleet
             &proj=current|2029
             &scatter=observed|projected
             &lab=<lab name>|ALL

   Only non-default values are serialized. The section prefix
   (race/geomap/sites/models) is preserved as-is — it's owned by
   the nav scroll-spy, not the store.
   ───────────────────────────────────────────────────────────── */

const VALID_SECTIONS = ['race', 'geomap', 'sites', 'models'] as const;
type ValidSection = (typeof VALID_SECTIONS)[number];

const DEFAULTS = {
  metric: 'h100e' as MetricMode,
  scope: 'tracked' as ScopeMode,
  projMode: 'current' as ProjMode,
  scatterView: 'observed' as ScatterView,
  labFilter: 'ALL' as LabFilter,
  raceMode: 'effective' as RaceMode,
} as const;

/** Partial patch of store fields this hook reads from / writes to the hash. */
interface HashPatch {
  metric?: MetricMode;
  scope?: ScopeMode;
  projMode?: ProjMode;
  scatterView?: ScatterView;
  labFilter?: LabFilter;
  raceMode?: RaceMode;
}

interface ParsedHash {
  section: ValidSection | null;
  patch: HashPatch;
}

function isValidSection(s: string): s is ValidSection {
  return (VALID_SECTIONS as readonly string[]).includes(s);
}

function isLab(v: string): v is Lab {
  return (LAB_NAMES as readonly string[]).includes(v);
}

/** Parse the current `window.location.hash` into a section + store patch. */
export function parseHash(): ParsedHash {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return { section: null, patch: {} };

  // Canonical form is `#section?k=v&k=v`. Be forgiving of two edge cases:
  //   - `#k=v&k=v`      — no section, all params
  //   - `#section`      — section only, no params
  let rawSection: string;
  let rawQuery: string;
  const qIdx = raw.indexOf('?');
  if (qIdx >= 0) {
    rawSection = raw.slice(0, qIdx);
    rawQuery = raw.slice(qIdx + 1);
  } else if (raw.includes('=')) {
    rawSection = '';
    rawQuery = raw;
  } else {
    rawSection = raw;
    rawQuery = '';
  }

  const params: Record<string, string> = {};
  if (rawQuery) {
    for (const kv of rawQuery.split('&')) {
      const [k, v] = kv.split('=');
      if (k && v !== undefined) params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }

  const patch: HashPatch = {};
  if (params.metric === 'h100e' || params.metric === 'power') patch.metric = params.metric;
  if (params.scope === 'tracked' || params.scope === 'fleet') patch.scope = params.scope;
  if (params.proj === 'current' || params.proj === '2029') patch.projMode = params.proj;
  if (params.scatter === 'observed' || params.scatter === 'projected') {
    patch.scatterView = params.scatter;
  }
  if (params.lab) {
    if (params.lab === 'ALL' || isLab(params.lab)) patch.labFilter = params.lab;
  }
  if (params.mode === 'effective' || params.mode === 'ownership') {
    patch.raceMode = params.mode;
  }

  return {
    section: isValidSection(rawSection) ? rawSection : null,
    patch,
  };
}

/**
 * Build a hash string from the current state, preserving the section
 * prefix already in the URL (defaults to 'race'). Only non-default
 * values are emitted as params.
 */
export function buildHash(state: Required<HashPatch>): string {
  const current = window.location.hash.replace(/^#/, '').split('?')[0];
  const section: ValidSection = isValidSection(current) ? current : 'race';

  const params: string[] = [];
  if (state.metric !== DEFAULTS.metric) params.push(`metric=${state.metric}`);
  if (state.scope !== DEFAULTS.scope) params.push(`scope=${state.scope}`);
  if (state.projMode !== DEFAULTS.projMode) params.push(`proj=${state.projMode}`);
  if (state.scatterView !== DEFAULTS.scatterView) {
    params.push(`scatter=${state.scatterView}`);
  }
  if (state.labFilter !== DEFAULTS.labFilter) {
    params.push(`lab=${encodeURIComponent(state.labFilter)}`);
  }
  if (state.raceMode !== DEFAULTS.raceMode) {
    params.push(`mode=${state.raceMode}`);
  }

  return `#${section}${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

/**
 * Two-way sync between the URL hash and the dashboard store.
 *
 *   mount         →  parseHash() → apply patch to store, scroll to section
 *   store change  →  buildHash() → history.replaceState
 *   back/forward  →  hashchange listener → re-apply patch
 *
 * A `_suppress` ref guards against re-entrant updates when the hook's
 * own writes trigger its subscribe callback.
 */
export function useHashState(): void {
  const setMetric = useDashboard((s) => s.setMetric);
  const setScope = useDashboard((s) => s.setScope);
  const setProjMode = useDashboard((s) => s.setProjMode);
  const setScatterView = useDashboard((s) => s.setScatterView);
  const setLabFilter = useDashboard((s) => s.setLabFilter);
  const setRaceMode = useDashboard((s) => s.setRaceMode);

  const suppressRef = useRef(false);

  // Apply the parsed hash patch to the store via slice setters.
  const applyPatch = (patch: HashPatch): void => {
    if (patch.metric) setMetric(patch.metric);
    if (patch.scope) setScope(patch.scope);
    if (patch.projMode) setProjMode(patch.projMode);
    if (patch.scatterView) setScatterView(patch.scatterView);
    if (patch.labFilter) setLabFilter(patch.labFilter);
    if (patch.raceMode) setRaceMode(patch.raceMode);
  };

  // --- Mount: read hash → store, scroll to section. ---
  useEffect(() => {
    const parsed = parseHash();
    if (Object.keys(parsed.patch).length > 0) {
      suppressRef.current = true;
      applyPatch(parsed.patch);
      suppressRef.current = false;
    }
    if (parsed.section) {
      const el = document.getElementById(parsed.section);
      if (el) {
        // Defer to next tick so layout is ready.
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Listen for back/forward (hashchange). ---
  useEffect(() => {
    const handler = (): void => {
      if (suppressRef.current) return;
      const parsed = parseHash();
      if (Object.keys(parsed.patch).length > 0) {
        suppressRef.current = true;
        applyPatch(parsed.patch);
        suppressRef.current = false;
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Subscribe to store changes, push to hash. ---
  useEffect(() => {
    const unsubscribe = useDashboard.subscribe((state, prev) => {
      // Only react to fields this hook owns.
      if (
        state.metric === prev.metric &&
        state.scope === prev.scope &&
        state.projMode === prev.projMode &&
        state.scatterView === prev.scatterView &&
        state.labFilter === prev.labFilter &&
        state.raceMode === prev.raceMode
      ) {
        return;
      }
      if (suppressRef.current) return;

      const next = buildHash({
        metric: state.metric,
        scope: state.scope,
        projMode: state.projMode,
        scatterView: state.scatterView,
        labFilter: state.labFilter,
        raceMode: state.raceMode,
      });
      if (window.location.hash !== next) {
        suppressRef.current = true;
        try {
          history.replaceState(null, '', next);
        } catch {
          /* iframe / sandboxed context — silently ignore */
        }
        suppressRef.current = false;
      }
    });
    return unsubscribe;
  }, []);
}
