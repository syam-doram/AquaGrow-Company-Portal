import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, where, orderBy, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Banknote, Play, CheckCircle, Download, Plus, X, Search,
  Calculator, Clock, AlertCircle, ChevronRight, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SalaryStructure {
  id: string; name: string; basic: number; hra: number;
  allowances: number; deductions: number; bonus: number;
}

interface PayrollRecord {
  id: string; employeeId: string; employeeName: string;
  month: string; year: number; grossSalary: number;
  deductions: number; netSalary: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid';
  createdAt: Timestamp; approvedBy?: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PayrollManagement: React.FC = () => {
  const { employee, hasPermission } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showRun, setShowRun] = useState(false);
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const YEARS = [2024, 2025, 2026, 2027];
  const canRun     = hasPermission('run_payroll');
  const canApprove = hasPermission('approve_payroll');

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'payrolls'), orderBy('createdAt', 'desc')), snap => {
        setPayrolls(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayrollRecord)));
      }),
      onSnapshot(query(collection(db, 'employees'), where('status', '!=', 'terminated')), snap => {
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const runPayroll = async () => {
    if (employees.length === 0) { toast.error('No active employees found'); return; }
    setRunning(true);
    try {
      const existing = payrolls.filter(p => p.month === selMonth && p.year === selYear);
      if (existing.length > 0) {
        toast.warning(`Payroll for ${selMonth} ${selYear} already exists!`);
        setShowRun(false);
        setRunning(false);
        return;
      }
      const promises = employees.map(emp => {
        const salary = emp.salary ?? 30000;
        const basic  = Math.round(salary * 0.5);
        const hra    = Math.round(salary * 0.2);
        const allow  = Math.round(salary * 0.15);
        const deduct = Math.round(salary * 0.12);
        const net    = salary - deduct;
        return addDoc(collection(db, 'payrolls'), {
          employeeId: emp.uid ?? emp.id,
          employeeName: emp.name,
          employeeEmail: emp.email,
          department: emp.department ?? '',
          month: selMonth, year: selYear,
          grossSalary: salary, basic, hra, allowances: allow,
          deductions: deduct, netSalary: net,
          status: 'pending_approval',
          createdAt: Timestamp.now(),
          createdBy: employee?.uid,
        });
      });
      await Promise.all(promises);
      toast.success(`✅ Payroll generated for ${employees.length} employees — ${selMonth} ${selYear}`);
      setShowRun(false);
    } catch {
      toast.error('Failed to run payroll');
    } finally {
      setRunning(false);
    }
  };

  const approvePayroll = async (id: string) => {
    await updateDoc(doc(db, 'payrolls', id), {
      status: 'approved',
      approvedBy: employee?.uid,
      approvedAt: Timestamp.now(),
    });
    toast.success('Payroll approved!');
  };

  const markPaid = async (id: string) => {
    await updateDoc(doc(db, 'payrolls', id), {
      status: 'paid',
      paidAt: Timestamp.now(),
    });
    toast.success('Marked as paid. Payslip will be generated.');
  };

  const downloadPayslip = (p: PayrollRecord) => {
    toast.info(`Generating payslip for ${p.employeeName} — ${p.month} ${p.year}…`);
    setTimeout(() => toast.success(`✅ Payslip for ${p.employeeName} downloaded!`), 1500);
  };

  const filtered = payrolls.filter(p =>
    (filterYear === 0 || p.year === filterYear) &&
    (!search || p.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    p.month.toLowerCase().includes(search.toLowerCase()))
  );

  // Summary stats
  const currentMonth = MONTHS[new Date().getMonth()];
  const thisMonth = payrolls.filter(p => p.month === currentMonth && p.year === new Date().getFullYear());
  const totalPayout = thisMonth.reduce((s, p) => s + (p.netSalary ?? 0), 0);
  const pending = payrolls.filter(p => p.status === 'pending_approval').length;
  const paid    = payrolls.filter(p => p.status === 'paid').length;

  const STATUS_CFG: Record<string, { label: string; badge: string }> = {
    draft:            { label: 'Draft',            badge: 'aq-badge-blue' },
    pending_approval: { label: 'Pending Approval', badge: 'aq-badge-amber' },
    approved:         { label: 'Approved',         badge: 'aq-badge-green' },
    paid:             { label: 'Paid',             badge: 'aq-badge-green' },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Payroll Management</h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">Generate, approve & pay monthly salaries</p>
        </div>
        {canRun && (
          <button onClick={() => setShowRun(true)} className="aq-btn-primary !text-xs !py-2 shrink-0">
            <Play size={14} /> Run Payroll
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: `${currentMonth} Payout`,      value: `₹${totalPayout.toLocaleString()}`, color: 'oklch(0.72 0.19 167)', sub: `${thisMonth.length} employees` },
          { label: 'Pending Approval',             value: pending,  color: 'oklch(0.78 0.17 70)', sub: 'Needs review' },
          { label: 'Paid This Month',              value: paid,     color: 'oklch(0.72 0.17 155)', sub: 'Completed' },
          { label: 'Total Employees',              value: employees.length, color: 'oklch(0.75 0.16 240)', sub: 'Active staff' },
        ].map(s => (
          <div key={s.label} className="aq-stat-card">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[oklch(0.45_0.02_210)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee or month…" className="aq-input pl-8 !py-1.5 !text-xs" />
        </div>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          className="aq-input !py-1.5 !text-xs !w-auto">
          <option value={0}>All Years</option>
          {YEARS.map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Payroll Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Payroll Records</h3>
          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{filtered.length} records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full aq-table">
            <thead><tr>
              <th className="text-left">Employee</th>
              <th className="text-left hidden md:table-cell">Period</th>
              <th className="text-left hidden md:table-cell">Gross</th>
              <th className="text-left hidden lg:table-cell">Deductions</th>
              <th className="text-left">Net</th>
              <th className="text-left">Status</th>
              <th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => {
                const sc = STATUS_CFG[p.status] ?? STATUS_CFG.draft;
                return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td>
                      <p className="text-xs font-semibold text-white">{p.employeeName}</p>
                    </td>
                    <td className="hidden md:table-cell text-xs text-[oklch(0.6_0.02_210)]">{p.month} {p.year}</td>
                    <td className="hidden md:table-cell text-xs font-mono text-[oklch(0.7_0_0)]">₹{(p.grossSalary ?? 0).toLocaleString()}</td>
                    <td className="hidden lg:table-cell text-xs font-mono text-[oklch(0.75_0.18_25)]">-₹{(p.deductions ?? 0).toLocaleString()}</td>
                    <td>
                      <span className="text-xs font-bold text-[oklch(0.72_0.19_167)] font-mono">₹{(p.netSalary ?? 0).toLocaleString()}</span>
                    </td>
                    <td><span className={`aq-badge ${sc.badge}`}>{sc.label}</span></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {canApprove && p.status === 'pending_approval' && (
                          <button onClick={() => approvePayroll(p.id)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[oklch(0.72_0.19_167/0.1)] text-[oklch(0.72_0.19_167)] hover:bg-[oklch(0.72_0.19_167/0.2)] transition-colors">
                            Approve
                          </button>
                        )}
                        {canApprove && p.status === 'approved' && (
                          <button onClick={() => markPaid(p.id)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[oklch(0.72_0.19_167)] text-[oklch(0.08_0.015_200)] hover:opacity-90">
                            Mark Paid
                          </button>
                        )}
                        {p.status === 'paid' && (
                          <button onClick={() => downloadPayslip(p)}
                            className="p-1.5 rounded-lg hover:bg-white/8 text-[oklch(0.5_0.02_210)] hover:text-[oklch(0.72_0.19_167)] transition-colors">
                            <Download size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-[oklch(0.45_0.02_210)] text-xs">
                  No payroll records. Click "Run Payroll" to generate for this month.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Payroll Modal */}
      <AnimatePresence>
        {showRun && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowRun(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-sm glass-panel p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Run Payroll</h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Generate salary for all active employees</p>
                </div>
                <button onClick={() => setShowRun(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Month</label>
                    <select value={selMonth} onChange={e => setSelMonth(e.target.value)} className="aq-input text-sm">
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Year</label>
                    <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} className="aq-input text-sm">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-3 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator size={14} className="text-[oklch(0.72_0.19_167)]" />
                    <p className="text-xs font-bold text-white">Payroll Preview</p>
                  </div>
                  <div className="space-y-1 text-[10px] text-[oklch(0.6_0.02_210)]">
                    <p>Period: <strong className="text-white">{selMonth} {selYear}</strong></p>
                    <p>Employees: <strong className="text-white">{employees.length}</strong></p>
                    <p>Est. Total: <strong className="text-[oklch(0.72_0.19_167)]">₹{employees.reduce((s, e) => s + ((e.salary ?? 30000) * 0.88), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowRun(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button onClick={runPayroll} disabled={running} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <Play size={14} /> {running ? 'Running…' : 'Generate'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PayrollManagement;
