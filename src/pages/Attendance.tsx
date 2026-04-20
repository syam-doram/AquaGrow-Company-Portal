import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, CheckCircle, LogOut, Calendar, Activity,
  RefreshCw, Sun, Moon, Coffee, ChevronLeft, ChevronRight,
  Umbrella, Star, AlertCircle, TrendingUp, Zap, Lock,
} from 'lucide-react';
import {
  format, differenceInMinutes, isSameDay, startOfMonth,
  endOfMonth, eachDayOfInterval, isWeekend, isBefore, isAfter,
  startOfYear, endOfYear, isSameMonth,
} from 'date-fns';
import { toast } from 'sonner';
import hrmsApi from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_WORK_HOURS = 9;           // maximum billable hours per day
const STANDARD_HOURS = 8;          // standard shift hours
const LATE_THRESHOLD_MIN = 30;     // minutes after 9:00 AM = late

// ── Indian Public Holidays 2026 ───────────────────────────────────────────────
const PUBLIC_HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'New Year\'s Day',
  '2026-01-14': 'Makar Sankranti',
  '2026-01-26': 'Republic Day',
  '2026-03-25': 'Holi',
  '2026-04-02': 'Good Friday',
  '2026-04-14': 'Dr. Ambedkar Jayanti',
  '2026-05-01': 'Labour Day',
  '2026-08-15': 'Independence Day',
  '2026-09-17': 'Ganesh Chaturthi',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-21': 'Dussehra',
  '2026-11-10': 'Diwali',
  '2026-11-13': 'Diwali (Padwa)',
  '2026-12-25': 'Christmas Day',
  // 2025
  '2025-01-26': 'Republic Day',
  '2025-08-15': 'Independence Day',
  '2025-10-02': 'Gandhi Jayanti',
  '2025-10-23': 'Dussehra',
  '2025-10-20': 'Diwali',
  '2025-12-25': 'Christmas Day',
};

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  _id: string;
  empId?: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  workingHours?: number;
  notes?: string;
}

interface LeaveRecord {
  _id: string;
  from: string;
  to: string;
  status: 'approved' | 'pending' | 'rejected';
  type: string;
}

type CalendarView = 'month' | 'year';

// ── Helpers ────────────────────────────────────────────────────────────────────
const today = () => format(new Date(), 'yyyy-MM-dd');

const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

const isPublicHoliday = (d: Date) => dateKey(d) in PUBLIC_HOLIDAYS;

const isLeaveDay = (d: Date, leaves: LeaveRecord[]) =>
  leaves.some(l => {
    if (l.status !== 'approved') return false;
    const from = new Date(l.from);
    const to   = new Date(l.to);
    return !isBefore(d, from) && !isAfter(d, to);
  });

const isFrozen = (d: Date, leaves: LeaveRecord[]) =>
  isWeekend(d) || isPublicHoliday(d) || isLeaveDay(d, leaves);

