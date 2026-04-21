import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Plus, CheckCircle, XCircle, Clock, X,
  Umbrella, Star, Info, ChevronLeft, ChevronRight,
  Sun, Flower2, Flag, RefreshCw, AlertTriangle, Lock,
  TrendingUp, Zap, Shield, ChevronDown,
} from 'lucide-react';
import {
  format, differenceInCalendarDays, getMonth, getYear,
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isWeekend, isAfter, isBefore, addDays, isToday,
} from 'date-fns';
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

// ── Leave Policy ───────────────────────────────────────────────────────────────
const MONTHLY_ACCRUAL = 1.5;
const ANNUAL_TOTAL    = 18;

const LEAVE_POLICY = [
  { type: 'casual',   label: 'Casual Leave',    annual: 6, monthly: 0.5, color: 'oklch(0.72 0.16 240)', bg: 'oklch(0.65 0.18 240 / 0.1)', icon: Sun,      desc: '0.5 days credited every month' },
  { type: 'sick',     label: 'Sick Leave',       annual: 6, monthly: 0.5, color: 'oklch(0.68 0.22 25)',  bg: 'oklch(0.65 0.22 25  / 0.1)', icon: Umbrella, desc: '0.5 days credited every month' },
  { type: 'vacation', label: 'Annual Vacation',  annual: 6, monthly: 0.5, color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.1)', icon: Star,     desc: '0.5 days credited every month' },
];

const LEAVE_TYPES_ALL = [
  ...LEAVE_POLICY,
  { type: 'emergency', label: 'Emergency Leave',       annual: 0, monthly: 0, color: 'oklch(0.82 0.18 70)',  bg: 'oklch(0.78 0.17 70  / 0.1)',  icon: Flag,    desc: 'As needed — manager approval required' },
  { type: 'maternity', label: 'Maternity / Paternity', annual: 0, monthly: 0, color: 'oklch(0.78 0.17 295)', bg: 'oklch(0.65 0.2  295 / 0.1)',  icon: Flower2, desc: 'As per policy & applicable law' },
];

// ── 2026 Holiday Calendar ──────────────────────────────────────────────────────
const HOLIDAYS_2026: { date: string; name: string; type: 'national' | 'regional' | 'optional' }[] = [
  { date: '2026-01-26', name: 'Republic Day',             type: 'national' },
  { date: '2026-03-08', name: 'Maha Shivaratri',          type: 'national' },
  { date: '2026-03-13', name: 'Holi',                     type: 'national' },
  { date: '2026-03-25', name: 'Ugadi (Telugu New Year)',  type: 'national' },
  { date: '2026-04-02', name: 'Sri Rama Navami',          type: 'national' },
  { date: '2026-04-06', name: 'Mahavir Jayanti',          type: 'national' },
  { date: '2026-04-03', name: 'Good Friday',              type: 'national' },
  { date: '2026-05-01', name: 'Labour Day',               type: 'national' },
  { date: '2026-05-13', name: 'Buddha Purnima',           type: 'national' },
  { date: '2026-06-25', name: 'Eid ul-Adha',              type: 'national' },
  { date: '2026-08-15', name: 'Independence Day',         type: 'national' },
  { date: '2026-08-28', name: 'Janmashtami',              type: 'national' },
  { date: '2026-10-02', name: 'Gandhi Jayanti',           type: 'national' },
  { date: '2026-10-20', name: 'Dussehra / Vijayadasami', type: 'national' },
  { date: '2026-11-01', name: 'Andhra Pradesh Day',       type: 'regional' },
  { date: '2026-11-05', name: 'Diwali',                   type: 'national' },
  { date: '2026-11-25', name: 'Guru Nanak Jayanti',       type: 'national' },
  { date: '2026-12-25', name: 'Christmas Day',            type: 'national' },
  { date: '2026-01-14', name: 'Pongal / Sankranti',       type: 'optional' },
  { date: '2026-10-31', name: 'Pre-Diwali',               type: 'optional' },
];

const HOLIDAY_CONFIG = {
  national: { label: 'National Holiday', color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.1)' },
  regional: { label: 'Regional Holiday', color: 'oklch(0.78 0.17 295)', bg: 'oklch(0.65 0.2  295 / 0.1)' },
  optional: { label: 'Optional Holiday', color: 'oklch(0.82 0.18 70)',  bg: 'oklch(0.78 0.17 70  / 0.1)' },
};

