import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useHiring } from '../context/HiringContext';
import type { Candidate as HiringCandidate } from './HiringPipeline';
import {
  CalendarDays, CheckCircle, XCircle, Clock, Search,
  X, Users, Star, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInCalendarDays } from 'date-fns';
import hrmsApi from '../api';

// ── Leave types ────────────────────────────────────────────────────────────────
interface LeaveRecord {
  id: string; _id?: string; employeeId?: string; employeeName?: string;
  type: string; from: string; to: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string; appliedAt?: string;
  approvedBy?: string; approverComment?: string;
}

const TYPE_COLORS: Record<string, string> = {
  sick: 'aq-badge-red', casual: 'aq-badge-blue',
  vacation: 'aq-badge-green', emergency: 'aq-badge-amber',
};

// ══════════════════════════════════════════════════════════════════════════════
const AllApprovals: React.FC = () => {
  const { employee, hasPermission, hasRole } = useAuth();
  const { candidates, updateCandidate } = useHiring();
  const isFounder = hasRole('super_admin');

  // Active top tab
  const [tab, setTab] = useState<'leaves' | 'hiring'>('leaves');

  // ── LEAVE state ────────────────────────────────────────────────────────────
  const [leaves, setLeaves]       = useState<LeaveRecord[]>([]);
  const [filter, setFilter]       = useState('pending');
  const [search, setSearch]       = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const YEARS = [2024, 2025, 2026, 2027];
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [comment, setComment]     = useState('');
  const [processing, setProcessing] = useState(false);
  const [fetching, setFetching]   = useState(true);
  const canApproveLeave = hasPermission('approve_leaves');

  const fetchLeaves = useCallback(async () => {
    setFetching(true);
    try {
      const data = await hrmsApi.leaves.list();
      setLeaves(data.map((l: any) => ({ ...l, id: l._id ?? l.id ?? '' })));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load leaves');
    } finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleLeaveDecision = async (leaveId: string, decision: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      await hrmsApi.leaves.update(leaveId, { status: decision, comment });
      if (comment) await hrmsApi.leaves.comment(leaveId, comment);
      toast.success(`Leave ${decision}!`);
      setSelectedLeave(null); setComment('');
      await fetchLeaves();
    } catch (err: any) { toast.error(err.message ?? 'Failed to update leave'); }
    finally { setProcessing(false); }
  };

  const filteredLeaves = leaves.filter(l => {
    const matchF = filter === 'all' || l.status === filter;
    const matchS = !search || (l.employeeName ?? '').toLowerCase().includes(search.toLowerCase()) || l.type.toLowerCase().includes(search.toLowerCase());
    const matchY = filterYear === 0 || new Date(l.from).getFullYear() === filterYear;
    return matchF && matchS && matchY;
  });

  const leavePending  = leaves.filter(l => l.status === 'pending').length;
  const leaveApproved = leaves.filter(l => l.status === 'approved').length;
  const leaveRejected = leaves.filter(l => l.status === 'rejected').length;
  const days = (l: LeaveRecord) => Math.max(1, differenceInCalendarDays(new Date(l.to), new Date(l.from)) + 1);

  // ── HIRING PIPELINE — Founder Approvals ────────────────────────────────────
  // Candidates awaiting Founder sign-off (status === 'hr_approved')
  const pendingFounder = candidates.filter(c => c.status === 'hr_approved');
  const [selectedCand, setSelectedCand] = useState<HiringCandidate | null>(null);
  const [hiringNote, setHiringNote]     = useState('');

  const handleHiringDecision = (cand: HiringCandidate, decision: 'founder_approved' | 'rejected') => {
    updateCandidate(cand.id, decision, { founderNote: hiringNote || undefined });
    toast.success(decision === 'founder_approved'
      ? `✅ ${cand.name} approved — proceeding to BGV`
      : `❌ ${cand.name} rejected`);
    setSelectedCand(null); setHiringNote('');
  };

  // ── Total pending badge ────────────────────────────────────────────────────
  const totalPending = leavePending + (isFounder ? pendingFounder.length : 0);

  return (
    <div className="space-y-5" style={{ color: 'var(--aq-text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
            All Approvals
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
            Leaves · Hiring · All pending decisions in one place
          </p>
        </div>
        {totalPending > 0 && (
          <span className="px-3 py-1.5 rounded-xl text-xs font-black"
            style={{ background: 'oklch(0.78 0.17 70 / 0.15)', color: 'oklch(0.78 0.17 70)', border: '1px solid oklch(0.78 0.17 70 / 0.3)' }}>
            ⏳ {totalPending} pending
          </span>
        )}
      </div>

      {/* Top Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--aq-stat-bg)', border: '1px solid var(--aq-glass-border)' }}>
        {[
          { id: 'leaves',  label: '📅 Leave Requests', count: leavePending },
          ...(isFounder ? [{ id: 'hiring', label: '🏆 Hiring Approvals', count: pendingFounder.length }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            style={tab === t.id
              ? { background: 'oklch(0.60 0.17 167 / 0.12)', color: 'var(--primary)', border: '1px solid oklch(0.60 0.17 167 / 0.3)' }
              : { color: 'var(--aq-text-muted)', border: '1px solid transparent' }}>
            {t.label}
            {t.count > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                style={{ background: 'oklch(0.78 0.17 70 / 0.2)', color: 'oklch(0.78 0.17 70)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════ LEAVE TAB ═══════════════ */}
      <AnimatePresence mode="wait">
        {tab === 'leaves' && (
          <motion.div key="leaves" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pending',  value: leavePending,  color: 'oklch(0.78 0.17 70)'  },
                { label: 'Approved', value: leaveApproved, color: 'oklch(0.72 0.19 167)' },
                { label: 'Rejected', value: leaveRejected, color: 'oklch(0.75 0.18 25)'  },
              ].map(s => (
                <div key={s.label} className="aq-stat-card">
                  <p className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--aq-text-muted)' }}>{s.label}</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--aq-text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee…" className="aq-input pl-8 !py-1.5 !text-xs" />
              </div>
              <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                className="aq-input !py-1.5 !text-xs !w-auto">
                <option value={0}>All Years</option>
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
              {['all','pending','approved','rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all"
                  style={filter === f
                    ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }
                    : { background: 'var(--aq-ghost-bg)', color: 'var(--aq-text-muted)', border: '1px solid var(--aq-glass-border)' }}>
                  {f}{f !== 'all' && <span className="opacity-60 ml-1">{leaves.filter(l => l.status === f).length}</span>}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* List */}
              <div className="space-y-2">
                {filteredLeaves.map(l => (
                  <motion.button key={l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedLeave(l)}
                    className={`w-full text-left glass-panel p-4 transition-all hover:border-[oklch(0.72_0.19_167/0.3)] ${selectedLeave?.id === l.id ? 'border-[oklch(0.72_0.19_167/0.3)]' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl shrink-0" style={{ background: 'oklch(1 0 0 / 5%)' }}>
                        <CalendarDays size={13} style={{ color: 'oklch(0.72 0.19 167)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>{l.employeeName ?? 'Employee'}</p>
                          <span className={`aq-badge ${TYPE_COLORS[l.type] ?? 'aq-badge-blue'} capitalize`}>{l.type}</span>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>
                          {format(new Date(l.from), 'MMM dd')} – {format(new Date(l.to), 'MMM dd, yyyy')}
                          <span className="ml-1 opacity-40">· {days(l)} day{days(l) > 1 ? 's' : ''}</span>
                        </p>
                        <p className="text-[9px] mt-0.5 truncate" style={{ color: 'var(--aq-text-muted)' }}>{l.reason}</p>
                      </div>
                      <span className={`aq-badge shrink-0 ${l.status === 'approved' ? 'aq-badge-green' : l.status === 'rejected' ? 'aq-badge-red' : 'aq-badge-amber'}`}>
                        {l.status}
                      </span>
                    </div>
                  </motion.button>
                ))}
                {filteredLeaves.length === 0 && !fetching && (
                  <div className="glass-panel py-10 text-center text-xs" style={{ color: 'var(--aq-text-muted)' }}>
                    No {filter === 'all' ? '' : filter} leaves
                  </div>
                )}
              </div>

              {/* Detail panel */}
              {selectedLeave ? (
                <div className="glass-panel p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`aq-badge ${TYPE_COLORS[selectedLeave.type] ?? 'aq-badge-blue'} capitalize`}>{selectedLeave.type}</span>
                        <span className={`aq-badge ${selectedLeave.status === 'approved' ? 'aq-badge-green' : selectedLeave.status === 'rejected' ? 'aq-badge-red' : 'aq-badge-amber'}`}>{selectedLeave.status}</span>
                      </div>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>{selectedLeave.employeeName ?? 'Employee'}</h3>
                      <p className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>
                        {format(new Date(selectedLeave.from), 'MMM dd')} – {format(new Date(selectedLeave.to), 'MMM dd, yyyy')} · {days(selectedLeave)} day{days(selectedLeave) > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button onClick={() => setSelectedLeave(null)} className="p-1.5 rounded-xl hover:bg-white/5" style={{ color: 'var(--aq-text-muted)' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--aq-text-muted)' }}>Reason</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>{selectedLeave.reason || 'No reason provided'}</p>
                  </div>
                  {canApproveLeave && selectedLeave.status === 'pending' && (
                    <div className="space-y-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '1rem' }}>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>Comment (optional)</label>
                        <textarea rows={2} value={comment} onChange={e => setComment(e.target.value)}
                          placeholder="Add a note for the employee…" className="aq-input resize-none text-xs" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleLeaveDecision(selectedLeave.id, 'rejected')} disabled={processing}
                          className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          style={{ background: 'oklch(0.65 0.22 25 / 0.12)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                          <XCircle size={13} /> Reject
                        </button>
                        <button onClick={() => handleLeaveDecision(selectedLeave.id, 'approved')} disabled={processing}
                          className="aq-btn-primary flex-1 justify-center !text-xs">
                          <CheckCircle size={13} /> Approve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-panel flex items-center justify-center py-20">
                  <div className="text-center">
                    <CalendarDays size={32} className="mx-auto mb-2" style={{ color: 'var(--aq-text-faint)' }} />
                    <p className="text-xs" style={{ color: 'var(--aq-text-muted)' }}>Select a leave request to review</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════ HIRING TAB (Founder only) ═══════════════ */}
        {tab === 'hiring' && isFounder && (
          <motion.div key="hiring" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pending Approval', value: pendingFounder.length,                                            color: 'oklch(0.78 0.17 70)'  },
                { label: 'Approved',          value: candidates.filter(c => c.status === 'founder_approved').length,  color: 'oklch(0.72 0.19 167)' },
                { label: 'Rejected',          value: candidates.filter(c => c.status === 'rejected').length,          color: 'oklch(0.75 0.18 25)'  },
              ].map(s => (
                <div key={s.label} className="aq-stat-card">
                  <p className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--aq-text-muted)' }}>{s.label}</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Candidate list */}
              <div className="space-y-2">
                {pendingFounder.length === 0 ? (
                  <div className="glass-panel py-12 text-center">
                    <Star size={28} className="mx-auto mb-2" style={{ color: 'var(--aq-text-faint)' }} />
                    <p className="text-xs" style={{ color: 'var(--aq-text-muted)' }}>No candidates awaiting your approval</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--aq-text-faint)' }}>Candidates reach this stage after HR review</p>
                  </div>
                ) : pendingFounder.map((c, i) => (
                  <motion.button key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => { setSelectedCand(c); setHiringNote(''); }}
                    className={`w-full text-left glass-panel p-4 transition-all hover:border-[oklch(0.72_0.19_167/0.3)] ${selectedCand?.id === c.id ? 'border-[oklch(0.72_0.19_167/0.3)]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                        style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))', color: 'oklch(0.08 0.015 200)' }}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>{c.name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>{c.appliedRole} · {c.department}</p>
                        {c.submittedAt && (
                          <p className="text-[9px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>Submitted {c.submittedAt}</p>
                        )}
                      </div>
                      <span className="aq-badge aq-badge-amber shrink-0">HR Approved</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Detail / action panel */}
              {selectedCand ? (
                <div className="glass-panel p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0"
                        style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))', color: 'oklch(0.08 0.015 200)' }}>
                        {selectedCand.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>{selectedCand.name}</h3>
                        <p className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>{selectedCand.appliedRole} · {selectedCand.department}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedCand(null)} className="p-1.5 rounded-xl hover:bg-white/5" style={{ color: 'var(--aq-text-muted)' }}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Mini details */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Email',    value: selectedCand.email      || '—' },
                      { label: 'Phone',    value: selectedCand.phone      || '—' },
                      { label: 'Invited',  value: selectedCand.invitedAt  || '—' },
                      { label: 'Submitted',value: selectedCand.submittedAt|| '—' },
                    ].map(r => (
                      <div key={r.label} className="p-2.5 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                        <p className="text-[8px] uppercase tracking-widest font-bold mb-0.5" style={{ color: 'var(--aq-text-muted)' }}>{r.label}</p>
                        <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--aq-text-primary)' }}>{r.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pipeline stage */}
                  <div className="flex items-center gap-2 text-[9px]" style={{ color: 'var(--aq-text-muted)' }}>
                    {['Invited','Submitted','HR Review','Founder','BGV','Hired'].map((stage, i, arr) => (
                      <React.Fragment key={stage}>
                        <span className={`font-bold ${stage === 'Founder' ? 'text-amber-400' : ''}`}>{stage}</span>
                        {i < arr.length - 1 && <ChevronRight size={9} />}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Founder note + buttons */}
                  <div className="space-y-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '1rem' }}>
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>Note (optional)</label>
                      <textarea rows={2} value={hiringNote} onChange={e => setHiringNote(e.target.value)}
                        placeholder="Add a note for HR…" className="aq-input resize-none text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleHiringDecision(selectedCand, 'rejected')}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        style={{ background: 'oklch(0.65 0.22 25 / 0.12)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                        <XCircle size={13} /> Reject
                      </button>
                      <button onClick={() => handleHiringDecision(selectedCand, 'founder_approved')}
                        className="aq-btn-primary flex-1 justify-center !text-xs">
                        <CheckCircle size={13} /> Approve → BGV
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel flex items-center justify-center py-20">
                  <div className="text-center">
                    <Users size={32} className="mx-auto mb-2" style={{ color: 'var(--aq-text-faint)' }} />
                    <p className="text-xs" style={{ color: 'var(--aq-text-muted)' }}>Select a candidate to review</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllApprovals;