const dayStatusColor = (
  d: Date,
  rec: AttendanceRecord | undefined,
  leaves: LeaveRecord[],
  isToday: boolean,
): { bg: string; text: string; ring?: string; label?: string } => {
  const key = dateKey(d);
  const inFuture = isAfter(d, new Date()) && !isToday;

  if (isPublicHoliday(d))        return { bg: 'oklch(0.78 0.17 295 / 0.18)', text: 'oklch(0.78 0.17 295)', label: 'Holiday' };
  if (isLeaveDay(d, leaves))     return { bg: 'oklch(0.75 0.16 240 / 0.18)', text: 'oklch(0.75 0.16 240)', label: 'Leave' };
  if (isWeekend(d))              return { bg: 'oklch(1 0 0 / 0.04)',         text: 'oklch(0.38 0.02 210)', label: 'Weekend' };
  if (inFuture)                  return { bg: 'transparent',                 text: 'oklch(0.35 0.02 210)' };

  if (!rec) return { bg: 'oklch(0.65 0.22 25 / 0.14)', text: 'oklch(0.75 0.18 25)', label: 'Absent' };

  const statusMap: Record<string, ReturnType<typeof dayStatusColor>> = {
    present:  { bg: 'oklch(0.72 0.19 167 / 0.18)', text: 'oklch(0.72 0.19 167)', label: 'Present' },
    late:     { bg: 'oklch(0.78 0.17 70 / 0.18)',  text: 'oklch(0.78 0.17 70)',  label: 'Late' },
    half_day: { bg: 'oklch(0.75 0.16 240 / 0.18)', text: 'oklch(0.75 0.16 240)', label: 'Half Day' },
    absent:   { bg: 'oklch(0.65 0.22 25 / 0.14)',  text: 'oklch(0.75 0.18 25)',  label: 'Absent' },
    on_leave: { bg: 'oklch(0.75 0.16 240 / 0.18)', text: 'oklch(0.75 0.16 240)', label: 'Leave' },
  };
  return statusMap[rec.status] ?? statusMap.present;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_DAYS = ['S','M','T','W','T','F','S'];

// ══════════════════════════════════════════════════════════════════════════════
const Attendance: React.FC = () => {
  const { employee } = useAuth();
  const [records, setRecords]       = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves]         = useState<LeaveRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(true);
  const [now, setNow]               = useState(new Date());
  const [calView, setCalView]       = useState<CalendarView>('month');
  const [calYear, setCalYear]       = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]     = useState(new Date().getMonth()); // 0-indexed
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [tooltip, setTooltip]       = useState<{ x: number; y: number; d: Date } | null>(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch attendance + leaves
  // Always fetch current month separately so todayRecord is always accurate
  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const currentMonthParam = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const calMonthParam     = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

      // Always fetch today's month for todayRecord; also fetch requested month for calendar
      const fetchParams = calMonthParam === currentMonthParam
        ? [hrmsApi.attendance.list({ month: calMonthParam })]
        : [
            hrmsApi.attendance.list({ month: calMonthParam }),
            hrmsApi.attendance.list({ month: currentMonthParam }),
          ];

      const [calData, leaveData, todayMonthData] = await Promise.all([
        fetchParams[0],
        hrmsApi.leaves.list({ status: 'approved' }),
        fetchParams[1] ?? Promise.resolve(null),
      ]);

      setRecords(calData);
      setLeaves(leaveData);

      // todayRecord: look in the dedicated today-month fetch (or calData if same month)
      const todaySource = todayMonthData ?? calData;
      const todayStr = today();
      setTodayRecord(todaySource.find((r: AttendanceRecord) => r.date?.startsWith(todayStr)) ?? null);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load attendance');
    } finally {
      setFetching(false);
    }
  }, [calYear, calMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const recordMap = useMemo(() => {
    const m: Record<string, AttendanceRecord> = {};
    records.forEach(r => { m[r.date?.slice(0, 10)] = r; });
    return m;
  }, [records]);

  // Today state
  const todayStr    = today();
  const todayDate   = new Date();
  const alreadyIn   = !!todayRecord?.checkIn;
  const alreadyOut  = !!todayRecord?.checkOut;
  const isToday     = (d: Date) => isSameDay(d, todayDate);

  // Live elapsed
  const elapsed = todayRecord && !todayRecord.checkOut
    ? differenceInMinutes(now, new Date(todayRecord.checkIn))
    : null;
  const elapsedH = elapsed != null ? Math.floor(elapsed / 60) : 0;
  const elapsedM = elapsed != null ? elapsed % 60 : 0;

  // Max hours guard — disable checkout if > MAX_WORK_HOURS already logged
  const hoursLogged = todayRecord?.workingHours ?? (elapsed != null ? elapsed / 60 : 0);
  const progressPct = Math.min(100, (hoursLogged / MAX_WORK_HOURS) * 100);
  const isOvertime  = hoursLogged >= MAX_WORK_HOURS;

  // Month stats
  const monthRecords = records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  });
  const presentDays = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const leaveDays   = monthRecords.filter(r => r.status === 'on_leave').length;
  const totalHours  = monthRecords.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const avgHours    = presentDays > 0 ? (totalHours / presentDays).toFixed(1) : '0';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (isFrozen(todayDate, leaves)) {
      toast.error('Today is a holiday or leave day'); return;
    }
    // Guard: already checked in
    if (alreadyIn) {
      toast.warning('You have already checked in today'); return;
    }
    setLoading(true);
    try {
      await hrmsApi.attendance.checkIn();
      toast.success('✅ Checked in! Good morning.');
      await fetchAll();
    } catch (err: any) {
      // Surface exact server message (e.g. "Already checked in")
      toast.error(err.message ?? 'Failed to check in');
    } finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    // Guard: not checked in yet
    if (!alreadyIn) {
      toast.error('You must check in first before checking out'); return;
    }
    // Guard: already checked out
    if (alreadyOut) {
      toast.warning('You have already checked out today'); return;
    }
    if (isOvertime) {
      toast.warning(`⚠ Maximum ${MAX_WORK_HOURS}h/day reached — please check out now!`);
    }
    setLoading(true);
    try {
      await hrmsApi.attendance.checkOut();
      toast.success('✅ Checked out. Great work today!');
      await fetchAll();
    } catch (err: any) {
      // Surface exact server message (e.g. "No check-in found", "Already checked out")
      toast.error(err.message ?? 'Failed to check out');
    } finally { setLoading(false); }
  };

  // Calendar nav
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  // ── Calendar days for current month ───────────────────────────────────────
  const calDays = useMemo(() => {
    const start = startOfMonth(new Date(calYear, calMonth));
    const end   = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [calYear, calMonth]);

  // Starting weekday offset
  const startOffset = startOfMonth(new Date(calYear, calMonth)).getDay();

  // ── Year-view months ───────────────────────────────────────────────────────
  const yearMonthData = useMemo(() =>
    MONTHS.map((label, mi) => {
      const start = startOfMonth(new Date(calYear, mi));
      const end   = endOfMonth(start);
      const days  = eachDayOfInterval({ start, end });
      const working = days.filter(d => !isWeekend(d) && !isPublicHoliday(d));
      const present = working.filter(d => {
        const rec = recordMap[dateKey(d)];
        return rec && (rec.status === 'present' || rec.status === 'late');
      }).length;
      const absent = working.filter(d => {
        const inFuture = isAfter(d, todayDate);
        if (inFuture) return false;
        const rec = recordMap[dateKey(d)];
        return !rec && !isLeaveDay(d, leaves) && !isToday(d);
      }).length;
      const pct = working.length > 0 ? Math.round((present / working.length) * 100) : 0;
      return { label, mi, present, absent, pct, working: working.length };
    }),
  [calYear, recordMap, leaves]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const shimmer = (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: 'oklch(0.72 0.19 167 / 0.25)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
    </div>
  );

  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Attendance
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            Max {MAX_WORK_HOURS}h/day · Standard {STANDARD_HOURS}h shift · Only today's date is actionable
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'oklch(1 0 0 / 5%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
            {(['month', 'year'] as CalendarView[]).map(v => (
              <button key={v} onClick={() => setCalView(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                style={calView === v
                  ? { background: 'oklch(0.72 0.19 167 / 0.18)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }
                  : { color: 'oklch(0.5 0.02 210)', border: '1px solid transparent' }}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} disabled={fetching} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Present Days',    value: String(presentDays),       icon: CheckCircle, color: 'oklch(0.72 0.19 167)', sub: `${FULL_MONTHS[calMonth]} ${calYear}` },
          { label: 'Total Hours',     value: `${totalHours.toFixed(0)}h`, icon: Clock,     color: 'oklch(0.75 0.16 240)', sub: 'Logged this month' },
          { label: 'Avg Daily Hrs',   value: `${avgHours}h`,            icon: Activity,    color: 'oklch(0.78 0.17 70)',  sub: 'Per working day' },
          { label: 'Leave Days',      value: String(leaveDays),         icon: Umbrella,    color: 'oklch(0.78 0.17 295)', sub: 'Approved absences' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }} className="aq-stat-card">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>{s.label}</p>
                <div className="p-2 rounded-lg" style={{ background: 'oklch(1 0 0 / 7%)' }}>
                  <Icon size={13} style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>{s.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Check In/Out Widget ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-6 flex flex-col items-center text-center">

          {/* Clock ring */}
          <div className="relative w-36 h-36 mb-5">
            {/* Outer ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 144 144">
              <circle cx="72" cy="72" r="64" fill="none" stroke="oklch(0.72 0.19 167 / 0.1)" strokeWidth="5" />
              <circle cx="72" cy="72" r="64" fill="none"
                stroke={isOvertime ? 'oklch(0.75 0.18 25)' : 'oklch(0.72 0.19 167)'}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 64}`}
                strokeDashoffset={`${2 * Math.PI * 64 * (1 - progressPct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }} />
            </svg>
            {/* Inner display */}
            <div className="absolute inset-3 rounded-full flex flex-col items-center justify-center"
              style={{ background: 'oklch(0.09 0.018 205)' }}>
              <p className="text-2xl font-bold text-white font-mono leading-none">{format(now, 'hh:mm')}</p>
              <p className="text-xs font-semibold font-mono" style={{ color: 'oklch(0.72 0.19 167)' }}>{format(now, 'ss')}s</p>
              <p className="text-[9px] mt-0.5 font-bold" style={{ color: isOvertime ? 'oklch(0.75 0.18 25)' : 'oklch(0.5 0.02 210)' }}>
                {format(now, 'a')}
              </p>
            </div>
            {alreadyIn && !alreadyOut && (
              <div className="absolute inset-0 rounded-full border-2 opacity-40 animate-ping"
                style={{ borderColor: isOvertime ? 'oklch(0.75 0.18 25)' : 'oklch(0.72 0.19 167)' }} />
            )}
          </div>

          {/* Date */}
          <p className="text-sm font-bold text-white mb-0.5">{format(now, 'EEEE, d MMMM yyyy')}</p>

          {/* Elapsed / hours bar */}
          {alreadyIn && !alreadyOut && (
            <div className="w-full mb-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: 'oklch(0.55 0.02 210)' }}>
                  Active: {elapsedH}h {elapsedM}m
                </span>
                <span style={{ color: isOvertime ? 'oklch(0.75 0.18 25)' : 'oklch(0.72 0.19 167)' }}>
                  {hoursLogged.toFixed(1)}h / {MAX_WORK_HOURS}h
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(1 0 0 / 6%)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: isOvertime ? 'oklch(0.75 0.18 25)' : 'linear-gradient(90deg, oklch(0.72 0.19 167), oklch(0.78 0.17 70))' }}
                  animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
              </div>
              {isOvertime && (
                <p className="text-[9px] mt-1 font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>
                  ⚠ Max {MAX_WORK_HOURS}h reached — please check out
                </p>
              )}
            </div>
          )}

          {/* Today is frozen? */}
          {isFrozen(todayDate, leaves) && !alreadyIn && (
            <div className="w-full mb-3 p-2.5 rounded-xl flex items-center gap-2"
              style={{ background: 'oklch(0.78 0.17 295 / 0.1)', border: '1px solid oklch(0.78 0.17 295 / 0.2)' }}>
              <Lock size={13} style={{ color: 'oklch(0.78 0.17 295)' }} className="shrink-0" />
              <p className="text-[10px] font-semibold text-left" style={{ color: 'oklch(0.78 0.17 295)' }}>
                {isPublicHoliday(todayDate)
                  ? `🎉 ${PUBLIC_HOLIDAYS[todayStr]} — Public Holiday`
                  : isLeaveDay(todayDate, leaves)
                  ? '🏖 You are on approved leave today'
                  : '📅 Weekend — no attendance required'}
              </p>
            </div>
          )}

          {/* Action Button — only today enabled */}
          <div className="w-full mt-1">
            {!alreadyIn ? (
              <button onClick={handleCheckIn} disabled={loading || isFrozen(todayDate, leaves)}
                className="aq-btn-primary w-full justify-center text-sm py-3"
                style={isFrozen(todayDate, leaves) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
                <Clock size={17} />
                {loading ? 'Checking in…' : isFrozen(todayDate, leaves) ? 'Attendance Locked' : 'Check In'}
              </button>
            ) : !alreadyOut ? (
              <button onClick={handleCheckOut} disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'oklch(0.65 0.22 25 / 0.15)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.25)' }}>
                <LogOut size={17} />
                {loading ? 'Checking out…' : isOvertime ? '⚠ Check Out (Max Hrs)' : 'Check Out'}
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                <CheckCircle size={16} /> Day Completed!
              </div>
            )}
          </div>

          {/* Today summary */}
          {todayRecord && (
            <div className="w-full mt-4 space-y-0" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '1rem' }}>
              {[
                { label: 'Check In',  val: format(new Date(todayRecord.checkIn), 'hh:mm a'), icon: Sun },
                ...(todayRecord.checkOut ? [{ label: 'Check Out', val: format(new Date(todayRecord.checkOut), 'hh:mm a'), icon: Moon }] : []),
                ...(todayRecord.workingHours != null ? [{ label: 'Hours Worked', val: `${todayRecord.workingHours}h`, icon: Zap }] : []),
              ].map(({ label, val, icon: Icon }) => (
                <div key={label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
                  <div className="flex items-center gap-2">
                    <Icon size={11} style={{ color: 'oklch(0.55 0.02 210)' }} />
                    <span className="text-xs" style={{ color: 'oklch(0.5 0.02 210)' }}>{label}</span>
                  </div>
                  <span className="text-xs font-bold text-white font-mono">{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="w-full mt-4 grid grid-cols-2 gap-1">
            {[
              { color: 'oklch(0.72 0.19 167)', label: 'Present' },
              { color: 'oklch(0.78 0.17 70)',  label: 'Late' },
              { color: 'oklch(0.65 0.22 25)',  label: 'Absent' },
              { color: 'oklch(0.78 0.17 295)', label: 'Holiday' },
              { color: 'oklch(0.75 0.16 240)', label: 'Leave' },
              { color: 'oklch(0.38 0.02 210)', label: 'Weekend' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Calendar Panel ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 glass-panel overflow-hidden">

          {/* Calendar Header */}
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'oklch(0.55 0.02 210)' }}>
                <ChevronLeft size={15} />
              </button>
              <div>
                <p className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {calView === 'month' ? `${FULL_MONTHS[calMonth]} ${calYear}` : `Year ${calYear}`}
                </p>
                {calView === 'month' && (
                  <p className="text-[9px]" style={{ color: 'oklch(0.45 0.02 210)' }}>
                    {presentDays} present · {leaveDays} leave · {monthRecords.filter(r => r.status === 'absent').length} absent
                  </p>
                )}
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'oklch(0.55 0.02 210)' }}>
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }}
                className="text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all"
                style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                Today
              </button>
              <select value={calYear} onChange={e => setCalYear(Number(e.target.value))}
                className="aq-input !py-1 !text-xs !w-auto">
                {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {fetching ? shimmer : (
            <div className="p-4">
              {/* ── MONTH VIEW ─────────────────────────────────────────────── */}
              {calView === 'month' && (
                <>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {WEEK_DAYS.map((d, i) => (
                      <div key={i} className="text-center text-[9px] font-black uppercase py-1"
                        style={{ color: i === 0 || i === 6 ? 'oklch(0.65 0.22 25 / 0.7)' : 'oklch(0.45 0.02 210)' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty offset cells */}
                    {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}

                    {calDays.map(day => {
                      const key    = dateKey(day);
                      const rec    = recordMap[key];
                      const todayD = isToday(day);
                      const frozen = isFrozen(day, leaves);
                      const futur  = isAfter(day, todayDate) && !todayD;
                      const cfg    = dayStatusColor(day, rec, leaves, todayD);
                      const holiday = PUBLIC_HOLIDAYS[key];
                      const onLeave = isLeaveDay(day, leaves);
                      const weekend = isWeekend(day);

                      return (
                        <motion.div key={key}
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                          whileHover={!futur ? { scale: 1.08 } : {}}
                          transition={{ duration: 0.15 }}
                          className="relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer group"
                          style={{
                            background: cfg.bg,
                            border: todayD ? `2px solid ${cfg.text}` : '1px solid oklch(1 0 0 / 5%)',
                            opacity: futur ? 0.35 : 1,
                          }}
                          title={holiday || cfg.label || ''}>

                          {/* Day number */}
                          <span className={`text-[11px] font-bold leading-none ${todayD ? 'font-black' : ''}`}
                            style={{ color: futur ? 'oklch(0.38 0.02 210)' : cfg.text }}>
                            {format(day, 'd')}
                          </span>

                          {/* Indicator dot */}
                          {!futur && !weekend && (
                            <div className="w-1 h-1 rounded-full mt-0.5"
                              style={{ background: frozen ? 'oklch(0.65 0.2 295)' : cfg.text, opacity: 0.8 }} />
                          )}

                          {/* Freeze overlay icon */}
                          {frozen && !futur && (
                            <div className="absolute top-0.5 right-0.5">
                              {holiday || onLeave
                                ? <Star size={7} style={{ color: cfg.text }} />
                                : <Lock size={7} style={{ color: 'oklch(0.45 0.02 210)' }} />
                              }
                            </div>
                          )}

                          {/* Today ring */}
                          {todayD && (
                            <div className="absolute inset-0 rounded-xl border-2 animate-pulse"
                              style={{ borderColor: `${cfg.text}50` }} />
                          )}

                          {/* Hover tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none
                            opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            <div className="px-2 py-1 rounded-lg text-[9px] font-bold shadow-xl"
                              style={{ background: 'oklch(0.12 0.02 210)', border: '1px solid oklch(1 0 0 / 15%)', color: 'white' }}>
                              {format(day, 'MMM d')} — {
                                holiday ? holiday :
                                onLeave ? 'On Leave' :
                                weekend ? 'Weekend' :
                                futur ? 'Future' :
                                cfg.label ?? 'No record'
                              }
                              {rec?.checkIn && ` · ${format(new Date(rec.checkIn), 'h:mm a')}`}
                              {rec?.workingHours != null && ` · ${rec.workingHours}h`}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Working hours bar for the month */}
                  <div className="mt-4 p-3 rounded-xl" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <span style={{ color: 'oklch(0.5 0.02 210)' }}>Monthly Hours Progress</span>
                      <span className="font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>
                        {totalHours.toFixed(0)}h / {presentDays * STANDARD_HOURS}h target
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'oklch(1 0 0 / 8%)' }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}
                        animate={{ width: `${Math.min(100, presentDays > 0 ? (totalHours / (presentDays * STANDARD_HOURS)) * 100 : 0)}%` }}
                        transition={{ duration: 1 }} />
                    </div>
                  </div>
                </>
              )}

              {/* ── YEAR VIEW ──────────────────────────────────────────────── */}
              {calView === 'year' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {yearMonthData.map(({ label, mi, present, absent, pct, working }) => {
                    const isCurMonth = mi === new Date().getMonth() && calYear === new Date().getFullYear();
                    return (
                      <motion.div key={label}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: mi * 0.03 }}
                        className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.03]"
                        style={{
                          background: isCurMonth ? 'oklch(0.72 0.19 167 / 0.08)' : 'oklch(1 0 0 / 3%)',
                          border: isCurMonth
                            ? '1px solid oklch(0.72 0.19 167 / 0.3)'
                            : '1px solid oklch(1 0 0 / 7%)',
                        }}
                        onClick={() => { setCalMonth(mi); setCalView('month'); }}>

                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold" style={{ color: isCurMonth ? 'oklch(0.72 0.19 167)' : 'white' }}>{label}</p>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                            style={{
                              background: pct >= 80 ? 'oklch(0.72 0.19 167 / 0.15)' : pct >= 50 ? 'oklch(0.78 0.17 70 / 0.15)' : 'oklch(0.65 0.22 25 / 0.15)',
                              color: pct >= 80 ? 'oklch(0.72 0.19 167)' : pct >= 50 ? 'oklch(0.78 0.17 70)' : 'oklch(0.75 0.18 25)',
                            }}>
                            {pct}%
                          </span>
                        </div>

                        {/* Mini bar */}
                        <div className="w-full h-1.5 rounded-full mb-2" style={{ background: 'oklch(1 0 0 / 8%)' }}>
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 80 ? 'oklch(0.72 0.19 167)' : pct >= 50 ? 'oklch(0.78 0.17 70)' : 'oklch(0.65 0.22 25)',
                            }} />
                        </div>

                        <div className="flex justify-between text-[8px]" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          <span className="font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>{present}✓</span>
                          <span style={{ color: 'oklch(0.45 0.02 210)' }}>{working}d</span>
                          {absent > 0 && <span className="font-bold" style={{ color: 'oklch(0.75 0.18 25)' }}>{absent}✗</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming Holidays ────────────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Upcoming Holidays & Leave
        </h3>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PUBLIC_HOLIDAYS)
            .filter(([d]) => isAfter(new Date(d), todayDate))
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(0, 6)
            .map(([dateStr, name]) => (
              <div key={dateStr} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'oklch(0.78 0.17 295 / 0.08)', border: '1px solid oklch(0.78 0.17 295 / 0.18)' }}>
                <Star size={10} style={{ color: 'oklch(0.78 0.17 295)' }} />
                <div>
                  <p className="font-bold" style={{ color: 'oklch(0.78 0.17 295)' }}>{name}</p>
                  <p className="text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>{format(new Date(dateStr), 'EEE, MMM d yyyy')}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ── History Table ─────────────────────────────────────────────────────── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
          <div>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Attendance History</h3>
            <p className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>{FULL_MONTHS[calMonth]} {calYear}</p>
          </div>
          <div className="flex gap-2">
            <select value={calMonth} onChange={e => setCalMonth(Number(e.target.value))} className="aq-input !py-1 !text-xs !w-auto">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {fetching ? shimmer : (
            <table className="w-full aq-table">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Day</th>
                  <th className="text-left">Check In</th>
                  <th className="text-left">Check Out</th>
                  <th className="text-left">Hours</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {calDays.map((day, i) => {
                  const key    = dateKey(day);
                  const rec    = recordMap[key];
                  const frozen = isFrozen(day, leaves);
                  const holiday = PUBLIC_HOLIDAYS[key];
                  const onLeave = isLeaveDay(day, leaves);
                  const futur  = isAfter(day, todayDate) && !isToday(day);
                  const weekend = isWeekend(day);

                  // Determine row style
                  let rowStyle: React.CSSProperties = {};
                  let statusEl: React.ReactNode = null;
                  let checkInEl: React.ReactNode = <span style={{ color: 'oklch(0.35 0.02 210)' }}>—</span>;
                  let checkOutEl: React.ReactNode = <span style={{ color: 'oklch(0.35 0.02 210)' }}>—</span>;
                  let hoursEl: React.ReactNode = <span style={{ color: 'oklch(0.35 0.02 210)' }}>—</span>;

                  if (holiday) {
                    rowStyle = { background: 'oklch(0.78 0.17 295 / 0.05)' };
                    statusEl = (
                      <span className="aq-badge" style={{ background: 'oklch(0.78 0.17 295 / 0.15)', color: 'oklch(0.78 0.17 295)', border: '1px solid oklch(0.78 0.17 295 / 0.25)' }}>
                        🎉 Holiday
                      </span>
                    );
                  } else if (onLeave) {
                    rowStyle = { background: 'oklch(0.75 0.16 240 / 0.05)' };
                    statusEl = <span className="aq-badge aq-badge-blue">🏖 On Leave</span>;
                  } else if (weekend) {
                    rowStyle = { background: 'oklch(1 0 0 / 0.01)', opacity: 0.5 };
                    statusEl = <span className="aq-badge" style={{ background: 'oklch(1 0 0 / 0.05)', color: 'oklch(0.4 0.02 210)' }}>Weekend</span>;
                  } else if (futur) {
                    rowStyle = { opacity: 0.3 };
                    statusEl = <span style={{ color: 'oklch(0.35 0.02 210)', fontSize: '10px' }}>—</span>;
                  } else if (rec) {
                    const colors: Record<string, string> = {
                      present: 'aq-badge-green', late: 'aq-badge-amber',
                      half_day: 'aq-badge-blue', absent: 'aq-badge-red', on_leave: 'aq-badge-blue',
                    };
                    statusEl = <span className={`aq-badge ${colors[rec.status] ?? 'aq-badge-green'}`}>{rec.status.replace('_', ' ')}</span>;
                    if (rec.checkIn) checkInEl = <span className="font-mono text-white">{format(new Date(rec.checkIn), 'hh:mm a')}</span>;
                    if (rec.checkOut) checkOutEl = <span className="font-mono text-white">{format(new Date(rec.checkOut), 'hh:mm a')}</span>;
                    if (rec.workingHours != null) {
                      const over = rec.workingHours > MAX_WORK_HOURS;
                      hoursEl = (
                        <span className="font-bold" style={{ color: over ? 'oklch(0.75 0.18 25)' : 'oklch(0.72 0.19 167)' }}>
                          {rec.workingHours}h{over ? ' ⚠' : ''}
                        </span>
                      );
                    }
                  } else {
                    // Past working day, no record
                    rowStyle = { background: 'oklch(0.65 0.22 25 / 0.04)' };
                    statusEl = <span className="aq-badge aq-badge-red">Absent</span>;
                  }

                  return (
                    <motion.tr key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                      style={rowStyle}
                      className={isToday(day) ? 'ring-1 ring-inset ring-[oklch(0.72_0.19_167/0.3)]' : ''}>
                      <td>
                        <span className={`font-medium ${isToday(day) ? 'text-[oklch(0.72_0.19_167)] font-bold' : 'text-white'}`}>
                          {format(day, 'MMM dd')}
                          {isToday(day) && <span className="ml-1 text-[8px] px-1 py-0.5 rounded-full" style={{ background: 'oklch(0.72 0.19 167 / 0.2)' }}>Today</span>}
                        </span>
                      </td>
                      <td><span className="text-xs" style={{ color: weekend ? 'oklch(0.65 0.22 25 / 0.7)' : 'oklch(0.55 0.02 210)' }}>{format(day, 'EEE')}</span></td>
                      <td>{checkInEl}</td>
                      <td>{checkOutEl}</td>
                      <td>{hoursEl}</td>
                      <td>{statusEl}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
