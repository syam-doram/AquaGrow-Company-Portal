import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, where, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Users, Clock, CalendarDays, Ticket, TrendingUp, AlertCircle,
  CheckCircle, Activity, Banknote, Target, ArrowUpRight, UserCheck,
  Building2, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DEPT_COLORS = [
  'oklch(0.72 0.19 167)', 'oklch(0.75 0.16 240)', 'oklch(0.78 0.17 70)',
  'oklch(0.78 0.17 295)', 'oklch(0.75 0.18 25)', 'oklch(0.6 0.16 187)',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-panel px-3 py-2 text-xs">
        <p className="font-bold text-white">{label}</p>
        <p className="text-[oklch(0.72_0.19_167)]">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const KpiCard = ({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<any>; color: string; trend?: string;
}) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="aq-stat-card group">
    <div className="flex items-start justify-between mb-3">
      <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)]">{label}</p>
      <div className="p-2 rounded-lg" style={{ background: 'oklch(1 0 0 / 6%)' }}>
        <Icon size={13} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif', color }}>{value}</p>
    <div className="flex items-center gap-2 mt-1">
      {sub && <p className="text-[10px] text-[oklch(0.45_0.02_210)]">{sub}</p>}
      {trend && (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-[oklch(0.72_0.19_167)]">
          <ArrowUpRight size={10} />{trend}
        </span>
      )}
    </div>
  </motion.div>
);

