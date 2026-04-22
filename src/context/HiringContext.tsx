/**
 * HiringContext — Shared state between Recruitment and HiringPipeline.
 *
 * Flow:
 *   Recruitment (offered + accepted) → "Move to Hiring Pipeline"
 *   → pushes a Candidate record into this context
 *   → HiringPipeline reads from this context (initialised with SEED data for demo)
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Candidate, HiringStatus } from '../pages/HiringPipeline';

// ── Re-export types so importers can grab them from one place ──────────────────
export type { Candidate, HiringStatus };

// ── Context Shape ──────────────────────────────────────────────────────────────
interface HiringContextValue {
  candidates: Candidate[];
  addCandidate: (c: Candidate) => void;
  updateCandidate: (id: string, status: HiringStatus, extras?: Partial<Candidate>) => void;
  hasCandidate: (id: string) => boolean;
}

const HiringContext = createContext<HiringContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────
export const HiringProvider: React.FC<{
  children: React.ReactNode;
  initialCandidates?: Candidate[];
}> = ({ children, initialCandidates = [] }) => {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);

  const addCandidate = useCallback((c: Candidate) => {
    setCandidates(prev => {
      // Avoid duplicates
      if (prev.some(x => x.id === c.id)) return prev;
      return [c, ...prev];
    });
  }, []);

  const updateCandidate = useCallback((
    id: string,
    status: HiringStatus,
    extras: Partial<Candidate> = {},
  ) => {
    setCandidates(prev =>
      prev.map(c => c.id === id ? { ...c, status, ...extras } : c),
    );
  }, []);

  const hasCandidate = useCallback(
    (id: string) => candidates.some(c => c.id === id),
    [candidates],
  );

  return (
    <HiringContext.Provider value={{ candidates, addCandidate, updateCandidate, hasCandidate }}>
      {children}
    </HiringContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────────────
export const useHiring = (): HiringContextValue => {
  const ctx = useContext(HiringContext);
  if (!ctx) throw new Error('useHiring must be used inside <HiringProvider>');
  return ctx;
};
