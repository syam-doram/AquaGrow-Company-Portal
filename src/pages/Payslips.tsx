import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, FileText, TrendingUp, TrendingDown,
  Calendar, RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
  Banknote, Wallet, Shield, Zap, X, Printer, CheckCircle, Clock,
  BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, getMonth, getYear } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import hrmsApi from '../api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Payslip {
  _id: string;
  month: string;      // "April 2026" or "2026-04"
  year?: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: string;
  basic?: number;
  hra?: number;
  allowances?: number;
  bonus?: number;
  pfDeduction?: number;
  taxDeduction?: number;
  createdAt?: string;
  approvedAt?: string;
  paidAt?: string;
  employeeName?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURR_YEAR    = new Date().getFullYear();
const CURR_MONTH   = new Date().getMonth(); // 0-indexed

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Parse various month formats → { month: 0-11, year } */
const parseSlipDate = (slip: Payslip): { month: number; year: number } => {
  // Try "April 2026"
  for (let i = 0; i < MONTHS_FULL.length; i++) {
    if (slip.month?.startsWith(MONTHS_FULL[i])) {
      const yr = parseInt(slip.month.split(' ')[1] ?? String(slip.year ?? CURR_YEAR));
      return { month: i, year: isNaN(yr) ? (slip.year ?? CURR_YEAR) : yr };
    }
    if (slip.month?.startsWith(MONTHS_SHORT[i])) {
      const yr = parseInt(slip.month.split(' ')[1] ?? String(slip.year ?? CURR_YEAR));
      return { month: i, year: isNaN(yr) ? (slip.year ?? CURR_YEAR) : yr };
    }
  }
  // Try "2026-04"
  if (/^\d{4}-\d{2}$/.test(slip.month ?? '')) {
    const [y, m] = slip.month.split('-').map(Number);
    return { month: m - 1, year: y };
  }
  // Fallback to createdAt
  if (slip.createdAt) {
    const d = new Date(slip.createdAt);
    return { month: d.getMonth(), year: d.getFullYear() };
  }
  return { month: slip.year ? 0 : CURR_MONTH, year: slip.year ?? CURR_YEAR };
};

const slipLabel = (slip: Payslip) => {
  const { month, year } = parseSlipDate(slip);
  return `${MONTHS_FULL[month]} ${year}`;
};

const statusBadge = (status: string) => {
  if (status === 'paid')              return { cls: 'aq-badge-green', label: 'Paid',     icon: CheckCircle };
  if (status === 'approved')          return { cls: 'aq-badge-blue',  label: 'Approved', icon: CheckCircle };
  if (status === 'pending_approval')  return { cls: 'aq-badge-amber', label: 'Pending',  icon: Clock };
  return { cls: 'aq-badge-blue', label: status?.replace('_',' ') ?? 'Draft', icon: Clock };
};

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

// ── Custom chart tooltips ──────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="glass-panel px-3 py-2 text-xs">
    <p className="font-bold text-white mb-1">{label}</p>
    {payload.map((p: any) => (
      <p key={p.name} style={{ color: p.fill ?? p.stroke }}>
        {p.name === 'net' ? 'Net' : p.name === 'gross' ? 'Gross' : 'Deductions'}: ₹{Number(p.value).toLocaleString('en-IN')}
      </p>
    ))}
  </div>
) : null;

