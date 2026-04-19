import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Clock, Calendar, CreditCard, TrendingUp, ArrowUpRight,
  Star, MapPin, Waves, Leaf, Zap, Heart, Target,
  CheckCircle, ChevronRight, Rocket,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string; date: string; checkIn: Timestamp; checkOut?: Timestamp; workingHours?: number;
}

const weekData = [
  { day: 'Mon', hours: 8.0 }, { day: 'Tue', hours: 7.5 }, { day: 'Wed', hours: 9.0 },
  { day: 'Thu', hours: 8.5 }, { day: 'Fri', hours: 8.0 }, { day: 'Sat', hours: 4.0 }, { day: 'Sun', hours: 0 },
];
const perfData = [
  { month: 'Jan', score: 78 }, { month: 'Feb', score: 83 }, { month: 'Mar', score: 87 }, { month: 'Apr', score: 91 },
];

const VALUES = [
  { icon: Leaf,   color: 'oklch(0.72 0.19 167)', title: 'Sustainability', desc: 'Responsible aquaculture at the heart of every decision.' },
  { icon: Target, color: 'oklch(0.78 0.17 295)', title: 'Precision',      desc: 'Data-driven insights for smarter harvests & operations.' },
  { icon: Heart,  color: 'oklch(0.75 0.18 25)',  title: 'Farmer First',   desc: 'Empowering farmers with technology and fair market access.' },
  { icon: Zap,    color: 'oklch(0.78 0.17 70)',  title: 'Innovation',     desc: 'Continuous R&D in IoT, AI prediction & supply chain.' },
];

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel px-3 py-2">
      <p className="text-[10px] font-bold" style={{ color: 'var(--aq-text-muted)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>{payload[0].value}</p>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, color, delay }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<any>; color: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay ?? 0, duration: 0.4, ease: 'easeOut' }}
    className="aq-stat-card"
  >
    <div className="flex items-start justify-between mb-3">
      <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--aq-text-muted)' }}>{label}</p>
      <div className="p-2 rounded-lg" style={{ background: `color-mix(in oklch, ${color} 14%, transparent)` }}>
        <Icon size={14} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>{value}</p>
    {sub && <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>{sub}</p>}
  </motion.div>
);

