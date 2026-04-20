import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  UserX, Plus, Search, X, Save, CheckCircle, Clock, AlertTriangle,
  DollarSign, Calendar, FileText, RefreshCw, ChevronDown, CreditCard,
  Banknote, ShieldCheck, BarChart3, TrendingDown, TrendingUp, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInCalendarDays } from 'date-fns';
import hrmsApi from '../api';

// ── Types ─────────────────────────────────────────────────────────────────────
type SepType = 'resignation' | 'termination' | 'retirement' | 'voluntary';
type FnfStatus = 'initiated' | 'pending_approval' | 'approved' | 'disbursed';

interface FnfRecord {
  _id: string;
  id?: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  separationType: SepType;
  lastWorkingDay: string;
  noticePeriodDays?: number;
  noticePeriodServed?: boolean;
  status: FnfStatus;
  // Earnings
  lastBasicSalary?: number;
  gratuityAmount?: number;
  leaveEncashment?: number;
  bonusAmount?: number;
  otherEarnings?: number;
  // Deductions
  noticePayDeduction?: number;
  otherDeductions?: number;
  // Net
  netSettlement?: number;
  // Meta
  initiatedAt?: string;
  approvedAt?: string;
  settledAt?: string;
  hrNotes?: string;
  paymentMode?: string;
  transactionRef?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEP_CFG: Record<SepType, { label: string; color: string; badge: string }> = {
  resignation:  { label: 'Resignation',    color: 'oklch(0.75 0.16 240)', badge: 'aq-badge-blue'   },
  termination:  { label: 'Termination',    color: 'oklch(0.75 0.18 25)',  badge: 'aq-badge-red'    },
  retirement:   { label: 'Retirement',     color: 'oklch(0.72 0.19 167)', badge: 'aq-badge-green'  },
  voluntary:    { label: 'Voluntary Exit', color: 'oklch(0.78 0.17 70)',  badge: 'aq-badge-amber'  },
};

const STATUS_CFG: Record<FnfStatus, { label: string; badge: string; icon: any }> = {
  initiated:        { label: 'Initiated',        badge: 'aq-badge-blue',   icon: Clock        },
  pending_approval: { label: 'Pending Approval', badge: 'aq-badge-amber',  icon: AlertTriangle },
  approved:         { label: 'Approved',         badge: 'aq-badge-green',  icon: CheckCircle  },
  disbursed:        { label: 'Disbursed',        badge: 'aq-badge-green',  icon: ShieldCheck  },
};

const eur = (n?: number) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

// ── Initiate Modal ────────────────────────────────────────────────────────────
interface InitiateModalProps { employees: any[]; onSave: (data: any) => Promise<void>; onClose: () => void; }
const InitiateModal: React.FC<InitiateModalProps> = ({ employees, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    separationType: 'resignation' as SepType,
    lastWorkingDay: format(new Date(), 'yyyy-MM-dd'),
    noticePeriodDays: 30,
    noticePeriodServed: true,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) { toast.error('Select an employee'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
        className="w-full max-w-lg glass-panel p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Initiate F&F Settlement
            </h3>
            <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Begin full & final clearance process</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Employee</label>
            <select required value={form.employeeId}
              onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
              className="aq-input text-sm">
              <option value="">Select employee…</option>
              {employees.filter(e => e.status !== 'terminated').map(emp => (
                <option key={emp.id ?? emp._id} value={emp.id ?? emp._id}>
                  {emp.name} — {emp.empId ?? ''} ({emp.department ?? emp.role ?? ''})
                </option>
              ))}
            </select>
          </div>

          {/* Separation Type */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Separation Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SEP_CFG) as [SepType, any][]).map(([key, cfg]) => (
                <button key={key} type="button"
                  onClick={() => setForm(f => ({ ...f, separationType: key }))}
                  className="py-2 rounded-xl text-[10px] font-bold text-left px-3 transition-all"
                  style={form.separationType === key
                    ? { background: `${cfg.color} / 0.15`, color: cfg.color, border: `1px solid ${cfg.color} / 0.3` }
                    : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Last Working Day */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Last Working Day</label>
              <input type="date" required value={form.lastWorkingDay}
                onChange={e => setForm(f => ({ ...f, lastWorkingDay: e.target.value }))}
                className="aq-input text-sm" />
            </div>
            {/* Notice Period */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Notice Period (days)</label>
              <input type="number" min={0} value={form.noticePeriodDays}
                onChange={e => setForm(f => ({ ...f, noticePeriodDays: Number(e.target.value) }))}
                className="aq-input text-sm" />
            </div>
          </div>

          {/* Notice Served */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            <div onClick={() => setForm(f => ({ ...f, noticePeriodServed: !f.noticePeriodServed }))}
              className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative ${form.noticePeriodServed ? 'bg-[oklch(0.72_0.19_167)]' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.noticePeriodServed ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Notice Period Served</p>
              <p className="text-[9px] text-[oklch(0.5_0.02_210)]">
                {form.noticePeriodServed ? 'Full notice served — no deduction' : 'Notice not served — deduction will apply'}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">HR Notes (optional)</label>
            <textarea rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Reason for exit, performance notes, handover status…"
              className="aq-input resize-none text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
              <UserX size={14} /> {saving ? 'Initiating…' : 'Initiate F&F'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Disburse Modal ─────────────────────────────────────────────────────────────
const DisburseModal: React.FC<{ record: FnfRecord; onSave: (data: any) => Promise<void>; onClose: () => void }> = ({ record, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ paymentMode: 'bank_transfer', transactionRef: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
        className="w-full max-w-sm glass-panel p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Mark as Disbursed</h3>
            <p className="text-[10px] text-[oklch(0.5_0.02_210)]">To: {record.employeeName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]"><X size={16} /></button>
        </div>

        <div className="p-3 rounded-xl mb-4" style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
          <p className="text-[9px] text-[oklch(0.55_0.02_210)] mb-1">Net Settlement Amount</p>
          <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {eur(record.netSettlement)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Payment Mode</label>
            <select value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))} className="aq-input text-sm">
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Transaction Reference</label>
            <input value={form.transactionRef} onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))}
              placeholder="UTR / Cheque No. / UPI Ref" className="aq-input text-sm" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
              <Banknote size={14} /> {saving ? 'Processing…' : 'Confirm Disbursal'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Settlement Detail Panel ────────────────────────────────────────────────────
const SettlementDetail: React.FC<{
  record: FnfRecord;
  canApprove: boolean;
  onApprove: () => void;
  onDisburse: () => void;
  onClose: () => void;
}> = ({ record, canApprove, onApprove, onDisburse, onClose }) => {
  const gross = (record.lastBasicSalary ?? 0) + (record.gratuityAmount ?? 0) +
    (record.leaveEncashment ?? 0) + (record.bonusAmount ?? 0) + (record.otherEarnings ?? 0);
  const deductions = (record.noticePayDeduction ?? 0) + (record.otherDeductions ?? 0);
  const net = record.netSettlement ?? (gross - deductions);

  const earnings = [
    { label: 'Last Month Salary', amount: record.lastBasicSalary ?? 0 },
    { label: 'Gratuity',          amount: record.gratuityAmount ?? 0 },
    { label: 'Leave Encashment',  amount: record.leaveEncashment ?? 0 },
    { label: 'Bonus / Incentive', amount: record.bonusAmount ?? 0 },
    { label: 'Other Earnings',    amount: record.otherEarnings ?? 0 },
  ].filter(e => e.amount > 0);

  const deductionList = [
    { label: 'Notice Pay Deduction', amount: record.noticePayDeduction ?? 0 },
    { label: 'Other Deductions',     amount: record.otherDeductions ?? 0 },
  ].filter(e => e.amount > 0);

  const scfg = STATUS_CFG[record.status] ?? STATUS_CFG.initiated;
  const Icon = scfg.icon;

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`aq-badge ${SEP_CFG[record.separationType]?.badge ?? 'aq-badge-blue'}`}>
              {SEP_CFG[record.separationType]?.label ?? record.separationType}
            </span>
            <span className={`aq-badge ${scfg.badge} flex items-center gap-1`}>
              <Icon size={9} /> {scfg.label}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">{record.employeeName ?? 'Employee'}</h3>
          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{record.department ?? ''}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
          <X size={14} />
        </button>
      </div>

      {/* Key Dates */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Last Working Day',  val: record.lastWorkingDay ? format(new Date(record.lastWorkingDay), 'MMM dd, yyyy') : '—' },
          { label: 'Notice Period',     val: record.noticePeriodDays ? `${record.noticePeriodDays} days` : '—' },
          { label: 'Notice Served',     val: record.noticePeriodServed ? '✅ Yes' : '❌ No' },
          { label: 'Initiated',         val: record.initiatedAt ? format(new Date(record.initiatedAt), 'MMM dd, yyyy') : '—' },
        ].map(row => (
          <div key={row.label} className="p-2.5 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="text-[9px] text-[oklch(0.45_0.02_210)] uppercase tracking-wide font-bold">{row.label}</p>
            <p className="text-xs font-bold text-white mt-0.5">{row.val}</p>
          </div>
        ))}
      </div>

      {/* Earnings */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2 flex items-center gap-1">
          <TrendingUp size={10} /> Earnings
        </p>
        <div className="space-y-1">
          {earnings.length > 0 ? earnings.map(e => (
            <div key={e.label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
              <span className="text-xs text-[oklch(0.65_0_0)]">{e.label}</span>
              <span className="text-xs font-bold text-[oklch(0.72_0.19_167)]">+{eur(e.amount)}</span>
            </div>
          )) : (
            <p className="text-[10px] text-[oklch(0.4_0.02_210)] py-2">No earnings calculated yet</p>
          )}
        </div>
      </div>

      {/* Deductions */}
      {deductionList.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2 flex items-center gap-1">
            <TrendingDown size={10} /> Deductions
          </p>
          <div className="space-y-1">
            {deductionList.map(d => (
              <div key={d.label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
                <span className="text-xs text-[oklch(0.65_0_0)]">{d.label}</span>
                <span className="text-xs font-bold text-[oklch(0.75_0.18_25)]">−{eur(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Net Settlement */}
      <div className="p-3 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white">Net Settlement</p>
          <p className="text-xl font-bold text-[oklch(0.72_0.19_167)]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{eur(net)}</p>
        </div>
        {record.paymentMode && (
          <p className="text-[9px] text-[oklch(0.5_0.02_210)] mt-1">
            Paid via {record.paymentMode.replace('_', ' ')} {record.transactionRef ? `· Ref: ${record.transactionRef}` : ''}
          </p>
        )}
      </div>

      {record.hrNotes && (
        <div className="p-3 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1">HR Notes</p>
          <p className="text-xs text-[oklch(0.7_0_0)]">{record.hrNotes}</p>
        </div>
      )}

      {/* Actions */}
      {canApprove && (
        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
          {record.status === 'pending_approval' && (
            <button onClick={onApprove} className="aq-btn-primary w-full justify-center !text-xs">
              <CheckCircle size={13} /> Approve Settlement
            </button>
          )}
          {record.status === 'approved' && (
            <button onClick={onDisburse} className="aq-btn-primary w-full justify-center !text-xs">
              <Banknote size={13} /> Mark as Disbursed
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main F&F Page ─────────────────────────────────────────────────────────────
const FullFinalSettlement: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage_employees');
  const canApprove = hasPermission('approve_payroll') || hasPermission('run_payroll');

  const [records, setRecords]       = useState<FnfRecord[]>([]);
  const [employees, setEmployees]   = useState<any[]>([]);
  const [fetching, setFetching]     = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected]     = useState<FnfRecord | null>(null);
  const [showInitiate, setShowInitiate] = useState(false);
  const [showDisburse, setShowDisburse] = useState(false);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const [fnfData, empData] = await Promise.all([
        hrmsApi.fnf.list(),
        hrmsApi.employees.list(),
      ]);
      setRecords(fnfData.map((r: any) => ({ ...r, id: r._id ?? r.id })));
      setEmployees(empData.map((e: any) => ({ ...e, id: e._id ?? e.id })));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load F&F data');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInitiate = async (data: any) => {
    try {
      await hrmsApi.fnf.create(data);
      toast.success('F&F settlement initiated!');
      setShowInitiate(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to initiate F&F');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await hrmsApi.fnf.approve(id);
      toast.success('Settlement approved!');
      setSelected(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to approve');
    }
  };

  const handleDisburse = async (id: string, data: any) => {
    try {
      await hrmsApi.fnf.disburse(id, data);
      toast.success('Settlement marked as disbursed!');
      setShowDisburse(false);
      setSelected(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to disburse');
    }
  };

  const filtered = records.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSearch = !search ||
      (r.employeeName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      r.separationType.includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Stats
  const initiated   = records.filter(r => r.status === 'initiated').length;
  const pending     = records.filter(r => r.status === 'pending_approval').length;
  const approved    = records.filter(r => r.status === 'approved').length;
  const disbursed   = records.filter(r => r.status === 'disbursed').length;
  const totalDisbursed = records.filter(r => r.status === 'disbursed')
    .reduce((s, r) => s + (r.netSettlement ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Full & Final Settlement
          </h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">
            Manage employee exits — gratuity, leave encashment & clearance
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} disabled={fetching} className="aq-btn-ghost !py-2 !px-3 !text-xs">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
          </button>
          {canManage && (
            <button onClick={() => setShowInitiate(true)} className="aq-btn-primary !text-xs !py-2">
              <Plus size={14} /> Initiate F&F
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Initiated',        value: initiated,  color: 'oklch(0.75 0.16 240)' },
          { label: 'Pending Approval', value: pending,    color: 'oklch(0.78 0.17 70)'  },
          { label: 'Approved',         value: approved,   color: 'oklch(0.72 0.19 167)' },
          { label: 'Disbursed',        value: disbursed,  color: 'oklch(0.72 0.17 155)' },
          { label: 'Total Disbursed',  value: `₹${(totalDisbursed / 1000).toFixed(0)}K`, color: 'oklch(0.72 0.19 167)' },
        ].map(s => (
          <div key={s.label} className="aq-stat-card">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee or type…" className="aq-input pl-8 !py-1.5 !text-xs" />
        </div>
        {['all', 'initiated', 'pending_approval', 'approved', 'disbursed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all"
            style={filterStatus === s
              ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }
              : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {fetching ? (
            <div className="glass-panel py-14 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[oklch(0.72_0.19_167/0.2)] border-t-[oklch(0.72_0.19_167)] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel py-14 text-center">
              <UserX size={32} className="mx-auto mb-2 text-[oklch(0.3_0.02_210)]" />
              <p className="text-xs text-[oklch(0.45_0.02_210)]">
                {records.length === 0 ? 'No F&F settlements yet.' : 'No records match your filter.'}
              </p>
              {records.length === 0 && canManage && (
                <button onClick={() => setShowInitiate(true)} className="aq-btn-primary !text-xs mt-3">
                  <Plus size={13} /> Initiate First F&F
                </button>
              )}
            </div>
          ) : filtered.map(r => {
            const scfg = STATUS_CFG[r.status] ?? STATUS_CFG.initiated;
            const Ico = scfg.icon;
            return (
              <motion.button key={r._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(r)}
                className={`w-full text-left glass-panel p-4 transition-all hover:border-[oklch(0.72_0.19_167/0.3)] ${selected?._id === r._id ? 'border-[oklch(0.72_0.19_167/0.3)]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl shrink-0" style={{ background: 'oklch(1 0 0 / 5%)' }}>
                    <UserX size={13} style={{ color: SEP_CFG[r.separationType]?.color ?? 'oklch(0.72 0.19 167)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-bold text-white truncate">{r.employeeName ?? 'Employee'}</p>
                      <span className={`aq-badge ${SEP_CFG[r.separationType]?.badge ?? 'aq-badge-blue'}`}>
                        {SEP_CFG[r.separationType]?.label ?? r.separationType}
                      </span>
                    </div>
                    <p className="text-[10px] text-[oklch(0.55_0.02_210)]">
                      LWD: {r.lastWorkingDay ? format(new Date(r.lastWorkingDay), 'MMM dd, yyyy') : '—'}
                    </p>
                    {r.netSettlement && (
                      <p className="text-[10px] font-bold text-[oklch(0.72_0.19_167)] mt-0.5">
                        Net: {eur(r.netSettlement)}
                      </p>
                    )}
                  </div>
                  <span className={`aq-badge shrink-0 flex items-center gap-1 ${scfg.badge}`}>
                    <Ico size={9} /> {scfg.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <SettlementDetail
            record={selected}
            canApprove={canApprove}
            onApprove={() => handleApprove(selected._id)}
            onDisburse={() => setShowDisburse(true)}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="glass-panel flex items-center justify-center py-20">
            <div className="text-center">
              <FileText size={32} className="mx-auto mb-2 text-[oklch(0.3_0.02_210)]" />
              <p className="text-xs text-[oklch(0.45_0.02_210)]">Select a record to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showInitiate && (
          <InitiateModal employees={employees} onSave={handleInitiate} onClose={() => setShowInitiate(false)} />
        )}
        {showDisburse && selected && (
          <DisburseModal
            record={selected}
            onSave={data => handleDisburse(selected._id, data)}
            onClose={() => setShowDisburse(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FullFinalSettlement;
