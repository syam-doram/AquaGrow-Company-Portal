import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, ROLE_LABELS, DEPARTMENTS, type EmployeeRole } from '../context/AuthContext';
import {
  Users, Plus, Search, Edit2, Trash2, X, Save, UserCheck,
  Mail, Phone, Building2, Calendar, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'super_admin',         label: 'Super Admin' },
  { value: 'hr_manager',          label: 'HR Manager' },
  { value: 'finance_manager',     label: 'Finance Manager' },
  { value: 'operations_manager',  label: 'Operations Manager' },
  { value: 'support_agent',       label: 'Support Agent' },
  { value: 'employee',            label: 'Employee' },
];

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'aq-badge-purple', hr_manager: 'aq-badge-green',
  finance_manager: 'aq-badge-blue', operations_manager: 'aq-badge-amber',
  support_agent: 'aq-badge-red', employee: 'aq-badge-blue',
};

const STATUS_OPTS = ['active','inactive','on_leave','terminated'];

interface Employee {
  id: string; uid: string; name: string; email: string;
  role: EmployeeRole; department?: string; phone?: string;
  salary?: number; status?: string; joiningDate?: string;
  empId?: string; photoUrl?: string;
}

const EMPTY_EMP: Omit<Employee, 'id' | 'uid'> = {
  name: '', email: '', role: 'employee',
  department: '', phone: '', salary: 0,
  status: 'active', joiningDate: format(new Date(), 'yyyy-MM-dd'), empId: '',
};

const EmployeeOnboarding: React.FC = () => {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_EMP);
  const [saving, setSaving] = useState(false);
  const canManage = hasPermission('manage_employees');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'employees'), orderBy('name')), snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    });
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_EMP, empId: `AQ-${Date.now().toString().slice(-5)}` });
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({ name: emp.name, email: emp.email, role: emp.role, department: emp.department ?? '', phone: emp.phone ?? '', salary: emp.salary ?? 0, status: emp.status ?? 'active', joiningDate: emp.joiningDate ?? '', empId: emp.empId ?? '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        await updateDoc(doc(db, 'employees', editTarget.id), { ...form, updatedAt: Timestamp.now() });
        toast.success('Employee record updated!');
      } else {
        await addDoc(collection(db, 'employees'), {
          ...form,
          createdAt: Timestamp.now(),
          uid: form.email.replace(/[^a-z0-9]/gi, '_'),
        });
        toast.success(`${form.name} added to the portal!`);
      }
      setShowModal(false);
    } catch (err) {
      toast.error('Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'employees', emp.id));
      toast.success('Employee removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = employees.filter(e => {
    const s = search.toLowerCase();
    const matchSearch = !s || e.name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || (e.empId ?? '').toLowerCase().includes(s);
    const matchDept = filterDept === 'All' || e.department === filterDept;
    const matchRole = filterRole === 'All' || e.role === filterRole;
    return matchSearch && matchDept && matchRole;
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
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">{filtered.length} of {employees.length} employees</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canManage && (
            <button onClick={openAdd} className="aq-btn-primary !text-xs !py-2">
              <Plus size={14} /> Add Employee
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
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="aq-input !py-1.5 !text-xs !w-auto">
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="aq-input !py-1.5 !text-xs !w-auto">
          <option value="All">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: employees.length,                                               color: 'oklch(0.72 0.19 167)' },
          { label: 'Active',     value: employees.filter(e => e.status === 'active' || !e.status).length, color: 'oklch(0.72 0.17 155)' },
          { label: 'On Leave',   value: employees.filter(e => e.status === 'on_leave').length,          color: 'oklch(0.78 0.17 70)' },
          { label: 'Terminated', value: employees.filter(e => e.status === 'terminated').length,        color: 'oklch(0.65 0.22 25)' },
        ].map(s => (
          <div key={s.label} className="aq-stat-card">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
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
                  <td><span className={`aq-badge ${ROLE_BADGE[emp.role] ?? 'aq-badge-blue'} capitalize`}>{(emp.role ?? '').replace('_', ' ')}</span></td>
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
                  {search ? 'No employees found for your search' : 'No employees yet. Click "Add Employee" to get started.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
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
                    {editTarget ? 'Edit Employee' : 'Add New Employee'}
                  </h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">
                    {editTarget ? `Editing: ${editTarget.name}` : 'Fill in the employee details below'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Full Name"   name="name"   required />
                  <InputField label="Employee ID" name="empId" />
                  <InputField label="Email Address" name="email" type="email" required />
                  <InputField label="Phone"       name="phone" type="tel" />
                  <InputField label="Salary (₹/month)" name="salary" type="number" />
                  <InputField label="Joining Date" name="joiningDate" type="date" />
                </div>
                {/* Role */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as EmployeeRole }))} className="aq-input text-sm">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
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
                        style={form.status === s ? { background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' } : { background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <Save size={14} /> {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Employee'}
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

export default EmployeeOnboarding;
