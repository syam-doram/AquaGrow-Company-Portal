import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, RefreshCw, ChevronLeft, ChevronRight,
  X, Save, AlertTriangle, CheckCircle, Gift,
  Edit3, FileText, Hourglass, CalendarCheck,
  SunMedium, Star, TrendingUp, Activity,
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
  '2026-01-01': "New Year's Day",  '2026-01-14': 'Makar Sankranti',
  '2026-01-26': 'Republic Day',    '2026-03-25': 'Holi',
  '2026-04-02': 'Good Friday',     '2026-04-14': 'Ambedkar Jayanti',
  '2026-05-01': 'Labour Day',      '2026-08-15': 'Independence Day',
  '2026-09-17': 'Ganesh Chaturthi','2026-10-02': 'Gandhi Jayanti',
  '2026-10-21': 'Dussehra',        '2026-11-10': 'Diwali',
  '2026-12-25': 'Christmas Day',
  '2025-01-26': 'Republic Day',    '2025-05-01': 'Labour Day',
  '2025-08-15': 'Independence Day','2025-10-02': 'Gandhi Jayanti',
  '2025-10-20': 'Diwali',          '2025-12-25': 'Christmas Day',
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
const STATUS_CFG: Record<string, { color: string; label: string; bg: string }> = {
  present:  { color: 'oklch(0.72 0.19 167)',  label: 'Present',  bg: 'oklch(0.72 0.19 167 / 0.1)' },
  late:     { color: 'oklch(0.82 0.18 70)',   label: 'Late',     bg: 'oklch(0.82 0.18 70  / 0.1)' },
  half_day: { color: 'oklch(0.72 0.16 240)',  label: 'Half Day', bg: 'oklch(0.72 0.16 240 / 0.1)' },
  absent:   { color: 'oklch(0.68 0.22 25)',   label: 'Absent',   bg: 'oklch(0.68 0.22 25  / 0.1)' },
  on_leave: { color: 'oklch(0.68 0.16 295)',  label: 'Leave',    bg: 'oklch(0.68 0.16 295 / 0.1)' },
  holiday:  { color: 'oklch(0.78 0.17 55)',   label: 'Holiday',  bg: 'oklch(0.78 0.17 55  / 0.1)' },
  weekend:  { color: 'var(--aq-text-muted)',  label: 'Weekend',  bg: 'transparent'                 },
};

const getCellStyle = (d: Date, rec: AttendanceRecord | undefined, leaves: LeaveRecord[]) => {
  const today   = new Date();
  const isToday = isSameDay(d, today);
  const future  = isAfter(d, today) && !isToday;
  if (isHoliday(d))       return { ...STATUS_CFG.holiday,  isToday, future, frozen: true };
  if (isLeave(d, leaves)) return { ...STATUS_CFG.on_leave, isToday, future, frozen: true };
  if (isWeekend(d))       return { ...STATUS_CFG.weekend,  isToday, future, frozen: true };
  if (future)             return { color: 'var(--aq-text-faint)', label: '', bg: 'transparent', isToday, future, frozen: false };
  if (isToday && !rec)    return { color: 'oklch(0.72 0.19 167)', label: 'Today', bg: 'oklch(0.72 0.19 167 / 0.08)', isToday, future, frozen: false };
  if (!rec)               return { ...STATUS_CFG.absent,   isToday: false, future, frozen: false };
  return { ...(STATUS_CFG[rec.status] ?? STATUS_CFG.present), isToday, future, frozen: false };
};

