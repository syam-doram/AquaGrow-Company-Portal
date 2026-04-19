import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, CheckCircle, XCircle, Clock, X, ChevronDown } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { toast } from 'sonner';

interface LeaveRecord {
  id: string;
  employeeId: string;
  type: string;
  from: string;
  to: string;
  status: string;
  reason: string;
  appliedAt: Timestamp;
}

const LEAVE_TYPES = [
  { value: 'sick',      label: 'Sick Leave',      color: 'oklch(0.75 0.18 25)',  bg: 'oklch(0.65 0.22 25 / 0.12)' },
  { value: 'casual',    label: 'Casual Leave',     color: 'oklch(0.75 0.16 240)', bg: 'oklch(0.65 0.18 240 / 0.12)' },
  { value: 'vacation',  label: 'Annual Vacation',  color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.12)' },
  { value: 'emergency', label: 'Emergency',        color: 'oklch(0.78 0.17 70)',  bg: 'oklch(0.78 0.17 70 / 0.12)' },
];

const statusConfig = {
  approved: { label: 'Approved', badge: 'aq-badge-green', icon: CheckCircle, iconColor: 'text-[oklch(0.72_0.19_167)]' },
  rejected: { label: 'Rejected', badge: 'aq-badge-red',   icon: XCircle,     iconColor: 'text-[oklch(0.75_0.18_25)]' },
  pending:  { label: 'Pending',  badge: 'aq-badge-amber',  icon: Clock,       iconColor: 'text-[oklch(0.78_0.17_70)]' },
};

const Leaves: React.FC = () => {
  const { employee } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState('sick');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!employee) return;
    const q = query(
      collection(db, 'leaves'),
      where('employeeId', '==', employee.uid),
      orderBy('appliedAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRecord)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'leaves'));
    return () => unsub();
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !fromDate || !toDate) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'leaves'), {
        employeeId: employee.uid,
        type: leaveType,
        from: fromDate,
        to: toDate,
        status: 'pending',
        reason,
        appliedAt: Timestamp.now(),
      });
      toast.success('Leave application submitted!');
      setShowModal(false);
      setFromDate(''); setToDate(''); setReason('');
    } catch {
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const approved = leaves.filter(l => l.status === 'approved');
  const pending  = leaves.filter(l => l.status === 'pending');
  const totalDays = (l: LeaveRecord) =>
    Math.max(1, differenceInCalendarDays(new Date(l.to), new Date(l.from)) + 1);

  const approvedDays = approved.reduce((s, l) => s + totalDays(l), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Leave Management</h1>
          <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">Apply for leaves and track your requests in real time.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="aq-btn-primary shrink-0">
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Allotted',  value: '12 Days', icon: Calendar,      color: 'oklch(0.75 0.16 240)' },
          { label: 'Approved',        value: `${approvedDays} Days`, icon: CheckCircle, color: 'oklch(0.72 0.19 167)' },
          { label: 'Pending',         value: `${pending.length}`,   icon: Clock,       color: 'oklch(0.78 0.17 70)' },
          { label: 'Remaining',       value: `${Math.max(0, 12 - approvedDays)} Days`, icon: Calendar, color: 'oklch(0.78 0.17 295)' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="aq-stat-card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)]">{s.label}</p>
              <div className="p-2 rounded-lg" style={{ background: 'oklch(1 0 0 / 8%)' }}>
                <s.icon size={13} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Leave Balance Bar */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Annual Leave Balance</h3>
          <span className="text-xs text-[oklch(0.5_0.02_210)]">{approvedDays} / 12 days used</span>
        </div>
        <div className="aq-progress mb-2">
          <motion.div className="aq-progress-fill" style={{ background: 'oklch(0.72 0.19 167)', width: `${Math.min(100, (approvedDays / 12) * 100)}%` }}
            initial={{ width: 0 }} animate={{ width: `${Math.min(100, (approvedDays / 12) * 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <div className="flex gap-4 mt-3">
          {LEAVE_TYPES.map(lt => {
            const typeApproved = approved.filter(l => l.type === lt.value).reduce((s, l) => s + totalDays(l), 0);
            return typeApproved > 0 ? (
              <div key={lt.value} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: lt.color }} />
                <span className="text-[10px] text-[oklch(0.6_0.02_210)]">{lt.label}: <strong className="text-white">{typeApproved}d</strong></span>
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Leave List */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Leave History</h3>
          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{leaves.length} record{leaves.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="divide-y divide-white/5">
          {leaves.map((leave, i) => {
            const cfg = statusConfig[leave.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const lt = LEAVE_TYPES.find(t => t.value === leave.type);
            const days = totalDays(leave);
            return (
              <motion.div key={leave.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-5 hover:bg-white/2 transition-colors flex items-center gap-4">
                {/* Type indicator */}
                <div className="p-3 rounded-xl shrink-0" style={{ background: lt?.bg ?? 'oklch(1 0 0 / 5%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                  <Calendar size={16} style={{ color: lt?.color ?? 'oklch(0.72 0.19 167)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white capitalize">{leave.type} Leave</p>
                    <span className={`aq-badge ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-[oklch(0.55_0.02_210)]">
                    {format(new Date(leave.from), 'MMM dd')} – {format(new Date(leave.to), 'MMM dd, yyyy')}
                    <span className="ml-1 text-white/40">· {days} day{days > 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-[10px] text-[oklch(0.45_0.02_210)] mt-0.5 truncate">{leave.reason}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[10px] text-[oklch(0.45_0.02_210)]">Applied</p>
                  <p className="text-xs font-medium text-white">{format(leave.appliedAt.toDate(), 'MMM dd')}</p>
                </div>
              </motion.div>
            );
          })}
          {leaves.length === 0 && (
            <div className="py-16 text-center">
              <Calendar size={32} className="mx-auto mb-3 text-[oklch(0.3_0.02_210)]" />
              <p className="text-sm text-[oklch(0.45_0.02_210)]">No leave requests yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass-panel p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Apply for Leave</h3>
                  <p className="text-xs text-[oklch(0.5_0.02_210)]">Fill in the details below</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Leave Type */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[oklch(0.5_0.02_210)] mb-2">Leave Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAVE_TYPES.map(lt => (
                      <button key={lt.value} type="button" onClick={() => setLeaveType(lt.value)}
                        className="p-2.5 rounded-xl text-xs font-semibold text-left transition-all"
                        style={{
                          background: leaveType === lt.value ? lt.bg : 'oklch(1 0 0 / 4%)',
                          border: `1px solid ${leaveType === lt.value ? lt.color : 'oklch(1 0 0 / 8%)'}`,
                          color: leaveType === lt.value ? lt.color : 'oklch(0.6 0.02 210)',
                        }}>
                        {lt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[oklch(0.5_0.02_210)] mb-1.5">From</label>
                    <input type="date" required value={fromDate} onChange={e => setFromDate(e.target.value)}
                      className="aq-input" min={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[oklch(0.5_0.02_210)] mb-1.5">To</label>
                    <input type="date" required value={toDate} onChange={e => setToDate(e.target.value)}
                      className="aq-input" min={fromDate || format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[oklch(0.5_0.02_210)] mb-1.5">Reason</label>
                  <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder="Briefly explain the reason for your leave…"
                    className="aq-input resize-none" />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="aq-btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={loading} className="aq-btn-primary flex-1 justify-center">
                    {loading ? 'Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaves;
