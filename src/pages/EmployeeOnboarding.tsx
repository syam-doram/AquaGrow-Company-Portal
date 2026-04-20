import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, ROLE_LABELS, DEPARTMENTS, type EmployeeRole } from '../context/AuthContext';
import {
  Users, Plus, Search, Edit2, Trash2, X, Save, UserCheck,
  Mail, Phone, Building2, Calendar, ShieldCheck, ChevronDown, RefreshCw,
  Key, Copy, CheckCircle, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import hrmsApi from '../api';

// ── Role Config ───────────────────────────────────────────────────────────────
const HRMS_ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'super_admin',         label: 'Super Admin' },
  { value: 'hr_manager',          label: 'HR Manager' },
  { value: 'finance_manager',     label: 'Finance Manager' },
  { value: 'operations_manager',  label: 'Operations Manager' },
  { value: 'support_agent',       label: 'Support Agent' },
  { value: 'employee',            label: 'Employee' },
];

/** Maps HRMS role → Admin panel role (if applicable) */
const ADMIN_ROLE_MAP: Partial<Record<EmployeeRole, string>> = {
  super_admin:        'super_admin',
  hr_manager:         'hr_admin',
  finance_manager:    'finance_admin',
  operations_manager: 'operations_admin',
  support_agent:      'support_admin',
};

const isAdminRole = (role: EmployeeRole) => role in ADMIN_ROLE_MAP;

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'aq-badge-purple', hr_manager: 'aq-badge-green',
  finance_manager: 'aq-badge-blue', operations_manager: 'aq-badge-amber',
  support_agent: 'aq-badge-red', employee: 'aq-badge-blue',
};

const STATUS_OPTS = ['active', 'inactive', 'on_leave', 'terminated'];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; uid: string; name: string; email: string;
  role: EmployeeRole; department?: string; phone?: string;
  salary?: number; status?: string; joiningDate?: string;
  empId?: string; photoUrl?: string;
}

const EMPTY_EMP: Omit<Employee, 'id' | 'uid'> = {
  name: '', email: '', role: 'employee', department: '',
  phone: '', salary: 0, status: 'active',
  joiningDate: format(new Date(), 'yyyy-MM-dd'), empId: '',
};

