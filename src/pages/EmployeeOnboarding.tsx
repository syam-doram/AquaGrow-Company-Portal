import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, ROLE_LABELS, DEPARTMENTS, type EmployeeRole } from '../context/AuthContext';
import {
  Users, Plus, Search, Edit2, Trash2, X, Save, UserCheck,
  Mail, Phone, Building2, Calendar, ShieldCheck, RefreshCw,
  Key, Copy, CheckCircle, AlertTriangle, Eye, EyeOff,
  Lock, Info, ChevronDown, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import hrmsApi from '../api';

// ── Role config with what each role can access ─────────────────────────────────
const ROLE_CONFIG: {
  value: EmployeeRole;
  label: string;
  color: string;
  badge: string;
  desc: string;
  access: string[];
}[] = [
  {
    value: 'super_admin',
    label: 'Founder',
    color: 'oklch(0.78 0.17 295)',
    badge: 'aq-badge-purple',
    desc: 'Founder & CEO — full control',
    access: ['Everything including role management & system settings'],
  },
  {
    value: 'hr_manager',
    label: 'HR Manager',
    color: 'oklch(0.72 0.19 167)',
    badge: 'aq-badge-green',
    desc: 'People & talent operations',
    access: ['Hire / edit employees', 'Leave approvals', 'Payroll run', 'Recruitment', 'Performance reviews', 'F&F Settlement'],
  },
  {
    value: 'finance_manager',
    label: 'Finance Manager',
    color: 'oklch(0.75 0.16 240)',
    badge: 'aq-badge-blue',
    desc: 'Financial operations & payroll',
    access: ['Payroll management', 'Finance reports', 'Payslips view', 'All employee self-service'],
  },
  {
    value: 'operations_manager',
    label: 'Operations Manager',
    color: 'oklch(0.82 0.18 70)',
    badge: 'aq-badge-amber',
    desc: 'Team & operations management',
    access: ['Leave approvals', 'Timesheet admin', 'Performance', 'Asset management', 'All tickets', 'All employee self-service'],
  },
  {
    value: 'support_agent',
    label: 'Support Agent',
    color: 'oklch(0.75 0.18 25)',
    badge: 'aq-badge-red',
    desc: 'Customer & internal support',
    access: ['Manage all support tickets', 'All employee self-service'],
  },
  {
    value: 'employee',
    label: 'Employee',
    color: 'oklch(0.65 0.16 240)',
    badge: 'aq-badge-blue',
    desc: 'Standard employee — no admin tools',
    access: ['Timesheet', 'My Leaves', 'Payslips', 'Courses', 'My Tickets', 'Profile'],
  },
];

const STATUS_OPTS = ['active', 'inactive', 'on_leave', 'terminated'];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; uid: string; name: string; email: string;
  role: EmployeeRole; department?: string; phone?: string;
  salary?: number; status?: string; joiningDate?: string;
  empId?: string; photoUrl?: string; designation?: string;
}

const EMPTY_EMP: Omit<Employee, 'id' | 'uid'> = {
  name: '', email: '', role: 'employee', department: '',
  phone: '', salary: 0, status: 'active',
  joiningDate: format(new Date(), 'yyyy-MM-dd'),
  empId: '', designation: '',
};

// ── Password generator ─────────────────────────────────────────────────────────
function generatePassword(name: string, empId: string): string {
  const first = (name.split(' ')[0] ?? 'User').replace(/[^a-zA-Z]/g, '');
  const suffix = empId.slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
  return `${first.charAt(0).toUpperCase()}${first.slice(1, 4)}@${suffix}`;
}

