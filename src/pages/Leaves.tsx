import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Plus, CheckCircle, XCircle, Clock, X,
  Gift, Umbrella, Briefcase, Star, Info, ChevronLeft, ChevronRight,
  Sun, Flower2, Flag, RefreshCw,
} from 'lucide-react';
import { format, differenceInCalendarDays, getMonth, getYear, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isWeekend } from 'date-fns';
import { toast } from 'sonner';
import hrmsApi from '../api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface LeaveRecord {
  id: string;
  _id?: string;
  employeeId?: string;
  type: string;
  from: string;
  to: string;
  status: string;
  reason: string;
  appliedAt?: string | { _seconds?: number; toDate?: () => Date };
  days?: number;
}

// ── Corporate Leave Policy ─────────────────────────────────────────────────────
// AquaGrow Technologies Pvt. Ltd. — Monthly accrual policy
const MONTHLY_ACCRUAL = 1.5; // 1.5 days per month = 18 days/year total
const ANNUAL_TOTAL    = 18;   // 18 working days per year

const LEAVE_POLICY = [
  { type: 'casual',      label: 'Casual Leave',     annual: 6,  monthly: 0.5,  color: 'oklch(0.75 0.16 240)', bg: 'oklch(0.65 0.18 240 / 0.12)', icon: Sun,      desc: '0.5 days credited every month' },
  { type: 'sick',        label: 'Sick Leave',        annual: 6,  monthly: 0.5,  color: 'oklch(0.75 0.18 25)',  bg: 'oklch(0.65 0.22 25 / 0.12)',  icon: Umbrella, desc: '0.5 days credited every month' },
  { type: 'vacation',   label: 'Annual Vacation',   annual: 6,  monthly: 0.5,  color: 'oklch(0.72 0.19 167)',  bg: 'oklch(0.72 0.19 167 / 0.12)', icon: Star,     desc: '0.5 days credited every month' },
];

const LEAVE_TYPES_ALL = [
  ...LEAVE_POLICY,
  { type: 'emergency', label: 'Emergency Leave', annual: 0, monthly: 0, color: 'oklch(0.78 0.17 70)', bg: 'oklch(0.78 0.17 70 / 0.12)', icon: Flag, desc: 'As needed — manager approval required' },
  { type: 'maternity', label: 'Maternity / Paternity', annual: 0, monthly: 0, color: 'oklch(0.78 0.17 295)', bg: 'oklch(0.65 0.2 295 / 0.12)', icon: Flower2, desc: 'As per policy & applicable law' },
];

// ── 2026 Holiday Calendar (India — AP + National) ─────────────────────────────
const HOLIDAYS_2026: { date: string; name: string; type: 'national' | 'regional' | 'optional' }[] = [
  // National
  { date: '2026-01-26', name: 'Republic Day',            type: 'national' },
  { date: '2026-03-08', name: 'Maha Shivaratri',         type: 'national' },
  { date: '2026-03-13', name: 'Holi',                    type: 'national' },
  { date: '2026-03-25', name: 'Ugadi (Telugu New Year)', type: 'national' },
  { date: '2026-04-02', name: 'Sri Rama Navami',         type: 'national' },
  { date: '2026-04-06', name: 'Mahavir Jayanti',         type: 'national' },
  { date: '2026-04-03', name: 'Good Friday',             type: 'national' },
  { date: '2026-05-01', name: 'Labour Day',              type: 'national' },
  { date: '2026-05-13', name: 'Buddha Purnima',          type: 'national' },
  { date: '2026-06-25', name: 'Eid ul-Adha',             type: 'national' },
  { date: '2026-08-15', name: 'Independence Day',        type: 'national' },
  { date: '2026-08-28', name: 'Janmashtami',             type: 'national' },
  { date: '2026-09-12', name: 'Milad-un-Nabi',           type: 'national' },
  { date: '2026-10-02', name: 'Gandhi Jayanti',          type: 'national' },
  { date: '2026-10-20', name: 'Dussehra / Vijayadasami',type: 'national' },
  { date: '2026-11-01', name: 'Andhra Pradesh Day',      type: 'regional' },
  { date: '2026-11-05', name: 'Diwali',                  type: 'national' },
  { date: '2026-11-25', name: 'Guru Nanak Jayanti',      type: 'national' },
  { date: '2026-12-25', name: 'Christmas Day',           type: 'national' },
  // Optional
  { date: '2026-01-14', name: 'Pongal / Sankranti',      type: 'optional' },
  { date: '2026-10-31', name: '(Pre-)Diwali',            type: 'optional' },
];

