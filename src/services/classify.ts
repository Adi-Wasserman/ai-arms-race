import type { ConfidenceTag, LabOrOther } from '@/types';

/**
 * Classify a facility into its parent lab using Epoch's "Users" and "Owner"
 * columns. Pure string-matching heuristic ported from ai-arms-race.html.
 */
export function classifyLab(users: string, owner: string): LabOrOther {
  const s = (users || '').toLowerCase();
  const w = (owner || '').toLowerCase();
  if (s.includes('openai')) return 'OpenAI';
  if (s.includes('google deepmind')) return 'Gemini';
  if (s.includes('meta')) return 'Meta';
  if (s.includes('xai')) return 'xAI';
  if (s.includes('anthropic')) return 'Anthropic';
  if (s.includes('microsoft')) return 'OpenAI';
  if (w.includes('google')) return 'Gemini';
  if (w.includes('amazon')) return 'Anthropic';
  if (w.includes('oracle')) return 'OpenAI';
  return 'Other';
}

/**
 * Classify a facility from its handle/name alone. Used when the DC CSV
 * is unavailable and only the timeline rows are present.
 */
export function classifyByHandle(handle: string): LabOrOther {
  const h = (handle || '').toLowerCase();
  if (h.includes('openai') || h.includes('stargate')) return 'OpenAI';
  if (h.includes('microsoft') || h.includes('fairwater')) return 'OpenAI';
  if (h.includes('meta ') || h.includes('prometheus') || h.includes('hyperion')) return 'Meta';
  if (h.includes('xai') || h.includes('colossus')) return 'xAI';
  if (h.includes('anthropic') || h.includes('rainier')) return 'Anthropic';
  if (h.includes('amazon')) return 'Anthropic';
  if (h.includes('google') || h.includes('crusoe')) return 'Gemini';
  return 'Other';
}

/**
 * Extract the Epoch confidence tag from the Users/Owner columns
 * (strings contain "#confident", "#likely", or "#speculative").
 */
export function extractConfidence(users: string, owner: string): ConfidenceTag {
  const s = `${users || ''} ${owner || ''}`;
  if (s.includes('#confident')) return 'confident';
  if (s.includes('#likely')) return 'likely';
  if (s.includes('#speculative')) return 'speculative';
  return 'unknown';
}
