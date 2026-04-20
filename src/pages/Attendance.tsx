import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, RefreshCw, ChevronLeft, ChevronRight,
  X, Save, Clock, AlertTriangle, CheckCircle, Gift,
  Sun, Umbrella, Info,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isWeekend, isBefore, isAfter, isSameDay, isSameMonth,
} from 'date-fns';
import { toast } from 'sonner';
import hrmsApi from '../api';

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_WORK_HOURS = 9;

// ── 2025 / 2026 Indian Public Holidays ────────────────────────────────────────
const PUBLIC_HOLIDAYS: Record<string, string> = {
  '2026-01-01': "New Year's Day",
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
  '2026-12-25': 'Christmas Day',
  '2025-01-26': 'Republic Day',
  '2025-05-01': 'Labour Day',
  '2025-08-15': 'Independence Day',
  '2025-10-02': 'Gandhi Jayanti',
  '2025-10-20': 'Diwali',
  '2025-12-25': 'Christmas Day',
};

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  _id?: string;
  empId?: string;
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

// ── Helpers ────────────────────────────────────────────────────────────────────
const dateKey     = (d: Date) => format(d, 'yyyy-MM-dd');
const isHoliday   = (d: Date) => dateKey(d) in PUBLIC_HOLIDAYS;
const holidayName = (d: Date) => PUBLIC_HOLIDAYS[dateKey(d)] ?? '';

const isLeaveDay = (d: Date, leaves: LeaveRecord[]) =>
  leaves.some(l => {
    if (l.status !== 'approved') return false;
    const from = new Date(l.from);
    const to   = new Date(l.to);
    return !isBefore(d, from) && !isAfter(d, to);
  });

const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEK_HDR     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Day cell styling ──────────────────────────────────────────────────────────
const dayStyle = (
  d: Date,
  rec: AttendanceRecord | undefined,
  leaves: LeaveRecord[],
): { bg: string; text: string; label?: string; isSpecial?: boolean } => {
  const today     = new Date();
  const isTodayD  = isSameDay(d, today);
  const inFuture  = isAfter(d, today) && !isTodayD;

  if (isHoliday(d))            return { bg: 'oklch(0.78 0.17 295 / 0.18)', text: 'oklch(0.78 0.17 295)', label: holidayName(d), isSpecial: true };
  if (isLeaveDay(d, leaves))   return { bg: 'oklch(0.75 0.16 240 / 0.18)', text: 'oklch(0.75 0.16 240)', label: 'Leave', isSpecial: true };
  if (isWeekend(d))            return { bg: 'oklch(1 0 0 / 0.03)',          text: 'oklch(0.35 0.02 210)', label: 'Weekend' };
  if (inFuture)                return { bg: 'transparent',                  text: 'oklch(0.28 0.02 210)' };
  if (isTodayD)                return { bg: 'oklch(0.72 0.19 167 / 0.15)', text: 'oklch(0.72 0.19 167)', label: 'Today' };

  if (!rec)                    return { bg: 'oklch(0.65 0.22 25 / 0.12)',  text: 'oklch(0.75 0.18 25)',  label: 'Absent' };

  const map: Record<string, ReturnType<typeof dayStyle>> = {
    present:  { bg: 'oklch(0.72 0.19 167 / 0.18)', text: 'oklch(0.72 0.19 167)', label: 'Present' },
    late:     { bg: 'oklch(0.78 0.17 70 / 0.18)',  text: 'oklch(0.78 0.17 70)',  label: 'Late' },
    half_day: { bg: 'oklch(0.75 0.16 240 / 0.18)', text: 'oklch(0.75 0.16 240)', label: 'Half Day' },
    absent:   { bg: 'oklch(0.65 0.22 25 / 0.12)',  text: 'oklch(0.75 0.18 25)',  label: 'Absent' },
    on_leave: { bg: 'oklch(0.75 0.16 240 / 0.18)', text: 'oklch(0.75 0.16 240)', label: 'Leave' },
  };
  return map[rec.status] ?? map.present;
};

