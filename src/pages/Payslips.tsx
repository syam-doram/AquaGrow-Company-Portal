import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, TrendingUp, TrendingDown, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, Banknote, Wallet, Shield, Zap,
  X, Download, CheckCircle, Clock, User, Building2, Calendar,
  BarChart2, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, getMonth, getYear, getYear as dfnsGetYear } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import hrmsApi from '../api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Payslip {
  _id: string;
  month: string;
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
const CURR_MONTH   = new Date().getMonth();

// ── Helpers ────────────────────────────────────────────────────────────────────
const parseSlipDate = (slip: Payslip): { month: number; year: number } => {
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
  if (/^\d{4}-\d{2}$/.test(slip.month ?? '')) {
    const [y, m] = slip.month.split('-').map(Number);
    return { month: m - 1, year: y };
  }
  if (slip.createdAt) {
    const d = new Date(slip.createdAt);
    return { month: d.getMonth(), year: d.getFullYear() };
  }
  return { month: CURR_MONTH, year: slip.year ?? CURR_YEAR };
};

const isPaid = (slip: Payslip) =>
  slip.status === 'paid' || slip.status === 'approved';

const statusBadge = (status: string) => {
  if (status === 'paid')             return { cls: 'aq-badge-green', label: 'Paid',      icon: CheckCircle };
  if (status === 'approved')         return { cls: 'aq-badge-blue',  label: 'Approved',  icon: CheckCircle };
  if (status === 'pending_approval') return { cls: 'aq-badge-amber', label: 'Pending',   icon: Clock       };
  return { cls: 'aq-badge-blue', label: status?.replace('_',' ') ?? 'Draft', icon: Clock };
};

const fmt  = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
const fmt2 = (n: number) => (n ?? 0).toLocaleString('en-IN');

