/**
 * HiringContext — Shared state between Recruitment, HiringPipeline, and EmployeeManagement.
 *
 * Flow:
 *   Recruitment (offered + accepted) → "Move to Hiring Pipeline"
 *   → pushes a Candidate record into this context
 *   → HiringPipeline reads from this context (initialised with SEED data for demo)
 *   → When candidate reaches 'hired', they are added to hiredCandidates
 *   → EmployeeManagement reads hiredCandidates and auto-adds them to the employee list
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Candidate, HiringStatus } from '../pages/HiringPipeline';

// ── Re-export types so importers can grab them from one place ──────────────────
export type { Candidate, HiringStatus };

// ── Context Shape ──────────────────────────────────────────────────────────────
interface HiringContextValue {
  candidates: Candidate[];
  hiredCandidates: Candidate[];           // candidates that completed 'hired' stage
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

  // Pre-seed any candidates that were already 'hired' in the initial data
  const [hiredCandidates, setHiredCandidates] = useState<Candidate[]>(
    initialCandidates.filter(c => c.status === 'hired'),
  );

  const addCandidate = useCallback((c: Candidate) => {
    setCandidates(prev => {
      if (prev.some(x => x.id === c.id)) return prev;
      return [c, ...prev];
    });
  }, []);

  const updateCandidate = useCallback((
    id: string,
    status: HiringStatus,
    extras: Partial<Candidate> = {},
  ) => {
    setCandidates(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status, ...extras } : c);

      // Auto-push to hiredCandidates when pipeline completes
      if (status === 'hired') {
        const hired = updated.find(c => c.id === id);
        if (hired) {
          setHiredCandidates(h => h.some(x => x.id === id) ? h : [hired, ...h]);
        }
      }

      return updated;
    });
  }, []);

  const hasCandidate = useCallback(
    (id: string) => candidates.some(c => c.id === id),
    [candidates],
  );

  return (
    <HiringContext.Provider value={{ candidates, hiredCandidates, addCandidate, updateCandidate, hasCandidate }}>
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