const HOLIDAY_CONFIG = {
  national: { label: 'National Holiday', color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.12)' },
  regional: { label: 'Regional Holiday', color: 'oklch(0.78 0.17 295)', bg: 'oklch(0.65 0.2 295 / 0.12)' },
  optional: { label: 'Optional Holiday', color: 'oklch(0.78 0.17 70)',  bg: 'oklch(0.78 0.17 70 / 0.12)' },
};

const statusConfig = {
  approved: { label: 'Approved', badge: 'aq-badge-green', icon: CheckCircle },
  rejected: { label: 'Rejected', badge: 'aq-badge-red',   icon: XCircle    },
  pending:  { label: 'Pending',  badge: 'aq-badge-amber',  icon: Clock      },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const totalDays = (l: LeaveRecord) =>
  Math.max(1, differenceInCalendarDays(new Date(l.to), new Date(l.from)) + 1);

// Months accrued up to & including current month
const monthsAccruedInYear = (year: number) => {
  const now = new Date();
  const curYear = getYear(now);
  if (year < curYear) return 12;
  if (year > curYear) return 0;
  return getMonth(now) + 1; // Jan=0 → 1 month
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const getAppliedDate = (appliedAt: LeaveRecord['appliedAt']) => {
  if (!appliedAt) return new Date();
  if (typeof appliedAt === 'string') return new Date(appliedAt);
  if (typeof appliedAt === 'object' && appliedAt._seconds) return new Date(appliedAt._seconds * 1000);
  if (typeof appliedAt === 'object' && appliedAt.toDate) return appliedAt.toDate();
  return new Date();
};

// ══════════════════════════════════════════════════════════════════════════════
const Leaves: React.FC = () => {
  const { employee } = useAuth();
  const [leaves, setLeaves]         = useState<LeaveRecord[]>([]);
  const [fetching, setFetching]     = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [leaveType, setLeaveType]   = useState('casual');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [reason, setReason]         = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab]   = useState<'leaves' | 'policy' | 'calendar'>('leaves');
  const [calMonth, setCalMonth]     = useState(new Date());
  const YEARS = [2025, 2026, 2027];

  const fetchLeaves = useCallback(async () => {
    setFetching(true);
    try {
      const data = await hrmsApi.leaves.list();
      // Normalise id field from either _id or id
      const normalised = data.map((l: any) => ({ ...l, id: l._id ?? l.id ?? '' }));
      setLeaves(normalised);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load leaves');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      await hrmsApi.leaves.apply({
        type: leaveType,
        from: fromDate,
        to: toDate,
        days: Math.max(1, differenceInCalendarDays(new Date(toDate), new Date(fromDate)) + 1),
        reason,
      });
      toast.success('Leave application submitted!');
      setShowModal(false);
      setFromDate(''); setToDate(''); setReason('');
      await fetchLeaves();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Calculated leave stats
  const approved        = leaves.filter(l => l.status === 'approved' && new Date(l.from).getFullYear() === filterYear);
  const pending         = leaves.filter(l => l.status === 'pending'  && new Date(l.from).getFullYear() === filterYear);
  const allFiltered     = leaves.filter(l => new Date(l.from).getFullYear() === filterYear);
  const approvedDays    = approved.reduce((s, l) => s + totalDays(l), 0);
  const accruedMonths   = monthsAccruedInYear(filterYear);
  const accruedTotal    = Math.round(accruedMonths * MONTHLY_ACCRUAL * 10) / 10; // e.g. 4 months → 6 days
  const remaining       = Math.max(0, accruedTotal - approvedDays);
  const maxTotal        = ANNUAL_TOTAL;

  // Calendar helpers
  const calYear  = getYear(calMonth);
  const calMon   = getMonth(calMonth);
  const firstDay = startOfMonth(calMonth);
  const lastDay  = endOfMonth(calMonth);
  const calDays  = eachDayOfInterval({ start: startOfWeek(firstDay, { weekStartsOn: 1 }), end: endOfWeek(lastDay, { weekStartsOn: 1 }) });
  const isHoliday = (d: Date) => HOLIDAYS_2026.find(h => h.date === format(d, 'yyyy-MM-dd'));
  const WEEKDAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Monthly accrual rows for policy table
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
            Leave Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
            Corporate monthly accrual · 1.5 days / month · 18 days / year
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="aq-input !py-1.5 !text-xs !w-auto">
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="aq-btn-primary">
            <Plus size={15} /> Apply Leave
          </button>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Annual Quota',   value: `${maxTotal} Days`,      color: 'oklch(0.75 0.16 240)', sub: '1.5 days × 12 months' },
          { label: 'Accrued So Far', value: `${accruedTotal} Days`,  color: 'oklch(0.72 0.19 167)', sub: `${accruedMonths} months × 1.5` },
          { label: 'Approved Used',  value: `${approvedDays} Days`,  color: 'oklch(0.75 0.18 25)',  sub: 'Approved leaves taken' },
          { label: 'Available Now',  value: `${remaining} Days`,     color: 'oklch(0.72 0.19 167)', sub: 'Accrued – used' },
          { label: 'Pending',        value: `${pending.length} Req`, color: 'oklch(0.78 0.17 70)',  sub: 'Awaiting approval' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="aq-stat-card !p-4">
            <p className="text-[8.5px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--aq-text-muted)' }}>{s.label}</p>
            <p className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--aq-text-faint)' }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────────────────── */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Leave Balance — {filterYear}
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
              Accrued: {accruedTotal} days · Used: {approvedDays} days · Remaining: {remaining} days
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)' }}>
            {accruedTotal > 0 ? Math.round((approvedDays / accruedTotal) * 100) : 0}% used
          </span>
        </div>
        {/* Accrued bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[9px] mb-1" style={{ color: 'var(--aq-text-faint)' }}>
            <span>Accrued ({accruedTotal} / {maxTotal} days)</span>
            <span>{Math.round((accruedTotal / maxTotal) * 100)}%</span>
          </div>
          <div className="aq-progress">
            <motion.div className="aq-progress-fill"
              style={{ background: 'oklch(0.65 0.18 240)', width: `${(accruedTotal / maxTotal) * 100}%` }}
              initial={{ width: 0 }} animate={{ width: `${(accruedTotal / maxTotal) * 100}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }} />
          </div>
        </div>
        {/* Used bar */}
        <div>
          <div className="flex items-center justify-between text-[9px] mb-1" style={{ color: 'var(--aq-text-faint)' }}>
            <span>Used ({approvedDays} / {accruedTotal} accrued)</span>
            <span>{accruedTotal > 0 ? Math.round((approvedDays / accruedTotal) * 100) : 0}%</span>
          </div>
          <div className="aq-progress">
            <motion.div className="aq-progress-fill"
              style={{ background: 'oklch(0.72 0.19 167)', width: `${accruedTotal > 0 ? (approvedDays / accruedTotal) * 100 : 0}%` }}
              initial={{ width: 0 }} animate={{ width: `${accruedTotal > 0 ? (approvedDays / accruedTotal) * 100 : 0}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
          </div>
        </div>

        {/* Per-type breakdown */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--aq-glass-border)' }}>
          {LEAVE_POLICY.map(lt => {
            const used = approved.filter(l => l.type === lt.type).reduce((s, l) => s + totalDays(l), 0);
            const monthAcc = Math.round(accruedMonths * lt.monthly * 10) / 10;
            return (
              <div key={lt.type} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: lt.color }} />
                <span className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>
                  {lt.label}:
                  <strong className="ml-1" style={{ color: 'var(--aq-text-primary)' }}>{used}/{monthAcc}d</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs: Leaves | Policy | Calendar ─────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--aq-glass-bg)', border: '1px solid var(--aq-glass-border)' }}>
        {([['leaves','My Leaves'], ['policy','Leave Policy'], ['calendar','Holiday Calendar']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200"
            style={{
              background: activeTab === t ? 'oklch(0.72 0.19 167 / 0.15)' : 'transparent',
              color: activeTab === t ? 'oklch(0.72 0.19 167)' : 'var(--aq-text-muted)',
              border: activeTab === t ? '1px solid oklch(0.72 0.19 167 / 0.2)' : '1px solid transparent',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: MY LEAVES ───────────────────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="glass-panel overflow-hidden">
          <div className="p-5" style={{ borderBottom: '1px solid var(--aq-glass-border)' }}>
            <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Leave History — {filterYear}
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
              {allFiltered.length} record{allFiltered.length !== 1 ? 's' : ''} this year
            </p>
          </div>
          <div>
            {allFiltered.map((leave, i) => {
              const cfg = statusConfig[leave.status as keyof typeof statusConfig] ?? statusConfig.pending;
              const lt  = LEAVE_TYPES_ALL.find(t => t.type === leave.type);
              const days = totalDays(leave);
              return (
                <motion.div key={leave.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-5 flex items-center gap-4 transition-colors"
                  style={{ borderBottom: i < allFiltered.length - 1 ? '1px solid var(--aq-glass-border)' : 'none' }}>
                  <div className="p-3 rounded-xl shrink-0" style={{ background: lt?.bg ?? 'var(--aq-glass-bg)', border: '1px solid var(--aq-glass-border)' }}>
                    {lt ? <lt.icon size={16} style={{ color: lt.color }} /> : <Calendar size={16} style={{ color: 'var(--primary)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold capitalize" style={{ color: 'var(--aq-text-primary)' }}>{lt?.label ?? leave.type}</p>
                      <span className={`aq-badge ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--aq-text-secondary)' }}>
                      {format(new Date(leave.from), 'MMM dd')} – {format(new Date(leave.to), 'MMM dd, yyyy')}
                      <span className="ml-1" style={{ color: 'var(--aq-text-faint)' }}>· {days} day{days > 1 ? 's' : ''}</span>
                    </p>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--aq-text-faint)' }}>{leave.reason}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[10px]" style={{ color: 'var(--aq-text-faint)' }}>Applied</p>
                    <p className="text-xs font-medium" style={{ color: 'var(--aq-text-primary)' }}>{leave.appliedAt ? format(getAppliedDate(leave.appliedAt), 'MMM dd') : '—'}</p>
                  </div>
                </motion.div>
              );
            })}
            {allFiltered.length === 0 && (
              <div className="py-16 text-center">
                <Calendar size={32} className="mx-auto mb-3" style={{ color: 'var(--aq-text-faint)' }} />
                <p className="text-sm" style={{ color: 'var(--aq-text-muted)' }}>No leave requests for {filterYear}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: LEAVE POLICY ────────────────────────────────────────────────── */}
      {activeTab === 'policy' && (
        <div className="space-y-4">
          {/* Policy intro */}
          <div className="glass-panel p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-xl shrink-0" style={{ background: 'oklch(0.72 0.19 167 / 0.12)' }}>
                <Info size={16} style={{ color: 'oklch(0.72 0.19 167)' }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                  AquaGrow Technologies — Leave Policy
                </h3>
                <p className="text-[11px] mt-1" style={{ color: 'var(--aq-text-secondary)' }}>
                  Every confirmed employee accrues <strong style={{ color: 'var(--aq-text-primary)' }}>1.5 paid leave days per month</strong> (18 days/year).
                  Leave credit is applied at the start of each month to your balance.
                  Unused leaves can be carried forward up to 6 days at year-end.
                </p>
              </div>
            </div>

            {/* Leave type breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LEAVE_POLICY.map(lt => {
                const Icon = lt.icon;
                return (
                  <div key={lt.type} className="p-4 rounded-xl"
                    style={{ background: lt.bg, border: `1px solid color-mix(in oklch, ${lt.color} 25%, var(--aq-glass-border))` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color: lt.color }} />
                      <span className="text-[11px] font-bold" style={{ color: lt.color }}>{lt.label}</span>
                    </div>
                    <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                      {lt.annual} <span className="text-sm font-normal" style={{ color: 'var(--aq-text-muted)' }}>days/yr</span>
                    </p>
                    <p className="text-[9px] mt-1" style={{ color: 'var(--aq-text-faint)' }}>{lt.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Other leave types */}
            <div className="mt-3 p-4 rounded-xl" style={{ background: 'var(--aq-glass-bg)', border: '1px solid var(--aq-glass-border)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--aq-text-muted)' }}>Special / As-Applicable</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LEAVE_TYPES_ALL.filter(l => l.annual === 0).map(lt => {
                  const Icon = lt.icon;
                  return (
                    <div key={lt.type} className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg shrink-0" style={{ background: lt.bg }}>
                        <Icon size={11} style={{ color: lt.color }} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>{lt.label}</p>
                        <p className="text-[9px]" style={{ color: 'var(--aq-text-faint)' }}>{lt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly accrual table */}
          <div className="glass-panel overflow-hidden">
            <div className="p-5" style={{ borderBottom: '1px solid var(--aq-glass-border)' }}>
              <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                Monthly Accrual Schedule — {filterYear}
              </h3>
              <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                1.5 days credited at the start of each month (0.5 CL + 0.5 SL + 0.5 EL)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="aq-table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Month</th>
                    <th className="text-center">Casual</th>
                    <th className="text-center">Sick</th>
                    <th className="text-center">Vacation</th>
                    <th className="text-center">Monthly Total</th>
                    <th className="text-center">Cumulative</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((month, idx) => {
                    const monthNum     = idx + 1;
                    const cumulative   = Math.round(monthNum * MONTHLY_ACCRUAL * 10) / 10;
                    const isPast       = filterYear < new Date().getFullYear() || (filterYear === new Date().getFullYear() && monthNum <= getMonth(new Date()) + 1);
                    const isCurrent    = filterYear === new Date().getFullYear() && monthNum === getMonth(new Date()) + 1;
                    return (
                      <tr key={month} style={{
                        background: isCurrent ? 'oklch(0.72 0.19 167 / 0.06)' : 'transparent',
                      }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: isCurrent ? 'oklch(0.72 0.19 167)' : isPast ? 'oklch(0.72 0.19 167 / 0.4)' : 'var(--aq-text-faint)' }} />
                            <span className="font-semibold text-[12px]" style={{ color: isCurrent ? 'oklch(0.72 0.19 167)' : 'var(--aq-text-primary)' }}>
                              {month} {filterYear}
                            </span>
                            {isCurrent && <span className="aq-badge aq-badge-green" style={{ fontSize: '7px' }}>Current</span>}
                          </div>
                        </td>
                        <td className="text-center text-[12px]" style={{ color: 'oklch(0.75 0.16 240)' }}>0.5</td>
                        <td className="text-center text-[12px]" style={{ color: 'oklch(0.75 0.18 25)' }}>0.5</td>
                        <td className="text-center text-[12px]" style={{ color: 'oklch(0.72 0.19 167)' }}>0.5</td>
                        <td className="text-center font-bold text-[12px]" style={{ color: 'var(--aq-text-primary)' }}>1.5</td>
                        <td className="text-center font-black text-[13px]" style={{ color: isPast ? 'oklch(0.72 0.19 167)' : 'var(--aq-text-faint)' }}>{cumulative}</td>
                        <td className="text-center">
                          {isCurrent
                            ? <span className="aq-badge aq-badge-green">Active</span>
                            : isPast
                            ? <span className="aq-badge aq-badge-blue">Credited</span>
                            : <span className="aq-badge aq-badge-amber">Upcoming</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: HOLIDAY CALENDAR ─────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Mini month calendar */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(m => new Date(getYear(m), getMonth(m) - 1))}
                className="p-2 rounded-xl aq-btn-ghost !p-1.5"><ChevronLeft size={16} /></button>
              <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                {format(calMonth, 'MMMM yyyy')}
              </h3>
              <button onClick={() => setCalMonth(m => new Date(getYear(m), getMonth(m) + 1))}
                className="p-2 rounded-xl aq-btn-ghost !p-1.5"><ChevronRight size={16} /></button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[9px] font-black uppercase tracking-wider py-1"
                  style={{ color: d === 'Sat' || d === 'Sun' ? 'oklch(0.75 0.18 25)' : 'var(--aq-text-faint)' }}>{d}</div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map(day => {
                const holiday    = isHoliday(day);
                const sameMonth  = isSameMonth(day, calMonth);
                const weekend    = isWeekend(day);
                const isToday    = isSameDay(day, new Date());
                const hCfg       = holiday ? HOLIDAY_CONFIG[holiday.type] : null;
                return (
                  <div key={day.toISOString()}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center relative group"
                    style={{
                      background: holiday && sameMonth ? hCfg!.bg : isToday ? 'oklch(0.72 0.19 167 / 0.15)' : 'transparent',
                      border: isToday ? '1px solid oklch(0.72 0.19 167 / 0.4)' : '1px solid transparent',
                      opacity: sameMonth ? 1 : 0.3,
                    }}>
                    <span className="text-[11px] font-bold leading-none"
                      style={{ color: holiday ? hCfg!.color : isToday ? 'oklch(0.72 0.19 167)' : weekend ? 'oklch(0.75 0.18 25)' : 'var(--aq-text-primary)' }}>
                      {format(day, 'd')}
                    </span>
                    {holiday && (
                      <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: hCfg!.color }} />
                    )}
                    {/* Tooltip on hover */}
                    {holiday && sameMonth && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50
                        opacity-0 group-hover:opacity-100 transition-opacity" style={{ whiteSpace: 'nowrap' }}>
                        <div className="glass-panel px-2 py-1.5 text-[9px] font-bold" style={{ color: hCfg!.color, borderRadius: '0.5rem' }}>
                          {holiday.name}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--aq-glass-border)' }}>
              {Object.entries(HOLIDAY_CONFIG).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  <span className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>{cfg.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: 'oklch(0.75 0.18 25)' }} />
                <span className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>Weekend</span>
              </div>
            </div>
          </div>

          {/* Full 2026 holiday list */}
          <div className="glass-panel overflow-hidden">
            <div className="p-5" style={{ borderBottom: '1px solid var(--aq-glass-border)' }}>
              <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                2026 Holiday Calendar — AquaGrow Technologies
              </h3>
              <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                Andhra Pradesh + National Holidays · {HOLIDAYS_2026.filter(h => h.type !== 'optional').length} mandated + {HOLIDAYS_2026.filter(h => h.type === 'optional').length} optional
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--aq-glass-border)' }}>
              {HOLIDAYS_2026.sort((a, b) => a.date.localeCompare(b.date)).map((h, i) => {
                const cfg  = HOLIDAY_CONFIG[h.type];
                const date = new Date(h.date);
                const day  = format(date, 'EEEE');
                const wknd = day === 'Saturday' || day === 'Sunday';
                return (
                  <motion.div key={h.date} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3.5">
                    {/* Date badge */}
                    <div className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center"
                      style={{ background: cfg.bg, border: `1px solid color-mix(in oklch, ${cfg.color} 25%, var(--aq-glass-border))` }}>
                      <span className="text-[9px] font-black uppercase" style={{ color: cfg.color }}>
                        {format(date, 'MMM')}
                      </span>
                      <span className="text-lg font-black leading-none" style={{ color: cfg.color }}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>{h.name}</p>
                        {wknd && <span className="aq-badge aq-badge-amber" style={{ fontSize: '7px' }}>Weekend</span>}
                      </div>
                      <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                        {day} · {format(date, 'dd MMMM yyyy')}
                      </p>
                    </div>
                    <span className="shrink-0 text-[9px] font-black px-2 py-1 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid color-mix(in oklch, ${cfg.color} 25%, transparent)` }}>
                      {cfg.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Apply Leave Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass-panel p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>Apply for Leave</h3>
                  <p className="text-xs" style={{ color: 'var(--aq-text-muted)' }}>Available: <strong style={{ color: 'oklch(0.72 0.19 167)' }}>{remaining} days</strong></p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl aq-btn-ghost !p-1.5"><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Leave type */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--aq-text-muted)' }}>Leave Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAVE_TYPES_ALL.map(lt => {
                      const Icon = lt.icon;
                      return (
                        <button key={lt.type} type="button" onClick={() => setLeaveType(lt.type)}
                          className="p-2.5 rounded-xl text-xs font-semibold text-left transition-all flex items-center gap-2"
                          style={{
                            background: leaveType === lt.type ? lt.bg : 'var(--aq-glass-bg)',
                            border: `1px solid ${leaveType === lt.type ? lt.color : 'var(--aq-glass-border)'}`,
                            color: leaveType === lt.type ? lt.color : 'var(--aq-text-secondary)',
                          }}>
                          <Icon size={12} className="shrink-0" />
                          {lt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>From</label>
                    <input type="date" required value={fromDate} onChange={e => setFromDate(e.target.value)}
                      className="aq-input" min={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>To</label>
                    <input type="date" required value={toDate} onChange={e => setToDate(e.target.value)}
                      className="aq-input" min={fromDate || format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                </div>
                {/* Duration indicator */}
                {fromDate && toDate && (
                  <div className="text-center py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.08)', color: 'oklch(0.72 0.19 167)' }}>
                    {Math.max(1, differenceInCalendarDays(new Date(toDate), new Date(fromDate)) + 1)} day(s) selected
                  </div>
                )}
                {/* Reason */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>Reason</label>
                  <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder="Briefly explain the reason for your leave…" className="aq-input resize-none" />
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