const HRDashboard: React.FC = () => {
  const { employee } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'employees')), s => setEmployees(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'leaves'), where('status', '==', 'pending')), s => setLeaves(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'tickets'), where('status', 'in', ['open', 'in_progress'])), s => setTickets(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'tasks'), where('status', '!=', 'completed'), limit(5)), s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Derived stats
  const active    = employees.filter(e => e.status !== 'terminated').length;
  const depts     = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const deptData  = depts.map(d => ({ name: d, count: employees.filter(e => e.department === d).length }));

  const roleData = [
    { name: 'Employee',   value: employees.filter(e => e.role === 'employee').length },
    { name: 'Manager',    value: employees.filter(e => ['hr_manager','operations_manager','finance_manager'].includes(e.role)).length },
    { name: 'Support',    value: employees.filter(e => e.role === 'support_agent').length },
    { name: 'Admin',      value: employees.filter(e => e.role === 'super_admin').length },
  ].filter(r => r.value > 0);

  const ticketsByPriority = {
    high:   tickets.filter(t => t.priority === 'high').length,
    medium: tickets.filter(t => t.priority === 'medium').length,
    low:    tickets.filter(t => t.priority === 'low').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>HR Dashboard</h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')} · {active} staff active</p>
        </div>
        <div className="aq-badge aq-badge-green px-3 py-1.5 text-[10px]">
          <Activity size={10} /> Live
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Staff"       value={employees.length} sub={`${active} active`}              icon={Users}        color="oklch(0.72 0.19 167)"  trend="+3 this month" />
        <KpiCard label="Pending Leaves"    value={leaves.length}    sub="Awaiting approval"               icon={CalendarDays} color="oklch(0.78 0.17 70)" />
        <KpiCard label="Open Tickets"      value={tickets.length}   sub={`${ticketsByPriority.high} high priority`} icon={Ticket} color="oklch(0.75 0.18 25)" />
        <KpiCard label="Open Tasks"        value={tasks.length}     sub="Across all teams"                icon={CheckCircle}  color="oklch(0.75 0.16 240)" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Breakdown */}
        <div className="lg:col-span-2 glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Staff by Department</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{depts.length} departments</p>
            </div>
          </div>
          {deptData.length > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} barSize={24}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }}
                    tickFormatter={v => v.split(' ')[0]} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(1 0 0 / 3%)' }} />
                  <Bar dataKey="count" fill="oklch(0.72 0.19 167)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-[oklch(0.4_0.02_210)] text-sm">
              No department data yet — add employees to see breakdown
            </div>
          )}
        </div>

        {/* Role Distribution */}
        <div className="glass-panel p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Role Split</h3>
            <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{employees.length} total</p>
          </div>
          {roleData.length > 0 ? (
            <>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                      dataKey="value" paddingAngle={3}>
                      {roleData.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {roleData.map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                      <span className="text-[oklch(0.6_0.02_210)]">{r.name}</span>
                    </div>
                    <span className="font-bold text-white">{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-[oklch(0.4_0.02_210)] text-sm text-center">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Leaves */}
        <div className="glass-panel overflow-hidden">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Pending Leave Requests</h3>
            <span className="aq-badge aq-badge-amber">{leaves.length}</span>
          </div>
          <div className="divide-y divide-white/5">
            {leaves.slice(0, 4).map((l, i) => (
              <div key={l.id} className="p-3.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
                <div className="p-2 rounded-lg bg-[oklch(0.78_0.17_70/0.1)]">
                  <CalendarDays size={13} className="text-[oklch(0.78_0.17_70)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white capitalize">{l.type} Leave</p>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{l.from} → {l.to} · {l.reason?.slice(0, 30)}</p>
                </div>
                <span className="aq-badge aq-badge-amber text-[8px]">Pending</span>
              </div>
            ))}
            {leaves.length === 0 && (
              <div className="py-8 text-center text-[oklch(0.45_0.02_210)] text-xs">No pending leaves ✅</div>
            )}
          </div>
        </div>

        {/* Open Tickets */}
        <div className="glass-panel overflow-hidden">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Open Tickets</h3>
            <span className="aq-badge aq-badge-red">{ticketsByPriority.high} high</span>
          </div>
          <div className="divide-y divide-white/5">
            {tickets.slice(0, 4).map((t) => (
              <div key={t.id} className="p-3.5 flex items-center gap-3 hover:bg-white/2 transition-colors">
                <div className={`p-2 rounded-lg ${t.priority === 'high' ? 'bg-[oklch(0.65_0.22_25/0.12)]' : 'bg-[oklch(0.78_0.17_70/0.1)]'}`}>
                  <Ticket size={13} className={t.priority === 'high' ? 'text-[oklch(0.75_0.18_25)]' : 'text-[oklch(0.78_0.17_70)]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{t.title ?? t.subject ?? 'Ticket'}</p>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)] capitalize">{t.category} · {t.status?.replace('_', ' ')}</p>
                </div>
                <span className={`aq-badge ${t.priority === 'high' ? 'aq-badge-red' : 'aq-badge-amber'} text-[8px]`}>
                  {t.priority}
                </span>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="py-8 text-center text-[oklch(0.45_0.02_210)] text-xs">No open tickets ✅</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Employees */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Employee Directory</h3>
          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{employees.length} registered</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full aq-table">
            <thead><tr>
              <th className="text-left">Name</th>
              <th className="text-left">Role</th>
              <th className="text-left hidden md:table-cell">Department</th>
              <th className="text-left hidden lg:table-cell">Email</th>
              <th className="text-left">Status</th>
            </tr></thead>
            <tbody>
              {employees.slice(0, 8).map((emp, i) => (
                <tr key={emp.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      {emp.photoUrl
                        ? <img src={emp.photoUrl} className="w-7 h-7 rounded-xl object-cover" alt={emp.name} />
                        : <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] text-[10px] font-bold">
                            {emp.name?.charAt(0)}
                          </div>}
                      <span className="text-xs font-semibold text-white">{emp.name}</span>
                    </div>
                  </td>
                  <td><span className="text-[10px] text-[oklch(0.65_0.02_210)] capitalize">{(emp.role ?? '').replace('_', ' ')}</span></td>
                  <td className="hidden md:table-cell text-[10px] text-[oklch(0.55_0.02_210)]">{emp.department ?? '—'}</td>
                  <td className="hidden lg:table-cell text-[10px] text-[oklch(0.55_0.02_210)]">{emp.email}</td>
                  <td>
                    <span className={`aq-badge ${emp.status === 'active' || !emp.status ? 'aq-badge-green' : emp.status === 'on_leave' ? 'aq-badge-amber' : 'aq-badge-red'}`}>
                      {emp.status ?? 'active'}
                    </span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-[oklch(0.45_0.02_210)] text-xs">
                  No employees yet. Add employees from the Employee Management section.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
