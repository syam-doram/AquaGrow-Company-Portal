import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Clock, Calendar, CreditCard, TrendingUp, ArrowUpRight,
  Star, MapPin, Users, Award, Waves, Leaf, Globe2,
  ChevronRight, Zap, Heart, Target, BarChart2,
  CheckCircle, Rocket, Building,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: string; date: string; checkIn: Timestamp; checkOut?: Timestamp; workingHours?: number;
}

// ── Static data ────────────────────────────────────────────────────────────────
const weekData = [
  { day: 'Mon', hours: 8.0 }, { day: 'Tue', hours: 7.5 }, { day: 'Wed', hours: 9.0 },
  { day: 'Thu', hours: 8.5 }, { day: 'Fri', hours: 8.0 }, { day: 'Sat', hours: 4.0 }, { day: 'Sun', hours: 0 },
];

const perfData = [
  { month: 'Jan', score: 78 }, { month: 'Feb', score: 83 }, { month: 'Mar', score: 87 }, { month: 'Apr', score: 91 },
];

// Company growth YoY
const growthData = [
  { year: '2021', farmers: 40,  revenue: 12, states: 2 },
  { year: '2022', farmers: 120, revenue: 38, states: 4 },
  { year: '2023', farmers: 280, revenue: 95, states: 8 },
  { year: '2024', farmers: 420, revenue: 165, states: 11 },
  { year: '2025', farmers: 560, revenue: 230, states: 13 },
];

const donutData = [
  { name: 'Catfish',  value: 35, color: 'oklch(0.72 0.19 167)' },
  { name: 'Tilapia',  value: 28, color: 'oklch(0.78 0.17 295)' },
  { name: 'Shrimp',   value: 22, color: 'oklch(0.78 0.17 70)' },
  { name: 'Others',   value: 15, color: 'oklch(0.65 0.18 240)' },
];

// Company timeline milestones
const MILESTONES = [
  { year: '2021', icon: Rocket,    color: 'oklch(0.72 0.19 167)', title: 'AquaGrow Founded',       desc: 'Started in Chennai with 3 founders and a mission to modernise Indian aquaculture.' },
  { year: '2022', icon: Users,     color: 'oklch(0.78 0.17 295)', title: 'First 100 Farmers',       desc: 'Reached 100 onboarded farmers across Tamil Nadu & Andhra Pradesh.' },
  { year: '2023', icon: Globe2,    color: 'oklch(0.78 0.17 70)',  title: 'National Expansion',      desc: 'Expanded to 8 states. Launched the AquaGrow mobile app with IoT sensor integration.' },
  { year: '2024', icon: Award,     color: 'oklch(0.75 0.18 25)',  title: 'CII Startup Award',        desc: 'Won CII Best AgriTech Startup Award. Series-A funding of ₹8Cr raised.' },
  { year: '2025', icon: BarChart2, color: 'oklch(0.75 0.16 240)', title: '₹2Cr+ Monthly Revenue',   desc: '560 active farmers, 13 states, and 98% platform satisfaction rate.' },
];

// Core values
const VALUES = [
  { icon: Leaf,        color: 'oklch(0.72 0.19 167)', title: 'Sustainability',   desc: 'Every feature we build prioritises responsible aquaculture & eco-balance.' },
  { icon: Target,      color: 'oklch(0.78 0.17 295)', title: 'Precision',        desc: 'Data-driven decisions for harvests, health & feeding — zero guesswork.' },
  { icon: Heart,       color: 'oklch(0.75 0.18 25)',  title: 'Farmer First',     desc: 'We exist to increase farmer incomes and reduce risks through technology.' },
  { icon: Zap,         color: 'oklch(0.78 0.17 70)',  title: 'Innovation',       desc: 'Continuous R&D in IoT, AI prediction, and supply chain automation.' },
];

// KPI highlights
const COMPANY_KPIS = [
  { label: 'Active Farmers',  value: '560+',    icon: Users,      color: 'oklch(0.72 0.19 167)' },
  { label: 'States Covered',  value: '13',       icon: MapPin,     color: 'oklch(0.78 0.17 295)' },
  { label: 'Monthly Revenue', value: '₹2Cr+',   icon: TrendingUp, color: 'oklch(0.78 0.17 70)'  },
  { label: 'Satisfaction',    value: '98%',      icon: Star,       color: 'oklch(0.75 0.18 25)'  },
  { label: 'Team Members',    value: '48',       icon: Building,   color: 'oklch(0.75 0.16 240)' },
  { label: 'Years Active',    value: '4+',       icon: Award,      color: 'oklch(0.65 0.02 210)' },
];