// ══════════════════════════════════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  const { employee } = useAuth();
  const [attendance, setAttendance]   = useState<AttendanceRecord[]>([]);
  const [todayAt, setTodayAt]         = useState<AttendanceRecord | null>(null);
  const [time, setTime]               = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!employee) return;
    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', employee.uid),
      orderBy('checkIn', 'desc'), limit(7)
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendance(docs);
      const today = format(new Date(), 'yyyy-MM-dd');
      setTodayAt(docs.find(r => r.date === today) ?? null);
    }, err => handleFirestoreError(err, OperationType.LIST, 'attendance'));
    return () => unsub();
  }, [employee]);

  const attendanceStatus = todayAt
    ? todayAt.checkOut ? 'Completed' : 'Checked In'
    : 'Not Checked In';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '🌅 Good morning';
    if (h < 17) return '☀️ Good afternoon';
    return '🌙 Good evening';
  };

  return (
    <div className="space-y-6">

      {/* ── Greeting + Clock ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'oklch(0.72 0.19 167)' }}>{greeting()},</p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
            {employee?.name?.split(' ')[0] ?? 'Employee'}!
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
            Here's your workspace overview for today.
          </p>
        </div>
        <div className="glass-panel px-5 py-3 text-right shrink-0">
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--aq-text-primary)' }}>
            {format(time, 'hh:mm')}
            <span style={{ color: 'oklch(0.72 0.19 167)' }}>:{format(time, 'ss')}</span>
            <span className="text-sm ml-1" style={{ color: 'var(--aq-text-muted)' }}>{format(time, 'a')}</span>
          </p>
          <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>{format(time, 'EEEE, MMM d')}</p>
        </div>
      </motion.div>

      {/* ── My KPI Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance" value={attendanceStatus}
          sub={todayAt ? `Check-in: ${format(todayAt.checkIn.toDate(), 'hh:mm a')}` : 'Not yet today'}
          icon={Clock} color="oklch(0.72 0.19 167)" delay={0} />
        <StatCard label="Leaves Remaining" value="8 Days" sub="Used 4 of 12 this year"
          icon={Calendar} color="oklch(0.78 0.17 70)" delay={0.07} />
        <StatCard label="Net Salary" value={`₹${(employee?.salary ?? 45000).toLocaleString()}`}
          sub="Next: Apr 30, 2026" icon={CreditCard} color="oklch(0.78 0.17 295)" delay={0.14} />
        <StatCard label="Performance" value="91%" sub="Above team average"
          icon={Star} color="oklch(0.75 0.18 25)" delay={0.21} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>Working Hours</h3>
              <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)' }}>
              <TrendingUp size={12} /> +8% this week
            </div>
          </div>
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} barSize={26}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 11 }} dx={-4} domain={[0, 10]} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'oklch(1 0 0 / 3%)' }} />
                <Bar dataKey="hours" fill="oklch(0.72 0.19 167)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>Performance</h3>
              <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Contribution score</p>
            </div>
            <div className="flex items-center gap-1" style={{ color: 'oklch(0.72 0.19 167)' }}>
              <ArrowUpRight size={14} /><span className="text-xs font-bold">+12%</span>
            </div>
          </div>
          <div className="h-[120px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perfData}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="oklch(0.72 0.19 167)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.72 0.19 167)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 10 }} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="score" stroke="oklch(0.72 0.19 167)" fill="url(#perfGrad)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
            <div className="flex items-center gap-2">
              <Star size={14} style={{ color: 'oklch(0.72 0.19 167)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--aq-text-primary)' }}>Current Score</span>
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.72 0.19 167)' }}>91%</span>
          </div>
        </div>
      </div>

      {/* ── Attendance Summary ────────────────────────────────────────────────── */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
            My Attendance
          </h3>
          <span className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>This week</span>
        </div>
        <div className="p-4 rounded-xl mb-4" style={{
          background: todayAt ? todayAt.checkOut ? 'oklch(0.72 0.19 167 / 0.08)' : 'oklch(0.75 0.16 240 / 0.08)' : 'var(--aq-glass-bg)',
          border: `1px solid ${todayAt ? todayAt.checkOut ? 'oklch(0.72 0.19 167 / 0.2)' : 'oklch(0.75 0.16 240 / 0.2)' : 'var(--aq-glass-border)'}`,
        }}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full pulse-ring"
              style={{ background: todayAt ? todayAt.checkOut ? 'oklch(0.72 0.19 167)' : 'oklch(0.75 0.16 240)' : 'var(--aq-text-muted)' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>{attendanceStatus}</p>
              {todayAt && (
                <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                  In: {format(todayAt.checkIn.toDate(), 'hh:mm a')}
                  {todayAt.checkOut && ` · Out: ${format(todayAt.checkOut.toDate(), 'hh:mm a')}`}
                  {todayAt.workingHours && ` · ${todayAt.workingHours}h`}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {attendance.slice(0, 4).map((rec, i) => (
            <div key={rec.id} className="flex items-center justify-between py-2"
              style={{ borderBottom: i < 3 ? '1px solid var(--aq-table-td-border)' : 'none' }}>
              <p className="text-xs" style={{ color: 'var(--aq-text-secondary)' }}>
                {format(new Date(rec.date), 'EEE, MMM d')}
              </p>
              <div className="flex items-center gap-2">
                {rec.workingHours && <span className="text-xs font-mono" style={{ color: 'var(--aq-text-primary)' }}>{rec.workingHours}h</span>}
                <span className="aq-badge aq-badge-green">Present</span>
              </div>
            </div>
          ))}
          {attendance.length === 0 && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--aq-text-muted)' }}>No records yet</p>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ABOUT AQUAGROW
          ════════════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'var(--aq-glass-border)' }} />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: 'oklch(0.72 0.19 167 / 0.1)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
          <Waves size={12} style={{ color: 'oklch(0.72 0.19 167)' }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'oklch(0.72 0.19 167)' }}>
            About AquaGrow
          </span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'var(--aq-glass-border)' }} />
      </motion.div>

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
        <img src="/aq-hero.png" alt="AquaGrow"
          className="w-full object-cover" style={{ height: '200px', objectPosition: 'center 40%' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-8"
          style={{ background: 'linear-gradient(to right, oklch(0.08 0.015 200 / 88%) 0%, oklch(0.08 0.015 200 / 25%) 65%, transparent 100%)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
              <Waves size={14} style={{ color: 'oklch(0.08 0.015 200)' }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Est. 2026</span>
          </div>
          <h2 className="text-2xl font-black text-white leading-tight mb-1"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Smart Aquaculture,<br />
            <span style={{ color: 'oklch(0.72 0.19 167)' }}>Sustainable Future</span>
          </h2>
          <p className="text-xs text-white/55 max-w-xs">
            A technology-first platform empowering fish farmers across India with IoT, AI, and real-time market access.
          </p>
        </div>
      </motion.div>

      {/* ── Founder + About ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Founder image card */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.44 }}
          className="lg:col-span-2 relative rounded-2xl overflow-hidden"
          style={{ border: '1px solid oklch(0.72 0.19 167 / 0.15)', minHeight: '260px' }}>
          <img src="/aq-founder.png" alt="Founder"
            className="w-full h-full object-cover" style={{ minHeight: '260px' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, oklch(0.08 0.015 200 / 95%) 0%, oklch(0.08 0.015 200 / 30%) 55%, transparent 100%)' }}>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              {/* Founder badge */}
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
                style={{ background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }}>
                <Rocket size={9} /> Founder &amp; CEO
              </span>
              <h3 className="text-xl font-black text-white leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Syam Kumar Reddy
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={10} style={{ color: 'oklch(0.78 0.17 70)' }} />
                <p className="text-[11px] text-white/55">Chennai, Tamil Nadu</p>
              </div>
              <p className="text-[10px] text-white/40 mt-1">Founded AquaGrow · 2026</p>
            </div>
          </div>
        </motion.div>

        {/* About text + values */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-3 glass-panel p-6 flex flex-col gap-5 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={12} style={{ color: 'oklch(0.78 0.17 70)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'oklch(0.78 0.17 70)' }}>
                Chennai, Tamil Nadu · Est. 2026
              </span>
            </div>
            <h3 className="text-lg font-black mb-2"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Transforming Indian Aquaculture
            </h3>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>
              AquaGrow was founded in 2026 by <strong style={{ color: 'var(--aq-text-primary)' }}>Syam Kumar Reddy</strong> with
              one bold idea — give every fish farmer in India the same precision tools that industry leaders use. We built
              IoT sensors, a real-time monitoring app, and a full supply-chain platform to connect farmers directly with buyers,
              eliminating middlemen and maximising farmer incomes.
            </p>
            <p className="text-[11px] leading-relaxed mt-2" style={{ color: 'var(--aq-text-muted)' }}>
              Starting from Chennai, AquaGrow is on a mission to make aquaculture smarter, more sustainable, and more
              profitable for every stakeholder in the value chain.
            </p>
          </div>

          {/* Core values */}
          <div className="grid grid-cols-2 gap-2.5">
            {VALUES.map(v => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{
                    background: `color-mix(in oklch, ${v.color} 7%, var(--aq-glass-bg))`,
                    border: `1px solid color-mix(in oklch, ${v.color} 15%, var(--aq-glass-border))`,
                  }}>
                  <div className="shrink-0 p-1.5 rounded-lg" style={{ background: `color-mix(in oklch, ${v.color} 18%, transparent)` }}>
                    <Icon size={12} style={{ color: v.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold leading-none" style={{ color: 'var(--aq-text-primary)' }}>{v.title}</p>
                    <p className="text-[9px] mt-0.5 leading-snug" style={{ color: 'var(--aq-text-muted)' }}>{v.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── App Info Card ────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
        className="glass-panel p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.12)' }}>
            <Waves size={16} style={{ color: 'oklch(0.72 0.19 167)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              AquaGrow HRMS Portal
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Platform information</p>
          </div>
          <div className="ml-auto">
            <span className="text-[9px] font-black px-2.5 py-1 rounded-full"
              style={{ background: 'oklch(0.72 0.19 167 / 0.12)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
              v2.0
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Company',       value: 'AquaGrow Pvt. Ltd.',    color: 'oklch(0.72 0.19 167)' },
            { label: 'Founded',       value: '2026',                  color: 'oklch(0.78 0.17 70)'  },
            { label: 'Founder & CEO', value: 'Syam Kumar Reddy',      color: 'oklch(0.78 0.17 295)' },
            { label: 'Headquarters',  value: 'Chennai, Tamil Nadu',   color: 'oklch(0.75 0.18 25)'  },
            { label: 'Industry',      value: 'AgriTech · AquaTech',   color: 'oklch(0.72 0.19 167)' },
            { label: 'Platform',      value: 'HRMS Portal v2.0',      color: 'oklch(0.78 0.17 70)'  },
            { label: 'Stack',         value: 'React · Firebase · Render', color: 'oklch(0.78 0.17 295)' },
            { label: 'Status',        value: '🟢 Live & Active',      color: 'oklch(0.72 0.19 167)' },
          ].map(row => (
            <div key={row.label} className="p-3 rounded-xl"
              style={{ background: 'var(--aq-glass-bg)', border: '1px solid var(--aq-glass-border)' }}>
              <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--aq-text-faint)' }}>
                {row.label}
              </p>
              <p className="text-[12px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                {row.value}
              </p>
            </div>
          ))}
        </div>

        {/* Mission statement strip */}
        <div className="mt-4 p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'oklch(0.72 0.19 167 / 0.06)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
          <CheckCircle size={16} style={{ color: 'oklch(0.72 0.19 167)', flexShrink: 0 }} />
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>
            <strong style={{ color: 'var(--aq-text-primary)' }}>Mission:</strong> To democratise aquaculture technology in India —
            empowering farmers with real-time data, AI-driven insights, and direct market access to build a sustainable,
            profitable fishery ecosystem.
          </p>
        </div>
      </motion.div>

    </div>
  );
};

export default Dashboard;