// ── PDF generator (uses browser print dialog on a hidden iframe) ───────────────
const generatePayslipPDF = (slip: Payslip, employee: any) => {
  const { month: mi, year } = parseSlipDate(slip);
  const monthLabel = `${MONTHS_FULL[mi]} ${year}`;
  const g = slip.grossSalary ?? 0;
  const d = slip.deductions  ?? 0;
  const basic  = slip.basic      ?? Math.round(g * 0.50);
  const hra    = slip.hra        ?? Math.round(g * 0.20);
  const allow  = slip.allowances ?? Math.round(g * 0.15);
  const bonus  = slip.bonus      ?? 0;
  const specl  = Math.max(0, g - basic - hra - allow - bonus);
  const pf     = slip.pfDeduction  ?? Math.round(d * 0.60);
  const tax    = slip.taxDeduction ?? Math.round(d * 0.30);
  const other  = Math.max(0, d - pf - tax);
  const dateStr = slip.paidAt ?? slip.approvedAt ?? slip.createdAt;
  const creditedOn = dateStr ? format(new Date(dateStr), 'dd MMMM yyyy') : '—';
  const empName = employee?.name ?? slip.employeeName ?? '—';
  const empId   = employee?.empId ?? '—';
  const dept    = employee?.department ?? '—';
  const desg    = (employee as any)?.designation ?? '—';
  const joiningDate = employee?.joiningDate ? format(new Date(employee.joiningDate), 'dd MMM yyyy') : '—';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Payslip — ${monthLabel} — ${empName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }
    .page { max-width: 720px; margin: 0 auto; padding: 36px; }
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 18px; border-bottom: 3px solid #0d9488; margin-bottom: 20px; }
    .logo-block h1 { font-size: 18px; font-weight: 800; color: #0d9488; }
    .logo-block p  { font-size: 10px; color: #64748b; margin-top: 2px; }
    .slip-label { text-align: right; }
    .slip-label h2 { font-size: 20px; font-weight: 800; color: #1e293b; }
    .slip-label p  { font-size: 10px; color: #64748b; }
    /* Employee info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #e2e8f0; }
    .info-row:last-child { border: none; }
    .info-row .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-row .value { font-weight: 600; color: #1e293b; font-size: 11px; }
    /* Tables */
    .tables { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .table-section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 8px; padding: 6px 10px; border-radius: 4px; }
    .earnings h3  { color: #0d9488; background: #f0fdfa; }
    .deductions h3 { color: #dc2626; background: #fef2f2; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 5px 8px; font-size: 11px; }
    tr:nth-child(even) { background: #f8fafc; }
    .td-label { color: #475569; }
    .td-amt   { text-align: right; font-weight: 600; }
    .td-amt.credit { color: #0d9488; }
    .td-amt.debit  { color: #dc2626; }
    .total-row td { border-top: 2px solid #e2e8f0; font-weight: 700; padding-top: 8px; }
    /* Net pay */
    .net-pay { border: 2px solid #0d9488; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; background: #f0fdfa; margin-bottom: 20px; }
    .net-label h3  { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #0d9488; }
    .net-label p   { font-size: 9px; color: #64748b; margin-top: 2px; }
    .net-amount    { font-size: 26px; font-weight: 900; color: #0d9488; }
    /* Footer */
    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
    .stamp  { border: 2px solid #0d9488; border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8px; color: #0d9488; font-weight: 700; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="logo-block">
      <h1>AquaGrow Technologies Pvt. Ltd.</h1>
      <p>Nellore, Andhra Pradesh · GSTIN: 37AABCA1234F1Z5</p>
      <p>Email: hr@aquagrow.com · Tel: +91-99999-00001</p>
    </div>
    <div class="slip-label">
      <h2>PAYSLIP</h2>
      <p>${monthLabel}</p>
      <p style="margin-top:4px; color:#0d9488; font-weight:600">Credited: ${creditedOn}</p>
    </div>
  </div>

  <!-- Employee Info -->
  <div class="info-grid">
    <div class="info-row"><span class="label">Employee Name</span><span class="value">${empName}</span></div>
    <div class="info-row"><span class="label">Employee ID</span><span class="value">${empId}</span></div>
    <div class="info-row"><span class="label">Department</span><span class="value">${dept}</span></div>
    <div class="info-row"><span class="label">Designation</span><span class="value">${desg}</span></div>
    <div class="info-row"><span class="label">Date of Joining</span><span class="value">${joiningDate}</span></div>
    <div class="info-row"><span class="label">Pay Period</span><span class="value">${monthLabel}</span></div>
  </div>

  <!-- Earnings + Deductions -->
  <div class="tables">
    <div class="table-section earnings">
      <h3>Earnings</h3>
      <table>
        <tr><td class="td-label">Basic Pay</td><td class="td-amt credit">₹${fmt2(basic)}</td></tr>
        <tr><td class="td-label">HRA</td><td class="td-amt credit">₹${fmt2(hra)}</td></tr>
        <tr><td class="td-label">Allowances</td><td class="td-amt credit">₹${fmt2(allow)}</td></tr>
        ${bonus > 0 ? `<tr><td class="td-label">Bonus / Incentive</td><td class="td-amt credit">₹${fmt2(bonus)}</td></tr>` : ''}
        ${specl > 0 ? `<tr><td class="td-label">Special Allowance</td><td class="td-amt credit">₹${fmt2(specl)}</td></tr>` : ''}
        <tr class="total-row"><td class="td-label" style="font-weight:700">Gross Earnings</td><td class="td-amt credit" style="font-size:13px">₹${fmt2(g)}</td></tr>
      </table>
    </div>
    <div class="table-section deductions">
      <h3>Deductions</h3>
      <table>
        <tr><td class="td-label">Provident Fund (12%)</td><td class="td-amt debit">−₹${fmt2(pf)}</td></tr>
        <tr><td class="td-label">TDS / Income Tax</td><td class="td-amt debit">−₹${fmt2(tax)}</td></tr>
        ${other > 0 ? `<tr><td class="td-label">Other Deductions</td><td class="td-amt debit">−₹${fmt2(other)}</td></tr>` : ''}
        <tr class="total-row"><td class="td-label" style="font-weight:700">Total Deductions</td><td class="td-amt debit" style="font-size:13px">−₹${fmt2(d)}</td></tr>
      </table>
    </div>
  </div>

  <!-- Net Pay -->
  <div class="net-pay">
    <div class="net-label">
      <h3>NET PAY</h3>
      <p>Gross Earnings − Total Deductions</p>
      <p>₹${fmt2(g)} − ₹${fmt2(d)}</p>
    </div>
    <div class="net-amount">₹${fmt2(slip.netSalary)}</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <p><strong>AquaGrow Technologies Pvt. Ltd.</strong></p>
      <p>This is a computer-generated payslip and does not require a physical signature.</p>
      <p>Generated on ${format(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
    </div>
    <div class="stamp">PAID<br/>${MONTHS_SHORT[mi]}<br/>${year}</div>
  </div>
</div>
</body>
</html>`;

  // Open in new window and trigger print
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) { toast.error('Pop-up blocked. Please allow pop-ups for this site.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
};

// ── Chart tooltip ──────────────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="glass-panel px-3 py-2 text-xs shadow-xl">
    <p className="font-bold text-white mb-1">{label}</p>
    {payload.map((p: any) => (
      <p key={p.name} className="font-semibold" style={{ color: p.fill ?? p.stroke }}>
        {p.name === 'net' ? 'Net' : p.name === 'gross' ? 'Gross' : 'Deduct'}: ₹{Number(p.value).toLocaleString('en-IN')}
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

  // Joining year — derived from employee profile
  const joiningYear = useMemo(() => {
    if (!employee?.joiningDate) return CURR_YEAR;
    const y = new Date(employee.joiningDate).getFullYear();
    return isNaN(y) ? CURR_YEAR : y;
  }, [employee?.joiningDate]);

  // Year range: joining year → current year
  const yearRange = useMemo(() => {
    const yrs: number[] = [];
    for (let y = CURR_YEAR; y >= joiningYear; y--) yrs.push(y);
    return yrs;
  }, [joiningYear]);

  const [viewYear, setViewYear]   = useState<number>(CURR_YEAR);
  const [viewMonth, setViewMonth] = useState<number | null>(null);
  const [detail, setDetail]       = useState<Payslip | null>(null);
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
  // Payslips for selected year — ONLY paid/approved
  const yearSlips = useMemo(() =>
    payslips
      .filter(p => parseSlipDate(p).year === viewYear && isPaid(p))
      .sort((a, b) => parseSlipDate(b).month - parseSlipDate(a).month),
    [payslips, viewYear]);

  // Payslip for selected month
  const monthSlip = useMemo(() =>
    viewMonth !== null ? yearSlips.find(p => parseSlipDate(p).month === viewMonth) ?? null : null,
    [yearSlips, viewMonth]);

  // Yearly aggregates
  const yearTotal  = useMemo(() => yearSlips.reduce((s, p) => s + (p.netSalary   ?? 0), 0), [yearSlips]);
  const yearGross  = useMemo(() => yearSlips.reduce((s, p) => s + (p.grossSalary  ?? 0), 0), [yearSlips]);
  const yearDeduct = useMemo(() => yearSlips.reduce((s, p) => s + (p.deductions   ?? 0), 0), [yearSlips]);
  const avgNet     = yearSlips.length ? Math.round(yearTotal / yearSlips.length) : 0;

  // Latest payslip overall (for hero card)
  const latest = useMemo(() =>
    [...payslips]
      .filter(isPaid)
      .sort((a, b) => {
        const da = parseSlipDate(a), db = parseSlipDate(b);
        return db.year !== da.year ? db.year - da.year : db.month - da.month;
      })[0] ?? null,
    [payslips]);

  // Chart data
  const chartData = useMemo(() => MONTHS_SHORT.map((label, mi) => {
    const slip = yearSlips.find(p => parseSlipDate(p).month === mi);
    return { label, gross: slip?.grossSalary ?? 0, net: slip?.netSalary ?? 0, deduct: slip?.deductions ?? 0 };
  }), [yearSlips]);

  // Breakdown from a payslip
  const breakdown = (slip: Payslip) => {
    const g = slip.grossSalary ?? 0;
    const d = slip.deductions  ?? 0;
    const basic  = slip.basic      ?? Math.round(g * 0.50);
    const hra    = slip.hra        ?? Math.round(g * 0.20);
    const allow  = slip.allowances ?? Math.round(g * 0.15);
    const bonus  = slip.bonus      ?? 0;
    const specl  = Math.max(0, g - basic - hra - allow - bonus);
    const pf     = slip.pfDeduction  ?? Math.round(d * 0.60);
    const tax    = slip.taxDeduction ?? Math.round(d * 0.30);
    const other  = Math.max(0, d - pf - tax);
    return {
      earnings: [
        { label: 'Basic Pay',          amount: basic },
        { label: 'HRA',                amount: hra   },
        { label: 'Allowances',         amount: allow },
        ...(bonus > 0 ? [{ label: 'Bonus / Incentive', amount: bonus }] : []),
        ...(specl > 0 ? [{ label: 'Special Allowance', amount: specl }] : []),
      ],
      deductions: [
        { label: 'Provident Fund (12%)', amount: pf  },
        { label: 'TDS / Income Tax',     amount: tax },
        ...(other > 0 ? [{ label: 'Other Deductions', amount: other }] : []),
      ],
    };
  };

  const nextPayDate = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'MMM dd, yyyy');

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
  const empDesignation = (employee as any)?.designation;

  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Payslips & Salary
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            Only paid/approved payslips shown · PDF available for each month
          </p>
        </div>
        <button onClick={load} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Employee ID Card ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle at 90% 50%, oklch(0.72 0.19 167), transparent 55%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
            {employee?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {employee?.name ?? '—'}
              </h2>
              <span className="aq-badge aq-badge-green">{employee?.role?.replace('_',' ')}</span>
            </div>
            <div className="flex gap-4 flex-wrap mt-1">
              {[
                { icon: User,      val: employee?.empId ?? '—' },
                { icon: Building2, val: `${employee?.department ?? '—'}${empDesignation ? ` · ${empDesignation}` : ''}` },
                { icon: Calendar,  val: employee?.joiningDate ? `Joined: ${format(new Date(employee.joiningDate), 'MMM dd, yyyy')}` : '—' },
              ].map(({ icon: Icon, val }, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: 'oklch(0.55 0.02 210)' }}>
                  <Icon size={11} style={{ color: 'oklch(0.45 0.02 210)' }} />
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Current salary */}
          <div className="text-right shrink-0">
            <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>Net Monthly</p>
            <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.72 0.19 167)' }}>
              {fmt(latest?.netSalary ?? employee?.salary ?? 0)}
            </p>
            <p className="text-[9px]" style={{ color: 'oklch(0.45 0.02 210)' }}>Next: {nextPayDate}</p>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Strip ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: `${viewYear} Total Earned`, value: fmt(yearTotal),  sub: `${yearSlips.length} months paid`,  color: 'oklch(0.72 0.19 167)', icon: Banknote },
          { label: `${viewYear} Gross`,        value: fmt(yearGross),  sub: 'Before deductions',                color: 'oklch(0.75 0.16 240)', icon: Wallet  },
          { label: `${viewYear} Deductions`,   value: fmt(yearDeduct), sub: 'PF + TDS + Other',                 color: 'oklch(0.75 0.18 25)',  icon: Shield  },
          { label: 'Monthly Avg Net',          value: fmt(avgNet),     sub: `Over ${yearSlips.length} months`,  color: 'oklch(0.78 0.17 70)',  icon: Zap     },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }} className="aq-stat-card !p-4 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-8"
                style={{ background: `radial-gradient(circle at 80% 10%, ${k.color}, transparent 65%)` }} />
              <div className="flex items-start justify-between mb-2">
                <p className="text-[8.5px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>{k.label}</p>
                <div className="p-1.5 rounded-lg" style={{ background: `${k.color.replace(')', ' / 0.12)')}` }}>
                  <Icon size={12} style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-lg font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: k.color }}>{k.value}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>{k.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Year Selector (joining year → now) ──────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[10px] font-bold" style={{ color: 'oklch(0.5 0.02 210)' }}>
          Since {joiningYear}:
        </p>
        {yearRange.map(y => (
          <button key={y} onClick={() => { setViewYear(y); setViewMonth(null); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={viewYear === y
              ? { background: 'oklch(0.72 0.19 167 / 0.18)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.35)' }
              : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {y}
            {y === CURR_YEAR && <span className="ml-1 text-[8px] opacity-70">●</span>}
          </button>
        ))}
        {viewMonth !== null && (
          <button onClick={() => setViewMonth(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'oklch(0.75 0.16 240 / 0.1)', color: 'oklch(0.75 0.16 240)', border: '1px solid oklch(0.75 0.16 240 / 0.2)' }}>
            <X size={11} /> Back to {viewYear}
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          YEAR OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMonth === null && (
        <div className="space-y-4">

          {/* Salary trend chart */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Salary Trend — {viewYear}
                </h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                  Monthly gross · net · deductions
                </p>
              </div>
              <div className="flex gap-1">
                {(['bar','line'] as const).map(t => (
                  <button key={t} onClick={() => setChartType(t)}
                    className="p-2 rounded-lg transition-all"
                    style={chartType === t
                      ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)' }
                      : { color: 'oklch(0.4 0.02 210)' }}>
                    {t === 'bar' ? <BarChart2 size={14} /> : <TrendingUp size={14} />}
                  </button>
                ))}
              </div>
            </div>

            {yearSlips.length === 0 ? (
              <div className="h-[160px] flex items-center justify-center">
                <div className="text-center">
                  <FileText size={32} className="mx-auto mb-2" style={{ color: 'oklch(0.3 0.02 210)' }} />
                  <p className="text-xs" style={{ color: 'oklch(0.4 0.02 210)' }}>No paid payslips for {viewYear}</p>
                </div>
              </div>
            ) : (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} barSize={12} barGap={2}>
                      <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 9 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                      <Tooltip content={<BarTip />} cursor={{ fill: 'oklch(1 0 0 / 4%)' }} />
                      <Bar dataKey="gross"  name="gross"  fill="oklch(0.75 0.16 240 / 0.5)" radius={[4,4,0,0]} />
                      <Bar dataKey="net"    name="net"    fill="oklch(0.72 0.19 167)"         radius={[4,4,0,0]} />
                      <Bar dataKey="deduct" name="deduct" fill="oklch(0.65 0.22 25 / 0.55)"  radius={[4,4,0,0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 9 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                      <Tooltip content={<BarTip />} />
                      <Line type="monotone" dataKey="gross"  stroke="oklch(0.75 0.16 240)" strokeWidth={2}   dot={{ fill: 'oklch(0.75 0.16 240)', r: 3 }} name="gross" />
                      <Line type="monotone" dataKey="net"    stroke="oklch(0.72 0.19 167)" strokeWidth={2.5} dot={{ fill: 'oklch(0.72 0.19 167)', r: 4 }} name="net" />
                      <Line type="monotone" dataKey="deduct" stroke="oklch(0.65 0.22 25)"  strokeWidth={1.5} dot={{ fill: 'oklch(0.65 0.22 25)', r: 3 }} strokeDasharray="4 2" name="deduct" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex gap-5 mt-3 pt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
              {[{ color: 'oklch(0.75 0.16 240)', label: 'Gross' }, { color: 'oklch(0.72 0.19 167)', label: 'Net' }, { color: 'oklch(0.65 0.22 25)', label: 'Deductions' }]
                .map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-1.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>{l.label}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* 12-month grid — ONLY months with a paid payslip are clickable */}
          <div className="glass-panel overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Monthly Payslips — {viewYear}
                </h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                  {yearSlips.length} payslip{yearSlips.length !== 1 ? 's' : ''} available · Click to view & download PDF
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 p-4">
              {MONTHS_FULL.map((mLabel, mi) => {
                const slip    = yearSlips.find(p => parseSlipDate(p).month === mi);
                const isFutur = viewYear === CURR_YEAR && mi > CURR_MONTH;
                const isCur   = viewYear === CURR_YEAR && mi === CURR_MONTH;
                // Don't show months before joining year's month if it's the joining year
                const joinMonth = employee?.joiningDate ? new Date(employee.joiningDate).getMonth() : 0;
                const joinYr    = employee?.joiningDate ? new Date(employee.joiningDate).getFullYear() : joiningYear;
                const beforeJoin = viewYear === joinYr && mi < joinMonth;

                return (
                  <motion.button key={mLabel}
                    whileHover={slip ? { scale: 1.05, y: -2 } : {}}
                    onClick={() => slip && setViewMonth(mi)}
                    disabled={!slip}
                    className="p-3 rounded-xl text-left transition-all relative"
                    style={{
                      background: slip
                        ? isCur ? 'oklch(0.72 0.19 167 / 0.12)' : 'oklch(1 0 0 / 5%)'
                        : 'oklch(1 0 0 / 2%)',
                      border: isCur && slip
                        ? '1px solid oklch(0.72 0.19 167 / 0.4)'
                        : slip ? '1px solid oklch(1 0 0 / 10%)' : '1px solid oklch(1 0 0 / 4%)',
                      opacity: isFutur || beforeJoin ? 0.2 : 1,
                      cursor: slip ? 'pointer' : 'not-allowed',
                    }}>

                    <p className="text-[10px] font-black uppercase tracking-wide mb-1"
                      style={{ color: isCur && slip ? 'oklch(0.72 0.19 167)' : 'oklch(0.5 0.02 210)' }}>
                      {MONTHS_SHORT[mi]}
                    </p>

                    {slip ? (
                      <>
                        <p className="text-sm font-black text-white leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {fmt(slip.netSalary)}
                        </p>
                        <p className="text-[8px] mt-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>net</p>
                        {/* PDF indicator */}
                        <div className="flex items-center gap-0.5 mt-1.5">
                          <FileText size={9} style={{ color: 'oklch(0.72 0.19 167)' }} />
                          <span className="text-[7px] font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>PDF</span>
                        </div>
                        {/* Status dot */}
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                          style={{ background: slip.status === 'paid' ? 'oklch(0.72 0.19 167)' : 'oklch(0.75 0.16 240)' }} />
                      </>
                    ) : isFutur ? (
                      <p className="text-[8px]" style={{ color: 'oklch(0.3 0.02 210)' }}>Future</p>
                    ) : beforeJoin ? (
                      <p className="text-[8px]" style={{ color: 'oklch(0.3 0.02 210)' }}>—</p>
                    ) : (
                      <p className="text-[8px]" style={{ color: 'oklch(0.35 0.02 210)' }}>No payslip</p>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {yearSlips.length === 0 && (
              <div className="py-10 text-center pb-6">
                <FileText size={32} className="mx-auto mb-2" style={{ color: 'oklch(0.28 0.02 210)' }} />
                <p className="text-sm font-bold text-white mb-1">No payslips for {viewYear}</p>
                <p className="text-xs" style={{ color: 'oklch(0.4 0.02 210)' }}>Payroll must be processed and approved by Finance</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MONTH DETAIL
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMonth !== null && (
        <div className="space-y-4">
          {/* Month strip nav */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => setViewMonth(m => m !== null && m > 0 ? m - 1 : m)}
              disabled={viewMonth === 0} className="aq-btn-ghost !p-1.5 shrink-0"><ChevronLeft size={15} /></button>
            <div className="flex gap-1">
              {MONTHS_SHORT.map((m, mi) => {
                const slip = yearSlips.find(p => parseSlipDate(p).month === mi);
                return (
                  <button key={m} onClick={() => slip && setViewMonth(mi)} disabled={!slip}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all relative"
                    style={viewMonth === mi
                      ? { background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.4)' }
                      : slip ? { background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }
                      : { color: 'oklch(0.28 0.02 210)', border: '1px solid transparent', cursor: 'not-allowed', opacity: 0.4 }}>
                    {m}
                    {slip && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.19_167)]" />}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setViewMonth(m => m !== null && m < 11 ? m + 1 : m)}
              disabled={viewMonth === 11} className="aq-btn-ghost !p-1.5 shrink-0"><ChevronRight size={15} /></button>
          </div>

          {monthSlip ? (() => {
            const bd = breakdown(monthSlip);
            const sb = statusBadge(monthSlip.status);
            const StatusIcon = sb.icon;
            const dateStr = monthSlip.paidAt ?? monthSlip.approvedAt ?? monthSlip.createdAt;
            return (
              <div className="space-y-4">
                {/* Main payslip card */}
                <div className="glass-panel overflow-hidden">
                  {/* Header strip */}
                  <div className="p-5 relative overflow-hidden"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.07)', borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
                    <div className="absolute inset-0 pointer-events-none opacity-10"
                      style={{ background: 'radial-gradient(circle at 85% 50%, oklch(0.72 0.19 167), transparent 55%)' }} />
                    <div className="flex items-start justify-between relative">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          Payslip — {MONTHS_FULL[viewMonth]} {viewYear}
                        </p>
                        <p className="text-3xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {fmt(monthSlip.netSalary)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0.02 210)' }}>
                          Gross: {fmt(monthSlip.grossSalary)} · Deductions: −{fmt(monthSlip.deductions)}
                        </p>
                        {dateStr && (
                          <p className="text-[10px] mt-1" style={{ color: 'oklch(0.5 0.02 210)' }}>
                            Credited on: <strong className="text-white">{format(new Date(dateStr), 'dd MMMM yyyy')}</strong>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`aq-badge ${sb.cls} flex items-center gap-1`}>
                          <StatusIcon size={10} /> {sb.label}
                        </span>
                        {/* PDF download */}
                        <button
                          onClick={() => generatePayslipPDF(monthSlip, employee)}
                          className="aq-btn-primary !text-xs !py-2 !px-4 flex items-center gap-2">
                          <Download size={13} /> Download PDF
                        </button>
                        <button onClick={() => setDetail(monthSlip)}
                          className="aq-btn-ghost !text-xs !py-2 !px-4 flex items-center gap-2">
                          <FileText size={13} /> View Full Slip
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Earnings + Deductions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
                    {/* Earnings */}
                    <div className="p-5">
                      <p className="text-[9px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5" style={{ color: 'oklch(0.72 0.19 167)' }}>
                        <TrendingUp size={11} /> Earnings
                      </p>
                      {bd.earnings.map(e => (
                        <div key={e.label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
                          <span className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>{e.label}</span>
                          <span className="text-xs font-bold text-white">{fmt(e.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 mt-1">
                        <span className="text-xs font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>Gross Earnings</span>
                        <span className="text-sm font-black" style={{ color: 'oklch(0.72 0.19 167)' }}>{fmt(monthSlip.grossSalary)}</span>
                      </div>
                    </div>
                    {/* Deductions */}
                    <div className="p-5">
                      <p className="text-[9px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5" style={{ color: 'oklch(0.75 0.18 25)' }}>
                        <TrendingDown size={11} /> Deductions
                      </p>
                      {bd.deductions.map(d => (
                        <div key={d.label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
                          <span className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>{d.label}</span>
                          <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(d.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 mt-1">
                        <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>Total Deductions</span>
                        <span className="text-sm font-black" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(monthSlip.deductions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net footer */}
                  <div className="px-5 py-4 flex items-center justify-between"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.06)', borderTop: '1px solid oklch(1 0 0 / 7%)' }}>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'oklch(0.5 0.02 210)' }}>NET TAKE-HOME</p>
                      <p className="text-[9px] mt-0.5" style={{ color: 'oklch(0.42 0.02 210)' }}>
                        {employee?.name} · {MONTHS_FULL[viewMonth]} {viewYear}
                      </p>
                    </div>
                    <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.72 0.19 167)' }}>
                      {fmt(monthSlip.netSalary)}
                    </p>
                  </div>
                </div>

                {/* Composition bars */}
                <div className="glass-panel p-5">
                  <h3 className="text-xs font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Salary Composition
                  </h3>
                  {[...bd.earnings, ...bd.deductions.map(d => ({ ...d, debit: true }))].map((item: any) => {
                    const pct = monthSlip.grossSalary > 0 ? (item.amount / monthSlip.grossSalary) * 100 : 0;
                    return (
                      <div key={item.label} className="mb-3">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span style={{ color: 'oklch(0.6 0.02 210)' }}>{item.label}</span>
                          <span className="font-bold" style={{ color: item.debit ? 'oklch(0.75 0.18 25)' : 'white' }}>
                            {item.debit ? '−' : '+'}{fmt(item.amount)}
                            <span style={{ color: 'oklch(0.45 0.02 210)' }}> ({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'oklch(1 0 0 / 6%)' }}>
                          <motion.div className="h-full rounded-full"
                            style={{ background: item.debit ? 'oklch(0.65 0.22 25)' : 'linear-gradient(90deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.85, ease: 'easeOut' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="glass-panel py-14 text-center">
              <FileText size={34} className="mx-auto mb-3" style={{ color: 'oklch(0.28 0.02 210)' }} />
              <p className="text-sm font-bold text-white mb-1">No payslip for {MONTHS_FULL[viewMonth]} {viewYear}</p>
              <p className="text-xs" style={{ color: 'oklch(0.42 0.02 210)' }}>
                Only paid/approved payslips are shown. Payroll must be processed by Finance.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FULL PAYSLIP MODAL (printable view)
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {detail && (() => {
          const bd = breakdown(detail);
          const sb = statusBadge(detail.status);
          const StatusIcon = sb.icon;
          const dateStr = detail.paidAt ?? detail.approvedAt ?? detail.createdAt;
          const { month: dmi, year: dyr } = parseSlipDate(detail);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 backdrop-blur-sm p-4"
              onClick={() => setDetail(null)}>
              <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                className="w-full max-w-lg glass-panel overflow-hidden max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>

                {/* Modal header */}
                <div className="p-5 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167 / 0.12), oklch(0.6 0.16 187 / 0.07))', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
                        <FileText size={15} style={{ color: 'oklch(0.08 0.015 200)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">AquaGrow Technologies Pvt. Ltd.</p>
                        <p className="text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>Nellore, Andhra Pradesh</p>
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
                        {MONTHS_FULL[dmi]} {dyr}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>
                        <span>{employee?.name ?? '—'}</span>
                        <span>·</span>
                        <span>{employee?.empId ?? '—'}</span>
                        {dateStr && <><span>·</span><span>Credited {format(new Date(dateStr), 'dd MMM yyyy')}</span></>}
                      </div>
                    </div>
                    <span className={`aq-badge ${sb.cls} flex items-center gap-1`}>
                      <StatusIcon size={10} /> {sb.label}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Earnings */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'oklch(0.72 0.19 167)' }}>Earnings</p>
                    {bd.earnings.map(e => (
                      <div key={e.label} className="flex justify-between items-center py-2 px-3 rounded-lg mb-1"
                        style={{ background: 'oklch(0.72 0.19 167 / 0.05)' }}>
                        <span className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>{e.label}</span>
                        <span className="text-xs font-bold text-white">{fmt(e.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 mt-1" style={{ borderTop: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                      <span className="text-xs font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>Gross Earnings</span>
                      <span className="text-sm font-black" style={{ color: 'oklch(0.72 0.19 167)' }}>{fmt(detail.grossSalary)}</span>
                    </div>
                  </div>
                  {/* Deductions */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'oklch(0.75 0.18 25)' }}>Deductions</p>
                    {bd.deductions.map(d => (
                      <div key={d.label} className="flex justify-between items-center py-2 px-3 rounded-lg mb-1"
                        style={{ background: 'oklch(0.65 0.22 25 / 0.05)' }}>
                        <span className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>{d.label}</span>
                        <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(d.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 mt-1" style={{ borderTop: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                      <span className="text-xs font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>Total Deductions</span>
                      <span className="text-sm font-black" style={{ color: 'oklch(0.75 0.18 25)' }}>−{fmt(detail.deductions)}</span>
                    </div>
                  </div>
                  {/* Net */}
                  <div className="p-4 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.1)', border: '2px solid oklch(0.72 0.19 167 / 0.3)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white">NET PAY</p>
                        <p className="text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>Gross − Deductions</p>
                      </div>
                      <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.72 0.19 167)' }}>
                        {fmt(detail.netSalary)}
                      </p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button onClick={() => setDetail(null)} className="aq-btn-ghost flex-1 justify-center">Close</button>
                    <button onClick={() => generatePayslipPDF(detail, employee)} className="aq-btn-primary flex-1 justify-center">
                      <Printer size={14} /> Print / Save PDF
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