// ── Tooltip ────────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel px-3 py-2">
      <p className="text-[10px] font-bold" style={{ color: 'var(--aq-text-muted)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>
        {payload[0].value}{payload[0].unit ?? ''}
      </p>
    </div>
  );
};

// ── StatCard ───────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, color, delay }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<any>; color: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay ?? 0, duration: 0.4, ease: 'easeOut' }}
    className="aq-stat-card group"
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
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [todayAt, setTodayAt]       = useState<AttendanceRecord | null>(null);
  const [time, setTime]             = useState(new Date());

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
    <div className="space-y-7">

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

      {/* ── My KPI Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance" value={attendanceStatus}
          sub={todayAt ? `Check-in: ${format(todayAt.checkIn.toDate(), 'hh:mm a')}` : 'Not Yet'}
          icon={Clock} color="oklch(0.72 0.19 167)" delay={0} />
        <StatCard label="Leaves Remaining" value="8 Days" sub="Used 4 of 12 this year"
          icon={Calendar} color="oklch(0.78 0.17 70)" delay={0.07} />
        <StatCard label="Net Salary" value={`₹${(employee?.salary ?? 45000).toLocaleString()}`}
          sub="Next: Apr 30, 2026" icon={CreditCard} color="oklch(0.78 0.17 295)" delay={0.14} />
        <StatCard label="Performance" value="91%" sub="Above team average"
          icon={Star} color="oklch(0.75 0.18 25)" delay={0.21} />
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────────── */}
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
              <ArrowUpRight size={14} />
              <span className="text-xs font-bold">+12%</span>
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

      {/* ══════════════════════════════════════════════════════════════════════
          COMPANY SECTION DIVIDER
          ══════════════════════════════════════════════════════════════════════ */}
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

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
        <img src="/aq-hero.png" alt="AquaGrow — Smart Aquaculture"
          className="w-full object-cover"
          style={{ height: '220px', objectPosition: 'center 40%' }} />
        {/* overlay */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to right, oklch(0.08 0.015 200 / 85%) 0%, oklch(0.08 0.015 200 / 20%) 60%, transparent 100%)',
        }}>
          <div className="h-full flex flex-col justify-center px-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
                <Waves size={14} style={{ color: 'oklch(0.08 0.015 200)' }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Since 2021</span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Smart Aquaculture,<br />
              <span style={{ color: 'oklch(0.72 0.19 167)' }}>Sustainable Future</span>
            </h2>
            <p className="text-xs text-white/60 max-w-xs">
              Technology-first platform empowering fish farmers across India with IoT, AI and real-time market access.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Company KPI Strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {COMPANY_KPIS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="aq-stat-card text-center !py-4 !px-2">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-xl" style={{ background: `color-mix(in oklch, ${kpi.color} 14%, transparent)` }}>
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: kpi.color }}>{kpi.value}</p>
              <p className="text-[9px] mt-0.5 font-semibold uppercase tracking-wider" style={{ color: 'var(--aq-text-muted)' }}>{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Founder Story + About ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Founder Image Card */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
          className="lg:col-span-2 relative rounded-2xl overflow-hidden"
          style={{ border: '1px solid oklch(0.72 0.19 167 / 0.15)', minHeight: '280px' }}>
          <img src="/aq-founder.png" alt="AquaGrow Founder Story"
            className="w-full h-full object-cover" style={{ minHeight: '280px' }} />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, oklch(0.08 0.015 200 / 90%) 0%, transparent 50%)',
          }}>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full mb-2 inline-block"
                style={{ background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }}>
                🌊 Founded 2021
              </span>
              <h3 className="text-base font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                The AquaGrow Story
              </h3>
              <p className="text-[10px] text-white/55 mt-1">Chennai → Pan-India in 4 years</p>
            </div>
          </div>
        </motion.div>

        {/* About Text + Values */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-3 glass-panel p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={12} style={{ color: 'oklch(0.78 0.17 70)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'oklch(0.78 0.17 70)' }}>
                Chennai, Tamil Nadu · Est. 2021
              </span>
            </div>
            <h3 className="text-lg font-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Transforming Indian Aquaculture
            </h3>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>
              AquaGrow was born from a simple idea: what if every fish farmer in India had access to the same precision tools
              that big corporates use? We built IoT sensors, a real-time monitoring app, and a full supply-chain platform to
              connect farmers directly with buyers — eliminating middlemen and maximising farmer income.
            </p>
            <p className="text-[11px] leading-relaxed mt-2" style={{ color: 'var(--aq-text-muted)' }}>
              Today we serve 560+ farmers across 13 states, with a team of 48 passionate professionals committed to making
              aquaculture smarter, safer, and more profitable.
            </p>
          </div>

          {/* Core values grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {VALUES.map(v => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: `color-mix(in oklch, ${v.color} 7%, var(--aq-glass-bg))`, border: `1px solid color-mix(in oklch, ${v.color} 15%, var(--aq-glass-border))` }}>
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

      {/* ── Company Growth Chart + Donut ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Growth poster + line chart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Poster */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="relative rounded-2xl overflow-hidden"
            style={{ border: '1px solid oklch(0.78 0.17 70 / 0.15)', height: '150px' }}>
            <img src="/aq-growth.png" alt="AquaGrow Growth"
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center"
              style={{ background: 'linear-gradient(to left, transparent, oklch(0.08 0.015 200 / 75%) 50%)' }}>
              <div className="px-6">
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'oklch(0.78 0.17 70)' }}>📈 Company Growth</p>
                <h3 className="text-base font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  4X Growth in 4 Years
                </h3>
                <p className="text-[10px] text-white/50 mt-0.5">Farmers · Revenue · Reach</p>
              </div>
            </div>
          </motion.div>

          {/* Farmer growth line chart */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                  Farmer Onboarding Growth
                </h3>
                <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>2021 – 2025</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'oklch(0.78 0.17 70 / 0.12)', color: 'oklch(0.78 0.17 70)' }}>
                +1300% total growth
              </span>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <defs>
                    <linearGradient id="farmGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="oklch(0.72 0.19 167)" />
                      <stop offset="100%" stopColor="oklch(0.78 0.17 70)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="oklch(1 0 0 / 5%)" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.5 0.02 210)', fontSize: 11 }} dx={-4} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="farmers" stroke="url(#farmGrad)" strokeWidth={3}
                    dot={{ fill: 'oklch(0.72 0.19 167)', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: 'oklch(0.78 0.17 70)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Donut + milestone */}
        <div className="space-y-4">
          {/* Species mix donut */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Species Mix
            </h3>
            <p className="text-[10px] mb-3" style={{ color: 'var(--aq-text-muted)' }}>Platform harvest breakdown</p>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={55}
                    dataKey="value" stroke="none">
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {donutData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>{d.name}</span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="glass-panel p-4 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--aq-text-muted)' }}>Quick Actions</p>
            {[
              { label: 'Mark Attendance', sub: 'Check in / out', tab: 'attendance', color: 'oklch(0.72 0.19 167)' },
              { label: 'My Payslips',     sub: 'View salary history', tab: 'payslips',   color: 'oklch(0.78 0.17 295)' },
              { label: 'Submit Ticket',   sub: 'Raise support issue', tab: 'tickets',    color: 'oklch(0.75 0.18 25)'  },
            ].map(q => (
              <div key={q.label} className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all"
                style={{ background: `color-mix(in oklch, ${q.color} 7%, var(--aq-glass-bg))`, border: `1px solid color-mix(in oklch, ${q.color} 12%, var(--aq-glass-border))` }}>
                <CheckCircle size={12} style={{ color: q.color, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>{q.label}</p>
                  <p className="text-[9px]" style={{ color: 'var(--aq-text-muted)' }}>{q.sub}</p>
                </div>
                <ChevronRight size={10} style={{ color: 'var(--aq-text-faint)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Company Timeline ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.12)' }}>
            <Rocket size={16} style={{ color: 'oklch(0.72 0.19 167)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Company Journey
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Key milestones since founding</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-[2px] rounded-full"
            style={{ background: 'linear-gradient(to bottom, oklch(0.72 0.19 167 / 50%), oklch(0.78 0.17 70 / 20%))' }} />

          <div className="space-y-5">
            {MILESTONES.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div key={m.year}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.08 }}
                  className="flex items-start gap-4">
                  {/* Icon node */}
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center z-10"
                    style={{
                      background: `color-mix(in oklch, ${m.color} 18%, var(--aq-glass-bg))`,
                      border: `1px solid color-mix(in oklch, ${m.color} 30%, var(--aq-glass-border))`,
                      boxShadow: `0 0 12px color-mix(in oklch, ${m.color} 20%, transparent)`,
                    }}>
                    <Icon size={16} style={{ color: m.color }} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: `color-mix(in oklch, ${m.color} 14%, transparent)`, color: m.color }}>
                        {m.year}
                      </span>
                      <h4 className="text-[13px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>{m.title}</h4>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>{m.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Attendance Summary ──────────────────────────────────────────────── */}
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
            <div className={`w-2.5 h-2.5 rounded-full pulse-ring`}
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
                {rec.workingHours && (
                  <span className="text-xs font-mono" style={{ color: 'var(--aq-text-primary)' }}>{rec.workingHours}h</span>
                )}
                <span className="aq-badge aq-badge-green">Present</span>
              </div>
            </div>
          ))}
          {attendance.length === 0 && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--aq-text-muted)' }}>No records yet</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
