import type { Lab, LabChipMap, LabColorMap } from '@/types';

export const LAB_NAMES: readonly Lab[] = [
  'OpenAI',
  'Gemini',
  'Meta',
  'xAI',
  'Anthropic',
] as const;

export const LAB_COLORS: LabColorMap = {
  OpenAI: '#00ff87',
  Gemini: '#4285f4',
  Meta: '#00d4ff',
  xAI: '#ff4444',
  Anthropic: '#ffaa00',
} as const;

export const LAB_CHIPS: LabChipMap = {
  OpenAI: 'GB200/H100',
  Gemini: 'TPUv5/Ironwood',
  Meta: 'H100/B200',
  xAI: 'H200/GB200',
  Anthropic: 'Trainium2/Ironwood/GB200',
} as const;
