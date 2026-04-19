import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, limit, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Clock, MapPin, CheckCircle, LogOut, History, Calendar, Activity, TimerOff } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: Timestamp;
  checkOut?: Timestamp;
  status: string;
  workingHours?: number;
}

const statusColors: Record<string, { bg: string; text: string; dot: string; badge: string }> = {
  present:  { bg: 'bg-[oklch(0.72_0.19_167/0.08)]', text: 'text-[oklch(0.72_0.19_167)]', dot: 'bg-[oklch(0.72_0.19_167)]', badge: 'aq-badge-green' },
  absent:   { bg: 'bg-[oklch(0.65_0.22_25/0.08)]',  text: 'text-[oklch(0.75_0.18_25)]',  dot: 'bg-[oklch(0.75_0.18_25)]',  badge: 'aq-badge-red' },
  late:     { bg: 'bg-[oklch(0.78_0.17_70/0.08)]',  text: 'text-[oklch(0.78_0.17_70)]',  dot: 'bg-[oklch(0.78_0.17_70)]',  badge: 'aq-badge-amber' },
  half_day: { bg: 'bg-[oklch(0.75_0.16_240/0.08)]', text: 'text-[oklch(0.75_0.16_240)]', dot: 'bg-[oklch(0.75_0.16_240)]', badge: 'aq-badge-blue' },
};

const Attendance: React.FC = () => {
  const { employee } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Real-time attendance from Firestore
  useEffect(() => {
    if (!employee) return;
    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', employee.uid),
      orderBy('checkIn', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setRecords(docs);
      const today = format(new Date(), 'yyyy-MM-dd');
      setTodayRecord(docs.find(r => r.date === today) ?? null);
    }, err => handleFirestoreError(err, OperationType.LIST, 'attendance'));
    return () => unsub();
  }, [employee]);

  const handleCheckIn = async () => {
    if (!employee) return;
    setLoading(true);
    try {
      const n = new Date();
      await addDoc(collection(db, 'attendance'), {
        employeeId: employee.uid,
        date: format(n, 'yyyy-MM-dd'),
        checkIn: Timestamp.fromDate(n),
        status: 'present',
      });
      toast.success('✅ Checked in successfully!');
    } catch {
      toast.error('Failed to check in, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setLoading(true);
    try {
      const n = new Date();
      const mins = differenceInMinutes(n, todayRecord.checkIn.toDate());
      await updateDoc(doc(db, 'attendance', todayRecord.id), {
        checkOut: Timestamp.fromDate(n),
        workingHours: parseFloat((mins / 60).toFixed(2)),
      });
      toast.success('✅ Checked out. Great work today!');
    } catch {
      toast.error('Failed to check out.');
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const presentDays   = records.filter(r => r.status === 'present').length;
  const totalHours    = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const avgHours      = records.length ? (totalHours / records.filter(r => r.workingHours).length).toFixed(1) : '0';

  // Live elapsed time
  const elapsed = todayRecord && !todayRecord.checkOut
    ? differenceInMinutes(now, todayRecord.checkIn.toDate())
    : null;
  const elapsedStr = elapsed != null
    ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Attendance</h1>
        <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">Mark your daily attendance and track work hours.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present Days',   value: String(presentDays),     icon: CheckCircle, color: 'oklch(0.72 0.19 167)', sub: 'This month' },
          { label: 'Total Hours',    value: `${totalHours.toFixed(0)}h`,icon: Clock,     color: 'oklch(0.75 0.16 240)', sub: 'Logged so far' },
          { label: 'Avg Daily Hrs',  value: `${avgHours}h`,          icon: Activity,    color: 'oklch(0.78 0.17 70)',  sub: 'Per working day' },
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
            {/* Elapsed ring overlay when checked in */}
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
                <Clock size={18} /> Check In
              </button>
            ) : !todayRecord.checkOut ? (
              <button onClick={handleCheckOut} disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{ background: 'oklch(0.65 0.22 25 / 0.15)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.25)' }}>
                <LogOut size={18} /> Check Out
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
                <span className="text-xs font-bold text-white font-mono">{format(todayRecord.checkIn.toDate(), 'hh:mm a')}</span>
              </div>
              {todayRecord.checkOut && (
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                  <span className="text-xs text-[oklch(0.5_0.02_210)]">Check Out</span>
                  <span className="text-xs font-bold text-white font-mono">{format(todayRecord.checkOut.toDate(), 'hh:mm a')}</span>
                </div>
              )}
              {todayRecord.workingHours && (
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
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Attendance History</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Last {Math.min(records.length, 20)} records</p>
            </div>
            <History size={16} className="text-[oklch(0.5_0.02_210)]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full aq-table">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Check In</th>
                  <th className="text-left">Check Out</th>
                  <th className="text-left">Hours</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td className="font-medium text-white">{format(new Date(rec.date), 'MMM dd, yyyy')}</td>
                    <td className="font-mono">{format(rec.checkIn.toDate(), 'hh:mm a')}</td>
                    <td className="font-mono">{rec.checkOut ? format(rec.checkOut.toDate(), 'hh:mm a') : <span className="text-[oklch(0.45_0.02_210)]">–</span>}</td>
                    <td>{rec.workingHours ? <span className="text-[oklch(0.72_0.19_167)] font-bold">{rec.workingHours}h</span> : <span className="text-[oklch(0.45_0.02_210)]">–</span>}</td>
                    <td>
                      <span className={`aq-badge ${statusColors[rec.status]?.badge ?? 'aq-badge-green'}`}>
                        {rec.status.replace('_', ' ')}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[oklch(0.45_0.02_210)]">
                      No attendance records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
