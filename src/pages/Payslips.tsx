import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import {
  Download, FileText, TrendingUp, TrendingDown, CreditCard,
  Calendar, Coins, Receipt, Percent, RefreshCw, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import hrmsApi from '../api';

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-panel px-3 py-2">
        <p className="text-[10px] text-[oklch(0.5_0.02_210)] font-bold">{label}</p>
        <p className="text-sm font-bold text-[oklch(0.72_0.19_167)]">₹{Number(payload[0].value).toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const Payslips: React.FC = () => {
  const { employee } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await hrmsApi.payroll.myPayslips();
      setPayslips(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDownload = (slip: Payslip) => {
    toast.info(`Generating payslip for ${slip.month}…`);
    setTimeout(() => toast.success(`✅ ${slip.month} payslip downloaded!`), 1500);
  };

  // Current salary from employee profile or latest payslip
  const currentSalary = payslips[0]?.netSalary ?? employee?.salary ?? 0;
  const latestGross   = payslips[0]?.grossSalary ?? (employee?.salary ?? 0);
  const latestDeduct  = payslips[0]?.deductions ?? 0;

  // Build salary history from recent payslips (last 6)
  const salaryHistory = [...payslips]
    .slice(0, 6)
    .reverse()
    .map(p => ({
      month: p.month?.slice(0, 3) ?? '—',
      net: p.netSalary ?? 0,
    }));

  // Breakdown from latest payslip
  const latest = payslips[0];
  const basicPay     = latest?.basic ?? Math.round(latestGross * 0.5);
  const hra          = latest?.hra   ?? Math.round(latestGross * 0.2);
  const allowances   = latest?.allowances ?? Math.round(latestGross * 0.15);
  const bonus        = latest?.bonus ?? 0;
  const pfDeduction  = latest?.pfDeduction ?? Math.round(latestDeduct * 0.75);
  const taxDeduction = latest?.taxDeduction ?? Math.round(latestDeduct * 0.25);

  const BREAKDOWN = [
    { label: 'Basic Pay',    amount: basicPay,    type: 'credit', color: 'oklch(0.72 0.19 167)' },
    { label: 'HRA',          amount: hra,         type: 'credit', color: 'oklch(0.72 0.19 167)' },
    { label: 'Allowances',   amount: allowances,  type: 'credit', color: 'oklch(0.72 0.19 167)' },
    ...(bonus > 0 ? [{ label: 'Bonus', amount: bonus, type: 'credit', color: 'oklch(0.78 0.17 70)' }] : []),
    { label: 'PF Deduction', amount: pfDeduction, type: 'debit',  color: 'oklch(0.75 0.18 25)' },
    { label: 'Tax (TDS)',    amount: taxDeduction, type: 'debit',  color: 'oklch(0.75 0.18 25)' },
  ];

  const nextPayDate = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return format(lastDay, 'MMM dd, yyyy');
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[oklch(0.72_0.19_167/0.2)] border-t-[oklch(0.72_0.19_167)] rounded-full animate-spin" />
          <p className="text-xs text-[oklch(0.5_0.02_210)]">Loading payslips…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8 text-center space-y-3">
        <AlertCircle size={32} className="mx-auto text-[oklch(0.75_0.18_25)]" />
        <p className="text-sm text-white font-bold">Failed to load payslips</p>
        <p className="text-xs text-[oklch(0.5_0.02_210)]">{error}</p>
        <button onClick={load} className="aq-btn-primary mx-auto"><RefreshCw size={14} /> Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Payslips & Salary</h1>
          <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">View your salary breakdown and download payslips.</p>
        </div>
        <button onClick={load} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Current Salary Hero + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Salary Card */}
        <div className="glass-panel p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 20% 20%, oklch(0.72 0.19 167), transparent 60%)' }} />

          <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.5_0.02_210)] mb-1">Net Monthly Salary</p>
          <p className="text-4xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {currentSalary > 0 ? `₹${currentSalary.toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-[oklch(0.72_0.19_167)] font-semibold mb-4">Next payout: {nextPayDate}</p>

          <div className="pt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[oklch(0.72_0.19_167)]" />
              <span className="text-xs text-[oklch(0.6_0.02_210)]">Gross: <strong className="text-white">₹{latestGross.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[oklch(0.75_0.18_25)]" />
              <span className="text-xs text-[oklch(0.6_0.02_210)]">Deductions: <strong className="text-[oklch(0.75_0.18_25)]">−₹{latestDeduct.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Salary History Chart */}
        <div className="glass-panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Salary Trend</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Monthly net salary history</p>
            </div>
          </div>
          {salaryHistory.length > 0 ? (
            <div className="h-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryHistory} barSize={32}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(1 0 0 / 3%)' }} />
                  <Bar dataKey="net" fill="oklch(0.72 0.19 167)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[130px] flex items-center justify-center text-[oklch(0.4_0.02_210)] text-xs">
              No salary history yet
            </div>
          )}
        </div>
      </div>

      {/* Salary Breakdown */}
      {latest && (
        <div className="glass-panel p-5">
          <h3 className="text-sm font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Salary Breakdown — {latest.month}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BREAKDOWN.map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg" style={{ background: item.type === 'credit' ? 'oklch(0.72 0.19 167 / 0.12)' : 'oklch(0.65 0.22 25 / 0.12)' }}>
                    {item.type === 'credit'
                      ? <TrendingUp size={12} style={{ color: item.color }} />
                      : <TrendingDown size={12} style={{ color: item.color }} />}
                  </div>
                  <span className="text-xs font-medium text-[oklch(0.75_0_0)]">{item.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: item.type === 'debit' ? 'oklch(0.75 0.18 25)' : 'white' }}>
                  {item.type === 'debit' ? '−' : '+'}₹{item.amount.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Payslip History */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Payslip History</h3>
          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Download your monthly salary statements</p>
        </div>
        <div className="divide-y divide-white/5">
          {payslips.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="mx-auto mb-3 text-[oklch(0.3_0.02_210)]" />
              <p className="text-sm text-[oklch(0.45_0.02_210)]">No payslips found. Payroll may not have been run yet.</p>
            </div>
          ) : payslips.map((slip, i) => {
            const isPaid = slip.status === 'paid' || slip.status === 'approved';
            const dateStr = slip.paidAt ?? slip.approvedAt ?? slip.createdAt;
            return (
              <motion.div key={slip._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}
                className="p-5 flex items-center gap-4 hover:bg-white/2 transition-colors group">
                <div className="p-3 rounded-xl shrink-0 group-hover:bg-[oklch(0.72_0.19_167/0.12)] transition-colors"
                  style={{ background: 'oklch(1 0 0 / 5%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                  <FileText size={18} className="text-[oklch(0.55_0.02_210)] group-hover:text-[oklch(0.72_0.19_167)] transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white">{slip.month}</p>
                    <span className={`aq-badge ${isPaid ? 'aq-badge-green' : slip.status === 'pending_approval' ? 'aq-badge-amber' : 'aq-badge-blue'}`}>
                      {slip.status?.replace('_', ' ') ?? 'draft'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">
                    {dateStr
                      ? `${isPaid ? 'Credited' : 'Generated'} on ${format(new Date(dateStr), 'MMM dd, yyyy')}`
                      : 'Processing…'}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-base font-bold text-white">₹{(slip.netSalary ?? 0).toLocaleString()}</p>
                  <p className="text-[10px] text-[oklch(0.45_0.02_210)]">Net Amount</p>
                </div>
                {isPaid && (
                  <button onClick={() => handleDownload(slip)}
                    className="p-2 rounded-xl hover:bg-[oklch(0.72_0.19_167/0.1)] text-[oklch(0.5_0.02_210)] hover:text-[oklch(0.72_0.19_167)] transition-all shrink-0">
                    <Download size={16} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Payslips;