// ══════════════════════════════════════════════════════════════════════════════
const Payslips: React.FC = () => {
  const { employee } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // View state
  const [viewYear, setViewYear]   = useState<number>(CURR_YEAR);
  const [viewMonth, setViewMonth] = useState<number | null>(null); // null = year overview
  const [detail, setDetail]       = useState<Payslip | null>(null); // full payslip modal
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  // Load
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await hrmsApi.payroll.myPayslips();
      setPayslips(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived ────────────────────────────────────────────────────────────────
  // All unique years present in payslips (plus current year)
  const years = useMemo(() => {
    const yrs = new Set<number>([CURR_YEAR]);
    payslips.forEach(p => yrs.add(parseSlipDate(p).year));
    return [...yrs].sort((a, b) => b - a);
  }, [payslips]);

  // Payslips for selected year
  const yearSlips = useMemo(() =>
    payslips.filter(p => parseSlipDate(p).year === viewYear)
      .sort((a, b) => parseSlipDate(b).month - parseSlipDate(a).month),
    [payslips, viewYear]);

  // Payslip for selected month (if month view)
  const monthSlip = useMemo(() => {
    if (viewMonth === null) return null;
    return yearSlips.find(p => parseSlipDate(p).month === viewMonth) ?? null;
  }, [yearSlips, viewMonth]);

  // Chart data for year — all 12 months
  const chartData = useMemo(() => MONTHS_SHORT.map((label, mi) => {
    const slip = yearSlips.find(p => parseSlipDate(p).month === mi);
    return {
      label,
      mi,
      gross: slip?.grossSalary ?? 0,
      net:   slip?.netSalary ?? 0,
      deduct: slip?.deductions ?? 0,
      has: !!slip,
    };
  }), [yearSlips]);

  // Yearly totals
  const yearTotal  = useMemo(() => yearSlips.reduce((s, p) => s + (p.netSalary ?? 0), 0), [yearSlips]);
  const yearGross  = useMemo(() => yearSlips.reduce((s, p) => s + (p.grossSalary ?? 0), 0), [yearSlips]);
  const yearDeduct = useMemo(() => yearSlips.reduce((s, p) => s + (p.deductions ?? 0), 0), [yearSlips]);
  const paidMonth  = yearSlips.filter(p => p.status === 'paid' || p.status === 'approved').length;
  const avgNet     = yearSlips.length > 0 ? Math.round(yearTotal / yearSlips.length) : 0;

  // Latest payslip for the hero
  const latest = payslips.sort((a, b) => {
    const da = parseSlipDate(a), db = parseSlipDate(b);
    return db.year !== da.year ? db.year - da.year : db.month - da.month;
  })[0] ?? null;

  // Breakdown for a given payslip
  const breakdown = (slip: Payslip) => {
    const g = slip.grossSalary ?? 0;
    const d = slip.deductions ?? 0;
    const basic  = slip.basic      ?? Math.round(g * 0.5);
    const hra    = slip.hra        ?? Math.round(g * 0.2);
    const allow  = slip.allowances ?? Math.round(g * 0.15);
    const bonus  = slip.bonus      ?? 0;
    const specl  = g - basic - hra - allow - bonus;
    const pf     = slip.pfDeduction  ?? Math.round(d * 0.6);
    const tax    = slip.taxDeduction ?? Math.round(d * 0.3);
    const other  = d - pf - tax;
    return {
      earnings: [
        { label: 'Basic Pay',          amount: basic },
        { label: 'HRA',                amount: hra   },
        { label: 'Allowances',         amount: allow },
        ...(bonus > 0  ? [{ label: 'Bonus / Incentive', amount: bonus }] : []),
        ...(specl > 0  ? [{ label: 'Special Allowance', amount: specl }] : []),
      ],
      deductions: [
        { label: 'PF (12%)',           amount: pf    },
        { label: 'TDS / Income Tax',   amount: tax   },
        ...(other > 0  ? [{ label: 'Other Deductions', amount: other  }] : []),
      ],
    };
  };

  const nextPayDate = (() => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'MMM dd, yyyy');
  })();

  // ── Download (simulated) ───────────────────────────────────────────────────
  const handleDownload = (slip: Payslip) => {
    toast.info(`Preparing ${slipLabel(slip)} payslip…`);
    setTimeout(() => toast.success(`✅ ${slipLabel(slip)} payslip ready for download`), 1500);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-28">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'oklch(0.72 0.19 167 / 0.2)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
        <p className="text-xs" style={{ color: 'oklch(0.5 0.02 210)' }}>Loading payslips…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="glass-panel p-10 text-center space-y-3">
      <AlertCircle size={36} className="mx-auto" style={{ color: 'oklch(0.75 0.18 25)' }} />
      <p className="text-sm font-bold text-white">Failed to load payslips</p>
      <p className="text-xs" style={{ color: 'oklch(0.5 0.02 210)' }}>{error}</p>
      <button onClick={load} className="aq-btn-primary mx-auto"><RefreshCw size={14} /> Retry</button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Payslips & Salary
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            Year-wise & month-wise salary statements
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Hero KPI Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Current Net Salary', value: fmt(latest?.netSalary ?? employee?.salary ?? 0), sub: `Next payout: ${nextPayDate}`, color: 'oklch(0.72 0.19 167)', icon: Banknote },
          { label: `${viewYear} Total Earned`, value: fmt(yearTotal),  sub: `${paidMonth} months paid`,            color: 'oklch(0.78 0.17 70)',  icon: Wallet  },
          { label: 'Total Deductions',   value: fmt(yearDeduct),       sub: `${viewYear} PF + Tax + Other`,        color: 'oklch(0.75 0.18 25)',  icon: Shield  },
          { label: 'Monthly Average',    value: fmt(avgNet),            sub: `Net average · ${yearSlips.length}mo`, color: 'oklch(0.75 0.16 240)', icon: Zap     },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }} className="aq-stat-card !p-4 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{ background: `radial-gradient(circle at 80% 20%, ${k.color}, transparent 60%)` }} />
              <div className="flex items-start justify-between mb-2 relative">
                <p className="text-[8.5px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>{k.label}</p>
                <div className="p-1.5 rounded-lg" style={{ background: `${k.color.replace(')', ' / 0.12)')}` }}>
                  <Icon size={12} style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-lg font-black relative" style={{ fontFamily: 'Space Grotesk, sans-serif', color: k.color }}>{k.value}</p>
              <p className="text-[9px] mt-0.5 relative" style={{ color: 'oklch(0.45 0.02 210)' }}>{k.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Year Selector ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-bold" style={{ color: 'oklch(0.5 0.02 210)' }}>Year:</p>
        {years.map(y => (
          <button key={y} onClick={() => { setViewYear(y); setViewMonth(null); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={viewYear === y
              ? { background: 'oklch(0.72 0.19 167 / 0.18)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.35)' }
              : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {y}
            {y === CURR_YEAR && <span className="ml-1 text-[8px] opacity-60">Current</span>}
          </button>
        ))}
        {viewMonth !== null && (
          <button onClick={() => setViewMonth(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'oklch(0.75 0.16 240 / 0.12)', color: 'oklch(0.75 0.16 240)', border: '1px solid oklch(0.75 0.16 240 / 0.25)' }}>
            <X size={11} /> Back to {viewYear}
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          YEAR OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMonth === null && (
        <div className="space-y-4">

          {/* Salary Chart */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Salary Overview — {viewYear}
                </h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                  Monthly gross, net and deductions
                </p>
              </div>
              <div className="flex gap-1">
                {(['bar','line'] as const).map(t => (
                  <button key={t} onClick={() => setChartType(t)}
                    className="p-2 rounded-lg text-xs font-bold transition-all"
                    style={chartType === t
                      ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)' }
                      : { color: 'oklch(0.45 0.02 210)' }}>
                    {t === 'bar' ? <BarChart2 size={14} /> : <TrendingUp size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} barSize={14} barGap={3}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 9 }}
                      tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<BarTip />} cursor={{ fill: 'oklch(1 0 0 / 4%)' }} />
                    <Bar dataKey="gross"  name="gross"  fill="oklch(0.75 0.16 240 / 0.5)" radius={[4,4,0,0]} />
                    <Bar dataKey="net"    name="net"    fill="oklch(0.72 0.19 167)"         radius={[4,4,0,0]} />
                    <Bar dataKey="deduct" name="deduct" fill="oklch(0.65 0.22 25 / 0.6)"   radius={[4,4,0,0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 9 }}
                      tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<BarTip />} />
                    <Line type="monotone" dataKey="gross"  stroke="oklch(0.75 0.16 240)" strokeWidth={2} dot={{ fill: 'oklch(0.75 0.16 240)', r: 3 }} name="gross" />
                    <Line type="monotone" dataKey="net"    stroke="oklch(0.72 0.19 167)" strokeWidth={2.5} dot={{ fill: 'oklch(0.72 0.19 167)', r: 4 }} name="net" />
                    <Line type="monotone" dataKey="deduct" stroke="oklch(0.65 0.22 25)"  strokeWidth={1.5} dot={{ fill: 'oklch(0.65 0.22 25)', r: 3 }}  strokeDasharray="4 2" name="deduct" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Chart legend */}
            <div className="flex gap-5 mt-3 pt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
              {[
                { color: 'oklch(0.75 0.16 240)', label: 'Gross' },
                { color: 'oklch(0.72 0.19 167)', label: 'Net'   },
                { color: 'oklch(0.65 0.22 25)',  label: 'Deductions' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Year summary totals */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Gross',      value: fmt(yearGross),  sub: `${viewYear} earnings`, color: 'oklch(0.75 0.16 240)' },
              { label: 'Total Net Paid',   value: fmt(yearTotal),  sub: 'After deductions',     color: 'oklch(0.72 0.19 167)' },
              { label: 'Total Deducted',   value: fmt(yearDeduct), sub: 'PF + Tax + Other',     color: 'oklch(0.65 0.22 25)'  },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl text-center"
                style={{ background: `${s.color.replace(')', ' / 0.06)')}`, border: `1px solid ${s.color.replace(')', ' / 0.15)')}` }}>
                <p className="text-[8.5px] uppercase tracking-widest font-bold mb-1" style={{ color: 'oklch(0.45 0.02 210)' }}>{s.label}</p>
                <p className="text-base font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>{s.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Month grid — 12 month tiles */}
          <div className="glass-panel overflow-hidden">
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Monthly Payslips — {viewYear}
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                Click any month to view detailed breakdown
              </p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-4">
              {MONTHS_FULL.map((mLabel, mi) => {
                const slip    = yearSlips.find(p => parseSlipDate(p).month === mi);
                const isFutur = viewYear === CURR_YEAR && mi > CURR_MONTH;
                const isCur   = viewYear === CURR_YEAR && mi === CURR_MONTH;
                const sb      = slip ? statusBadge(slip.status) : null;

                return (
                  <motion.button key={mLabel} whileHover={slip ? { scale: 1.04 } : {}}
                    onClick={() => slip && setViewMonth(mi)}
                    disabled={!slip}
                    className="p-3 rounded-xl text-left transition-all relative"
                    style={{
                      background: isCur
                        ? 'oklch(0.72 0.19 167 / 0.1)'
                        : slip ? 'oklch(1 0 0 / 4%)' : 'oklch(1 0 0 / 2%)',
                      border: isCur
                        ? '1px solid oklch(0.72 0.19 167 / 0.3)'
                        : slip ? '1px solid oklch(1 0 0 / 8%)' : '1px solid oklch(1 0 0 / 4%)',
                      opacity: isFutur ? 0.3 : 1,
                      cursor: slip ? 'pointer' : 'default',
                    }}>
                    {/* Month name */}
                    <p className="text-[10px] font-black uppercase tracking-wide mb-1"
                      style={{ color: isCur ? 'oklch(0.72 0.19 167)' : 'oklch(0.55 0.02 210)' }}>
                      {MONTHS_SHORT[mi]}
                      {isCur && <span className="ml-1 text-[7px] normal-case">●</span>}
                    </p>

                    {slip ? (
                      <>
                        <p className="text-sm font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {fmt(slip.netSalary)}
                        </p>
                        <p className="text-[8px] mt-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>net</p>
                        {/* Status dot */}
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                          style={{ background: sb?.cls.includes('green') ? 'oklch(0.72 0.19 167)' : sb?.cls.includes('amber') ? 'oklch(0.78 0.17 70)' : 'oklch(0.75 0.16 240)' }} />
                      </>
                    ) : isFutur ? (
                      <p className="text-[9px]" style={{ color: 'oklch(0.35 0.02 210)' }}>Future</p>
                    ) : (
                      <p className="text-[9px]" style={{ color: 'oklch(0.38 0.02 210)' }}>No data</p>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MONTH DETAIL VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMonth !== null && (
        <div className="space-y-4">
          {/* Month selector strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => setViewMonth(m => m !== null && m > 0 ? m - 1 : m)}
              disabled={viewMonth === 0}
              className="aq-btn-ghost !p-1.5 shrink-0"><ChevronLeft size={15} /></button>

            <div className="flex gap-1">
              {MONTHS_SHORT.map((m, mi) => {
                const slip = yearSlips.find(p => parseSlipDate(p).month === mi);
                const isFutur = viewYear === CURR_YEAR && mi > CURR_MONTH;
                return (
                  <button key={m} onClick={() => setViewMonth(mi)}
                    disabled={!slip}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all relative"
                    style={viewMonth === mi
                      ? { background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.4)' }
                      : slip ? { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }
                      : { color: 'oklch(0.3 0.02 210)', border: '1px solid transparent', opacity: isFutur ? 0.2 : 0.5 }}>
                    {m}
                    {slip && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full" style={{ background: 'oklch(0.72 0.19 167)' }} />}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setViewMonth(m => m !== null && m < 11 ? m + 1 : m)}
              disabled={viewMonth === 11}
              className="aq-btn-ghost !p-1.5 shrink-0"><ChevronRight size={15} /></button>
          </div>

          {monthSlip ? (
            (() => {
              const bd = breakdown(monthSlip);
              const sb = statusBadge(monthSlip.status);
              const StatusIcon = sb.icon;
              const dateStr = monthSlip.paidAt ?? monthSlip.approvedAt ?? monthSlip.createdAt;
              return (
                <div className="space-y-4">
                  {/* Payslip detail card */}
                  <div className="glass-panel overflow-hidden">
                    {/* Header strip */}
                    <div className="p-5 relative overflow-hidden"
                      style={{ background: 'oklch(0.72 0.19 167 / 0.06)', borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
                      <div className="absolute inset-0 pointer-events-none opacity-10"
                        style={{ background: 'radial-gradient(circle at 80% 50%, oklch(0.72 0.19 167), transparent 60%)' }} />
                      <div className="flex items-start justify-between relative">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: 'oklch(0.45 0.02 210)' }}>
                            Payslip — {MONTHS_FULL[viewMonth]} {viewYear}
                          </p>
                          <p className="text-3xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {fmt(monthSlip.netSalary)}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0.02 210)' }}>
                            Net salary · Gross: {fmt(monthSlip.grossSalary)} · Deductions: {fmt(monthSlip.deductions)}
                          </p>
                          {dateStr && (
                            <p className="text-[10px] mt-1" style={{ color: 'oklch(0.5 0.02 210)' }}>
                              {monthSlip.status === 'paid' ? 'Credited on' : 'Generated on'} {format(new Date(dateStr), 'dd MMM yyyy')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`aq-badge ${sb.cls} flex items-center gap-1`}>
                            <StatusIcon size={10} /> {sb.label}
                          </span>
                          {(monthSlip.status === 'paid' || monthSlip.status === 'approved') && (
                            <button onClick={() => handleDownload(monthSlip)}
                              className="aq-btn-ghost !text-xs !py-1.5 !px-3">
                              <Download size={13} /> Download PDF
                            </button>
                          )}
                          <button onClick={() => setDetail(monthSlip)}
                            className="aq-btn-primary !text-xs !py-1.5 !px-3">
                            <FileText size={13} /> Full Payslip
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Earnings + Deductions table */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x"
                      style={{ '--tw-divide-opacity': 1, borderColor: 'oklch(1 0 0 / 7%)' } as any}>

                      {/* Earnings */}
                      <div className="p-5">
                        <p className="text-[9px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5"
                          style={{ color: 'oklch(0.72 0.19 167)' }}>
                          <TrendingUp size={11} /> Earnings
                        </p>
                        <div className="space-y-2.5">
                          {bd.earnings.map(e => (
                            <div key={e.label} className="flex justify-between items-center">
                              <span className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>{e.label}</span>
                              <span className="text-xs font-bold text-white">{fmt(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-3 mt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
                          <span className="text-xs font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>Total Earnings</span>
                          <span className="text-sm font-black" style={{ color: 'oklch(0.72 0.19 167)' }}>{fmt(monthSlip.grossSalary)}</span>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div className="p-5">
                        <p className="text-[9px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5"
                          style={{ color: 'oklch(0.75 0.18 25)' }}>
                          <TrendingDown size={11} /> Deductions
                        </p>
                        <div className="space-y-2.5">
                          {bd.deductions.map(d => (
                            <div key={d.label} className="flex justify-between items-center">
                              <span className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>{d.label}</span>
                              <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(d.amount)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-3 mt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
                          <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>Total Deductions</span>
                          <span className="text-sm font-black" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(monthSlip.deductions)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net footer */}
                    <div className="px-5 py-4 flex items-center justify-between"
                      style={{ background: 'oklch(0.72 0.19 167 / 0.06)', borderTop: '1px solid oklch(1 0 0 / 7%)' }}>
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'oklch(0.55 0.02 210)' }}>NET TAKE-HOME</p>
                        <p className="text-[9px] mt-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          {MONTHS_FULL[viewMonth]} {viewYear} · {employee?.name ?? 'Employee'}
                        </p>
                      </div>
                      <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.72 0.19 167)' }}>
                        {fmt(monthSlip.netSalary)}
                      </p>
                    </div>
                  </div>

                  {/* Breakdown visual bars */}
                  <div className="glass-panel p-5">
                    <h3 className="text-xs font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Salary Composition
                    </h3>
                    {bd.earnings.map(e => {
                      const pct = monthSlip.grossSalary > 0 ? (e.amount / monthSlip.grossSalary) * 100 : 0;
                      return (
                        <div key={e.label} className="mb-3">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span style={{ color: 'oklch(0.6 0.02 210)' }}>{e.label}</span>
                            <span className="font-bold text-white">{fmt(e.amount)} <span style={{ color: 'oklch(0.45 0.02 210)' }}>({pct.toFixed(0)}%)</span></span>
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: 'oklch(1 0 0 / 6%)' }}>
                            <motion.div className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                          </div>
                        </div>
                      );
                    })}
                    {bd.deductions.map(d => {
                      const pct = monthSlip.grossSalary > 0 ? (d.amount / monthSlip.grossSalary) * 100 : 0;
                      return (
                        <div key={d.label} className="mb-3">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span style={{ color: 'oklch(0.6 0.02 210)' }}>{d.label}</span>
                            <span className="font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(d.amount)} <span style={{ color: 'oklch(0.45 0.02 210)' }}>({pct.toFixed(0)}%)</span></span>
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: 'oklch(1 0 0 / 6%)' }}>
                            <motion.div className="h-full rounded-full"
                              style={{ background: 'oklch(0.65 0.22 25)' }}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="glass-panel py-16 text-center">
              <FileText size={36} className="mx-auto mb-3" style={{ color: 'oklch(0.3 0.02 210)' }} />
              <p className="text-sm font-bold text-white mb-1">No payslip for {MONTHS_FULL[viewMonth]} {viewYear}</p>
              <p className="text-xs" style={{ color: 'oklch(0.45 0.02 210)' }}>Payroll hasn't been processed for this month yet</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FULL PAYSLIP MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {detail && (() => {
          const bd = breakdown(detail);
          const sb = statusBadge(detail.status);
          const StatusIcon = sb.icon;
          const dateStr = detail.paidAt ?? detail.approvedAt ?? detail.createdAt;
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
              onClick={() => setDetail(null)}>
              <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                className="w-full max-w-lg glass-panel overflow-hidden max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>

                {/* Payslip header */}
                <div className="p-6 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167 / 0.12), oklch(0.6 0.16 187 / 0.08))', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
                          <FileText size={14} style={{ color: 'oklch(0.08 0.015 200)' }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">AquaGrow Technologies Pvt. Ltd.</p>
                          <p className="text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>Nellore, Andhra Pradesh</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setDetail(null)} className="p-1.5 rounded-xl hover:bg-white/10" style={{ color: 'oklch(0.5 0.02 210)' }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>PAYSLIP</p>
                      <p className="text-lg font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {slipLabel(detail)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                        Employee: <strong className="text-white">{employee?.name ?? detail.employeeName ?? '—'}</strong>
                      </p>
                      {dateStr && (
                        <p className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>
                          {detail.status === 'paid' ? 'Credited:' : 'Generated:'} <strong className="text-white">{format(new Date(dateStr), 'dd MMM yyyy')}</strong>
                        </p>
                      )}
                    </div>
                    <span className={`aq-badge ${sb.cls} flex items-center gap-1`}>
                      <StatusIcon size={10} /> {sb.label}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="p-6 space-y-4">
                  {/* Earnings */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-3" style={{ color: 'oklch(0.72 0.19 167)' }}>Earnings</p>
                    <div className="space-y-2">
                      {bd.earnings.map(e => (
                        <div key={e.label} className="flex justify-between items-center py-1.5 px-3 rounded-lg"
                          style={{ background: 'oklch(0.72 0.19 167 / 0.05)' }}>
                          <span className="text-xs" style={{ color: 'oklch(0.65 0.02 210)' }}>{e.label}</span>
                          <span className="text-xs font-bold text-white">{fmt(e.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                        <span className="text-xs font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>Gross Earnings</span>
                        <span className="text-sm font-black" style={{ color: 'oklch(0.72 0.19 167)' }}>{fmt(detail.grossSalary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-3" style={{ color: 'oklch(0.75 0.18 25)' }}>Deductions</p>
                    <div className="space-y-2">
                      {bd.deductions.map(d => (
                        <div key={d.label} className="flex justify-between items-center py-1.5 px-3 rounded-lg"
                          style={{ background: 'oklch(0.65 0.22 25 / 0.05)' }}>
                          <span className="text-xs" style={{ color: 'oklch(0.65 0.02 210)' }}>{d.label}</span>
                          <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(d.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                        <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>Total Deductions</span>
                        <span className="text-sm font-black" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(detail.deductions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net */}
                  <div className="p-4 rounded-xl"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '2px solid oklch(0.72 0.19 167 / 0.25)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white">NET PAY</p>
                        <p className="text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>Gross – Deductions</p>
                      </div>
                      <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.72 0.19 167)' }}>
                        {fmt(detail.netSalary)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setDetail(null)} className="aq-btn-ghost flex-1 justify-center">Close</button>
                    <button onClick={() => handleDownload(detail)} className="aq-btn-primary flex-1 justify-center">
                      <Download size={14} /> Download PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default Payslips;