const STATUS_CFG = {
  approved: { label: 'Approved', badge: 'aq-badge-green', icon: CheckCircle },
  rejected: { label: 'Rejected', badge: 'aq-badge-red',   icon: XCircle    },
  pending:  { label: 'Pending',  badge: 'aq-badge-amber',  icon: Clock      },
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS_MON = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Helpers ────────────────────────────────────────────────────────────────────
const totalDays = (l: LeaveRecord) =>
  Math.max(1, differenceInCalendarDays(new Date(l.to), new Date(l.from)) + 1);

const monthsAccruedInYear = (year: number) => {
  const now = new Date();
  const curYear = getYear(now);
  if (year < curYear) return 12;
  if (year > curYear) return 0;
  return getMonth(now) + 1;
};

const getAppliedDate = (appliedAt: LeaveRecord['appliedAt']) => {
  if (!appliedAt) return new Date();
  if (typeof appliedAt === 'string') return new Date(appliedAt);
  if (typeof appliedAt === 'object' && appliedAt._seconds) return new Date(appliedAt._seconds * 1000);
  if (typeof appliedAt === 'object' && appliedAt.toDate) return appliedAt.toDate();
  return new Date();
};

const countWorkingDays = (from: string, to: string): number => {
  if (!from || !to) return 0;
  const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) });
  return days.filter(d => !isWeekend(d) && !HOLIDAYS_2026.find(h => h.date === format(d, 'yyyy-MM-dd'))).length;
};

