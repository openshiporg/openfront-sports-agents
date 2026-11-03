import { useRef } from 'react';
import { GraphQLClient } from 'graphql-request';
import { requestSeedRecord, runSeedPhases, validateAgencySeed } from '../utils/seedRecords';
import { startOnboarding, completeOnboarding } from '../actions/onboarding';
import { getItemsFromJsonData } from '../utils/dataUtils';
import { SECTION_DEFINITIONS } from '../config/templates';
import type { OnboardingStep } from './useOnboardingState';

interface Props {
  currentJsonData: any;
  setProgress: (message: string) => void;
  setItemLoading: (type: string, item: string) => void;
  setItemCompleted: (type: string, item: string) => void;
  setItemError: (type: string, item: string, errorMessage: string) => void;
  setStep: (step: OnboardingStep) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  resetOnboardingState: () => void;
}

const message = (e: any) => e?.response?.errors?.map((x: any) => x.message).join('\n') || e?.message || 'Unknown error';

export function useOnboardingApi(p: Props) {
  const running = useRef(false);
  const runOnboarding = async () => {
    if (running.current) return;
    running.current = true;
    p.setIsLoading(true);
    p.setError(null);
    p.resetOnboardingState();
    p.setStep('progress');
    p.setProgress('Starting agency setup...');
    try {
      const data = p.currentJsonData;
      validateAgencySeed(data);
      const client = new GraphQLClient('/api/graphql', { headers: { 'Content-Type': 'application/json' } });
      // Ordered phases: each section's records exist before dependants reference them.
      const phases = SECTION_DEFINITIONS.filter((s) => data[s.type] && (!Array.isArray(data[s.type]) || data[s.type].length || s.type === 'contacts')).map((section) => async () => {
        p.setProgress(`Saving ${section.label.toLowerCase()}...`);
        const records = section.type === 'agency' || section.type === 'money' ? [data[section.type]] : data[section.type];
        const names = getItemsFromJsonData(data, section.type);
        if (section.type === 'money') {
          names.forEach((n) => p.setItemLoading(section.type, n));
          try { await requestSeedRecord(client, section.entity, records[0]); names.forEach((n) => p.setItemCompleted(section.type, n)); }
          catch (e) { names.forEach((n) => p.setItemError(section.type, n, message(e))); throw e; }
          return;
        }
        for (let i = 0; i < records.length; i++) {
          const name = names[i] || `${section.label} ${i + 1}`;
          p.setItemLoading(section.type, name);
          try { await requestSeedRecord(client, section.entity, records[i]); p.setItemCompleted(section.type, name); }
          catch (e) { p.setItemError(section.type, name, message(e)); throw e; }
        }
      });
      await runSeedPhases(startOnboarding, phases, completeOnboarding);
      p.setProgress('Agency setup saved.');
      p.setStep('done');
    } catch (e: any) {
      p.setError(message(e));
      p.setStep('template');
    } finally {
      running.current = false;
      p.setIsLoading(false);
    }
  };
  return { runOnboarding };
}
