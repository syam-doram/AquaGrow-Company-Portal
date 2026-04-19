import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, orderBy, Timestamp, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Star, Plus, X, Save, Search, User, Award, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Review {
  id: string; employeeId: string; employeeName: string;
  month: string; year: number; rating: number;
  kpiScore?: number; notes: string; goals?: string;
  reviewedBy: string; reviewerName: string;
  createdAt: Timestamp;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const StarRating = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(i => (
      <button key={i} type="button" disabled={readonly}
        onClick={() => onChange?.(i)}
        className={`transition-transform ${!readonly ? 'hover:scale-125' : ''}`}>
        <Star size={20} className={`transition-colors ${i <= value ? 'text-[oklch(0.78_0.17_70)] fill-[oklch(0.78_0.17_70)]' : 'text-[oklch(0.3_0.02_210)]'}`} />
      </button>
    ))}
  </div>
);

const PerformanceReviews: React.FC = () => {
  const { employee, hasPermission } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    employeeId: '', employeeName: '',
    month: MONTHS[new Date().getMonth()], year: new Date().getFullYear(),
    rating: 3, kpiScore: 80, notes: '', goals: '',
  });
  const [saving, setSaving] = useState(false);
  const canManage = hasPermission('manage_performance');

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'performance'), orderBy('createdAt', 'desc')), snap => {
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
      }),
      onSnapshot(query(collection(db, 'employees')), snap => {
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !form.employeeId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'performance'), {
        ...form,
        reviewedBy: employee.uid,
        reviewerName: employee.name,
        createdAt: Timestamp.now(),
      });
      toast.success(`Performance review submitted for ${form.employeeName}`);
      setShowModal(false);
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSaving(false);
    }
  };

  const filtered = reviews.filter(r =>
    !search || r.employeeName.toLowerCase().includes(search.toLowerCase())
  );

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
  const avgKpi    = reviews.filter(r => r.kpiScore != null).length
    ? Math.round(reviews.reduce((s, r) => s + (r.kpiScore ?? 0), 0) / reviews.filter(r => r.kpiScore != null).length)
    : null;

  const RATING_LABEL: Record<number, string> = { 1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent' };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Performance Reviews</h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">Monthly performance tracking and ratings</p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="aq-btn-primary !text-xs !py-2 shrink-0">
            <Plus size={14} /> New Review
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Reviews',  value: reviews.length,                                                color: 'oklch(0.72 0.19 167)' },
          { label: 'Avg Rating',     value: avgRating === '—' ? '—' : `${avgRating}/5`,                  color: 'oklch(0.78 0.17 70)' },
          { label: 'Avg KPI Score',  value: avgKpi ? `${avgKpi}%` : '—',                                  color: 'oklch(0.75 0.16 240)' },
          { label: 'Excellent',      value: reviews.filter(r => r.rating === 5).length,                    color: 'oklch(0.72 0.17 155)' },
        ].map(s => (
          <div key={s.label} className="aq-stat-card">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employee…" className="aq-input pl-8 !py-1.5 !text-xs" />
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass-panel p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-white">{r.employeeName}</p>
                <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{r.month} {r.year}</p>
              </div>
              <div className="p-2 rounded-xl" style={{ background: 'oklch(0.78 0.17 70 / 0.1)' }}>
                <Award size={14} className="text-[oklch(0.78_0.17_70)]" />
              </div>
            </div>
            <div className="mb-3">
              <StarRating value={r.rating} readonly />
              <p className="text-[10px] text-[oklch(0.55_0.02_210)] mt-0.5">{RATING_LABEL[r.rating] ?? ''}</p>
            </div>
            {r.kpiScore != null && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)]">KPI</span>
                  <span className="text-[10px] font-bold text-[oklch(0.72_0.19_167)]">{r.kpiScore}%</span>
                </div>
                <div className="aq-progress">
                  <motion.div className="aq-progress-fill"
                    style={{ background: r.kpiScore >= 80 ? 'oklch(0.72 0.19 167)' : r.kpiScore >= 60 ? 'oklch(0.78 0.17 70)' : 'oklch(0.75 0.18 25)' }}
                    initial={{ width: 0 }} animate={{ width: `${r.kpiScore}%` }} transition={{ duration: 1 }} />
                </div>
              </div>
            )}
            {r.notes && (
              <p className="text-[10px] text-[oklch(0.6_0.02_210)] line-clamp-2 mb-2 italic">{r.notes}</p>
            )}
            <div style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '0.5rem' }}>
              <p className="text-[9px] text-[oklch(0.4_0.02_210)]">Reviewed by {r.reviewerName}</p>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full glass-panel py-12 text-center text-[oklch(0.45_0.02_210)] text-xs">
            <TrendingUp size={28} className="mx-auto mb-2 text-[oklch(0.3_0.02_210)]" />
            No performance reviews yet
          </div>
        )}
      </div>

      {/* Add Review Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-md glass-panel p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>New Performance Review</h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Monthly evaluation</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Employee</label>
                  <select required value={form.employeeId}
                    onChange={e => {
                      const emp = employees.find(x => x.id === e.target.value);
                      setForm(f => ({ ...f, employeeId: e.target.value, employeeName: emp?.name ?? '' }));
                    }}
                    className="aq-input text-sm">
                    <option value="">Select employee…</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Month</label>
                    <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="aq-input text-sm">
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Year</label>
                    <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="aq-input text-sm">
                      {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">Rating</label>
                  <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
                  <p className="text-[10px] text-[oklch(0.55_0.02_210)] mt-1">{RATING_LABEL[form.rating]}</p>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">KPI Score (%)</label>
                  <input type="number" min={0} max={100} value={form.kpiScore}
                    onChange={e => setForm(f => ({ ...f, kpiScore: Number(e.target.value) }))}
                    className="aq-input text-sm" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Observations and feedback…" className="aq-input resize-none text-sm" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <Save size={14} /> {saving ? 'Saving…' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerformanceReviews;
