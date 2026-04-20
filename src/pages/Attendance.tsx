import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Clock, CheckCircle, LogOut, History, Calendar, Activity, TimerOff, RefreshCw, AlertCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';
import hrmsApi from '../api';

interface AttendanceRecord {
  _id: string;
  empId?: string;
  date: string;
  checkIn: string;   // ISO string
  checkOut?: string; // ISO string
  status: string;
  workingHours?: number;
}

const statusColors: Record<string, { badge: string }> = {
  present:  { badge: 'aq-badge-green' },
  absent:   { badge: 'aq-badge-red' },
  late:     { badge: 'aq-badge-amber' },
  half_day: { badge: 'aq-badge-blue' },
};

const Attendance: React.FC = () => {
  const { employee } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [now, setNow] = useState(new Date());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  const YEARS = [2024, 2025, 2026, 2027];
  const MONTHS_LABEL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch attendance from HRMS API
  const fetchAttendance = useCallback(async () => {
    setFetching(true);
    try {
      const month = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`;
      const data = await hrmsApi.attendance.list({ month });
      setRecords(data);
      const today = format(new Date(), 'yyyy-MM-dd');
      setTodayRecord(data.find((r: AttendanceRecord) => r.date?.startsWith(today)) ?? null);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load attendance');
    } finally {
      setFetching(false);
    }
  }, [filterYear, filterMonth]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await hrmsApi.attendance.checkIn();
      toast.success('✅ Checked in successfully!');
      await fetchAttendance();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await hrmsApi.attendance.checkOut();
      toast.success('✅ Checked out. Great work today!');
      await fetchAttendance();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const presentDays = records.filter(r => r.status === 'present').length;
  const totalHours  = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const avgHours    = records.length ? (totalHours / Math.max(records.filter(r => r.workingHours).length, 1)).toFixed(1) : '0';

  // Live elapsed time from check-in
  const elapsed = todayRecord && !todayRecord.checkOut
    ? differenceInMinutes(now, new Date(todayRecord.checkIn))
    : null;
  const elapsedStr = elapsed != null
    ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`
    : null;

  // Filtered records for the selected month
  const filtered = records.filter(rec => {
    const d = new Date(rec.date);
    return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Attendance</h1>
          <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">Mark your daily attendance and track work hours.</p>
        </div>
        <button onClick={fetchAttendance} disabled={fetching} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
          <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present Days',   value: String(presentDays),            icon: CheckCircle, color: 'oklch(0.72 0.19 167)', sub: 'This month' },
          { label: 'Total Hours',    value: `${totalHours.toFixed(0)}h`,    icon: Clock,       color: 'oklch(0.75 0.16 240)', sub: 'Logged so far' },
          { label: 'Avg Daily Hrs',  value: `${avgHours}h`,                 icon: Activity,    color: 'oklch(0.78 0.17 70)',  sub: 'Per working day' },
          { label: 'Attendance Rate',value: `${presentDays > 0 ? Math.round((presentDays / Math.max(records.length, 1)) * 100) : 0}%`,
            icon: Calendar, color: 'oklch(0.78 0.17 295)', sub: 'Current period' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Check In/Out Widget */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 flex flex-col items-center text-center">
          {/* Clock face */}
          <div className="relative w-36 h-36 mb-6">
            <div className="absolute inset-0 rounded-full" style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '2px solid oklch(0.72 0.19 167 / 0.2)' }} />
            <div className="absolute inset-3 rounded-full flex flex-col items-center justify-center"
              style={{ background: 'oklch(0.09 0.018 205)' }}>
              <p className="text-2xl font-bold text-white font-mono">{format(now, 'hh:mm')}</p>
              <p className="text-xs text-[oklch(0.72_0.19_167)] font-semibold">{format(now, 'ss')}s</p>
            </div>
            {todayRecord && !todayRecord.checkOut && (
              <div className="absolute inset-0 rounded-full border-2 border-[oklch(0.72_0.19_167)] opacity-60 pulse-ring" />
            )}
          </div>

          <p className="text-sm font-bold text-white mb-1">{format(now, 'EEEE, d MMMM yyyy')}</p>
          {elapsedStr && (
            <p className="text-xs text-[oklch(0.72_0.19_167)] font-semibold mb-3">Active: {elapsedStr}</p>
          )}

          {/* Action Button */}
          <div className="w-full mt-2">
            {!todayRecord ? (
              <button onClick={handleCheckIn} disabled={loading} className="aq-btn-primary w-full justify-center text-base py-3.5">
                <Clock size={18} /> {loading ? 'Checking in…' : 'Check In'}
              </button>
            ) : !todayRecord.checkOut ? (
              <button onClick={handleCheckOut} disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{ background: 'oklch(0.65 0.22 25 / 0.15)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.25)' }}>
                <LogOut size={18} /> {loading ? 'Checking out…' : 'Check Out'}
              </button>
            ) : (
              <div className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                <CheckCircle size={16} /> Day Completed!
              </div>
            )}
          </div>

          {/* Today summary */}
          {todayRecord && (
            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                <span className="text-xs text-[oklch(0.5_0.02_210)]">Check In</span>
                <span className="text-xs font-bold text-white font-mono">
                  {format(new Date(todayRecord.checkIn), 'hh:mm a')}
                </span>
              </div>
              {todayRecord.checkOut && (
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                  <span className="text-xs text-[oklch(0.5_0.02_210)]">Check Out</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {format(new Date(todayRecord.checkOut), 'hh:mm a')}
                  </span>
                </div>
              )}
              {todayRecord.workingHours != null && (
                <div className="flex justify-between py-2">
                  <span className="text-xs text-[oklch(0.5_0.02_210)]">Total Hours</span>
                  <span className="text-xs font-bold text-[oklch(0.72_0.19_167)]">{todayRecord.workingHours}h</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Attendance History */}
        <div className="lg:col-span-2 glass-panel overflow-hidden">
          <div className="p-4 flex flex-wrap items-center gap-3 justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Attendance History</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Filter by year & month</p>
            </div>
            {/* Year / Month filters */}
            <div className="flex items-center gap-2">
              <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                className="aq-input !py-1 !text-xs !w-auto">
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
              <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                className="aq-input !py-1 !text-xs !w-auto">
                {MONTHS_LABEL.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {fetching ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[oklch(0.72_0.19_167/0.2)] border-t-[oklch(0.72_0.19_167)] rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full aq-table">
                <thead><tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Check In</th>
                  <th className="text-left">Check Out</th>
                  <th className="text-left">Hours</th>
                  <th className="text-left">Status</th>
                </tr></thead>
                <tbody>
                  {filtered.map((rec, i) => (
                    <motion.tr key={rec._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                      <td className="font-medium text-white">{format(new Date(rec.date), 'MMM dd, yyyy')}</td>
                      <td className="font-mono">{format(new Date(rec.checkIn), 'hh:mm a')}</td>
                      <td className="font-mono">{rec.checkOut ? format(new Date(rec.checkOut), 'hh:mm a') : <span className="text-[oklch(0.45_0.02_210)]">–</span>}</td>
                      <td>{rec.workingHours != null ? <span className="text-[oklch(0.72_0.19_167)] font-bold">{rec.workingHours}h</span> : <span className="text-[oklch(0.45_0.02_210)]">–</span>}</td>
                      <td><span className={`aq-badge ${statusColors[rec.status]?.badge ?? 'aq-badge-green'}`}>{rec.status.replace('_', ' ')}</span></td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-[oklch(0.45_0.02_210)] text-xs">
                      No records for {MONTHS_LABEL[filterMonth]} {filterYear}
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
