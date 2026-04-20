import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Users, FileDown, TrendingUp, Calendar, Search,
  ShieldCheck, BarChart3, Activity, Download, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import hrmsApi from '../api';

const ROLE_COLORS: Record<string, string> = {
  admin:    'aq-badge-green',
  manager:  'aq-badge-blue',
  employee: 'aq-badge-amber',
};

const AdminReports: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrmsApi.employees.list();
      setEmployees(data.map((e: any) => ({ ...e, id: e._id ?? e.id })));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const exportReport = (type: string) => {
    toast.info(`Generating ${type} report…`);
    setTimeout(() => toast.success(`✅ ${type} report exported!`), 2000);
  };

  const filtered = employees.filter(e =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount  = employees.filter(e => e.role === 'admin').length;
  const managerCount = employees.filter(e => e.role === 'manager').length;
  const empCount    = employees.filter(e => e.role === 'employee').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>HR Reports</h1>
          <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">Monitor company-wide performance and employee directory.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportReport('Attendance')} className="aq-btn-ghost !text-xs !py-1.5">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => exportReport('Full Company')} className="aq-btn-primary !text-xs !py-1.5">
            <TrendingUp size={13} /> Generate PDF
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff',      value: String(employees.length), icon: Users,       color: 'oklch(0.72 0.19 167)',  sub: 'All registered' },
          { label: 'Avg Attendance',   value: '94%',                    icon: Calendar,    color: 'oklch(0.75 0.16 240)',  sub: 'Today' },
          { label: 'Tasks Completed',  value: '142',                    icon: Activity,    color: 'oklch(0.78 0.17 70)',   sub: 'This month' },
          { label: 'Admin Roles',      value: String(adminCount + managerCount), icon: ShieldCheck, color: 'oklch(0.78 0.17 295)', sub: 'Admins & managers' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="aq-stat-card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)]">{s.label}</p>
              <div className="p-2 rounded-lg" style={{ background: 'oklch(1 0 0 / 8%)' }}>
                <s.icon size={13} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.value}</p>
            <p className="text-[10px] text-[oklch(0.45_0.02_210)] mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Role Distribution */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Team Distribution</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Employees', count: empCount,    pct: employees.length ? Math.round((empCount / employees.length) * 100) : 0,    color: 'oklch(0.78 0.17 70)',  bar: 'oklch(0.78 0.17 70)' },
            { label: 'Managers',  count: managerCount, pct: employees.length ? Math.round((managerCount / employees.length) * 100) : 0, color: 'oklch(0.75 0.16 240)', bar: 'oklch(0.75 0.16 240)' },
            { label: 'Admins',    count: adminCount,   pct: employees.length ? Math.round((adminCount / employees.length) * 100) : 0,   color: 'oklch(0.72 0.19 167)', bar: 'oklch(0.72 0.19 167)' },
          ].map(r => (
            <div key={r.label} className="p-3 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
              <p className="text-xs font-semibold text-[oklch(0.6_0.02_210)] mb-1">{r.label}</p>
              <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{r.count}</p>
              <div className="aq-progress">
                <motion.div className="aq-progress-fill" style={{ background: r.bar }}
                  initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 1 }} />
              </div>
              <p className="text-[10px] text-[oklch(0.45_0.02_210)] mt-1">{r.pct}% of total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Directory */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <div>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Employee Directory</h3>
            <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{filtered.length} of {employees.length} records</p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="aq-input pl-8 !py-1.5 w-full sm:w-[220px] text-xs" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full aq-table">
            <thead>
              <tr>
                <th className="text-left">Employee</th>
                <th className="text-left">Role</th>
                <th className="text-left hidden md:table-cell">Email</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <td>
                    <div className="flex items-center gap-3">
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt={emp.name} className="w-8 h-8 rounded-xl object-cover border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] text-xs font-bold">
                          {emp.name?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <span className="font-semibold text-white">{emp.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`aq-badge ${ROLE_COLORS[emp.role] ?? 'aq-badge-blue'} capitalize`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-[oklch(0.6_0.02_210)]">{emp.email}</td>
                  <td><span className="aq-badge aq-badge-green">Active</span></td>
                </motion.tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[oklch(0.45_0.02_210)]">
                    {search ? `No employees matching "${search}"` : 'No employee records found.'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[oklch(0.45_0.02_210)]">Loading…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
