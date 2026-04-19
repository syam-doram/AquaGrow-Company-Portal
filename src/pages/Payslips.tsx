import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import {
  Download, FileText, TrendingUp, TrendingDown, CreditCard,
  Calendar, Coins, Receipt, Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Static payslip data (real data would come from HR Firestore collection)
const PAYSLIPS = [
  { month: 'April',    year: 2026, gross: 47000, deductions: 2000, net: 45000, status: 'upcoming', date: '2026-04-30' },
  { month: 'March',    year: 2026, gross: 47000, deductions: 2000, net: 45000, status: 'paid',     date: '2026-04-01' },
  { month: 'February', year: 2026, gross: 47000, deductions: 2000, net: 45000, status: 'paid',     date: '2026-03-01' },
  { month: 'January',  year: 2026, gross: 47000, deductions: 2000, net: 45000, status: 'paid',     date: '2026-02-01' },
];

const salaryHistory = [
  { month: 'Jan', net: 45000 }, { month: 'Feb', net: 45000 },
  { month: 'Mar', net: 45000 }, { month: 'Apr', net: 45000 },
];

const BREAKDOWN = [
  { label: 'Basic Pay',    amount: 28000, type: 'credit', color: 'oklch(0.72 0.19 167)' },
  { label: 'HRA',          amount: 8000,  type: 'credit', color: 'oklch(0.72 0.19 167)' },
  { label: 'Allowances',   amount: 7000,  type: 'credit', color: 'oklch(0.72 0.19 167)' },
  { label: 'Gifts & Bonus',amount: 4000,  type: 'credit', color: 'oklch(0.78 0.17 70)' },
  { label: 'PF Deduction', amount: 1500,  type: 'debit',  color: 'oklch(0.75 0.18 25)' },
  { label: 'Tax (TDS)',     amount:  500,  type: 'debit',  color: 'oklch(0.75 0.18 25)' },
];

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

const Payslips: React.FC = () => {
  const { employee } = useAuth();

  const handleDownload = (month: string, year: number) => {
    toast.info(`Generating payslip for ${month} ${year}…`);
    setTimeout(() => toast.success(`✅ ${month} ${year} payslip downloaded!`), 1500);
  };

  const currentSalary = employee?.salary ?? 45000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Payslips & Salary</h1>
        <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">View your salary breakdown and download payslips.</p>
      </div>

      {/* Current Salary Hero + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Salary Card */}
        <div className="glass-panel p-6 relative overflow-hidden">
          {/* BG glow */}
          <div className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 20% 20%, oklch(0.72 0.19 167), transparent 60%)' }} />

          <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.5_0.02_210)] mb-1">Net Monthly Salary</p>
          <p className="text-4xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            ₹{currentSalary.toLocaleString()}
          </p>
          <p className="text-xs text-[oklch(0.72_0.19_167)] font-semibold mb-4">Next payout: Apr 30, 2026</p>

          <div className="pt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[oklch(0.72_0.19_167)]" />
              <span className="text-xs text-[oklch(0.6_0.02_210)]">Gross: <strong className="text-white">₹{(47000).toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[oklch(0.75_0.18_25)]" />
              <span className="text-xs text-[oklch(0.6_0.02_210)]">Deductions: <strong className="text-[oklch(0.75_0.18_25)]">−₹{(2000).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Salary History Chart */}
        <div className="glass-panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Salary Trend</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Monthly net salary 2026</p>
            </div>
          </div>
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
        </div>
      </div>

      {/* Salary Breakdown */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Salary Breakdown</h3>
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

      {/* Payslip History */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Payslip History</h3>
          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Download your monthly salary statements</p>
        </div>
        <div className="divide-y divide-white/5">
          {PAYSLIPS.map((slip, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}
              className="p-5 flex items-center gap-4 hover:bg-white/2 transition-colors group">
              <div className="p-3 rounded-xl shrink-0 group-hover:bg-[oklch(0.72_0.19_167/0.12)] transition-colors"
                style={{ background: 'oklch(1 0 0 / 5%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                <FileText size={18} className="text-[oklch(0.55_0.02_210)] group-hover:text-[oklch(0.72_0.19_167)] transition-colors" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-white">{slip.month} {slip.year}</p>
                  <span className={`aq-badge ${slip.status === 'paid' ? 'aq-badge-green' : 'aq-badge-amber'}`}>
                    {slip.status === 'paid' ? 'Paid' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-[10px] text-[oklch(0.5_0.02_210)]">
                  {slip.status === 'paid' ? `Credited on ${format(new Date(slip.date), 'MMM dd, yyyy')}`
                    : `Expected: ${format(new Date(slip.date), 'MMM dd, yyyy')}`}
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-base font-bold text-white">₹{slip.net.toLocaleString()}</p>
                <p className="text-[10px] text-[oklch(0.45_0.02_210)]">Net Amount</p>
              </div>
              {slip.status === 'paid' && (
                <button onClick={() => handleDownload(slip.month, slip.year)}
                  className="p-2 rounded-xl hover:bg-[oklch(0.72_0.19_167/0.1)] text-[oklch(0.5_0.02_210)] hover:text-[oklch(0.72_0.19_167)] transition-all shrink-0">
                  <Download size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Payslips;
