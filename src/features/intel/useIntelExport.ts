import { useCallback } from 'react';

import { LAB_COLORS } from '@/config/labs';
import { scoreConfidence } from '@/services/confidence';
import { downloadCSV } from '@/services/export';
import { useDashboard } from '@/store';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

/**
 * Section-specific CSV export for the Intel table.
 * Ported from `Export.exportIntelCSV` in ai-arms-race.html.
 */
export function useIntelExport(): { exportCSV: () => void } {
  const exportCSV = useCallback((): void => {
    const state = useDashboard.getState();
    const rows = state.dataCenters
      .filter((dc) => dc.co !== 'Other')
      .map((dc) => {
        const tl = state.timeline.filter((t) => t.dc === dc.handle);
        const cf = scoreConfidence(dc, tl, TODAY_ISO, LAB_COLORS);
        return {
          facility: dc.title,
          handle: dc.handle,
          lab: dc.co,
          confidence_pct: cf.score,
          status: cf.label,
          current_H100e: dc.h,
          current_MW: dc.pw,
          cost_USD_B: dc.cs,
          phase: cf.phaseLabel,
        };
      });

    downloadCSV(rows, `ai-arms-race-intel-${TODAY_ISO}.csv`);
  }, []);

  return { exportCSV };
}
