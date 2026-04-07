import type { StateCreator } from 'zustand';

import type { ScatterView } from '@/types';

import type { DashboardState } from '../index';

export interface ModelsSlice {
  /** Model names (as shown in the benchmark table) the user has picked. */
  selectedModels: string[];
  scatterView: ScatterView;

  setSelectedModels: (models: string[]) => void;
  toggleModel: (name: string) => void;
  setScatterView: (view: ScatterView) => void;
}

export const createModelsSlice: StateCreator<
  DashboardState,
  [],
  [],
  ModelsSlice
> = (set, get) => ({
  selectedModels: [],
  scatterView: 'observed',

  setSelectedModels: (selectedModels) => set({ selectedModels }),

  toggleModel: (name) => {
    const current = get().selectedModels;
    const next = current.includes(name)
      ? current.filter((m) => m !== name)
      : [...current, name];
    set({ selectedModels: next });
  },

  setScatterView: (scatterView) => set({ scatterView }),
});
