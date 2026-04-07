export type Lab = 'OpenAI' | 'Gemini' | 'Meta' | 'xAI' | 'Anthropic';

/** A lab or "Other" for facilities not attributed to the tracked 5. */
export type LabOrOther = Lab | 'Other';

export type LabColorMap = Readonly<Record<Lab, string>>;
export type LabChipMap = Readonly<Record<Lab, string>>;