// ── Password generator ────────────────────────────────────────────────────────
function generatePassword(name: string): string {
  const first = (name.split(' ')[0] ?? 'User').replace(/[^a-zA-Z]/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${first.charAt(0).toUpperCase()}${first.slice(1, 4)}@${suffix}`;
}

// ── Admin Credentials Card (shown after hire) ─────────────────────────────────
const CredentialsCard: React.FC<{
  name: string; phone: string; password: string; adminRole: string; onClose: () => void;
}> = ({ name, phone, password, adminRole, onClose }) => {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
        className="w-full max-w-md glass-panel p-6"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mb-5 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'oklch(0.72 0.19 167 / 0.15)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }}>
            <Key size={24} style={{ color: 'oklch(0.72 0.19 167)' }} />
          </div>
          <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            ✅ Admin Account Created!
          </h3>
          <p className="text-xs text-[oklch(0.55_0.02_210)] mt-1">
            Share these credentials with <span className="text-white font-semibold">{name}</span> securely.
          </p>
        </div>

        {/* Alert */}
        <div className="mb-4 p-3 rounded-xl flex gap-2.5"
          style={{ background: 'oklch(0.78 0.17 70 / 0.1)', border: '1px solid oklch(0.78 0.17 70 / 0.25)' }}>
          <AlertTriangle size={14} style={{ color: 'oklch(0.78 0.17 70)', flexShrink: 0, marginTop: '2px' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: 'oklch(0.78 0.17 70)' }}>
            This password is shown only once. Please copy and share it with the employee now.
          </p>
        </div>

        {/* Credential rows */}
        <div className="space-y-2.5 mb-5">
          {[
            { label: 'Admin Panel', value: 'aquagrow.onrender.com/admin', field: 'url' },
            { label: 'Phone / Login ID', value: phone, field: 'phone' },
            { label: 'Role', value: adminRole.replace('_', ' '), field: 'role', noCopy: true },
          ].map(row => (
            <div key={row.field} className="flex items-center justify-between rounded-xl px-4 py-2.5"
              style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.4_0.02_210)]">{row.label}</p>
                <p className="text-xs font-mono font-bold text-white mt-0.5">{row.value}</p>
              </div>
              {!row.noCopy && (
                <button onClick={() => copy(row.value, row.field)}
                  className="p-1.5 rounded-lg hover:bg-white/8 text-[oklch(0.5_0.02_210)] hover:text-white transition-colors">
                  {copied === row.field ? <CheckCircle size={13} style={{ color: 'oklch(0.72 0.19 167)' }} /> : <Copy size={13} />}
                </button>
              )}
            </div>
          ))}

          {/* Password row */}
          <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.4_0.02_210)]">Password (one-time)</p>
              <p className="text-xs font-mono font-bold text-white mt-0.5">
                {showPw ? password : '•'.repeat(password.length)}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowPw(v => !v)}
                className="p-1.5 rounded-lg hover:bg-white/8 text-[oklch(0.5_0.02_210)] hover:text-white transition-colors">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button onClick={() => copy(password, 'password')}
                className="p-1.5 rounded-lg hover:bg-white/8 text-[oklch(0.5_0.02_210)] hover:text-white transition-colors">
                {copied === 'password' ? <CheckCircle size={13} style={{ color: 'oklch(0.72 0.19 167)' }} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="aq-btn-primary w-full justify-center">
          <CheckCircle size={14} /> Done — Credentials Noted
        </button>
      </motion.div>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const EmployeeOnboarding: React.FC = () => {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ ...EMPTY_EMP });
  const [password, setPassword] = useState('');           // auto-generated for admin roles
  const [provisionAdmin, setProvisionAdmin] = useState(false); // whether to also create admin user
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [credentials, setCredentials] = useState<{ name: string; phone: string; password: string; adminRole: string } | null>(null);
  const canManage = hasPermission('manage_employees');

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

  // Auto-generate password when role changes (for admin-eligible roles)
  useEffect(() => {
    if (isAdminRole(form.role) && !editTarget) {
      setProvisionAdmin(true);
      setPassword(generatePassword(form.name || 'User'));
    } else {
      setProvisionAdmin(false);
    }
  }, [form.role, form.name, editTarget]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_EMP, empId: `AQ-${Date.now().toString().slice(-5)}` });
    setPassword('');
    setProvisionAdmin(false);
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({
      name: emp.name, email: emp.email, role: emp.role,
      department: emp.department ?? '', phone: emp.phone ?? '',
      salary: emp.salary ?? 0, status: emp.status ?? 'active',
      joiningDate: emp.joiningDate ?? format(new Date(), 'yyyy-MM-dd'),
      empId: emp.empId ?? '',
    });
    setPassword('');
    setProvisionAdmin(false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        // ── Update existing employee ──────────────────────────────
        await hrmsApi.employees.update(editTarget.id, form);
        toast.success('Employee record updated!');
        setShowModal(false);
        await fetchEmployees();
      } else {
        // ── Create new employee (hire) ────────────────────────────
        await hrmsApi.employees.create(form);

        // ── If admin role selected, also provision admin panel account ──
        if (provisionAdmin && isAdminRole(form.role) && form.phone) {
          const adminRole = ADMIN_ROLE_MAP[form.role]!;
          const pw = password || generatePassword(form.name);
          try {
            await hrmsApi.adminUsers.create({
              name: form.name,
              phoneNumber: form.phone,
              password: pw,
              role: adminRole,
              email: form.email || undefined,
              location: form.department || undefined,
            });
            // Show credentials card
            setCredentials({ name: form.name, phone: form.phone, password: pw, adminRole });
            toast.success(`✅ ${form.name} hired and admin account provisioned!`);
          } catch (adminErr: any) {
            // Admin provisioning failed but employee was created — warn HR
            toast.warning(`Employee created, but admin provisioning failed: ${adminErr.message}. Create the admin account manually via RBAC.`);
          }
        } else {
          toast.success(`${form.name} added to the portal!`);
        }

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

  const InputField = ({ label, name, type = 'text', required = false }: { label: string; name: keyof typeof form; type?: string; required?: boolean }) => (
    <div>
      <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">{label}</label>
      <input type={type} required={required} value={String(form[name] ?? '')}
        onChange={e => setForm(f => ({ ...f, [name]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="aq-input text-sm" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Employee Management</h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">
            {fetching ? 'Loading…' : `${filtered.length} of ${employees.length} employees`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchEmployees} disabled={fetching} className="aq-btn-ghost !py-2 !px-3 !text-xs">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
          </button>
          {canManage && (
            <button onClick={openAdd} className="aq-btn-primary !text-xs !py-2">
              <Plus size={14} /> Hire Employee
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, ID…" className="aq-input pl-8 !py-1.5 !text-xs" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="aq-input !py-1.5 !text-xs !w-auto">
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="aq-input !py-1.5 !text-xs !w-auto">
          <option value="All">All Roles</option>
          {HRMS_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: employees.length,                                                  color: 'oklch(0.72 0.19 167)' },
          { label: 'Active',     value: employees.filter(e => e.status === 'active' || !e.status).length,  color: 'oklch(0.72 0.17 155)' },
          { label: 'On Leave',   value: employees.filter(e => e.status === 'on_leave').length,             color: 'oklch(0.78 0.17 70)' },
          { label: 'Terminated', value: employees.filter(e => e.status === 'terminated').length,           color: 'oklch(0.65 0.22 25)' },
        ].map(s => (
          <div key={s.label} className="aq-stat-card">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employee Table */}
      <div className="glass-panel overflow-hidden">
        {fetching ? (
          <div className="py-14 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[oklch(0.72_0.19_167/0.2)] border-t-[oklch(0.72_0.19_167)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full aq-table">
              <thead><tr>
                <th className="text-left">Employee</th>
                <th className="text-left">Role</th>
                <th className="text-left hidden md:table-cell">Department</th>
                <th className="text-left hidden lg:table-cell">Salary</th>
                <th className="text-left hidden lg:table-cell">Joined</th>
                <th className="text-left">Status</th>
                {canManage && <th className="text-right">Actions</th>}
              </tr></thead>
              <tbody>
                {filtered.map((emp) => (
                  <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {emp.photoUrl
                          ? <img src={emp.photoUrl} className="w-8 h-8 rounded-xl object-cover border border-white/10" alt={emp.name} />
                          : <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] text-xs font-bold">
                              {emp.name?.charAt(0)}
                            </div>}
                        <div>
                          <p className="text-xs font-semibold text-white">{emp.name}</p>
                          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{emp.empId ?? emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className={`aq-badge ${ROLE_BADGE[emp.role] ?? 'aq-badge-blue'} capitalize`}>{(emp.role ?? '').replace(/_/g, ' ')}</span>
                        {isAdminRole(emp.role) && (
                          <span title="Has Admin Panel access" style={{ color: 'oklch(0.72 0.19 167)' }}>
                            <ShieldCheck size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-[10px] text-[oklch(0.6_0.02_210)]">{emp.department ?? '—'}</td>
                    <td className="hidden lg:table-cell text-xs font-mono text-white">
                      {emp.salary ? `₹${Number(emp.salary).toLocaleString()}` : '—'}
                    </td>
                    <td className="hidden lg:table-cell text-[10px] text-[oklch(0.55_0.02_210)]">
                      {emp.joiningDate ? format(new Date(emp.joiningDate), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td>
                      <span className={`aq-badge ${emp.status === 'terminated' ? 'aq-badge-red' : emp.status === 'on_leave' ? 'aq-badge-amber' : 'aq-badge-green'}`}>
                        {(emp.status ?? 'active').replace('_', ' ')}
                      </span>
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-white/8 text-[oklch(0.5_0.02_210)] hover:text-[oklch(0.72_0.19_167)] transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(emp)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[oklch(0.5_0.02_210)] hover:text-[oklch(0.75_0.18_25)] transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-[oklch(0.45_0.02_210)] text-xs">
                    {search ? 'No employees found for your search' : 'No employees yet. Click "Hire Employee" to get started.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-xl glass-panel p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {editTarget ? 'Edit Employee' : '👤 Hire New Employee'}
                  </h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">
                    {editTarget ? `Editing: ${editTarget.name}` : 'Fill in the employee details below'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Full Name"          name="name"        required />
                  <InputField label="Employee ID"        name="empId" />
                  <InputField label="Email Address"      name="email"       type="email" required />
                  <InputField label="Phone (login ID)"   name="phone"       type="tel" />
                  <InputField label="Salary (₹/month)"   name="salary"      type="number" />
                  <InputField label="Joining Date"       name="joiningDate" type="date" />
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Role</label>
                  <select value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as EmployeeRole }))}
                    className="aq-input text-sm">
                    {HRMS_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {/* Admin Panel provisioning notice */}
                {!editTarget && isAdminRole(form.role) && (
                  <div className="rounded-xl p-4 space-y-3"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.07)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} style={{ color: 'oklch(0.72 0.19 167)' }} />
                      <p className="text-xs font-bold text-white">Admin Panel Access</p>
                    </div>
                    <p className="text-[10px] text-[oklch(0.6_0.02_210)] leading-relaxed">
                      This role maps to <strong className="text-white">{ADMIN_ROLE_MAP[form.role]?.replace(/_/g, ' ')}</strong> on the Admin Panel.
                      An account will automatically be provisioned so this employee can login to the admin portal.
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setProvisionAdmin(v => !v)}
                          className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative ${provisionAdmin ? 'bg-[oklch(0.72_0.19_167)]' : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${provisionAdmin ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                        <span className="text-[10px] text-[oklch(0.6_0.02_210)]">Create admin account for this employee</span>
                      </label>
                    </div>
                    {provisionAdmin && (
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">
                          Admin Password (auto-generated)
                        </label>
                        <div className="flex gap-2">
                          <input value={password} onChange={e => setPassword(e.target.value)}
                            className="aq-input text-sm flex-1 font-mono" placeholder="Auto-generated…" />
                          <button type="button"
                            onClick={() => setPassword(generatePassword(form.name || 'User'))}
                            className="aq-btn-ghost !py-2 !px-3 !text-xs shrink-0">
                            <RefreshCw size={12} />
                          </button>
                        </div>
                        <p className="text-[9px] text-[oklch(0.4_0.02_210)] mt-1.5">
                          Employee will use their phone number + this password to login to the admin panel.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Department */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="aq-input text-sm">
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {STATUS_OPTS.map(s => (
                      <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all"
                        style={form.status === s
                          ? { background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }
                          : { background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <Save size={14} />
                    {saving ? 'Saving…' : editTarget ? 'Save Changes' : (provisionAdmin && isAdminRole(form.role)) ? 'Hire & Provision' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Credentials Card */}
      <AnimatePresence>
        {credentials && (
          <CredentialsCard
            name={credentials.name}
            phone={credentials.phone}
            password={credentials.password}
            adminRole={credentials.adminRole}
            onClose={() => setCredentials(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeOnboarding;
