import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, RefreshCw, ChevronLeft, ChevronRight,
  X, Save, AlertTriangle, CheckCircle, Gift,
  Edit3, FileText, Hourglass, CalendarCheck,
  SunMedium, Star,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isWeekend, isBefore, isAfter, isSameDay,
} from 'date-fns';
import { toast } from 'sonner';
import hrmsApi from '../api';

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_WORK_HOURS = 9;

const PUBLIC_HOLIDAYS: Record<string, string> = {
  '2026-01-01': "New Year's Day", '2026-01-14': 'Makar Sankranti',
  '2026-01-26': 'Republic Day',   '2026-03-25': 'Holi',
  '2026-04-02': 'Good Friday',    '2026-04-14': 'Ambedkar Jayanti',
  '2026-05-01': 'Labour Day',     '2026-08-15': 'Independence Day',
  '2026-09-17': 'Ganesh Chaturthi','2026-10-02': 'Gandhi Jayanti',
  '2026-10-21': 'Dussehra',       '2026-11-10': 'Diwali',
  '2026-12-25': 'Christmas Day',
  '2025-01-26': 'Republic Day',   '2025-05-01': 'Labour Day',
  '2025-08-15': 'Independence Day','2025-10-02': 'Gandhi Jayanti',
  '2025-10-20': 'Diwali',         '2025-12-25': 'Christmas Day',
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
  _id: string; from: string; to: string;
  status: 'approved' | 'pending' | 'rejected'; type: string;
}
type EntryStatus = AttendanceRecord['status'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const dk        = (d: Date) => format(d, 'yyyy-MM-dd');
const isHoliday = (d: Date) => dk(d) in PUBLIC_HOLIDAYS;
const holName   = (d: Date) => PUBLIC_HOLIDAYS[dk(d)] ?? '';
const isLeave   = (d: Date, lv: LeaveRecord[]) =>
  lv.some(l => l.status === 'approved' &&
    !isBefore(d, new Date(l.from)) && !isAfter(d, new Date(l.to)));

const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WDAYS_S      = ['S','M','T','W','T','F','S'];
const WDAYS_F      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string,{ color: string; label: string; bg: string }> = {
  present:  { color: '#00e5a0', label: 'Present',  bg: 'oklch(0.72 0.19 167 / 0.18)' },
  late:     { color: '#f5c542', label: 'Late',     bg: 'oklch(0.82 0.18 70  / 0.18)' },
  half_day: { color: '#60a5fa', label: 'Half Day', bg: 'oklch(0.72 0.16 240 / 0.18)' },
  absent:   { color: '#f87171', label: 'Absent',   bg: 'oklch(0.68 0.22 25  / 0.18)' },
  on_leave: { color: '#a78bfa', label: 'Leave',    bg: 'oklch(0.68 0.16 295 / 0.18)' },
  holiday:  { color: '#fb923c', label: 'Holiday',  bg: 'oklch(0.72 0.18 55  / 0.18)' },
  weekend:  { color: '#6b7280', label: 'Weekend',  bg: 'oklch(1 0 0 / 0.03)'         },
};

const getCellStyle = (d: Date, rec: AttendanceRecord | undefined, leaves: LeaveRecord[]) => {
  const today   = new Date();
  const isToday = isSameDay(d, today);
  const future  = isAfter(d, today) && !isToday;
  if (isHoliday(d))      return { ...STATUS_CFG.holiday, isToday, future, frozen: true };
  if (isLeave(d, leaves))return { ...STATUS_CFG.on_leave, isToday, future, frozen: true };
  if (isWeekend(d))      return { ...STATUS_CFG.weekend,  isToday, future, frozen: true };
  if (future)            return { color: '#374151', label: '', bg: 'transparent', isToday, future, frozen: false };
  if (isToday && !rec)   return { color: '#00e5a0', label: 'Today', bg: 'oklch(0.72 0.19 167 / 0.1)', isToday, future, frozen: false };
  if (!rec)              return { ...STATUS_CFG.absent,   isToday: false, future, frozen: false };
  return { ...(STATUS_CFG[rec.status] ?? STATUS_CFG.present), isToday, future, frozen: false };
};

const STATUS_OPTS: { val: EntryStatus; label: string; color: string; grd: string }[] = [
  { val: 'present',  label: 'Present',  color: '#00e5a0', grd: 'from-emerald-500/20 to-teal-500/10'    },
  { val: 'late',     label: 'Late',     color: '#f5c542', grd: 'from-yellow-500/20   to-amber-500/10'  },
  { val: 'half_day', label: 'Half Day', color: '#60a5fa', grd: 'from-blue-500/20     to-indigo-500/10' },
  { val: 'absent',   label: 'Absent',   color: '#f87171', grd: 'from-red-500/20      to-rose-500/10'   },
];

// ══════════════════════════════════════════════════════════════════════════════
const Attendance: React.FC = () => {
  const { employee } = useAuth();

  const [calYear,  setCalYear]  = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [records,  setRecords]  = useState<AttendanceRecord[]>([]);
  const [leaves,   setLeaves]   = useState<LeaveRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [entryHours,  setEntryHours]  = useState('');
  const [entryStatus, setEntryStatus] = useState<EntryStatus>('present');
  const [entryNotes,  setEntryNotes]  = useState('');
  const [saving,      setSaving]      = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const mp = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
      const [att, lv] = await Promise.all([
        hrmsApi.attendance.list({ month: mp }),
        hrmsApi.leaves.list({ status: 'approved' }),
      ]);
      setRecords(att); setLeaves(lv);
    } catch (e: any) { toast.error(e.message ?? 'Failed to load'); }
    finally { setFetching(false); }
  }, [calYear, calMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const recordMap = useMemo(() => {
    const m: Record<string, AttendanceRecord> = {};
    records.forEach(r => { if (r.date) m[r.date.slice(0,10)] = r; });
    return m;
  }, [records]);

  const firstDay    = startOfMonth(new Date(calYear, calMonth));
  const calDays     = eachDayOfInterval({ start: firstDay, end: endOfMonth(firstDay) });
  const startOffset = firstDay.getDay();

  const workingDays   = calDays.filter(d => !isWeekend(d) && !isHoliday(d));
  const totalH        = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const presentCount  = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const monthHols     = Object.entries(PUBLIC_HOLIDAYS)
    .filter(([d]) => { const dt = new Date(d); return dt.getFullYear() === calYear && dt.getMonth() === calMonth; })
    .sort(([a],[b]) => a.localeCompare(b));

  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y-1)) : setCalMonth(m => m-1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0),  setCalYear(y => y+1)) : setCalMonth(m => m+1);

  // ── Open day modal ────────────────────────────────────────────────────────
  const openDay = (d: Date) => {
    if (isHoliday(d)) { toast.info(`🎉 ${holName(d)}`); return; }
    if (isLeave(d, leaves)) { toast.info('🏖 Approved leave day'); return; }
    if (isWeekend(d)) { toast.info('😴 Weekend — rest well!'); return; }
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
    if (isNaN(h) || h < 0 || h > MAX_WORK_HOURS) { toast.error(`0 – ${MAX_WORK_HOURS}h only`); return; }
    setSaving(true);
    try {
      const key = dk(selectedDay);
      const ex  = recordMap[key];
      const payload = {
        date: key, workingHours: h, status: entryStatus, notes: entryNotes,
        checkIn:  `${key}T09:00:00.000Z`,
        checkOut: `${key}T${String(9+Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}:00.000Z`,
      };
      if (ex?._id) {
        await hrmsApi.attendance.update(ex._id, payload);
      } else {
        try { await hrmsApi.attendance.checkIn(); } catch {}
        const fresh = await hrmsApi.attendance.list({ month: `${calYear}-${String(calMonth+1).padStart(2,'0')}` });
        const cr = (fresh as AttendanceRecord[]).find(r => r.date?.startsWith(key));
        if (cr?._id) await hrmsApi.attendance.update(cr._id, payload);
      }
      toast.success(`✅ Saved — ${format(selectedDay,'dd MMM')}`);
      setSelectedDay(null); await fetchAll();
    } catch (e: any) { toast.error(e.message ?? 'Save failed'); }
    finally { setSaving(false); }
  };

  const hVal   = parseFloat(entryHours) || 0;
  const hPct   = Math.min(100, (hVal / MAX_WORK_HOURS) * 100);
  const hColor = hVal >= MAX_WORK_HOURS ? '#f87171' : hVal >= 8 ? '#00e5a0' : '#f5c542';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-6">

      {/* ── Hero strip ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Timesheet
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            {MONTHS_FULL[calMonth]} {calYear} · tap a date to log hours
          </p>
        </div>
        <button onClick={fetchAll} disabled={fetching} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
          <RefreshCw size={13} className={fetching ? 'animate-spin':''} />
        </button>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Hours Logged',  value: `${totalH.toFixed(1)}h`,  grad: 'linear-gradient(135deg, #00e5a0 0%, #0fadeá 100%)', icon: Clock,         from: '#00e5a0', to: '#00bcd4' },
          { label: 'Days Present',  value: `${presentCount}d`,        grad: '',                                                   icon: CalendarCheck,  from: '#f5c542', to: '#f97316' },
          { label: 'Working Days',  value: `${workingDays.length}d`,  grad: '',                                                   icon: SunMedium,      from: '#60a5fa', to: '#818cf8' },
          { label: 'Holidays',      value: `${monthHols.length}`,     grad: '',                                                   icon: Star,           from: '#fb923c', to: '#f43f5e' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label}
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${k.from}18, ${k.to}08)`, border: `1px solid ${k.from}30` }}>
              <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${k.from}, transparent)` }} />
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] uppercase tracking-widest font-black" style={{ color: `${k.from}bb` }}>{k.label}</p>
                <div className="p-1.5 rounded-lg" style={{ background: `${k.from}1a` }}>
                  <Icon size={12} style={{ color: k.from }} />
                </div>
              </div>
              <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: k.from }}>
                {k.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Two-column: Calendar + Holidays ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Calendar (2/3 width) ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 glass-panel overflow-hidden">

          {/* Month nav + month strip */}
          <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="aq-btn-ghost !p-1.5 !rounded-xl"><ChevronLeft size={15} /></button>
              <div className="text-center">
                <p className="text-sm font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {MONTHS_FULL[calMonth]} {calYear}
                </p>
              </div>
              <button onClick={nextMonth} className="aq-btn-ghost !p-1.5 !rounded-xl"><ChevronRight size={15} /></button>
            </div>

            {/* Month strip */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {MONTHS_SHORT.map((m, mi) => {
                const active  = mi === calMonth;
                const hasData = records.some(r => { const d = new Date(r.date); return d.getMonth() === mi && d.getFullYear() === calYear; });
                return (
                  <button key={m} onClick={() => setCalMonth(mi)}
                    className="relative shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black transition-all"
                    style={active
                      ? { background: 'linear-gradient(135deg, #00e5a022, #0fadeá11)', color: '#00e5a0', border: '1px solid #00e5a040' }
                      : { background: 'oklch(1 0 0 / 3%)', color: 'oklch(0.46 0.02 210)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                    {m}
                    {hasData && !active && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full" style={{ background: '#00e5a0' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 px-3 pt-2.5 pb-1">
            {WDAYS_S.map((d, i) => (
              <div key={`${d}${i}`} className="text-center py-0.5"
                style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.08em',
                  color: i === 0 || i === 6 ? '#f87171cc' : 'oklch(0.4 0.02 210)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid — compact */}
          {fetching ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: '#00e5a020', borderTopColor: '#00e5a0' }} />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 px-3 pb-3">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`p${i}`} />)}
              {calDays.map(day => {
                const key    = dk(day);
                const rec    = recordMap[key];
                const cs     = getCellStyle(day, rec, leaves);
                const h      = rec?.workingHours;
                const future = isAfter(day, new Date()) && !isSameDay(day, new Date());

                return (
                  <motion.button key={key}
                    whileHover={!future ? { scale: 1.1, y: -1 } : {}}
                    whileTap={!future ? { scale: 0.93 } : {}}
                    onClick={() => openDay(day)}
                    disabled={future}
                    title={cs.label || holName(day) || ''}
                    className="relative flex flex-col items-center justify-center rounded-lg"
                    style={{
                      aspectRatio: '1', minHeight: '38px', maxHeight: '46px',
                      background: cs.bg,
                      border: cs.isToday
                        ? `2px solid ${cs.color}`
                        : `1px solid ${cs.color}22`,
                      opacity: future ? 0.2 : 1,
                      cursor: future ? 'default' : 'pointer',
                      boxShadow: cs.isToday ? `0 0 0 3px ${cs.color}18` : undefined,
                    }}>

                    <span style={{ fontSize: '11px', fontWeight: 800, color: cs.color, lineHeight: 1 }}>
                      {format(day, 'd')}
                    </span>

                    {h != null && !cs.frozen && (
                      <span style={{ fontSize: '7px', fontWeight: 700, color: cs.color, opacity: 0.7, lineHeight: 1, marginTop: '1px' }}>
                        {h}h
                      </span>
                    )}

                    {isHoliday(day) && <span style={{ fontSize: '8px', lineHeight: 1, marginTop: '1px' }}>🎉</span>}
                    {isLeave(day, leaves) && !isHoliday(day) && <span style={{ fontSize: '8px', lineHeight: 1, marginTop: '1px' }}>🏖</span>}

                    {/* logged dot */}
                    {rec && !cs.frozen && (
                      <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full" style={{ background: cs.color }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Legend row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-2.5" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
            {[
              { c: '#00e5a0', l: 'Present' }, { c: '#f5c542', l: 'Late' },
              { c: '#f87171', l: 'Absent'  }, { c: '#a78bfa', l: 'Leave' },
              { c: '#fb923c', l: 'Holiday' }, { c: '#6b7280', l: 'Weekend' },
            ].map(x => (
              <div key={x.l} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: x.c }} />
                <span style={{ fontSize: '9px', color: 'oklch(0.48 0.02 210)' }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column: Holidays + Quick stats ─────────────────────────── */}
        <div className="space-y-4">

          {/* Holidays */}
          <div className="glass-panel overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)', background: 'linear-gradient(135deg, #fb923c0e, transparent)' }}>
              <Gift size={14} style={{ color: '#fb923c' }} />
              <div>
                <p className="text-xs font-black" style={{ color: '#fb923c', fontFamily: 'Space Grotesk, sans-serif' }}>
                  Holidays
                </p>
                <p style={{ fontSize: '9px', color: 'oklch(0.46 0.02 210)' }}>
                  {MONTHS_SHORT[calMonth]} {calYear}
                </p>
              </div>
            </div>

            {monthHols.length === 0 ? (
              <div className="py-6 text-center">
                <p style={{ fontSize: '11px', color: 'oklch(0.4 0.02 210)' }}>No holidays this month</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'oklch(1 0 0 / 5%)' }}>
                {monthHols.map(([dateStr, name], i) => {
                  const d = new Date(dateStr);
                  return (
                    <motion.div key={dateStr}
                      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.06 }}
                      className="flex items-center gap-3 px-4 py-2.5">
                      <div className="shrink-0 w-9 h-9 rounded-xl flex flex-col items-center justify-center"
                        style={{ background: '#fb923c18', border: '1px solid #fb923c30' }}>
                        <span style={{ fontSize: '6px', fontWeight: 900, color: '#fb923c', lineHeight: 1, textTransform: 'uppercase' }}>
                          {format(d,'MMM')}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#fb923c', lineHeight: 1, fontFamily: 'Space Grotesk, sans-serif' }}>
                          {format(d,'d')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{name}</p>
                        <p style={{ fontSize: '9px', color: 'oklch(0.5 0.02 210)' }}>{format(d,'EEE')}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Month summary mini card */}
          <div className="glass-panel p-4 space-y-3">
            <p className="text-xs font-black" style={{ color: 'oklch(0.55 0.02 210)', fontFamily: 'Space Grotesk, sans-serif' }}>
              This Month
            </p>
            {[
              { label: 'Logged', value: `${totalH.toFixed(1)}h`, color: '#00e5a0', pct: Math.min(100, (totalH / (workingDays.length * 8)) * 100) },
              { label: 'Present', value: `${presentCount} days`, color: '#60a5fa', pct: workingDays.length ? (presentCount/workingDays.length)*100 : 0 },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: 'oklch(0.52 0.02 210)' }}>{s.label}</span>
                  <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'oklch(1 0 0 / 6%)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Timesheet log table ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
        className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)', background: 'linear-gradient(135deg, #00e5a00a, transparent)' }}>
          <div className="flex items-center gap-2.5">
            <FileText size={14} style={{ color: '#00e5a0' }} />
            <div>
              <p className="text-sm font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Timesheet Log</p>
              <p style={{ fontSize: '9px', color: 'oklch(0.48 0.02 210)' }}>Working days · {MONTHS_FULL[calMonth]} {calYear}</p>
            </div>
          </div>
          <div className="text-right">
            <p style={{ fontSize: '8px', fontWeight: 900, color: 'oklch(0.4 0.02 210)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</p>
            <p style={{ fontSize: '16px', fontWeight: 900, color: '#00e5a0', fontFamily: 'Space Grotesk, sans-serif' }}>{totalH.toFixed(1)}h</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                {['Date','Day','Hours','Status','Notes',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left"
                    style={{ fontSize: '9px', fontWeight: 900, color: 'oklch(0.4 0.02 210)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calDays.filter(d => !isWeekend(d)).map((day, ri) => {
                const key     = dk(day);
                const rec     = recordMap[key];
                const cs      = getCellStyle(day, rec, leaves);
                const isToday = isSameDay(day, new Date());
                const future  = isAfter(day, new Date()) && !isToday;
                const hol     = isHoliday(day);
                const onLv    = isLeave(day, leaves);
                const h       = rec?.workingHours ?? 0;
                const hPctRow = Math.min(100, (h / MAX_WORK_HOURS) * 100);

                return (
                  <motion.tr key={key}
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: ri*0.015 }}
                    onClick={() => !future && !hol && !onLv && openDay(day)}
                    className="group transition-colors"
                    style={{
                      borderBottom: '1px solid oklch(1 0 0 / 4%)',
                      background: isToday ? '#00e5a008' : 'transparent',
                      opacity: future ? 0.28 : 1,
                      cursor: (future || hol || onLv) ? 'default' : 'pointer',
                    }}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {isToday && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#00e5a0' }} />}
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>
                          {format(day,'dd MMM')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span style={{ fontSize: '10px', color: 'oklch(0.5 0.02 210)' }}>{WDAYS_F[day.getDay()]}</span>
                    </td>
                    <td className="px-3 py-2.5 min-w-[72px]">
                      {hol || onLv ? (
                        <span style={{ fontSize: '10px', color: 'oklch(0.38 0.02 210)' }}>—</span>
                      ) : rec?.workingHours != null ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span style={{ fontSize: '11px', fontWeight: 800, color: cs.color, fontFamily: 'Space Grotesk, sans-serif' }}>{h}h</span>
                            {h >= MAX_WORK_HOURS && (
                              <span style={{ fontSize: '7px', fontWeight: 900, padding: '1px 4px', borderRadius: '4px', background: '#f5c54222', color: '#f5c542' }}>MAX</span>
                            )}
                          </div>
                          <div className="mt-0.5 w-14 h-1 rounded-full" style={{ background: 'oklch(1 0 0 / 7%)' }}>
                            <div className="h-full rounded-full" style={{ width: `${hPctRow}%`, background: cs.color }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'oklch(0.35 0.02 210)' }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full"
                        style={{ fontSize: '9px', fontWeight: 800, background: `${cs.color}18`, color: cs.color, border: `1px solid ${cs.color}30` }}>
                        {hol ? 'Holiday' : onLv ? 'Leave' : isToday && !rec ? 'Today' : future ? '—' : (cs.label || (rec ? rec.status : 'Absent'))}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[120px]">
                      <span style={{ fontSize: '9px', color: 'oklch(0.5 0.02 210)' }} className="truncate block">
                        {hol ? holName(day) : rec?.notes || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {!future && !hol && !onLv && (
                        <Edit3 size={11} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'oklch(0.55 0.02 210)' }} />
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          ENTRY MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedDay(null)}>
            <motion.div
              initial={{ scale:0.88, y:32, opacity:0 }}
              animate={{ scale:1, y:0, opacity:1 }}
              exit={{ scale:0.88, y:32, opacity:0 }}
              transition={{ type:'spring', stiffness:380, damping:30 }}
              className="w-full max-w-[360px] overflow-hidden rounded-3xl shadow-2xl"
              style={{ background: 'oklch(0.12 0.02 210)', border: '1px solid oklch(1 0 0 / 12%)' }}
              onClick={e => e.stopPropagation()}>

              {/* Gradient header */}
              <div className="relative px-5 py-4 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00e5a018, #0fadeá08)', borderBottom: '1px solid #00e5a018' }}>
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, #00e5a0, transparent)' }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p style={{ fontSize: '9px', fontWeight: 900, color: '#00e5a0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Log Hours
                    </p>
                    <p className="font-black text-white mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px' }}>
                      {format(selectedDay, 'EEEE')}
                    </p>
                    <p style={{ fontSize: '11px', color: 'oklch(0.55 0.02 210)', fontWeight: 600 }}>
                      {format(selectedDay, 'dd MMMM yyyy')}
                    </p>
                  </div>
                  <button onClick={() => setSelectedDay(null)}
                    className="p-1.5 rounded-xl hover:bg-white/10 mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">

                {/* Status */}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'oklch(0.45 0.02 210)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Status
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STATUS_OPTS.map(s => (
                      <button key={s.val} onClick={() => setEntryStatus(s.val)}
                        className="py-2.5 rounded-xl text-[9px] font-black transition-all"
                        style={entryStatus === s.val
                          ? { background: `${s.color}25`, color: s.color, border: `1.5px solid ${s.color}60`, boxShadow: `0 0 12px ${s.color}20` }
                          : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.48 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hours */}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'oklch(0.45 0.02 210)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Hours Worked <span style={{ fontWeight: 400, textTransform: 'none' }}>(max {MAX_WORK_HOURS}h)</span>
                  </p>

                  {/* Number input */}
                  <div className="relative mb-3">
                    <input type="number" min="0" max={MAX_WORK_HOURS} step="0.5"
                      value={entryHours} onChange={e => setEntryHours(e.target.value)}
                      placeholder="0.0"
                      className="w-full rounded-xl px-4 py-3 text-center font-black outline-none transition-all"
                      style={{
                        fontSize: '28px', fontFamily: 'Space Grotesk, sans-serif',
                        background: 'oklch(1 0 0 / 5%)', border: `1.5px solid ${hColor}40`,
                        color: hColor || 'white',
                        boxShadow: entryHours ? `0 0 0 3px ${hColor}12` : undefined,
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold"
                      style={{ fontSize: '14px', color: 'oklch(0.48 0.02 210)' }}>h</span>
                  </div>

                  {/* Quick chips */}
                  <div className="grid grid-cols-6 gap-1 mb-3">
                    {[4,6,7,8,8.5,9].map(h => (
                      <button key={h} onClick={() => setEntryHours(String(h))}
                        className="py-1.5 rounded-lg text-[9px] font-black transition-all"
                        style={entryHours === String(h)
                          ? { background: `${hColor}20`, color: hColor, border: `1px solid ${hColor}40` }
                          : { background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {h}h
                      </button>
                    ))}
                  </div>

                  {/* Bar */}
                  {entryHours !== '' && (
                    <div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'oklch(1 0 0 / 7%)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${hColor}cc, ${hColor})` }}
                          initial={{ width:0 }} animate={{ width:`${hPct}%` }}
                          transition={{ duration:0.35, ease:'easeOut' }} />
                      </div>
                      <div className="flex justify-between mt-1" style={{ fontSize: '9px' }}>
                        <span style={{ color: 'oklch(0.42 0.02 210)' }}>0h</span>
                        <span style={{ fontWeight: 800, color: hColor }}>{hVal}h / {MAX_WORK_HOURS}h</span>
                        <span style={{ color: 'oklch(0.42 0.02 210)' }}>Max</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'oklch(0.45 0.02 210)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                  </p>
                  <textarea rows={2} value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                    placeholder="WFH · Client visit · Training…"
                    className="aq-input resize-none text-sm" />
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => setSelectedDay(null)}
                    className="py-3 rounded-xl text-xs font-black transition-all"
                    style={{ background: 'oklch(1 0 0 / 5%)', color: 'oklch(0.55 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    disabled={saving || entryHours === '' || isNaN(parseFloat(entryHours))}
                    className="py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: `linear-gradient(135deg, #00e5a0, #00bcd4)`,
                      color: '#001a14',
                      opacity: (entryHours === '' || isNaN(parseFloat(entryHours))) ? 0.4 : 1,
                      boxShadow: '0 4px 16px #00e5a030',
                    }}>
                    <Save size={13} />
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