const tomorrow = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-5">
    <h3 className="text-base font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>{title}</h3>
    {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>{sub}</p>}
  </div>
);

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--aq-progress-track)' }}>
    <motion.div className="h-full rounded-full"
      style={{ background: color }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, value)}%` }}
      transition={{ duration: 1.1, ease: 'easeOut' }} />
  </div>
);

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

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLeaves = useCallback(async () => {
    setFetching(true);
    try {
      const data = await hrmsApi.leaves.list();
      setLeaves(data.map((l: any) => ({ ...l, id: l._id ?? l.id ?? '' })));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load leaves');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // ── Computed Stats ──────────────────────────────────────────────────────────
  const approved      = useMemo(() => leaves.filter(l => l.status === 'approved' && new Date(l.from).getFullYear() === filterYear), [leaves, filterYear]);
  const pending       = useMemo(() => leaves.filter(l => l.status === 'pending'  && new Date(l.from).getFullYear() === filterYear), [leaves, filterYear]);
  const allFiltered   = useMemo(() => leaves.filter(l => new Date(l.from).getFullYear() === filterYear).sort((a, b) => b.from.localeCompare(a.from)), [leaves, filterYear]);
  const approvedDays  = useMemo(() => approved.reduce((s, l) => s + totalDays(l), 0), [approved]);
  const accruedMonths = monthsAccruedInYear(filterYear);
  const accruedTotal  = Math.round(accruedMonths * MONTHLY_ACCRUAL * 10) / 10;
  const remaining     = Math.max(0, accruedTotal - approvedDays);

  const currentMonthUsedByType = useMemo(() => {
    const now = new Date();
    const map: Record<string, number> = {};
    approved.filter(l => {
      const from = new Date(l.from);
      return from.getMonth() === now.getMonth() && from.getFullYear() === now.getFullYear();
    }).forEach(l => { map[l.type] = (map[l.type] ?? 0) + totalDays(l); });
    return map;
  }, [approved]);

  const selectedWorkingDays  = useMemo(() => countWorkingDays(fromDate, toDate), [fromDate, toDate]);
  const selectedTypePolicy   = LEAVE_TYPES_ALL.find(p => p.type === leaveType);
  const monthlyQuotaForType  = selectedTypePolicy?.monthly ?? 0;
  const usedThisMonthForType = currentMonthUsedByType[leaveType] ?? 0;
  const remainingThisMonth   = Math.max(0, monthlyQuotaForType - usedThisMonthForType);
  const isOverMonthlyQuota   = monthlyQuotaForType > 0 && selectedWorkingDays > remainingThisMonth;
  const isOverTotal          = selectedWorkingDays > remaining && remaining < 100;
  const hasWarning           = isOverMonthlyQuota || isOverTotal;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) return;
    const fromD = new Date(fromDate);
    if (!isAfter(fromD, new Date())) { toast.error('Leave must start from tomorrow or a future date'); return; }
    if (isBefore(new Date(toDate), fromD)) { toast.error('"To" date must be on or after "From" date'); return; }
    if (isOverMonthlyQuota) {
      toast.error(`Monthly quota for ${selectedTypePolicy?.label} is ${monthlyQuotaForType}d. You've already used ${usedThisMonthForType.toFixed(1)}d this month.`);
      return;
    }
    if (isOverTotal && !['emergency', 'maternity'].includes(leaveType)) {
      toast.error(`Insufficient leave balance. Available: ${remaining} days, Requested: ${selectedWorkingDays} days`);
      return;
    }
    setLoading(true);
    try {
      await hrmsApi.leaves.apply({
        type: leaveType, from: fromDate, to: toDate,
        days: selectedWorkingDays || Math.max(1, differenceInCalendarDays(new Date(toDate), fromD) + 1),
        reason,
      });
      toast.success('✅ Leave application submitted successfully!');
      setShowModal(false);
      setFromDate(''); setToDate(''); setReason('');
      await fetchLeaves();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const calYear  = getYear(calMonth);
  const calMon   = getMonth(calMonth);
  const firstDay = startOfMonth(calMonth);
  const lastDay  = endOfMonth(calMonth);
  const calDays  = eachDayOfInterval({ start: startOfWeek(firstDay, { weekStartsOn: 1 }), end: endOfWeek(lastDay, { weekStartsOn: 1 }) });
  const isHoliday = (d: Date) => HOLIDAYS_2026.find(h => h.date === format(d, 'yyyy-MM-dd'));
  const isOnLeave = (d: Date) => approved.some(l => !isBefore(d, new Date(l.from)) && !isAfter(d, new Date(l.to)));
  const minDate = tomorrow();

  const TABS = [
    { id: 'leaves' as const,   label: '📋 My Leaves'      },
    { id: 'policy' as const,   label: '📜 Leave Policy'   },
    { id: 'calendar' as const, label: '🗓 Holiday Calendar' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
            Leave Management
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
            Monthly accrual · 1.5 days/month · 18 days/year · Future dates only
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            className="aq-input !py-1.5 !text-xs !w-auto">
            {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={fetchLeaves} disabled={fetching} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setShowModal(true); setFromDate(''); setToDate(''); setReason(''); setLeaveType('casual'); }}
            className="aq-btn-primary">
            <Plus size={15} /> Apply Leave
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Annual Quota',    value: `${ANNUAL_TOTAL}d`,         color: 'oklch(0.72 0.16 240)', sub: '18 days / year total',         icon: Shield    },
          { label: 'Accrued So Far',  value: `${accruedTotal}d`,         color: 'oklch(0.72 0.19 167)', sub: `${accruedMonths} months × 1.5`, icon: TrendingUp },
          { label: 'Used (Approved)', value: `${approvedDays}d`,         color: 'oklch(0.68 0.22 25)',  sub: 'Approved leaves taken',         icon: Calendar   },
          { label: 'Available Now',   value: `${remaining.toFixed(1)}d`, color: remaining > 0 ? 'oklch(0.72 0.19 167)' : 'oklch(0.68 0.22 25)', sub: 'Accrued minus used', icon: Zap },
          { label: 'Pending',         value: `${pending.length}`,        color: 'oklch(0.82 0.18 70)',  sub: 'Awaiting HR approval',          icon: Clock      },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }} className="aq-stat-card !p-4 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${s.color}10, ${s.color}04)`, border: `1px solid ${s.color}22` }}>
              <div className="absolute -right-4 -top-4 w-14 h-14 rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${s.color}, transparent)` }} />
              <div className="relative">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[8.5px] uppercase tracking-widest font-bold" style={{ color: `${s.color}99` }}>{s.label}</p>
                  <div className="p-1.5 rounded-lg" style={{ background: `${s.color}15` }}>
                    <Icon size={11} style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-xl font-display font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>{s.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Balance Bar panel ─────────────────────────────────────────────── */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
              Leave Balance — {filterYear}
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
              Accrued: {accruedTotal}d · Used: {approvedDays}d · Remaining: {remaining.toFixed(1)}d
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)' }}>
            {accruedTotal > 0 ? Math.round((approvedDays / accruedTotal) * 100) : 0}% used
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            { label: `Accrued (${accruedTotal} / ${ANNUAL_TOTAL} days)`, pct: (accruedTotal / ANNUAL_TOTAL) * 100, color: 'oklch(0.65 0.18 240)' },
            { label: `Used (${approvedDays} / ${accruedTotal} accrued)`, pct: accruedTotal > 0 ? (approvedDays / accruedTotal) * 100 : 0, color: 'oklch(0.72 0.19 167)' },
          ].map(bar => (
            <div key={bar.label}>
              <div className="flex justify-between text-[9px] mb-1" style={{ color: 'var(--aq-text-muted)' }}>
                <span>{bar.label}</span>
                <span>{Math.round(bar.pct)}%</span>
              </div>
              <ProgressBar value={bar.pct} color={bar.color} />
            </div>
          ))}
        </div>

        {/* Per-type this month */}
        <div className="flex flex-wrap gap-5 mt-4 pt-4" style={{ borderTop: '1px solid var(--aq-glass-border)' }}>
          <p className="w-full text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--aq-text-muted)' }}>
            This Month's Usage
          </p>
          {LEAVE_POLICY.map(lt => {
            const used = currentMonthUsedByType[lt.type] ?? 0;
            const overQuota = used > lt.monthly;
            return (
              <div key={lt.type} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: lt.color }} />
                <span className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>
                  {lt.label}:
                  <strong className="ml-1" style={{ color: overQuota ? 'oklch(0.68 0.22 25)' : 'var(--aq-text-primary)' }}>
                    {used}/{lt.monthly}d
                  </strong>
                  {overQuota && <span className="ml-1 text-[8px]" style={{ color: 'oklch(0.68 0.22 25)' }}>⚠ Over</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--aq-glass-bg)', border: '1px solid var(--aq-glass-border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all"
            style={{
              background: activeTab === t.id ? 'oklch(0.72 0.19 167 / 0.15)' : 'transparent',
              color: activeTab === t.id ? 'oklch(0.72 0.19 167)' : 'var(--aq-text-muted)',
              border: activeTab === t.id ? '1px solid oklch(0.72 0.19 167 / 0.25)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MY LEAVES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leaves' && (
        <div className="glass-panel overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--aq-glass-border)', background: 'oklch(0.72 0.19 167 / 0.03)' }}>
            <div>
              <h3 className="text-sm font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                Leave History — {filterYear}
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
                {allFiltered.length} record{allFiltered.length !== 1 ? 's' : ''} · {approved.length} approved · {pending.length} pending
              </p>
            </div>
          </div>

          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--aq-glass-border)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
            </div>
          ) : allFiltered.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={36} className="mx-auto mb-3" style={{ color: 'var(--aq-text-faint)' }} />
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--aq-text-primary)' }}>No leave requests for {filterYear}</p>
              <p className="text-xs" style={{ color: 'var(--aq-text-muted)' }}>Apply for a leave to see it here</p>
            </div>
          ) : (
            <div>
              {allFiltered.map((leave, i) => {
                const cfg  = STATUS_CFG[leave.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
                const lt   = LEAVE_TYPES_ALL.find(t => t.type === leave.type);
                const days = totalDays(leave);
                const StatusIcon = cfg.icon;
                return (
                  <motion.div key={leave.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-5 py-4 flex items-center gap-4 transition-all"
                    style={{
                      borderBottom: i < allFiltered.length - 1 ? '1px solid var(--aq-glass-border)' : 'none',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-table-hover)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>

                    {/* Type icon */}
                    <div className="p-3 rounded-xl shrink-0" style={{ background: lt?.bg ?? 'var(--aq-ghost-bg)', border: '1px solid var(--aq-glass-border)' }}>
                      {lt ? <lt.icon size={16} style={{ color: lt.color }} /> : <Calendar size={16} style={{ color: 'var(--aq-text-muted)' }} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>{lt?.label ?? leave.type}</p>
                        <span className={`aq-badge ${cfg.badge} flex items-center gap-1`}>
                          <StatusIcon size={9} /> {cfg.label}
                        </span>
                        <span className="aq-badge" style={{ background: 'var(--aq-ghost-bg)', color: 'var(--aq-text-muted)', border: '1px solid var(--aq-glass-border)' }}>
                          {days}d
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--aq-text-muted)' }}>
                        {format(new Date(leave.from), 'MMM dd')} – {format(new Date(leave.to), 'MMM dd, yyyy')}
                      </p>
                      {leave.reason && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--aq-text-faint)' }}>
                          {leave.reason}
                        </p>
                      )}
                    </div>

                    {/* Applied at */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Applied</p>
                      <p className="text-xs font-medium" style={{ color: 'var(--aq-text-primary)' }}>
                        {leave.appliedAt ? format(getAppliedDate(leave.appliedAt), 'MMM dd, yyyy') : '—'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: LEAVE POLICY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'policy' && (
        <div className="space-y-4">

          {/* Policy summary */}
          <div className="glass-panel p-5">
            <div className="flex items-start gap-3 mb-5">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'oklch(0.72 0.19 167 / 0.1)' }}>
                <Info size={16} style={{ color: 'oklch(0.72 0.19 167)' }} />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                  AquaGrow Technologies — Leave Policy
                </h3>
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>
                  Every confirmed employee accrues <strong style={{ color: 'var(--aq-text-primary)' }}>1.5 paid leave days per month</strong> (18 days/year).
                  Leave is credited at the start of each month. You can apply for leaves <strong style={{ color: 'var(--aq-text-primary)' }}>only for future dates</strong>.
                  Each leave type has a <strong style={{ color: 'var(--aq-text-primary)' }}>monthly quota</strong> — you cannot exceed it in a single month.
                  Unused leaves can be carried forward up to <strong style={{ color: 'var(--aq-text-primary)' }}>6 days</strong> at year-end.
                </p>
              </div>
            </div>

            {/* Key rules */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { icon: Lock,          color: 'oklch(0.68 0.22 25)',  label: 'Future Dates Only', desc: 'Cannot apply leave for today or past dates'  },
                { icon: Calendar,      color: 'oklch(0.72 0.16 240)', label: 'Monthly Quota',      desc: '0.5 days per leave type per month max'        },
                { icon: AlertTriangle, color: 'oklch(0.82 0.18 70)',  label: 'Balance Check',      desc: 'Cannot exceed accrued leave balance'           },
              ].map(r => {
                const Icon = r.icon;
                return (
                  <div key={r.label} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--aq-ghost-bg)', border: '1px solid var(--aq-glass-border)' }}>
                    <div className="p-2 rounded-lg shrink-0" style={{ background: `${r.color}15` }}>
                      <Icon size={13} style={{ color: r.color }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>{r.label}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>{r.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leave type cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LEAVE_POLICY.map(lt => {
                const Icon = lt.icon;
                const used = currentMonthUsedByType[lt.type] ?? 0;
                const monthPct = Math.min(100, (used / lt.monthly) * 100);
                return (
                  <div key={lt.type} className="p-4 rounded-xl"
                    style={{ background: lt.bg, border: `1px solid ${lt.color}30` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color: lt.color }} />
                      <span className="text-[11px] font-bold" style={{ color: lt.color }}>{lt.label}</span>
                    </div>
                    <p className="text-2xl font-display font-black mb-0.5" style={{ color: 'var(--aq-text-primary)' }}>
                      {lt.annual}<span className="text-sm font-normal" style={{ color: 'var(--aq-text-muted)' }}> days/yr</span>
                    </p>
                    <p className="text-[9px] mb-2" style={{ color: 'var(--aq-text-muted)' }}>{lt.desc}</p>
                    <div className="text-[8px] mb-1 flex justify-between" style={{ color: 'var(--aq-text-muted)' }}>
                      <span>This month</span>
                      <span>{used}/{lt.monthly}d used</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0 0 0 / 0.15)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${monthPct}%`, background: used >= lt.monthly ? 'oklch(0.68 0.22 25)' : lt.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly accrual table */}
          <div className="glass-panel overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--aq-glass-border)' }}>
              <h3 className="text-sm font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                Monthly Accrual Schedule — {filterYear}
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
                1.5 days credited at the start of each month (0.5 CL + 0.5 SL + 0.5 Vacation)
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
                    <th className="text-center">Monthly</th>
                    <th className="text-center">Cumulative</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS_FULL.map((month, idx) => {
                    const monthNum   = idx + 1;
                    const cumulative = Math.round(monthNum * MONTHLY_ACCRUAL * 10) / 10;
                    const isPast     = filterYear < new Date().getFullYear() || (filterYear === new Date().getFullYear() && monthNum <= getMonth(new Date()) + 1);
                    const isCurrent  = filterYear === new Date().getFullYear() && monthNum === getMonth(new Date()) + 1;
                    return (
                      <tr key={month} style={{ background: isCurrent ? 'oklch(0.72 0.19 167 / 0.05)' : 'transparent' }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: isCurrent ? 'oklch(0.72 0.19 167)' : isPast ? 'oklch(0.72 0.19 167 / 0.4)' : 'var(--aq-text-faint)' }} />
                            <span className="font-semibold text-xs" style={{ color: isCurrent ? 'oklch(0.72 0.19 167)' : 'var(--aq-text-primary)' }}>
                              {month} {filterYear}
                            </span>
                            {isCurrent && <span className="aq-badge aq-badge-green" style={{ fontSize: '7px' }}>Current</span>}
                          </div>
                        </td>
                        <td className="text-center text-xs" style={{ color: 'oklch(0.72 0.16 240)' }}>0.5</td>
                        <td className="text-center text-xs" style={{ color: 'oklch(0.68 0.22 25)' }}>0.5</td>
                        <td className="text-center text-xs" style={{ color: 'oklch(0.72 0.19 167)' }}>0.5</td>
                        <td className="text-center text-xs font-bold" style={{ color: 'var(--aq-text-primary)' }}>1.5</td>
                        <td className="text-center text-xs font-black"
                          style={{ color: isPast ? 'oklch(0.72 0.19 167)' : 'var(--aq-text-faint)' }}>{cumulative}</td>
                        <td className="text-center">
                          {isCurrent ? <span className="aq-badge aq-badge-green">Active</span>
                            : isPast  ? <span className="aq-badge aq-badge-blue">Credited</span>
                            :           <span className="aq-badge aq-badge-amber">Upcoming</span>}
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

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: HOLIDAY CALENDAR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="glass-panel p-5">

            {/* Mini calendar nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalMonth(m => new Date(getYear(m), getMonth(m) - 1))} className="aq-btn-ghost !p-1.5">
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-sm font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                {format(calMonth, 'MMMM yyyy')}
              </h3>
              <button onClick={() => setCalMonth(m => new Date(getYear(m), getMonth(m) + 1))} className="aq-btn-ghost !p-1.5">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS_MON.map(d => (
                <div key={d} className="text-center text-[9px] font-black uppercase tracking-wider py-1"
                  style={{ color: d === 'Sat' || d === 'Sun' ? 'oklch(0.68 0.22 25 / 0.8)' : 'var(--aq-text-muted)' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map(day => {
                const holiday   = isHoliday(day);
                const sameMonth = isSameMonth(day, calMonth);
                const weekend   = isWeekend(day);
                const todayDay  = isToday(day);
                const onLeave   = isOnLeave(day);
                const hCfg      = holiday ? HOLIDAY_CONFIG[holiday.type] : null;
                return (
                  <div key={day.toISOString()}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center relative group cursor-default"
                    style={{
                      background: holiday && sameMonth ? hCfg!.bg
                        : onLeave && sameMonth ? 'oklch(0.72 0.16 240 / 0.1)'
                        : todayDay ? 'oklch(0.72 0.19 167 / 0.12)'
                        : 'transparent',
                      border: todayDay ? '1px solid oklch(0.72 0.19 167 / 0.4)' : '1px solid transparent',
                      opacity: sameMonth ? 1 : 0.2,
                    }}>
                    <span className="text-[11px] font-bold leading-none"
                      style={{ color: holiday ? hCfg!.color : onLeave ? 'oklch(0.72 0.16 240)' : todayDay ? 'oklch(0.72 0.19 167)' : weekend ? 'oklch(0.68 0.22 25 / 0.7)' : 'var(--aq-text-primary)' }}>
                      {format(day, 'd')}
                    </span>
                    {(holiday || onLeave) && sameMonth && (
                      <div className="w-1 h-1 rounded-full mt-0.5"
                        style={{ background: holiday ? hCfg!.color : 'oklch(0.72 0.16 240)' }} />
                    )}
                    {/* Tooltip */}
                    {(holiday || onLeave) && sameMonth && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-50
                        opacity-0 group-hover:opacity-100 transition-opacity" style={{ whiteSpace: 'nowrap' }}>
                        <div className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold shadow-xl glass-panel"
                          style={{ color: holiday ? hCfg!.color : 'oklch(0.72 0.16 240)' }}>
                          {holiday ? holiday.name : 'On Leave'}
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
                  <span className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>{cfg.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: 'oklch(0.72 0.16 240)' }} />
                <span className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Your Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: 'oklch(0.68 0.22 25 / 0.7)' }} />
                <span className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Weekend</span>
              </div>
            </div>
          </div>

          {/* Holiday list */}
          <div className="glass-panel overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--aq-glass-border)', background: 'oklch(0.72 0.19 167 / 0.03)' }}>
              <h3 className="text-sm font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                2026 Holiday Calendar — AquaGrow Technologies
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
                {HOLIDAYS_2026.filter(h => h.type !== 'optional').length} mandated + {HOLIDAYS_2026.filter(h => h.type === 'optional').length} optional holidays
              </p>
            </div>
            <div>
              {HOLIDAYS_2026.sort((a, b) => a.date.localeCompare(b.date)).map((h, i) => {
                const cfg  = HOLIDAY_CONFIG[h.type];
                const date = new Date(h.date);
                const day  = format(date, 'EEEE');
                const wknd = day === 'Saturday' || day === 'Sunday';
                return (
                  <motion.div key={h.date} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3.5 transition-all"
                    style={{ borderBottom: i < HOLIDAYS_2026.length - 1 ? '1px solid var(--aq-glass-border)' : 'none' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-table-hover)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                      <span className="text-[9px] font-black uppercase" style={{ color: cfg.color }}>{format(date, 'MMM')}</span>
                      <span className="text-lg font-display font-black leading-none" style={{ color: cfg.color }}>{format(date, 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>{h.name}</p>
                        {wknd && <span className="aq-badge aq-badge-amber" style={{ fontSize: '7px' }}>Weekend</span>}
                      </div>
                      <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                        {day} · {format(date, 'dd MMMM yyyy')}
                      </p>
                    </div>
                    <span className="shrink-0 aq-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, fontSize: '9px' }}>
                      {cfg.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          APPLY LEAVE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'oklch(0 0 0 / 80%)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="w-full max-w-md glass-panel overflow-hidden max-h-[92vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--aq-glass-border)', background: 'oklch(0.72 0.19 167 / 0.05)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                      Apply for Leave
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
                      Available: <strong style={{ color: 'oklch(0.72 0.19 167)' }}>{remaining.toFixed(1)} days</strong>
                      {' '}· Future dates only
                    </p>
                  </div>
                  <button onClick={() => setShowModal(false)}
                    className="p-1.5 rounded-xl transition-colors" style={{ color: 'var(--aq-text-muted)' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-ghost-hover)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* No balance warning */}
                {remaining <= 0 && !['emergency', 'maternity'].includes(leaveType) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 p-3 rounded-xl flex items-start gap-2"
                    style={{ background: 'oklch(0.68 0.22 25 / 0.08)', border: '1px solid oklch(0.68 0.22 25 / 0.25)' }}>
                    <AlertTriangle size={14} style={{ color: 'oklch(0.68 0.22 25)' }} className="shrink-0 mt-0.5" />
                    <p className="text-[10px]" style={{ color: 'oklch(0.68 0.22 25)' }}>
                      You have no accrued leave balance. Only Emergency or Maternity/Paternity leave can be applied without balance.
                    </p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Leave type selector */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--aq-text-muted)' }}>
                      Leave Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEAVE_TYPES_ALL.map(lt => {
                        const Icon = lt.icon;
                        const used = currentMonthUsedByType[lt.type] ?? 0;
                        const exhausted = lt.monthly > 0 && used >= lt.monthly;
                        return (
                          <button key={lt.type} type="button" onClick={() => setLeaveType(lt.type)}
                            className="p-2.5 rounded-xl text-xs font-semibold text-left transition-all flex items-center gap-2"
                            style={{
                              background: leaveType === lt.type ? lt.bg : 'var(--aq-input-bg)',
                              border: `1px solid ${leaveType === lt.type ? `${lt.color}50` : 'var(--aq-input-border)'}`,
                              color: leaveType === lt.type ? lt.color : 'var(--aq-text-muted)',
                              opacity: exhausted && leaveType !== lt.type ? 0.5 : 1,
                            }}>
                            <Icon size={12} className="shrink-0" />
                            <div className="min-w-0">
                              <div>{lt.label}</div>
                              {lt.monthly > 0 && (
                                <div className="text-[8px] mt-0.5" style={{ color: exhausted ? 'oklch(0.68 0.22 25)' : 'var(--aq-text-faint)' }}>
                                  {used}/{lt.monthly}d this month{exhausted ? ' ⚠ Full' : ''}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date range */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>
                      Date Range <span style={{ color: 'oklch(0.72 0.19 167)' }}>· Future dates only</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] mb-1" style={{ color: 'var(--aq-text-muted)' }}>From</p>
                        <input type="date" required value={fromDate}
                          onChange={e => { setFromDate(e.target.value); if (toDate && e.target.value > toDate) setToDate(''); }}
                          className="aq-input text-sm" min={minDate} />
                      </div>
                      <div>
                        <p className="text-[9px] mb-1" style={{ color: 'var(--aq-text-muted)' }}>To</p>
                        <input type="date" required value={toDate}
                          onChange={e => setToDate(e.target.value)}
                          className="aq-input text-sm" min={fromDate || minDate} />
                      </div>
                    </div>
                    <p className="text-[9px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--aq-text-muted)' }}>
                      <Lock size={9} /> Leave start date must be <strong style={{ color: 'var(--aq-text-primary)' }}>tomorrow or later</strong>
                    </p>
                  </div>

                  {/* Duration summary */}
                  {fromDate && toDate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="rounded-xl overflow-hidden">
                      <div className="p-3.5 rounded-xl"
                        style={{ background: hasWarning ? 'oklch(0.68 0.22 25 / 0.06)' : 'oklch(0.72 0.19 167 / 0.06)', border: `1px solid ${hasWarning ? 'oklch(0.68 0.22 25 / 0.25)' : 'oklch(0.72 0.19 167 / 0.2)'}` }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold" style={{ color: hasWarning ? 'oklch(0.68 0.22 25)' : 'oklch(0.72 0.19 167)' }}>
                            Leave Summary
                          </span>
                          {hasWarning && <AlertTriangle size={13} style={{ color: 'oklch(0.68 0.22 25)' }} />}
                        </div>
                        <div className="space-y-1">
                          {[
                            { label: 'Calendar Days', val: `${differenceInCalendarDays(new Date(toDate), new Date(fromDate)) + 1}d` },
                            { label: 'Working Days',  val: `${selectedWorkingDays}d`, highlight: true },
                            { label: 'Available',     val: `${remaining.toFixed(1)}d` },
                            { label: 'After Apply',   val: `${Math.max(0, remaining - selectedWorkingDays).toFixed(1)}d`, warn: remaining - selectedWorkingDays < 0 },
                          ].map(row => (
                            <div key={row.label} className="flex justify-between text-[10px]">
                              <span style={{ color: 'var(--aq-text-muted)' }}>{row.label}</span>
                              <span className="font-bold"
                                style={{ color: row.warn ? 'oklch(0.68 0.22 25)' : row.highlight ? 'var(--aq-text-primary)' : 'var(--aq-text-secondary)' }}>
                                {row.val}
                              </span>
                            </div>
                          ))}
                        </div>
                        {isOverMonthlyQuota && (
                          <p className="text-[9px] mt-2 font-bold" style={{ color: 'oklch(0.68 0.22 25)' }}>
                            ⚠ Exceeds monthly quota for {selectedTypePolicy?.label}: {usedThisMonthForType.toFixed(1)}d used, {remainingThisMonth.toFixed(1)}d remaining this month
                          </p>
                        )}
                        {isOverTotal && !isOverMonthlyQuota && (
                          <p className="text-[9px] mt-2 font-bold" style={{ color: 'oklch(0.68 0.22 25)' }}>
                            ⚠ Exceeds accrued leave balance ({remaining.toFixed(1)}d available)
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Reason */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>
                      Reason *
                    </label>
                    <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={3}
                      placeholder="Briefly explain the reason for your leave…" className="aq-input resize-none text-sm" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowModal(false)} className="aq-btn-ghost flex-1 justify-center">
                      Cancel
                    </button>
                    <button type="submit"
                      disabled={loading || (hasWarning && !['emergency', 'maternity'].includes(leaveType))}
                      className="aq-btn-primary flex-1 justify-center"
                      style={(hasWarning && !['emergency', 'maternity'].includes(leaveType)) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
                      {loading ? 'Submitting…' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaves;
