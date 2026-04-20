import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, RefreshCw, ChevronLeft, ChevronRight,
  X, Save, AlertTriangle, CheckCircle, Gift,
  Edit3, CalendarDays, Zap, TimerOff, Hourglass,
  SunMedium, Umbrella, AlertCircle, FileText,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isWeekend, isBefore, isAfter, isSameDay,
} from 'date-fns';
import { toast } from 'sonner';
import hrmsApi from '../api';

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_WORK_HOURS = 9;
const STD_HOURS       = 8;

// ── Public Holidays ───────────────────────────────────────────────────────────
const PUBLIC_HOLIDAYS: Record<string, string> = {
  '2026-01-01': "New Year's Day",
  '2026-01-14': 'Makar Sankranti',
  '2026-01-26': 'Republic Day',
  '2026-03-25': 'Holi',
  '2026-04-02': 'Good Friday',
  '2026-04-14': 'Ambedkar Jayanti',
  '2026-05-01': 'Labour Day',
  '2026-08-15': 'Independence Day',
  '2026-09-17': 'Ganesh Chaturthi',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-21': 'Dussehra',
  '2026-11-10': 'Diwali',
  '2026-12-25': 'Christmas Day',
  '2025-01-26': 'Republic Day',
  '2025-05-01': 'Labour Day',
  '2025-08-15': 'Independence Day',
  '2025-10-02': 'Gandhi Jayanti',
  '2025-10-20': 'Diwali',
  '2025-12-25': 'Christmas Day',
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  _id?: string;
  date: string;
  checkIn?: string;
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
type EntryStatus = AttendanceRecord['status'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const dk        = (d: Date) => format(d, 'yyyy-MM-dd');
const isHoliday = (d: Date) => dk(d) in PUBLIC_HOLIDAYS;
const holName   = (d: Date) => PUBLIC_HOLIDAYS[dk(d)] ?? '';
const isLeave   = (d: Date, leaves: LeaveRecord[]) =>
  leaves.some(l => l.status === 'approved' &&
    !isBefore(d, new Date(l.from)) && !isAfter(d, new Date(l.to)));

const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WDAYS        = ['S','M','T','W','T','F','S'];
const WDAYS_FULL   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type DayMeta = {
  bg: string; text: string; ring?: string;
  badge?: string; icon?: React.FC<{ size?: number; className?: string }>;
};
const getDayMeta = (d: Date, rec: AttendanceRecord | undefined, leaves: LeaveRecord[]): DayMeta => {
  const today   = new Date();
  const isToday = isSameDay(d, today);
  const future  = isAfter(d, today) && !isToday;
  if (isHoliday(d))     return { bg: 'oklch(0.75 0.19 295 / 0.15)', text: 'oklch(0.8  0.18 295)', ring: 'oklch(0.75 0.19 295 / 0.4)', badge: holName(d) };
  if (isLeave(d,leaves))return { bg: 'oklch(0.72 0.16 240 / 0.15)', text: 'oklch(0.78 0.16 240)', ring: 'oklch(0.72 0.16 240 / 0.4)', badge: 'Leave' };
  if (isWeekend(d))     return { bg: 'oklch(1 0 0 / 0.025)',         text: 'oklch(0.32 0.01 210)' };
  if (future)           return { bg: 'transparent',                  text: 'oklch(0.28 0.01 210)' };
  if (isToday && !rec)  return { bg: 'oklch(0.72 0.19 167 / 0.08)', text: 'oklch(0.72 0.19 167)', ring: 'oklch(0.72 0.19 167)', badge: 'Today' };
  if (!rec)             return { bg: 'oklch(0.68 0.22 25  / 0.12)', text: 'oklch(0.78 0.20 25)',  badge: 'Absent' };
  const m: Record<string, DayMeta> = {
    present:  { bg: 'oklch(0.72 0.19 167 / 0.14)', text: 'oklch(0.72 0.19 167)', ring: 'oklch(0.72 0.19 167 / 0.5)', badge: 'Present' },
    late:     { bg: 'oklch(0.78 0.18 70  / 0.14)', text: 'oklch(0.82 0.18 70)',  ring: 'oklch(0.78 0.18 70  / 0.5)', badge: 'Late' },
    half_day: { bg: 'oklch(0.72 0.16 240 / 0.14)', text: 'oklch(0.76 0.16 240)', ring: 'oklch(0.72 0.16 240 / 0.5)', badge: 'Half' },
    absent:   { bg: 'oklch(0.68 0.22 25  / 0.12)', text: 'oklch(0.78 0.20 25)',  badge: 'Absent' },
    on_leave: { bg: 'oklch(0.72 0.16 240 / 0.14)', text: 'oklch(0.76 0.16 240)', badge: 'Leave' },
  };
  return m[rec.status] ?? m.present;
};

// ── Pill component ─────────────────────────────────────────────────────────────
const Pill: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
    style={{ background: color.replace(')', ' / 0.15)'), color, border: `1px solid ${color.replace(')', ' / 0.3)')}` }}>
    {label}
  </span>
);

// ── Status options ─────────────────────────────────────────────────────────────
const STATUS_OPTS: { val: EntryStatus; label: string; color: string }[] = [
  { val: 'present',  label: 'Present',  color: 'oklch(0.72 0.19 167)' },
  { val: 'late',     label: 'Late',     color: 'oklch(0.82 0.18 70)'  },
  { val: 'half_day', label: 'Half Day', color: 'oklch(0.76 0.16 240)' },
  { val: 'absent',   label: 'Absent',   color: 'oklch(0.78 0.20 25)'  },
];

// ══════════════════════════════════════════════════════════════════════════════
const Attendance: React.FC = () => {
  const { employee } = useAuth();

  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [records, setRecords]   = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves]     = useState<LeaveRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  // Entry modal
  const [selectedDay, setSelectedDay]   = useState<Date | null>(null);
  const [entryHours, setEntryHours]     = useState('');
  const [entryStatus, setEntryStatus]   = useState<EntryStatus>('present');
  const [entryNotes, setEntryNotes]     = useState('');
  const [saving, setSaving]             = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const mp = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
      const [att, lv] = await Promise.all([
        hrmsApi.attendance.list({ month: mp }),
        hrmsApi.leaves.list({ status: 'approved' }),
      ]);
      setRecords(att);
      setLeaves(lv);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load timesheet');
    } finally {
      setFetching(false);
    }
  }, [calYear, calMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const recordMap = useMemo(() => {
    const m: Record<string, AttendanceRecord> = {};
    records.forEach(r => { if (r.date) m[r.date.slice(0, 10)] = r; });
    return m;
  }, [records]);

  const firstDay    = startOfMonth(new Date(calYear, calMonth));
  const calDays     = eachDayOfInterval({ start: firstDay, end: endOfMonth(firstDay) });
  const startOffset = firstDay.getDay();

  const workingDays = calDays.filter(d => !isWeekend(d) && !isHoliday(d));
  const pastWorkDays = workingDays.filter(d => !isAfter(d, new Date()) || isSameDay(d, new Date()));
  const totalLoggedH = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const monthHols    = Object.entries(PUBLIC_HOLIDAYS)
    .filter(([d]) => { const dt = new Date(d); return dt.getFullYear() === calYear && dt.getMonth() === calMonth; })
    .sort(([a], [b]) => a.localeCompare(b));

  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

  // ── Open day ──────────────────────────────────────────────────────────────
  const openDay = (d: Date) => {
    if (isHoliday(d)) { toast.info(`🎉 Holiday: ${holName(d)}`); return; }
    if (isLeave(d, leaves)) { toast.info('🏖 Approved leave — no entry needed'); return; }
    if (isWeekend(d)) { toast.info('📅 Weekend — enjoy your rest!'); return; }
    if (isAfter(d, new Date()) && !isSameDay(d, new Date())) return;
    const ex = recordMap[dk(d)];
    setEntryHours(ex?.workingHours != null ? String(ex.workingHours) : '');
    setEntryStatus(ex?.status ?? 'present');
    setEntryNotes(ex?.notes ?? '');
    setSelectedDay(d);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedDay) return;
    const h = parseFloat(entryHours);
    if (isNaN(h) || h < 0 || h > MAX_WORK_HOURS) {
      toast.error(`Hours must be 0 – ${MAX_WORK_HOURS}`); return;
    }
    setSaving(true);
    try {
      const key = dk(selectedDay);
      const ex  = recordMap[key];
      const payload = {
        date: key, workingHours: h, status: entryStatus, notes: entryNotes,
        checkIn:  `${key}T09:00:00.000Z`,
        checkOut: `${key}T${String(9 + Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}:00.000Z`,
      };
      if (ex?._id) {
        await hrmsApi.attendance.update(ex._id, payload);
      } else {
        try { await hrmsApi.attendance.checkIn(); } catch {}
        const fresh = await hrmsApi.attendance.list({ month: `${calYear}-${String(calMonth+1).padStart(2,'0')}` });
        const created = (fresh as AttendanceRecord[]).find(r => r.date?.startsWith(key));
        if (created?._id) await hrmsApi.attendance.update(created._id, payload);
      }
      toast.success(`✅ Timesheet saved — ${format(selectedDay, 'dd MMM')}`);
      setSelectedDay(null);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed');
    } finally { setSaving(false); }
  };

  const hoursVal = parseFloat(entryHours) || 0;
  const pct      = Math.min(100, (hoursVal / MAX_WORK_HOURS) * 100);
  const barColor = hoursVal >= MAX_WORK_HOURS ? 'oklch(0.78 0.20 25)' : hoursVal >= STD_HOURS ? 'oklch(0.72 0.19 167)' : 'oklch(0.78 0.18 70)';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-8">

      {/* ══════════════════════════════════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 95% 50%, oklch(0.72 0.19 167 / 0.08), transparent)' }} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167 / 0.2), oklch(0.6 0.16 187 / 0.2))', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }}>
              <Clock size={22} style={{ color: 'oklch(0.72 0.19 167)' }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Timesheet
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                {MONTHS_FULL[calMonth]} {calYear} · Click a working day to log hours
              </p>
            </div>
          </div>

          {/* Month aggregates */}
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>Hours Logged</p>
              <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.72 0.19 167)' }}>
                {totalLoggedH.toFixed(1)}<span className="text-sm font-bold ml-0.5">h</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>Days Present</p>
              <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'oklch(0.78 0.18 70)' }}>
                {presentCount}<span className="text-sm font-bold ml-0.5">d</span>
              </p>
            </div>
            <button onClick={fetchAll} disabled={fetching}
              className="aq-btn-ghost !py-2 !px-3 !text-xs shrink-0">
              <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          CALENDAR CARD
      ══════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
        className="glass-panel overflow-hidden">

        {/* ── Top bar: month nav + month strip ─────────────────────────── */}
        <div className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="aq-btn-ghost !p-2 !rounded-xl">
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-lg font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {MONTHS_FULL[calMonth]} {calYear}
              </p>
              <p className="text-[10px]" style={{ color: 'oklch(0.48 0.02 210)' }}>
                {workingDays.length} working days ·&nbsp;
                {monthHols.length > 0
                  ? <span style={{ color: 'oklch(0.78 0.17 295)' }}>{monthHols.length} holiday{monthHols.length > 1 ? 's' : ''}</span>
                  : 'no holidays'}
              </p>
            </div>
            <button onClick={nextMonth} className="aq-btn-ghost !p-2 !rounded-xl">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month pill strip */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            {MONTHS_SHORT.map((m, mi) => {
              const isCur    = mi === calMonth;
              const hasData  = records.some(r => new Date(r.date).getMonth() === mi);
              return (
                <button key={m} onClick={() => setCalMonth(mi)}
                  className="relative flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                  style={isCur
                    ? { background: 'oklch(0.72 0.19 167 / 0.18)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.45)' }
                    : { background: 'oklch(1 0 0 / 3%)', color: 'oklch(0.48 0.02 210)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                  {m}
                  {hasData && !isCur && (
                    <span className="absolute top-1 right-1 w-1 h-1 rounded-full" style={{ background: 'oklch(0.72 0.19 167)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Weekday header ────────────────────────────────────────────── */}
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {WDAYS.map((d, i) => (
            <div key={`${d}${i}`}
              className="text-center text-[9px] font-black uppercase tracking-widest py-1"
              style={{ color: i === 0 || i === 6 ? 'oklch(0.72 0.20 25)' : 'oklch(0.4 0.02 210)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar grid ─────────────────────────────────────────────── */}
        {fetching ? (
          <div className="flex items-center justify-center py-14">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'oklch(0.72 0.19 167 / 0.2)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
              <p className="text-[10px]" style={{ color: 'oklch(0.42 0.02 210)' }}>Loading…</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 px-3 pb-4">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`pad${i}`} />)}

            {calDays.map(day => {
              const key     = dk(day);
              const rec     = recordMap[key];
              const meta    = getDayMeta(day, rec, leaves);
              const isToday = isSameDay(day, new Date());
              const future  = isAfter(day, new Date()) && !isToday;
              const frozen  = isHoliday(day) || isLeave(day, leaves) || isWeekend(day);
              const h       = rec?.workingHours;

              return (
                <motion.button key={key}
                  whileHover={!future ? { scale: 1.08, y: -2 } : {}}
                  whileTap={!future ? { scale: 0.96 } : {}}
                  onClick={() => openDay(day)}
                  disabled={future}
                  title={meta.badge}
                  className="relative flex flex-col items-center justify-center rounded-xl select-none transition-shadow"
                  style={{
                    aspectRatio: '1',
                    minHeight: '46px',
                    background: meta.bg,
                    border: isToday
                      ? `2px solid ${meta.ring ?? 'oklch(0.72 0.19 167)'}`
                      : frozen || rec
                      ? `1px solid ${(meta.ring ?? meta.text).replace(')', ' / 0.18)')}`
                      : '1px solid transparent',
                    opacity: future ? 0.22 : 1,
                    cursor: future ? 'default' : 'pointer',
                    boxShadow: isToday ? `0 0 0 3px ${(meta.ring ?? 'oklch(0.72 0.19 167)').replace(')', ' / 0.15)')}` : undefined,
                  }}>

                  {/* Day number */}
                  <span className="text-[11px] font-black leading-none" style={{ color: meta.text }}>
                    {format(day, 'd')}
                  </span>

                  {/* Hours */}
                  {h != null && !frozen && (
                    <span className="text-[7.5px] font-bold leading-none mt-[2px]" style={{ color: meta.text, opacity: 0.75 }}>
                      {h}h
                    </span>
                  )}

                  {/* Holiday / Leave icon */}
                  {isHoliday(day) && <span className="text-[9px] leading-none mt-[2px]">🎉</span>}
                  {isLeave(day, leaves) && !isHoliday(day) && <span className="text-[9px] leading-none mt-[2px]">🏖</span>}

                  {/* Weekend diagonal stripe feel */}
                  {isWeekend(day) && !isHoliday(day) && (
                    <div className="absolute inset-0 rounded-xl pointer-events-none opacity-20"
                      style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, oklch(1 0 0 / 0.08) 3px, oklch(1 0 0 / 0.08) 4px)' }} />
                  )}

                  {/* Edit dot for logged days */}
                  {rec && !frozen && (
                    <div className="absolute top-[3px] right-[3px] w-1 h-1 rounded-full"
                      style={{ background: meta.text }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ── Legend ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
          {[
            { color: 'oklch(0.72 0.19 167)', label: 'Present' },
            { color: 'oklch(0.82 0.18 70)',  label: 'Late' },
            { color: 'oklch(0.78 0.20 25)',  label: 'Absent' },
            { color: 'oklch(0.76 0.16 240)', label: 'Leave' },
            { color: 'oklch(0.80 0.18 295)', label: 'Holiday' },
            { color: 'oklch(0.35 0.01 210)', label: 'Weekend' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[9px]" style={{ color: 'oklch(0.48 0.02 210)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          HOLIDAYS THIS MONTH
      ══════════════════════════════════════════════════════════════════ */}
      {monthHols.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="glass-panel overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
            <div className="p-1.5 rounded-lg" style={{ background: 'oklch(0.78 0.17 295 / 0.12)' }}>
              <Gift size={14} style={{ color: 'oklch(0.78 0.17 295)' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Public Holidays
              </h3>
              <p className="text-[10px]" style={{ color: 'oklch(0.48 0.02 210)' }}>
                {MONTHS_FULL[calMonth]} {calYear} · {monthHols.length} holiday{monthHols.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'oklch(1 0 0 / 5%)' }}>
            {monthHols.map(([dateStr, name], i) => {
              const d = new Date(dateStr);
              return (
                <motion.div key={dateStr}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-3">
                  {/* Date box */}
                  <div className="shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center"
                    style={{ background: 'oklch(0.78 0.17 295 / 0.1)', border: '1px solid oklch(0.78 0.17 295 / 0.25)' }}>
                    <span className="text-[7px] font-black uppercase" style={{ color: 'oklch(0.78 0.17 295)' }}>
                      {format(d, 'MMM')}
                    </span>
                    <span className="text-base font-black leading-tight" style={{ color: 'oklch(0.78 0.17 295)', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {format(d, 'd')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{name}</p>
                    <p className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>
                      {format(d, 'EEEE')} · National Holiday
                    </p>
                  </div>
                  <Pill color="oklch(0.78 0.17 295)" label="Holiday" />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TIMESHEET LOG TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg" style={{ background: 'oklch(0.72 0.19 167 / 0.12)' }}>
              <FileText size={14} style={{ color: 'oklch(0.72 0.19 167)' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Timesheet Log
              </h3>
              <p className="text-[10px]" style={{ color: 'oklch(0.48 0.02 210)' }}>
                {MONTHS_FULL[calMonth]} {calYear} · Working days only
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.4 0.02 210)' }}>Total</p>
              <p className="text-sm font-black" style={{ color: 'oklch(0.72 0.19 167)', fontFamily: 'Space Grotesk, sans-serif' }}>
                {totalLoggedH.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                {['Date', 'Day', 'Hours', 'Status', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest"
                    style={{ color: 'oklch(0.4 0.02 210)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calDays
                .filter(d => !isWeekend(d))
                .map((day, ri) => {
                  const key     = dk(day);
                  const rec     = recordMap[key];
                  const meta    = getDayMeta(day, rec, leaves);
                  const isToday = isSameDay(day, new Date());
                  const inFuture = isAfter(day, new Date()) && !isToday;
                  const hol     = isHoliday(day);
                  const onLv    = isLeave(day, leaves);

                  // hours bar width
                  const h   = rec?.workingHours ?? 0;
                  const hPct = Math.min(100, (h / MAX_WORK_HOURS) * 100);

                  return (
                    <motion.tr key={key}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.018 }}
                      onClick={() => !inFuture && !hol && !onLv && openDay(day)}
                      style={{
                        borderBottom: '1px solid oklch(1 0 0 / 4%)',
                        background: isToday ? 'oklch(0.72 0.19 167 / 0.04)' : 'transparent',
                        opacity: inFuture ? 0.3 : 1,
                        cursor: (inFuture || hol || onLv) ? 'default' : 'pointer',
                      }}
                      className="group hover:bg-white/[0.02] transition-colors">

                      {/* Date */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isToday && (
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'oklch(0.72 0.19 167)' }} />
                          )}
                          <span className="text-xs font-bold text-white font-mono">
                            {format(day, 'dd MMM')}
                          </span>
                        </div>
                      </td>

                      {/* Day */}
                      <td className="px-4 py-3">
                        <span className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>
                          {WDAYS_FULL[day.getDay()]}
                        </span>
                      </td>

                      {/* Hours with bar */}
                      <td className="px-4 py-3 min-w-[80px]">
                        {hol || onLv ? (
                          <span className="text-[10px]" style={{ color: 'oklch(0.38 0.02 210)' }}>—</span>
                        ) : rec?.workingHours != null ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white font-mono">{h}h</span>
                              {h >= MAX_WORK_HOURS && (
                                <span className="text-[7px] font-bold px-1 py-0.5 rounded"
                                  style={{ background: 'oklch(0.78 0.18 70 / 0.15)', color: 'oklch(0.78 0.18 70)' }}>MAX</span>
                              )}
                            </div>
                            <div className="mt-1 w-16 h-1 rounded-full" style={{ background: 'oklch(1 0 0 / 7%)' }}>
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${hPct}%`, background: meta.text }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'oklch(0.35 0.02 210)' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {hol     ? <Pill color="oklch(0.80 0.18 295)" label="Holiday" /> :
                         onLv    ? <Pill color="oklch(0.76 0.16 240)" label="Leave"   /> :
                         isToday && !rec ? <Pill color="oklch(0.72 0.19 167)" label="Today" /> :
                         inFuture ? <span className="text-[9px]" style={{ color: 'oklch(0.3 0.02 210)' }}>—</span> :
                         rec      ? <Pill color={meta.text} label={meta.badge ?? rec.status} /> :
                                    <Pill color="oklch(0.78 0.20 25)" label="Absent" />}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 max-w-[140px]">
                        <span className="text-[10px] truncate block" style={{ color: 'oklch(0.5 0.02 210)' }}>
                          {hol ? holName(day) : rec?.notes || '—'}
                        </span>
                      </td>

                      {/* Edit */}
                      <td className="px-4 py-3">
                        {!inFuture && !hol && !onLv && (
                          <Edit3 size={12}
                            className="opacity-0 group-hover:opacity-60 transition-opacity"
                            style={{ color: 'oklch(0.55 0.02 210)' }} />
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          ENTRY MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedDay(null)}>
            <motion.div initial={{ scale: 0.9, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 24, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="w-full max-w-[380px] glass-panel overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="relative overflow-hidden px-5 py-4"
                style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167 / 0.12), oklch(0.6 0.16 187 / 0.06))', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                <div className="absolute inset-0 pointer-events-none opacity-15"
                  style={{ background: 'radial-gradient(ellipse 80% 100% at 95% 50%, oklch(0.72 0.19 167), transparent)' }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-black" style={{ color: 'oklch(0.72 0.19 167)' }}>
                      Log Hours
                    </p>
                    <p className="text-lg font-black text-white mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {format(selectedDay, 'EEEE')}
                    </p>
                    <p className="text-xs font-bold" style={{ color: 'oklch(0.55 0.02 210)' }}>
                      {format(selectedDay, 'dd MMMM yyyy')}
                    </p>
                  </div>
                  <button onClick={() => setSelectedDay(null)}
                    className="p-1.5 rounded-xl hover:bg-white/10 transition-colors mt-1"
                    style={{ color: 'oklch(0.5 0.02 210)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">

                {/* Status buttons */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black mb-2.5" style={{ color: 'oklch(0.42 0.02 210)' }}>
                    Status
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {STATUS_OPTS.map(s => (
                      <button key={s.val} onClick={() => setEntryStatus(s.val)}
                        className="py-2.5 rounded-xl text-[10px] font-black transition-all"
                        style={entryStatus === s.val
                          ? { background: s.color.replace(')', ' / 0.18)'), color: s.color, border: `1.5px solid ${s.color.replace(')', ' / 0.5)')}`, boxShadow: `0 0 10px ${s.color.replace(')', ' / 0.18)')}` }
                          : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.48 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hours input */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black mb-2.5" style={{ color: 'oklch(0.42 0.02 210)' }}>
                    Hours Worked
                    <span className="ml-1 normal-case font-normal" style={{ color: 'oklch(0.48 0.02 210)' }}>
                      (0 – {MAX_WORK_HOURS}h, step 0.5)
                    </span>
                  </p>

                  {/* Big hours display */}
                  <div className="relative mb-3">
                    <input type="number" min="0" max={MAX_WORK_HOURS} step="0.5"
                      value={entryHours}
                      onChange={e => setEntryHours(e.target.value)}
                      placeholder="0.0"
                      className="aq-input text-2xl font-black text-center pr-12"
                      style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold"
                      style={{ color: 'oklch(0.48 0.02 210)' }}>h</span>
                  </div>

                  {/* Quick pick hour chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[4, 6, 7, 8, 8.5, 9].map(h => (
                      <button key={h} onClick={() => setEntryHours(String(h))}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={entryHours === String(h)
                          ? { background: 'oklch(0.72 0.19 167 / 0.18)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.4)' }
                          : { background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {h}h
                      </button>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {entryHours !== '' && (
                    <div>
                      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'oklch(1 0 0 / 6%)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: barColor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.35, ease: 'easeOut' }} />
                      </div>
                      <div className="flex items-center justify-between text-[9px] mt-1.5">
                        <span style={{ color: 'oklch(0.42 0.02 210)' }}>0h</span>
                        <span className="font-bold" style={{ color: barColor }}>
                          {hoursVal}h / {MAX_WORK_HOURS}h max
                          {hoursVal >= MAX_WORK_HOURS && ' · Max reached'}
                        </span>
                        <span style={{ color: 'oklch(0.42 0.02 210)' }}>{MAX_WORK_HOURS}h</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black mb-2" style={{ color: 'oklch(0.42 0.02 210)' }}>
                    Notes <span className="normal-case font-normal" style={{ color: 'oklch(0.42 0.02 210)' }}>(optional)</span>
                  </p>
                  <textarea rows={2} value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                    placeholder="WFH · Client visit · Training…"
                    className="aq-input resize-none text-sm" />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setSelectedDay(null)} className="aq-btn-ghost flex-1 justify-center">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    disabled={saving || entryHours === '' || isNaN(parseFloat(entryHours))}
                    className="aq-btn-primary flex-1 justify-center"
                    style={(entryHours === '' || isNaN(parseFloat(entryHours))) ? { opacity: 0.4 } : {}}>
                    <Save size={14} />
                    {saving ? 'Saving…' : 'Save'}
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

export default Attendance;