const STATUS_OPTS: { val: EntryStatus; label: string; color: string }[] = [
  { val: 'present',  label: 'Present',  color: 'oklch(0.72 0.19 167)' },
  { val: 'late',     label: 'Late',     color: 'oklch(0.82 0.18 70)'  },
  { val: 'half_day', label: 'Half Day', color: 'oklch(0.72 0.16 240)' },
  { val: 'absent',   label: 'Absent',   color: 'oklch(0.68 0.22 25)'  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon, from, to, sub }: {
  label: string; value: string; icon: React.ReactNode;
  from: string; to: string; sub?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="aq-stat-card relative overflow-hidden"
    style={{ background: `linear-gradient(135deg, ${from}12, ${to}06)`, border: `1px solid ${from}28` }}
  >
    <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10"
      style={{ background: `radial-gradient(circle, ${from}, transparent)` }} />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: `${from}aa` }}>{label}</p>
        <div className="p-1.5 rounded-lg" style={{ background: `${from}18` }}>
          <div style={{ color: from }}>{icon}</div>
        </div>
      </div>
      <p className="text-2xl font-display font-bold" style={{ color: from }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: 'var(--aq-text-muted)' }}>{sub}</p>}
    </div>
  </motion.div>
);

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
    records.forEach(r => { if (r.date) m[r.date.slice(0, 10)] = r; });
    return m;
  }, [records]);

  const firstDay    = startOfMonth(new Date(calYear, calMonth));
  const calDays     = eachDayOfInterval({ start: firstDay, end: endOfMonth(firstDay) });
  const startOffset = firstDay.getDay();

  const workingDays  = calDays.filter(d => !isWeekend(d) && !isHoliday(d));
  const totalH       = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const monthHols    = Object.entries(PUBLIC_HOLIDAYS)
    .filter(([d]) => { const dt = new Date(d); return dt.getFullYear() === calYear && dt.getMonth() === calMonth; })
    .sort(([a], [b]) => a.localeCompare(b));

  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

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
        checkOut: `${key}T${String(9 + Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}:00.000Z`,
      };
      if (ex?._id) {
        await hrmsApi.attendance.update(ex._id, payload);
      } else {
        try { await hrmsApi.attendance.checkIn(); } catch {}
        const fresh = await hrmsApi.attendance.list({ month: `${calYear}-${String(calMonth + 1).padStart(2, '0')}` });
        const cr = (fresh as AttendanceRecord[]).find(r => r.date?.startsWith(key));
        if (cr?._id) await hrmsApi.attendance.update(cr._id, payload);
      }
      toast.success(`✅ Saved — ${format(selectedDay, 'dd MMM')}`);
      setSelectedDay(null); await fetchAll();
    } catch (e: any) { toast.error(e.message ?? 'Save failed'); }
    finally { setSaving(false); }
  };

  const hVal   = parseFloat(entryHours) || 0;
  const hPct   = Math.min(100, (hVal / MAX_WORK_HOURS) * 100);
  const hColor = hVal >= MAX_WORK_HOURS ? 'oklch(0.68 0.22 25)' : hVal >= 8 ? 'oklch(0.72 0.19 167)' : 'oklch(0.82 0.18 70)';

  const completionPct = workingDays.length > 0 ? Math.round((presentCount / workingDays.length) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero strip ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
            Timesheet
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
            {MONTHS_FULL[calMonth]} {calYear} &nbsp;·&nbsp; Tap a date to log hours
          </p>
        </div>
        <button onClick={fetchAll} disabled={fetching} className="aq-btn-ghost !py-1.5 !px-3 !text-xs self-start sm:self-auto">
          <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Hours Logged"  value={`${totalH.toFixed(1)}h`}       icon={<Clock size={13} />}        from="oklch(0.72 0.19 167)" to="oklch(0.6 0.16 187)" sub="This month" />
        <StatCard label="Days Present"  value={`${presentCount}d`}             icon={<CalendarCheck size={13} />} from="oklch(0.82 0.18 70)"  to="oklch(0.72 0.18 55)" sub={`${completionPct}% attendance`} />
        <StatCard label="Working Days"  value={`${workingDays.length}d`}        icon={<SunMedium size={13} />}    from="oklch(0.72 0.16 240)" to="oklch(0.65 0.18 270)" sub="Excl. holidays" />
        <StatCard label="Holidays"      value={`${monthHols.length}`}           icon={<Star size={13} />}         from="oklch(0.78 0.17 55)"  to="oklch(0.75 0.18 25)" sub="This month" />
      </div>

      {/* ── Two-column: Calendar + Side Panel ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Calendar (2/3 width) ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 glass-panel overflow-hidden">

          {/* Month nav + month strip */}
          <div className="px-4 py-3 space-y-2.5" style={{ borderBottom: '1px solid var(--aq-glass-border)' }}>
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="aq-btn-ghost !p-1.5 !rounded-xl"><ChevronLeft size={15} /></button>
              <div className="text-center">
                <p className="text-sm font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
                  {MONTHS_FULL[calMonth]} {calYear}
                </p>
              </div>
              <button onClick={nextMonth} className="aq-btn-ghost !p-1.5 !rounded-xl"><ChevronRight size={15} /></button>
            </div>

            {/* Month strip */}
            <div className="flex gap-1 overflow-x-auto">
              {MONTHS_SHORT.map((m, mi) => {
                const active  = mi === calMonth;
                const hasData = records.some(r => { const d = new Date(r.date); return d.getMonth() === mi && d.getFullYear() === calYear; });
                return (
                  <button key={m} onClick={() => setCalMonth(mi)}
                    className="relative shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black transition-all"
                    style={active
                      ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }
                      : { background: 'var(--aq-glass-bg)', color: 'var(--aq-text-muted)', border: '1px solid var(--aq-glass-border)' }}>
                    {m}
                    {hasData && !active && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full" style={{ background: 'oklch(0.72 0.19 167)' }} />}
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
                  color: i === 0 || i === 6 ? 'oklch(0.68 0.22 25 / 0.8)' : 'var(--aq-text-muted)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          {fetching ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--aq-glass-border)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
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
                    whileHover={!future ? { scale: 1.08, y: -1 } : {}}
                    whileTap={!future ? { scale: 0.93 } : {}}
                    onClick={() => openDay(day)}
                    disabled={future}
                    title={cs.label || holName(day) || ''}
                    className="relative flex flex-col items-center justify-center rounded-xl transition-all"
                    style={{
                      aspectRatio: '1', minHeight: '38px', maxHeight: '48px',
                      background: cs.bg,
                      border: cs.isToday
                        ? `2px solid ${cs.color}`
                        : `1px solid ${cs.color}28`,
                      opacity: future ? 0.2 : 1,
                      cursor: future ? 'default' : 'pointer',
                      boxShadow: cs.isToday ? `0 0 0 3px ${cs.color}15` : undefined,
                    }}>

                    <span style={{ fontSize: '11px', fontWeight: 800, color: cs.color, lineHeight: 1 }}>
                      {format(day, 'd')}
                    </span>

                    {h != null && !cs.frozen && (
                      <span style={{ fontSize: '7px', fontWeight: 700, color: cs.color, opacity: 0.75, lineHeight: 1, marginTop: '1px' }}>
                        {h}h
                      </span>
                    )}
                    {isHoliday(day) && <span style={{ fontSize: '8px', lineHeight: 1, marginTop: '1px' }}>🎉</span>}
                    {isLeave(day, leaves) && !isHoliday(day) && <span style={{ fontSize: '8px', lineHeight: 1, marginTop: '1px' }}>🏖</span>}
                    {rec && !cs.frozen && (
                      <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full" style={{ background: cs.color }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Legend row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-2.5" style={{ borderTop: '1px solid var(--aq-glass-border)' }}>
            {[
              { c: 'oklch(0.72 0.19 167)', l: 'Present'  },
              { c: 'oklch(0.82 0.18 70)',  l: 'Late'     },
              { c: 'oklch(0.68 0.22 25)',  l: 'Absent'   },
              { c: 'oklch(0.68 0.16 295)', l: 'Leave'    },
              { c: 'oklch(0.78 0.17 55)',  l: 'Holiday'  },
              { c: 'var(--aq-text-muted)', l: 'Weekend'  },
            ].map(x => (
              <div key={x.l} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: x.c }} />
                <span style={{ fontSize: '9px', color: 'var(--aq-text-muted)' }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column: Holidays + Month Summary ────────────────────────── */}
        <div className="space-y-4">

          {/* Holidays */}
          <div className="glass-panel overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3"
              style={{ borderBottom: '1px solid var(--aq-glass-border)', background: 'oklch(0.78 0.17 55 / 0.06)' }}>
              <Gift size={14} style={{ color: 'oklch(0.78 0.17 55)' }} />
              <div>
                <p className="text-xs font-display font-black" style={{ color: 'oklch(0.78 0.17 55)' }}>Holidays</p>
                <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)' }}>{MONTHS_SHORT[calMonth]} {calYear}</p>
              </div>
            </div>

            {monthHols.length === 0 ? (
              <div className="py-6 text-center">
                <p style={{ fontSize: '11px', color: 'var(--aq-text-muted)' }}>No holidays this month</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--aq-glass-border)' }}>
                {monthHols.map(([dateStr, name], i) => {
                  const d = new Date(dateStr);
                  return (
                    <motion.div key={dateStr}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 px-4 py-2.5">
                      <div className="shrink-0 w-9 h-9 rounded-xl flex flex-col items-center justify-center"
                        style={{ background: 'oklch(0.78 0.17 55 / 0.1)', border: '1px solid oklch(0.78 0.17 55 / 0.25)' }}>
                        <span style={{ fontSize: '6px', fontWeight: 900, color: 'oklch(0.78 0.17 55)', lineHeight: 1, textTransform: 'uppercase' }}>
                          {format(d, 'MMM')}
                        </span>
                        <span className="font-display" style={{ fontSize: '14px', fontWeight: 900, color: 'oklch(0.78 0.17 55)', lineHeight: 1 }}>
                          {format(d, 'd')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>{name}</p>
                        <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)' }}>{format(d, 'EEE')}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Month summary mini card */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-display font-black" style={{ color: 'var(--aq-text-secondary)' }}>This Month</p>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)' }}>
                {completionPct}% present
              </span>
            </div>
            {[
              { label: 'Hours Logged', value: `${totalH.toFixed(1)}h`, color: 'oklch(0.72 0.19 167)', pct: Math.min(100, (totalH / (workingDays.length * 8)) * 100) },
              { label: 'Attendance',  value: `${presentCount}/${workingDays.length}d`, color: 'oklch(0.72 0.16 240)', pct: workingDays.length ? (presentCount / workingDays.length) * 100 : 0 },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: 'var(--aq-text-muted)' }}>{s.label}</span>
                  <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--aq-progress-track)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div className="glass-panel p-4">
            <p className="text-xs font-display font-black mb-3" style={{ color: 'var(--aq-text-secondary)' }}>Status Breakdown</p>
            <div className="space-y-2">
              {[
                { label: 'On Time',  count: records.filter(r => r.status === 'present').length,  color: 'oklch(0.72 0.19 167)' },
                { label: 'Late',     count: records.filter(r => r.status === 'late').length,      color: 'oklch(0.82 0.18 70)'  },
                { label: 'Half Day', count: records.filter(r => r.status === 'half_day').length,  color: 'oklch(0.72 0.16 240)' },
                { label: 'Absent',   count: records.filter(r => r.status === 'absent').length,    color: 'oklch(0.68 0.22 25)'  },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-[10px]" style={{ color: 'var(--aq-text-secondary)' }}>{s.label}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${s.color}15`, color: s.color }}>
                    {s.count}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Timesheet log table ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-panel overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--aq-glass-border)', background: 'oklch(0.72 0.19 167 / 0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.1)' }}>
              <FileText size={14} style={{ color: 'oklch(0.72 0.19 167)' }} />
            </div>
            <div>
              <p className="text-sm font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>Timesheet Log</p>
              <p style={{ fontSize: '9px', color: 'var(--aq-text-muted)' }}>Working days · {MONTHS_FULL[calMonth]} {calYear}</p>
            </div>
          </div>
          <div className="text-right">
            <p style={{ fontSize: '8px', fontWeight: 900, color: 'var(--aq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</p>
            <p className="font-display" style={{ fontSize: '18px', fontWeight: 900, color: 'oklch(0.72 0.19 167)' }}>{totalH.toFixed(1)}h</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--aq-table-th-border)', background: 'var(--aq-table-th-bg)' }}>
                {['Date', 'Day', 'Hours', 'Status', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left"
                    style={{ fontSize: '9px', fontWeight: 900, color: 'var(--aq-table-th-color)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
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
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.012 }}
                    onClick={() => !future && !hol && !onLv && openDay(day)}
                    className="group transition-colors"
                    style={{
                      borderBottom: '1px solid var(--aq-table-td-border)',
                      background: isToday ? 'oklch(0.72 0.19 167 / 0.05)' : 'transparent',
                      opacity: future ? 0.28 : 1,
                      cursor: (future || hol || onLv) ? 'default' : 'pointer',
                    }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isToday && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'oklch(0.72 0.19 167)' }} />}
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aq-text-primary)', fontFamily: 'monospace' }}>
                          {format(day, 'dd MMM')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ fontSize: '10px', color: 'var(--aq-text-muted)' }}>{WDAYS_F[day.getDay()]}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[80px]">
                      {hol || onLv ? (
                        <span style={{ fontSize: '10px', color: 'var(--aq-text-faint)' }}>—</span>
                      ) : rec?.workingHours != null ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-display" style={{ fontSize: '12px', fontWeight: 900, color: cs.color }}>{h}h</span>
                            {h >= MAX_WORK_HOURS && (
                              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-md"
                                style={{ background: 'oklch(0.82 0.18 70 / 0.15)', color: 'oklch(0.82 0.18 70)' }}>MAX</span>
                            )}
                          </div>
                          <div className="mt-0.5 w-14 h-1 rounded-full overflow-hidden" style={{ background: 'var(--aq-progress-track)' }}>
                            <div className="h-full rounded-full" style={{ width: `${hPctRow}%`, background: cs.color }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--aq-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full"
                        style={{ fontSize: '9px', fontWeight: 800, background: `${cs.color}15`, color: cs.color, border: `1px solid ${cs.color}28` }}>
                        {hol ? 'Holiday' : onLv ? 'Leave' : isToday && !rec ? 'Today' : future ? '—' : (cs.label || (rec ? rec.status : 'Absent'))}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <span style={{ fontSize: '9px', color: 'var(--aq-text-muted)' }} className="truncate block">
                        {hol ? holName(day) : rec?.notes || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!future && !hol && !onLv && (
                        <Edit3 size={11} className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--aq-text-muted)' }} />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'oklch(0 0 0 / 80%)', backdropFilter: 'blur(12px)' }}
            onClick={() => setSelectedDay(null)}>
            <motion.div
              initial={{ scale: 0.88, y: 32, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 32, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-[380px] overflow-hidden glass-panel shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Gradient header */}
              <div className="relative px-5 py-4 overflow-hidden"
                style={{ background: 'oklch(0.72 0.19 167 / 0.08)', borderBottom: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-15"
                  style={{ background: 'radial-gradient(circle, oklch(0.72 0.19 167), transparent)' }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p style={{ fontSize: '9px', fontWeight: 900, color: 'oklch(0.72 0.19 167)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Log Hours
                    </p>
                    <p className="font-display font-black mt-0.5" style={{ color: 'var(--aq-text-primary)', fontSize: '18px' }}>
                      {format(selectedDay, 'EEEE')}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--aq-text-muted)', fontWeight: 600 }}>
                      {format(selectedDay, 'dd MMMM yyyy')}
                    </p>
                  </div>
                  <button onClick={() => setSelectedDay(null)}
                    className="p-1.5 rounded-xl transition-colors" style={{ color: 'var(--aq-text-muted)' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--aq-ghost-hover)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">

                {/* Status */}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--aq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Status
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STATUS_OPTS.map(s => (
                      <button key={s.val} onClick={() => setEntryStatus(s.val)}
                        className="py-2.5 rounded-xl text-[9px] font-black transition-all"
                        style={entryStatus === s.val
                          ? { background: `${s.color}20`, color: s.color, border: `1.5px solid ${s.color}55`, boxShadow: `0 0 12px ${s.color}18` }
                          : { background: 'var(--aq-input-bg)', color: 'var(--aq-text-muted)', border: '1px solid var(--aq-input-border)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hours input */}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--aq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Hours Worked <span style={{ fontWeight: 400, textTransform: 'none' }}>(max {MAX_WORK_HOURS}h)</span>
                  </p>
                  <div className="relative mb-3">
                    <input type="number" min="0" max={MAX_WORK_HOURS} step="0.5"
                      value={entryHours} onChange={e => setEntryHours(e.target.value)}
                      placeholder="0.0"
                      className="w-full rounded-xl px-4 py-3 text-center font-display font-black outline-none transition-all"
                      style={{
                        fontSize: '28px',
                        background: 'var(--aq-input-bg)', border: `1.5px solid ${hColor}40`,
                        color: hColor || 'var(--aq-text-primary)',
                        boxShadow: entryHours ? `0 0 0 3px ${hColor}12` : undefined,
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold"
                      style={{ fontSize: '14px', color: 'var(--aq-text-muted)' }}>h</span>
                  </div>

                  {/* Quick chips */}
                  <div className="grid grid-cols-6 gap-1.5 mb-3">
                    {[4, 6, 7, 8, 8.5, 9].map(h => (
                      <button key={h} onClick={() => setEntryHours(String(h))}
                        className="py-1.5 rounded-lg text-[9px] font-black transition-all"
                        style={entryHours === String(h)
                          ? { background: `${hColor}18`, color: hColor, border: `1px solid ${hColor}40` }
                          : { background: 'var(--aq-input-bg)', color: 'var(--aq-text-muted)', border: '1px solid var(--aq-input-border)' }}>
                        {h}h
                      </button>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {entryHours !== '' && (
                    <div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--aq-progress-track)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${hColor}bb, ${hColor})` }}
                          initial={{ width: 0 }} animate={{ width: `${hPct}%` }}
                          transition={{ duration: 0.35, ease: 'easeOut' }} />
                      </div>
                      <div className="flex justify-between mt-1" style={{ fontSize: '9px' }}>
                        <span style={{ color: 'var(--aq-text-muted)' }}>0h</span>
                        <span style={{ fontWeight: 800, color: hColor }}>{hVal}h / {MAX_WORK_HOURS}h</span>
                        <span style={{ color: 'var(--aq-text-muted)' }}>Max</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 900, color: 'var(--aq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                  </p>
                  <textarea rows={2} value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                    placeholder="WFH · Client visit · Training…"
                    className="aq-input resize-none text-sm" />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => setSelectedDay(null)}
                    className="aq-btn-ghost justify-center py-3 !text-xs font-black">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    disabled={saving || entryHours === '' || isNaN(parseFloat(entryHours))}
                    className="aq-btn-primary justify-center py-3 !text-xs font-black"
                    style={{ opacity: (entryHours === '' || isNaN(parseFloat(entryHours))) ? 0.4 : 1 }}>
                    <Save size={13} />
                    {saving ? 'Saving…' : 'Save Entry'}
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