// ── Credentials Card ──────────────────────────────────────────────────────────
const CredentialsCard: React.FC<{
  name: string; empId: string; password: string; role: EmployeeRole; onClose: () => void;
}> = ({ name, empId, password, role, onClose }) => {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const roleCfg = ROLE_CONFIG.find(r => r.value === role) ?? ROLE_CONFIG[5];

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
        className="w-full max-w-md glass-panel overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Colored header band */}
        <div className="px-6 py-5 relative overflow-hidden"
          style={{ background: `${roleCfg.color}12`, borderBottom: `1px solid ${roleCfg.color}25` }}>
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full"
            style={{ background: `radial-gradient(circle, ${roleCfg.color}20, transparent)` }} />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${roleCfg.color}18`, border: `1px solid ${roleCfg.color}35` }}>
              <Key size={22} style={{ color: roleCfg.color }} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${roleCfg.color}aa` }}>
                Employee Hired
              </p>
              <h3 className="text-base font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
                ✅ {name}
              </h3>
              <span className={`aq-badge ${roleCfg.badge}`} style={{ fontSize: '8px' }}>
                {roleCfg.label}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="p-3 rounded-xl flex gap-2.5"
            style={{ background: 'oklch(0.82 0.18 70 / 0.08)', border: '1px solid oklch(0.82 0.18 70 / 0.25)' }}>
            <AlertTriangle size={14} style={{ color: 'oklch(0.82 0.18 70)', flexShrink: 0, marginTop: '2px' }} />
            <p className="text-[10px] leading-relaxed" style={{ color: 'oklch(0.82 0.18 70)' }}>
              This password is shown <strong>only once</strong>. Share these login credentials with the employee securely before closing.
            </p>
          </div>

          {/* Credential rows */}
          <div className="space-y-2">
            {[
              { label: 'Portal URL',   value: window.location.origin, field: 'url' },
              { label: 'Employee ID',  value: empId,                  field: 'empId' },
              { label: 'Role / Access', value: roleCfg.label,          field: 'role', noCopy: true },
            ].map(row => (
              <div key={row.field} className="flex items-center justify-between rounded-xl px-4 py-2.5"
                style={{ background: 'var(--aq-ghost-bg)', border: '1px solid var(--aq-glass-border)' }}>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--aq-text-muted)' }}>{row.label}</p>
                  <p className="text-xs font-mono font-bold mt-0.5" style={{ color: 'var(--aq-text-primary)' }}>{row.value}</p>
                </div>
                {!row.noCopy && (
                  <button onClick={() => copy(row.value, row.field)}
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--aq-text-muted)' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-ghost-hover)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    {copied === row.field ? <CheckCircle size={13} style={{ color: 'oklch(0.72 0.19 167)' }} /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            ))}

            {/* Password row */}
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
              style={{ background: `${roleCfg.color}08`, border: `1px solid ${roleCfg.color}25` }}>
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--aq-text-muted)' }}>
                  Password <span style={{ textTransform: 'none', fontWeight: 400 }}>(one-time — change after first login)</span>
                </p>
                <p className="text-xs font-mono font-bold mt-0.5" style={{ color: roleCfg.color }}>
                  {showPw ? password : '•'.repeat(password.length)}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setShowPw(v => !v)}
                  className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--aq-text-muted)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-ghost-hover)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => copy(password, 'password')}
                  className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--aq-text-muted)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-ghost-hover)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  {copied === 'password' ? <CheckCircle size={13} style={{ color: 'oklch(0.72 0.19 167)' }} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* What they'll see */}
          <div className="rounded-xl p-3.5"
            style={{ background: 'var(--aq-ghost-bg)', border: '1px solid var(--aq-glass-border)' }}>
            <p className="text-[9px] uppercase tracking-widest font-black mb-2" style={{ color: 'var(--aq-text-muted)' }}>
              What {name.split(' ')[0]} will see in the portal
            </p>
            <div className="flex flex-wrap gap-1.5">
              {roleCfg.access.map(a => (
                <span key={a} className="text-[9px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: `${roleCfg.color}12`, color: roleCfg.color, border: `1px solid ${roleCfg.color}25` }}>
                  {a}
                </span>
              ))}
            </div>
          </div>

          <button onClick={onClose} className="aq-btn-primary w-full justify-center">
            <CheckCircle size={14} /> Done — Credentials Shared
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Role Access Matrix ────────────────────────────────────────────────────────
const RoleAccessGuide: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-panel overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
        onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-ghost-hover)')}
        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
        <div className="flex items-center gap-2.5">
          <Info size={14} style={{ color: 'oklch(0.72 0.19 167)' }} />
          <div className="text-left">
            <p className="text-xs font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>
              Role Access Matrix
            </p>
            <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)' }}>
              What each role can see after login
            </p>
          </div>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--aq-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden" style={{ borderTop: '1px solid var(--aq-glass-border)' }}>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ROLE_CONFIG.filter(r => r.value !== 'super_admin').map(r => (
                <div key={r.value} className="rounded-xl p-3.5"
                  style={{ background: `${r.color}08`, border: `1px solid ${r.color}20` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    <span className="text-[11px] font-black" style={{ color: r.color }}>{r.label}</span>
                  </div>
                  <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)', marginBottom: '8px' }}>{r.desc}</p>
                  <div className="space-y-1">
                    {r.access.map(a => (
                      <div key={a} className="flex items-center gap-1.5">
                        <CheckCircle size={8} style={{ color: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '9px', color: 'var(--aq-text-secondary)' }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const EmployeeOnboarding: React.FC = () => {
  const { hasPermission, hasRole } = useAuth();
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [search, setSearch]             = useState('');
  const [filterDept, setFilterDept]     = useState('All');
  const [filterRole, setFilterRole]     = useState('All');
  const [showModal, setShowModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState<Employee | null>(null);
  const [form, setForm]                 = useState({ ...EMPTY_EMP });
  const [password, setPassword]         = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [saving, setSaving]             = useState(false);
  const [fetching, setFetching]         = useState(true);
  const [credentials, setCredentials]   = useState<{ name: string; empId: string; password: string; role: EmployeeRole } | null>(null);
  const canManage = hasPermission('manage_employees');
  const isFounder = hasRole('super_admin');

  const roleCfg = (role: EmployeeRole) => ROLE_CONFIG.find(r => r.value === role) ?? ROLE_CONFIG[5];

  const fetchEmployees = useCallback(async () => {
    setFetching(true);
    try {
      const data = await hrmsApi.employees.list();
      setEmployees(data.map((e: any) => ({ ...e, id: e._id ?? e.id ?? '', uid: e._id ?? e.uid ?? '' })));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load employees');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Auto-generate password when name or empId changes (new hire mode)
  useEffect(() => {
    if (!editTarget && form.name) {
      setPassword(generatePassword(form.name, form.empId ?? ''));
    }
  }, [form.name, form.empId, editTarget]);

  const openAdd = () => {
    setEditTarget(null);
    const empId = `AQ-${Date.now().toString().slice(-5)}`;
    setForm({ ...EMPTY_EMP, empId });
    setPassword('');
    setShowPw(false);
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({
      name: emp.name, email: emp.email, role: emp.role,
      department: emp.department ?? '', phone: emp.phone ?? '',
      salary: emp.salary ?? 0, status: emp.status ?? 'active',
      joiningDate: emp.joiningDate ?? format(new Date(), 'yyyy-MM-dd'),
      empId: emp.empId ?? '', designation: emp.designation ?? '',
    });
    setPassword('');
    setShowPw(false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget && !password) { toast.error('A password is required for new employees'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await hrmsApi.employees.update(editTarget.id, form);
        toast.success('Employee record updated!');
        setShowModal(false);
        await fetchEmployees();
      } else {
        // Include password in payload for new hire
        await hrmsApi.employees.create({ ...form, password });
        setCredentials({ name: form.name, empId: form.empId!, password, role: form.role });
        toast.success(`✅ ${form.name} hired successfully!`);
        setShowModal(false);
        await fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await hrmsApi.employees.remove(emp.id);
      toast.success('Employee removed');
      await fetchEmployees();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete');
    }
  };

  const filtered = employees.filter(e => {
    const s = search.toLowerCase();
    return (
      (!s || e.name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || (e.empId ?? '').toLowerCase().includes(s)) &&
      (filterDept === 'All' || e.department === filterDept) &&
      (filterRole === 'All' || e.role === filterRole)
    );
  });

  const InputField = ({ label, name, type = 'text', required = false, placeholder = '' }: {
    label: string; name: keyof typeof form; type?: string; required?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>{label}</label>
      <input type={type} required={required} placeholder={placeholder}
        value={String(form[name] ?? '')}
        onChange={e => setForm(f => ({ ...f, [name]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="aq-input text-sm" />
    </div>
  );

  return (
    <div className="space-y-5 pb-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
            Employee Management
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
            {fetching ? 'Loading…' : `${filtered.length} of ${employees.length} employees`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={fetchEmployees} disabled={fetching} className="aq-btn-ghost !py-2 !px-3 !text-xs">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
          </button>
          {canManage && (
            <button onClick={openAdd} className="aq-btn-primary !text-xs">
              <Plus size={14} /> Hire Employee
            </button>
          )}
        </div>
      </div>

      {/* Role access guide (collapsible) */}
      <RoleAccessGuide />

      {/* Stats KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: employees.length,                                               color: 'oklch(0.72 0.19 167)' },
          { label: 'Active',     value: employees.filter(e => e.status === 'active' || !e.status).length, color: 'oklch(0.72 0.17 155)' },
          { label: 'On Leave',   value: employees.filter(e => e.status === 'on_leave').length,           color: 'oklch(0.82 0.18 70)'  },
          { label: 'Terminated', value: employees.filter(e => e.status === 'terminated').length,         color: 'oklch(0.68 0.22 25)'  },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="aq-stat-card relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${s.color}10, ${s.color}04)`, border: `1px solid ${s.color}22` }}>
            <div className="absolute -right-4 -top-4 w-14 h-14 rounded-full opacity-10"
              style={{ background: `radial-gradient(circle, ${s.color}, transparent)` }} />
            <div className="relative">
              <p className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: `${s.color}99` }}>{s.label}</p>
              <p className="text-2xl font-display font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--aq-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, ID…" className="aq-input pl-8 !py-1.5 !text-xs" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="aq-input !py-1.5 !text-xs !w-auto">
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="aq-input !py-1.5 !text-xs !w-auto">
          <option value="All">All Roles</option>
          {ROLE_CONFIG.filter(r => r.value !== 'super_admin').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Employee Table */}
      <div className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--aq-glass-border)', background: 'oklch(0.72 0.19 167 / 0.03)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.1)' }}>
              <Users size={14} style={{ color: 'oklch(0.72 0.19 167)' }} />
            </div>
            <div>
              <p className="text-sm font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>Team Directory</p>
              <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {fetching ? (
          <div className="py-14 flex items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--aq-glass-border)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full aq-table">
              <thead><tr>
                <th className="text-left">Employee</th>
                <th className="text-left">Role & Access</th>
                <th className="text-left hidden md:table-cell">Department</th>
                <th className="text-left hidden lg:table-cell">Designation</th>
                <th className="text-left hidden lg:table-cell">Salary</th>
                <th className="text-left hidden lg:table-cell">Joined</th>
                <th className="text-left">Status</th>
                {canManage && <th className="text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {filtered.map(emp => {
                  const rc = roleCfg(emp.role);
                  return (
                    <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {emp.photoUrl
                            ? <img src={emp.photoUrl} className="w-8 h-8 rounded-xl object-cover" style={{ border: '1px solid var(--aq-glass-border)' }} alt={emp.name} />
                            : <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                                style={{ background: `linear-gradient(135deg, ${rc.color}30, ${rc.color}10)`, color: rc.color, border: `1px solid ${rc.color}25` }}>
                                {emp.name?.charAt(0)}
                              </div>}
                          <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--aq-text-primary)' }}>{emp.name}</p>
                            <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)', fontFamily: 'monospace' }}>{emp.empId ?? emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <span className={`aq-badge ${rc.badge}`}>{rc.label}</span>
                          <p style={{ fontSize: '9px', color: 'var(--aq-text-faint)', marginTop: '3px' }}>{rc.desc}</p>
                        </div>
                      </td>
                      <td className="hidden md:table-cell" style={{ fontSize: '10px', color: 'var(--aq-text-secondary)' }}>{emp.department ?? '—'}</td>
                      <td className="hidden lg:table-cell" style={{ fontSize: '10px', color: 'var(--aq-text-secondary)' }}>{emp.designation ?? '—'}</td>
                      <td className="hidden lg:table-cell" style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--aq-text-primary)' }}>
                        {emp.role === 'super_admin'
                          ? (isFounder ? `₹${Number(emp.salary).toLocaleString()}` : '—')
                          : (emp.salary ? `₹${Number(emp.salary).toLocaleString()}` : '—')}
                      </td>
                      <td className="hidden lg:table-cell" style={{ fontSize: '10px', color: 'var(--aq-text-muted)' }}>
                        {emp.joiningDate ? format(new Date(emp.joiningDate), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td>
                        <span className={`aq-badge ${emp.status === 'terminated' ? 'aq-badge-red' : emp.status === 'on_leave' ? 'aq-badge-amber' : 'aq-badge-green'}`}>
                          {(emp.status ?? 'active').replace('_', ' ')}
                        </span>
                      </td>
                      {canManage && emp.role !== 'super_admin' && (
                        <td className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(emp)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--aq-text-muted)' }}
                              onMouseOver={e => (e.currentTarget.style.color = 'oklch(0.72 0.19 167)')}
                              onMouseOut={e => (e.currentTarget.style.color = 'var(--aq-text-muted)')}>
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(emp)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--aq-text-muted)' }}
                              onMouseOver={e => (e.currentTarget.style.color = 'oklch(0.68 0.22 25)')}
                              onMouseOut={e => (e.currentTarget.style.color = 'var(--aq-text-muted)')}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                      {canManage && emp.role === 'super_admin' && (
                        <td className="text-right">
                          <span style={{ fontSize: '9px', color: 'var(--aq-text-faint)' }}>🔒 Protected</span>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12" style={{ fontSize: '12px', color: 'var(--aq-text-muted)' }}>
                    {search ? 'No employees found for your search' : 'No employees yet. Click "Hire Employee" to get started.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          HIRE / EDIT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'oklch(0 0 0 / 80%)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              className="w-full max-w-xl glass-panel overflow-hidden max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--aq-glass-border)', background: 'oklch(0.72 0.19 167 / 0.04)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
                      {editTarget ? '✏️ Edit Employee' : '👤 Hire New Employee'}
                    </h3>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
                      {editTarget
                        ? `Editing: ${editTarget.name} · ${editTarget.empId}`
                        : 'Employee will log in to this portal with empId + password'}
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
                <form onSubmit={handleSave} className="space-y-4">

                  {/* Role selector — at top so it's prominent */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--aq-text-muted)' }}>
                      Role <span style={{ color: 'oklch(0.72 0.19 167)', fontWeight: 400, textTransform: 'none' }}>· determines what this employee can see</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ROLE_CONFIG.filter(r => r.value !== 'super_admin').map(r => (
                        <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                          className="p-2.5 rounded-xl text-left transition-all"
                          style={{
                            background: form.role === r.value ? `${r.color}12` : 'var(--aq-input-bg)',
                            border: `1px solid ${form.role === r.value ? `${r.color}40` : 'var(--aq-input-border)'}`,
                          }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                            <span style={{ fontSize: '10px', fontWeight: 800, color: form.role === r.value ? r.color : 'var(--aq-text-secondary)' }}>
                              {r.label}
                            </span>
                          </div>
                          <p style={{ fontSize: '8px', color: 'var(--aq-text-faint)', lineHeight: 1.4 }}>{r.desc}</p>
                        </button>
                      ))}
                    </div>
                    {/* Access preview */}
                    <div className="mt-2.5 p-2.5 rounded-xl flex flex-wrap gap-1.5"
                      style={{ background: `${roleCfg(form.role).color}08`, border: `1px solid ${roleCfg(form.role).color}20` }}>
                      <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--aq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', width: '100%' }}>
                        Portal access:
                      </span>
                      {roleCfg(form.role).access.map(a => (
                        <span key={a} style={{ fontSize: '8px', fontWeight: 700, color: roleCfg(form.role).color,
                          background: `${roleCfg(form.role).color}12`, padding: '2px 6px', borderRadius: '4px' }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Basic info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Full Name"         name="name"        required placeholder="e.g. Ravi Kumar"     />
                    <InputField label="Employee ID"       name="empId"                placeholder="e.g. AQ-EMP05"        />
                    <InputField label="Email Address"     name="email"       type="email" required placeholder="emp@aquagrow.com" />
                    <InputField label="Phone"             name="phone"       type="tel"   placeholder="9876543210"        />
                    <InputField label="Designation"       name="designation"            placeholder="e.g. Field Technician" />
                    <InputField label="Salary (₹/month)"  name="salary"      type="number" placeholder="30000"           />
                    <InputField label="Joining Date"      name="joiningDate" type="date" />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>Department</label>
                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="aq-input text-sm">
                      <option value="">Select department…</option>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Password — only for new hire */}
                  {!editTarget && (
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>
                        Login Password <span style={{ color: 'oklch(0.72 0.19 167)', fontWeight: 400, textTransform: 'none' }}>· auto-generated, editable</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input type={showPw ? 'text' : 'password'} value={password} required
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Min 6 characters" className="aq-input text-sm font-mono pr-9 w-full" />
                          <button type="button" onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aq-text-muted)' }}>
                            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                        <button type="button"
                          onClick={() => setPassword(generatePassword(form.name || 'User', form.empId ?? ''))}
                          className="aq-btn-ghost !py-2 !px-3 !text-xs shrink-0" title="Regenerate">
                          <RefreshCw size={12} />
                        </button>
                      </div>
                      <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)', marginTop: '6px' }}>
                        <Lock size={8} style={{ display: 'inline', marginRight: '4px' }} />
                        Employee uses <strong style={{ color: 'var(--aq-text-primary)' }}>Employee ID + this password</strong> to login to the portal.
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'var(--aq-text-muted)' }}>Status</label>
                    <div className="flex gap-2">
                      {STATUS_OPTS.map(s => (
                        <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all"
                          style={form.status === s
                            ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }
                            : { background: 'var(--aq-input-bg)', color: 'var(--aq-text-muted)', border: '1px solid var(--aq-input-border)' }}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowModal(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                    <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                      <Save size={14} />
                      {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Hire & Create Login'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credentials Card */}
      <AnimatePresence>
        {credentials && (
          <CredentialsCard
            name={credentials.name}
            empId={credentials.empId}
            password={credentials.password}
            role={credentials.role}
            onClose={() => setCredentials(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeOnboarding;
