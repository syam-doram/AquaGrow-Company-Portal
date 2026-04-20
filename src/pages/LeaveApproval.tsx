import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays, CheckCircle, XCircle, Clock, Search, MessageCircle, X, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInCalendarDays } from 'date-fns';
import hrmsApi from '../api';

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

const LeaveApproval: React.FC = () => {
  const { employee, hasPermission } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const YEARS = [2024, 2025, 2026, 2027];
  const [selected, setSelected] = useState<LeaveRecord | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [fetching, setFetching] = useState(true);
  const canApprove = hasPermission('approve_leaves');

  const fetchLeaves = useCallback(async () => {
    setFetching(true);
    try {
      const data = await hrmsApi.leaves.list();
      const normalised = data.map((l: any) => ({ ...l, id: l._id ?? l.id ?? '' }));
      setLeaves(normalised);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load leaves');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleDecision = async (leaveId: string, decision: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      await hrmsApi.leaves.update(leaveId, { status: decision, comment });
      if (comment) await hrmsApi.leaves.comment(leaveId, comment);
      toast.success(`Leave ${decision} successfully!`);
      setSelected(null);
      setComment('');
      await fetchLeaves();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update leave');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = leaves.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter;
    const matchSearch = !search || (l.employeeName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      l.type.toLowerCase().includes(search.toLowerCase());
    const matchYear = filterYear === 0 || new Date(l.from).getFullYear() === filterYear;
    return matchFilter && matchSearch && matchYear;
  });

  const pending   = leaves.filter(l => l.status === 'pending').length;
  const approved  = leaves.filter(l => l.status === 'approved').length;
  const rejected  = leaves.filter(l => l.status === 'rejected').length;
  const days = (l: LeaveRecord) => Math.max(1, differenceInCalendarDays(new Date(l.to), new Date(l.from)) + 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Leave Approvals</h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">Review and manage employee leave requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',  value: pending,  color: 'oklch(0.78 0.17 70)' },
          { label: 'Approved', value: approved, color: 'oklch(0.72 0.19 167)' },
          { label: 'Rejected', value: rejected, color: 'oklch(0.75 0.18 25)' },
        ].map(s => (
          <div key={s.label} className="aq-stat-card">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
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
            style={filter === f ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' } : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {f} {f !== 'all' && <span className="opacity-60 ml-1">{leaves.filter(l => l.status === f).length}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leave List */}
        <div className="space-y-2">
          {filtered.map(l => (
            <motion.button key={l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(l)}
              className={`w-full text-left glass-panel p-4 transition-all hover:border-[oklch(0.72_0.19_167/0.3)] ${selected?.id === l.id ? 'border-[oklch(0.72_0.19_167/0.3)]' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl shrink-0" style={{ background: 'oklch(1 0 0 / 5%)' }}>
                  <CalendarDays size={13} className="text-[oklch(0.72_0.19_167)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-bold text-white truncate">{l.employeeName ?? 'Employee'}</p>
                    <span className={`aq-badge ${TYPE_COLORS[l.type] ?? 'aq-badge-blue'} capitalize`}>{l.type}</span>
                  </div>
                  <p className="text-[10px] text-[oklch(0.55_0.02_210)]">
                    {format(new Date(l.from), 'MMM dd')} – {format(new Date(l.to), 'MMM dd, yyyy')}
                    <span className="ml-1 text-white/40">· {days(l)} day{days(l) > 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-[9px] text-[oklch(0.45_0.02_210)] mt-0.5 truncate">{l.reason}</p>
                </div>
                <span className={`aq-badge shrink-0 ${l.status === 'approved' ? 'aq-badge-green' : l.status === 'rejected' ? 'aq-badge-red' : 'aq-badge-amber'}`}>
                  {l.status}
                </span>
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && (
            <div className="glass-panel py-10 text-center text-[oklch(0.45_0.02_210)] text-xs">
              No {filter === 'all' ? '' : filter} leaves
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`aq-badge ${TYPE_COLORS[selected.type] ?? 'aq-badge-blue'} capitalize`}>{selected.type}</span>
                  <span className={`aq-badge ${selected.status === 'approved' ? 'aq-badge-green' : selected.status === 'rejected' ? 'aq-badge-red' : 'aq-badge-amber'}`}>
                    {selected.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{selected.employeeName ?? 'Employee'}</h3>
                <p className="text-[10px] text-[oklch(0.5_0.02_210)]">
                  {format(new Date(selected.from), 'MMM dd')} – {format(new Date(selected.to), 'MMM dd, yyyy')}
                  · {days(selected)} day{days(selected) > 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
                <X size={14} />
              </button>
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
              <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1">Reason</p>
              <p className="text-xs text-[oklch(0.75_0_0)] leading-relaxed">{selected.reason || 'No reason provided'}</p>
            </div>

            {selected.approverComment && (
              <div className="p-3 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1">Manager Note</p>
                <p className="text-xs text-[oklch(0.75_0_0)]">{selected.approverComment}</p>
              </div>
            )}

            {canApprove && selected.status === 'pending' && (
              <div className="space-y-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '1rem' }}>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Comment (optional)</label>
                  <textarea rows={2} value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Add a note for the employee…"
                    className="aq-input resize-none text-xs" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDecision(selected.id, 'rejected')} disabled={processing}
                    className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    style={{ background: 'oklch(0.65 0.22 25 / 0.12)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                    <XCircle size={13} /> Reject
                  </button>
                  <button onClick={() => handleDecision(selected.id, 'approved')} disabled={processing}
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
              <CalendarDays size={32} className="mx-auto mb-2 text-[oklch(0.3_0.02_210)]" />
              <p className="text-xs text-[oklch(0.45_0.02_210)]">Select a leave request to review</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveApproval;
