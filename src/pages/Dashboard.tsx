import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Clock, Calendar, CreditCard, TrendingUp, ArrowUpRight,
  Star, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';


interface AttendanceRecord { id: string; date: string; checkIn: Timestamp; checkOut?: Timestamp; workingHours?: number; }

const weekData = [
  { day: 'Mon', hours: 8.0 }, { day: 'Tue', hours: 7.5 }, { day: 'Wed', hours: 9.0 },
  { day: 'Thu', hours: 8.5 }, { day: 'Fri', hours: 8.0 }, { day: 'Sat', hours: 4.0 }, { day: 'Sun', hours: 0 },
];

const perfData = [
  { month: 'Jan', score: 78 }, { month: 'Feb', score: 83 }, { month: 'Mar', score: 87 },
  { month: 'Apr', score: 91 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-panel px-3 py-2">
        <p className="text-[10px] text-[oklch(0.5_0.02_210)] uppercase font-bold">{label}</p>
        <p className="text-sm font-bold text-[oklch(0.72_0.19_167)]">{payload[0].value}{payload[0].unit ?? ''}</p>
      </div>
    );
  }
  return null;
};

const StatCard = ({ label, value, sub, icon: Icon, color, delay }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<any>; color: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay ?? 0, duration: 0.4, ease: 'easeOut' }}
    className="aq-stat-card group"
  >
    <div className="flex items-start justify-between mb-3">
      <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)]">{label}</p>
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`} style={{ background: `${color}15` }}>
        <Icon size={14} className={color} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
    {sub && <p className="text-[10px] text-[oklch(0.45_0.02_210)]">{sub}</p>}
  </motion.div>
);

const Dashboard: React.FC = () => {
  const { employee } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [todayAt, setTodayAt] = useState<AttendanceRecord | null>(null);
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Live attendance
  useEffect(() => {
    if (!employee) return;
    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', employee.uid),
      orderBy('checkIn', 'desc'),
      limit(7)
    );
    const unsubscribe = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendance(docs);
      const today = format(new Date(), 'yyyy-MM-dd');
      setTodayAt(docs.find(r => r.date === today) ?? null);
    }, err => handleFirestoreError(err, OperationType.LIST, 'attendance'));
    return () => unsubscribe();
  }, [employee]);


  const attendanceStatus = todayAt
    ? todayAt.checkOut ? 'Completed' : 'Checked In'
    : 'Not Checked In';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[oklch(0.72_0.19_167)] text-sm font-semibold mb-1">{greeting()}, 👋</p>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {employee?.name?.split(' ')[0] ?? 'Employee'}!
          </h1>
          <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">
            Here's your workspace overview for today.
          </p>
        </div>

        {/* Live Clock */}
        <div className="glass-panel px-5 py-3 text-right shrink-0">
          <p className="text-xl font-bold text-white font-mono">
            {format(time, 'hh:mm')}
            <span className="text-[oklch(0.72_0.19_167)]">:{format(time, 'ss')}</span>
            <span className="text-[oklch(0.5_0.02_210)] text-sm ml-1">{format(time, 'a')}</span>
          </p>
          <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{format(time, 'EEEE, MMM d')}</p>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Attendance"
          value={attendanceStatus}
          sub={todayAt ? `Check-in: ${format(todayAt.checkIn.toDate(), 'hh:mm a')}` : 'Not Yet'}
          icon={Clock}
          color="oklch(0.72 0.19 167)"
          delay={0}
        />
        <StatCard
          label="Leaves Remaining"
          value="8 Days"
          sub="Used 4 of 12 this year"
          icon={Calendar}
          color="oklch(0.78 0.17 70)"
          delay={0.1}
        />
        <StatCard
          label="Net Salary"
          value={`₹${(employee?.salary ?? 45000).toLocaleString()}`}
          sub="Next: Apr 30, 2026"
          icon={CreditCard}
          color="oklch(0.78 0.17 295)"
          delay={0.15}
        />
      </div>

      {/* Charts + Tasks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Working Hours Chart */}
        <div className="lg:col-span-2 glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Working Hours</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Last 7 days activity</p>
            </div>
            <div className="flex items-center gap-1.5 text-[oklch(0.72_0.19_167)] bg-[oklch(0.72_0.19_167/0.1)] px-3 py-1 rounded-full text-xs font-semibold">
              <TrendingUp size={12} />
              <span>+8% this week</span>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} barSize={28}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false}
                  tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 11 }} dx={-4} domain={[0, 10]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(1 0 0 / 3%)' }} />
                <Bar dataKey="hours" fill="oklch(0.72 0.19 167)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Performance</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Contribution score</p>
            </div>
            <div className="flex items-center gap-1.5 text-[oklch(0.72_0.19_167)]">
              <ArrowUpRight size={14} />
              <span className="text-xs font-bold">+12%</span>
            </div>
          </div>
          <div className="h-[140px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perfData}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.19 167)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.72 0.19 167)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="oklch(0.72 0.19 167)"
                  fill="url(#perfGrad)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Score badge */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
            <div className="flex items-center gap-2">
              <Star size={14} className="text-[oklch(0.72_0.19_167)]" />
              <span className="text-xs font-bold text-white">Current Score</span>
            </div>
            <span className="text-lg font-bold text-[oklch(0.72_0.19_167)]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>91%</span>
          </div>
        </div>
      </div>

      {/* Attendance Row — full width */}
      <div className="grid grid-cols-1 gap-4">
        {/* Attendance Summary */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Attendance</h3>
            <span className="text-[10px] text-[oklch(0.5_0.02_210)]">This week</span>
          </div>

          {/* Today status */}
          <div className="p-4 rounded-xl mb-4" style={{
            background: todayAt
              ? todayAt.checkOut ? 'oklch(0.72 0.19 167 / 0.08)' : 'oklch(0.75 0.16 240 / 0.08)'
              : 'oklch(1 0 0 / 0.03)',
            border: `1px solid ${todayAt
              ? todayAt.checkOut ? 'oklch(0.72 0.19 167 / 0.2)' : 'oklch(0.75 0.16 240 / 0.2)'
              : 'oklch(1 0 0 / 0.06)'}`
          }}>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full pulse-ring ${
                todayAt ? todayAt.checkOut ? 'bg-[oklch(0.72_0.19_167)]' : 'bg-[oklch(0.75_0.16_240)]' : 'bg-[oklch(0.5_0.02_210)]'
              }`} />
              <div>
                <p className="text-sm font-bold text-white">{attendanceStatus}</p>
                {todayAt && (
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">
                    In: {format(todayAt.checkIn.toDate(), 'hh:mm a')}
                    {todayAt.checkOut && ` · Out: ${format(todayAt.checkOut.toDate(), 'hh:mm a')}`}
                    {todayAt.workingHours && ` · ${todayAt.workingHours}h`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent records */}
          <div className="space-y-2">
            {attendance.slice(0, 4).map((rec, i) => (
              <div key={rec.id} className="flex items-center justify-between py-2"
                style={{ borderBottom: i < 3 ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}>
                <p className="text-xs text-[oklch(0.65_0_0)]">
                  {format(new Date(rec.date), 'EEE, MMM d')}
                </p>
                <div className="flex items-center gap-2">
                  {rec.workingHours && (
                    <span className="text-xs font-mono text-[oklch(0.7_0_0)]">{rec.workingHours}h</span>
                  )}
                  <span className="aq-badge aq-badge-green">Present</span>
                </div>
              </div>
            ))}
            {attendance.length === 0 && (
              <p className="text-center text-[oklch(0.4_0.02_210)] text-sm py-4">No records yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