// ══════════════════════════════════════════════════════════════════════════════
const Attendance: React.FC = () => {
  const { employee } = useAuth();

  // Calendar state — month view only
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Data
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves]   = useState<LeaveRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  // Day entry panel
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [entryHours, setEntryHours]   = useState('');
  const [entryStatus, setEntryStatus] = useState<AttendanceRecord['status']>('present');
  const [entryNotes, setEntryNotes]   = useState('');
  const [saving, setSaving]           = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const monthParam = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
      const [attData, leaveData] = await Promise.all([
        hrmsApi.attendance.list({ month: monthParam }),
        hrmsApi.leaves.list({ status: 'approved' }),
      ]);
      setRecords(attData);
      setLeaves(leaveData);
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
    records.forEach(r => { if (r.date) m[r.date.slice(0, 10)] = r; });
    return m;
  }, [records]);

  // Month days + offset
  const firstDay    = startOfMonth(new Date(calYear, calMonth));
  const lastDay     = endOfMonth(firstDay);
  const calDays     = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startOffset = firstDay.getDay(); // 0=Sun

  // Upcoming holidays in this month
  const monthHolidays = useMemo(() =>
    Object.entries(PUBLIC_HOLIDAYS)
      .filter(([date]) => {
        const d = new Date(date);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .sort(([a], [b]) => a.localeCompare(b)),
    [calYear, calMonth]);

  // Month nav
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  // ── Open day entry panel ──────────────────────────────────────────────────
  const openDay = (d: Date) => {
    // Frozen days — only show info, no editing
    if (isHoliday(d) || isLeaveDay(d, leaves) || isWeekend(d)) {
      toast.info(
        isHoliday(d) ? `🎉 ${holidayName(d)}` :
        isLeaveDay(d, leaves) ? '🏖 Approved leave day' :
        '📅 Weekend — no attendance required'
      );
      return;
    }
    const key = dateKey(d);
    const existing = recordMap[key];
    setEntryHours(existing?.workingHours != null ? String(existing.workingHours) : '');
    setEntryStatus(existing?.status ?? 'present');
    setEntryNotes(existing?.notes ?? '');
    setSelectedDay(d);
  };

  // ── Save day entry ─────────────────────────────────────────────────────────
  const handleSaveEntry = async () => {
    if (!selectedDay) return;
    const hours = parseFloat(entryHours);
    if (isNaN(hours) || hours < 0 || hours > MAX_WORK_HOURS) {
      toast.error(`Enter hours between 0 and ${MAX_WORK_HOURS}`);
      return;
    }

    setSaving(true);
    try {
      const key     = dateKey(selectedDay);
      const existing = recordMap[key];

      const payload = {
        date:         key,
        workingHours: hours,
        status:       entryStatus,
        notes:        entryNotes,
        // derive synthetic check-in/out so backend is happy
        checkIn:  `${key}T09:00:00.000Z`,
        checkOut: `${key}T${String(9 + Math.floor(hours)).padStart(2,'0')}:${String(Math.round((hours % 1) * 60)).padStart(2,'0')}:00.000Z`,
      };

      if (existing?._id) {
        await hrmsApi.attendance.update(existing._id, payload);
      } else {
        // Use checkIn endpoint to create, then update with full payload
        try {
          await hrmsApi.attendance.checkIn();
        } catch {
          // may already exist — ignore
        }
        const fresh = await hrmsApi.attendance.list({ month: `${calYear}-${String(calMonth + 1).padStart(2,'0')}` });
        const created = fresh.find((r: AttendanceRecord) => r.date?.startsWith(key));
        if (created?._id) {
          await hrmsApi.attendance.update(created._id, payload);
        }
      }

      toast.success(`✅ Attendance saved for ${format(selectedDay, 'dd MMM yyyy')}`);
      setSelectedDay(null);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Attendance
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            Click any working day to log hours · Holidays & weekends are locked
          </p>
        </div>
        <button onClick={fetchAll} disabled={fetching} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
          <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Month Calendar ─────────────────────────────────────────────────── */}
      <div className="glass-panel overflow-hidden">

        {/* Month navigator */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
          <button onClick={prevMonth} className="aq-btn-ghost !p-1.5">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <h2 className="text-base font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {MONTHS_FULL[calMonth]} {calYear}
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
              {monthHolidays.length > 0
                ? `${monthHolidays.length} holiday${monthHolidays.length > 1 ? 's' : ''} this month`
                : 'No public holidays this month'}
            </p>
          </div>
          <button onClick={nextMonth} className="aq-btn-ghost !p-1.5">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Month selector strip */}
        <div className="flex gap-1 px-4 pt-3 overflow-x-auto pb-1">
          {MONTHS_SHORT.map((m, mi) => {
            const isCur = mi === calMonth;
            return (
              <button key={m} onClick={() => setCalMonth(mi)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0"
                style={isCur
                  ? { background: 'oklch(0.72 0.19 167 / 0.18)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.35)' }
                  : { background: 'oklch(1 0 0 / 3%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                {m}
              </button>
            );
          })}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-4 pt-3 pb-1">
          {WEEK_HDR.map(d => (
            <div key={d} className="text-center text-[9px] font-black uppercase tracking-wider py-1"
              style={{ color: d === 'Sun' || d === 'Sat' ? 'oklch(0.75 0.18 25)' : 'oklch(0.42 0.02 210)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'oklch(0.72 0.19 167 / 0.2)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {/* Empty offset cells */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {calDays.map(day => {
              const key      = dateKey(day);
              const rec      = recordMap[key];
              const style    = dayStyle(day, rec, leaves);
              const todayD   = isSameDay(day, new Date());
              const frozen   = isHoliday(day) || isLeaveDay(day, leaves) || isWeekend(day);
              const inFuture = isAfter(day, new Date()) && !todayD;
              const hours    = rec?.workingHours;

              return (
                <motion.button
                  key={key}
                  whileHover={!inFuture ? { scale: 1.06 } : {}}
                  onClick={() => openDay(day)}
                  disabled={inFuture}
                  className="relative flex flex-col items-center justify-center rounded-xl transition-all"
                  style={{
                    background: style.bg,
                    border: todayD ? '1.5px solid oklch(0.72 0.19 167 / 0.6)' : '1px solid transparent',
                    aspectRatio: '1',
                    opacity: inFuture ? 0.3 : 1,
                    cursor: inFuture ? 'default' : frozen ? 'pointer' : 'pointer',
                    minHeight: '44px',
                  }}>
                  {/* Day number */}
                  <span className="text-[11px] font-bold leading-none"
                    style={{ color: style.text }}>
                    {format(day, 'd')}
                  </span>

                  {/* Hours badge */}
                  {hours != null && !frozen && (
                    <span className="text-[8px] font-bold leading-none mt-0.5"
                      style={{ color: style.text, opacity: 0.8 }}>
                      {hours}h
                    </span>
                  )}

                  {/* Holiday / Leave emoji */}
                  {isHoliday(day) && (
                    <span className="text-[9px] leading-none mt-0.5">🎉</span>
                  )}
                  {isLeaveDay(day, leaves) && !isHoliday(day) && (
                    <span className="text-[9px] leading-none mt-0.5">🏖</span>
                  )}

                  {/* Today dot */}
                  {todayD && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: 'oklch(0.72 0.19 167)' }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-5 py-3" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
          {[
            { color: 'oklch(0.72 0.19 167)', label: 'Present' },
            { color: 'oklch(0.78 0.17 70)',  label: 'Late' },
            { color: 'oklch(0.75 0.18 25)',  label: 'Absent' },
            { color: 'oklch(0.75 0.16 240)', label: 'Leave' },
            { color: 'oklch(0.78 0.17 295)', label: 'Holiday' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Holidays This Month ─────────────────────────────────────────────── */}
      {monthHolidays.length > 0 && (
        <div className="glass-panel overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              🎉 Holidays — {MONTHS_FULL[calMonth]} {calYear}
            </h3>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {monthHolidays.map(([date, name]) => {
              const d   = new Date(date);
              const day = format(d, 'EEEE');
              return (
                <div key={date} className="flex items-center gap-4 px-4 py-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center"
                    style={{ background: 'oklch(0.78 0.17 295 / 0.12)', border: '1px solid oklch(0.78 0.17 295 / 0.25)' }}>
                    <span className="text-[8px] font-black uppercase" style={{ color: 'oklch(0.78 0.17 295)' }}>
                      {format(d, 'MMM')}
                    </span>
                    <span className="text-sm font-black leading-none" style={{ color: 'oklch(0.78 0.17 295)' }}>
                      {format(d, 'd')}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{name}</p>
                    <p className="text-[9px]" style={{ color: 'oklch(0.5 0.02 210)' }}>{day}</p>
                  </div>
                  <span className="ml-auto aq-badge" style={{ background: 'oklch(0.78 0.17 295 / 0.12)', color: 'oklch(0.78 0.17 295)', border: '1px solid oklch(0.78 0.17 295 / 0.2)' }}>
                    Holiday
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Attendance History Table ────────────────────────────────────────── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Attendance Log — {MONTHS_FULL[calMonth]} {calYear}
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            All working days this month
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="aq-table w-full">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-left">Day</th>
                <th className="text-center">Hours</th>
                <th className="text-center">Status</th>
                <th className="text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {calDays
                .filter(d => !isWeekend(d))
                .map(day => {
                  const key     = dateKey(day);
                  const rec     = recordMap[key];
                  const todayD  = isSameDay(day, new Date());
                  const inFut   = isAfter(day, new Date()) && !todayD;
                  const holiday = isHoliday(day);
                  const onLeave = isLeaveDay(day, leaves);
                  const dy      = dayStyle(day, rec, leaves);

                  let statusEl: React.ReactNode;
                  if (holiday)       statusEl = <span className="aq-badge" style={{ background: 'oklch(0.78 0.17 295 / 0.12)', color: 'oklch(0.78 0.17 295)', border: '1px solid oklch(0.78 0.17 295 / 0.2)' }}>Holiday</span>;
                  else if (onLeave)  statusEl = <span className="aq-badge aq-badge-blue">Leave</span>;
                  else if (inFut)    statusEl = <span className="text-[10px]" style={{ color: 'oklch(0.35 0.02 210)' }}>—</span>;
                  else if (rec)      statusEl = <span className="aq-badge" style={{ background: dy.bg, color: dy.text, border: `1px solid ${dy.text.replace(')', ' / 0.25)')}` }}>{dy.label}</span>;
                  else               statusEl = <span className="aq-badge aq-badge-red">Absent</span>;

                  return (
                    <tr key={key}
                      style={{
                        background: todayD ? 'oklch(0.72 0.19 167 / 0.05)' : 'transparent',
                        opacity: inFut ? 0.35 : 1,
                      }}>
                      <td>
                        <span className="text-xs font-mono text-white">
                          {format(day, 'dd MMM')}
                        </span>
                        {todayD && <span className="ml-1.5 aq-badge aq-badge-green" style={{ fontSize: '7px' }}>Today</span>}
                      </td>
                      <td className="text-xs" style={{ color: 'oklch(0.55 0.02 210)' }}>
                        {format(day, 'EEE')}
                      </td>
                      <td className="text-center">
                        {holiday || onLeave ? (
                          <span className="text-xs" style={{ color: 'oklch(0.4 0.02 210)' }}>—</span>
                        ) : rec?.workingHours != null ? (
                          <span className="text-xs font-bold text-white font-mono">
                            {rec.workingHours}h
                            {rec.workingHours >= MAX_WORK_HOURS && <span className="ml-1 text-[8px]" style={{ color: 'oklch(0.78 0.17 70)' }}>Max</span>}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'oklch(0.35 0.02 210)' }}>—</span>
                        )}
                      </td>
                      <td className="text-center">{statusEl}</td>
                      <td className="text-xs max-w-[120px] truncate" style={{ color: 'oklch(0.5 0.02 210)' }}>
                        {rec?.notes || (holiday ? holidayName(day) : '—')}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DAY ENTRY PANEL (slide-in from right)
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedDay(null)}>
            <motion.div initial={{ scale: 0.92, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 18 }}
              className="w-full max-w-sm glass-panel overflow-hidden"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)', background: 'oklch(0.72 0.19 167 / 0.07)' }}>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>
                    Log Attendance
                  </p>
                  <p className="text-base font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {format(selectedDay, 'EEEE, dd MMM yyyy')}
                  </p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-xl hover:bg-white/10" style={{ color: 'oklch(0.5 0.02 210)' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Status selector */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'oklch(0.45 0.02 210)' }}>
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { val: 'present',  label: 'Present',  color: 'oklch(0.72 0.19 167)' },
                      { val: 'late',     label: 'Late',     color: 'oklch(0.78 0.17 70)'  },
                      { val: 'half_day', label: 'Half Day', color: 'oklch(0.75 0.16 240)' },
                      { val: 'absent',   label: 'Absent',   color: 'oklch(0.75 0.18 25)'  },
                    ] as const).map(s => (
                      <button key={s.val} type="button" onClick={() => setEntryStatus(s.val)}
                        className="py-2 px-3 rounded-xl text-xs font-bold transition-all"
                        style={entryStatus === s.val
                          ? { background: `${s.color.replace(')', ' / 0.18)')}`, color: s.color, border: `1px solid ${s.color.replace(')', ' / 0.4)')}` }
                          : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Working hours */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                    Hours Worked <span style={{ color: 'oklch(0.72 0.19 167)' }}>* (max {MAX_WORK_HOURS}h)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={MAX_WORK_HOURS}
                      step="0.5"
                      value={entryHours}
                      onChange={e => setEntryHours(e.target.value)}
                      placeholder="e.g. 8.5"
                      className="aq-input pr-10 text-lg font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'oklch(0.5 0.02 210)' }}>
                      hrs
                    </span>
                  </div>

                  {/* Hours progress bar */}
                  {entryHours && !isNaN(parseFloat(entryHours)) && (
                    <div className="mt-2">
                      <div className="w-full h-2 rounded-full" style={{ background: 'oklch(1 0 0 / 6%)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{
                            background: parseFloat(entryHours) >= MAX_WORK_HOURS
                              ? 'oklch(0.75 0.18 25)'
                              : parseFloat(entryHours) >= 7
                              ? 'oklch(0.72 0.19 167)'
                              : 'oklch(0.78 0.17 70)',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (parseFloat(entryHours) / MAX_WORK_HOURS) * 100)}%` }}
                          transition={{ duration: 0.3 }} />
                      </div>
                      <div className="flex justify-between text-[9px] mt-1" style={{ color: 'oklch(0.45 0.02 210)' }}>
                        <span>0h</span>
                        <span className="font-bold" style={{ color: parseFloat(entryHours) >= MAX_WORK_HOURS ? 'oklch(0.75 0.18 25)' : 'oklch(0.72 0.19 167)' }}>
                          {entryHours}h / {MAX_WORK_HOURS}h
                        </span>
                        <span>{MAX_WORK_HOURS}h</span>
                      </div>
                      {parseFloat(entryHours) >= MAX_WORK_HOURS && (
                        <p className="text-[9px] mt-1 flex items-center gap-1" style={{ color: 'oklch(0.75 0.18 25)' }}>
                          <AlertTriangle size={9} /> Maximum daily hours reached
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                    Notes <span style={{ color: 'oklch(0.42 0.02 210)' }}>(optional)</span>
                  </label>
                  <textarea value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                    rows={2} placeholder="e.g. WFH, client meeting…"
                    className="aq-input resize-none text-sm" />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setSelectedDay(null)} className="aq-btn-ghost flex-1 justify-center">
                    Cancel
                  </button>
                  <button onClick={handleSaveEntry} disabled={saving || !entryHours}
                    className="aq-btn-primary flex-1 justify-center"
                    style={(!entryHours) ? { opacity: 0.4 } : {}}>
                    <Save size={14} /> {saving ? 'Saving…' : 'Save'}
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
