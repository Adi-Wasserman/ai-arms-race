/** A single construction-signal definition shown in the legend and drawer. */
export interface ConstructionSignal {
  key: string;
  icon: string;
  category: string;
  meaning: string;
  significance: string;
  /** '+' = positive progress, '-' = negative/delay. */
  polarity: '+' | '-';
}
