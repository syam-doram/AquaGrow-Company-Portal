import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, DEPARTMENTS, type EmployeeRole } from '../context/AuthContext';
import {
  Briefcase, Plus, Search, X, Save, Users, FileText,
  CheckCircle, XCircle, Send, UserPlus, Mail,
  Phone, MapPin, DollarSign, Star, Layers,
  CalendarDays, Building2, RefreshCw, ChevronRight,
  ChevronLeft, TrendingUp, Award, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import hrmsApi from '../api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  _id?: string;
  role: string;
  department: string;
  skills: string;
  salaryMin: number;
  salaryMax: number;
  location: string;
  openings: number;
  status: 'open' | 'closed' | 'paused';
  description?: string;
  createdAt: string;
}

type CandidateStatus = 'applied' | 'shortlisted' | 'interviewed' | 'selected' | 'offered' | 'rejected';

interface Candidate {
  id: string;
  _id?: string;
  jobId: string;
  jobRole: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: CandidateStatus;
  resumeUrl?: string;
  notes?: string;
  offeredSalary?: number;
  joiningDate?: string;
  offerStatus?: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────
const PIPELINE_STAGES: { status: CandidateStatus; label: string; color: string; bg: string; icon: any }[] = [
  { status: 'applied',     label: 'Applied',     color: 'oklch(0.75 0.16 240)', bg: 'oklch(0.65 0.18 240 / 0.12)', icon: FileText    },
  { status: 'shortlisted', label: 'Shortlisted', color: 'oklch(0.78 0.17 70)',  bg: 'oklch(0.78 0.17 70 / 0.12)',  icon: Star        },
  { status: 'interviewed', label: 'Interviewed', color: 'oklch(0.78 0.18 295)', bg: 'oklch(0.65 0.2 295 / 0.12)',  icon: Users       },
  { status: 'selected',    label: 'Selected',    color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.12)', icon: CheckCircle },
  { status: 'offered',     label: 'Offer Sent',  color: 'oklch(0.8 0.17 155)',  bg: 'oklch(0.72 0.17 155 / 0.12)', icon: Send        },
  { status: 'rejected',    label: 'Rejected',    color: 'oklch(0.72 0.22 25)',  bg: 'oklch(0.65 0.22 25 / 0.12)',  icon: XCircle     },
];

const STAGE_ORDER: CandidateStatus[] = ['applied','shortlisted','interviewed','selected','offered','rejected'];

const SOURCE_OPTS = ['Walk-in', 'Referral', 'Job Portal', 'LinkedIn', 'Direct', 'Campus'];
const ROLE_OPTS   = [
  'Support Agent','HR Executive','Finance Analyst','Operations Manager',
  'Warehouse Staff','Field Technician','Developer','Data Analyst','Team Lead',
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const stageCfg = (status: CandidateStatus) =>
  PIPELINE_STAGES.find(s => s.status === status) ?? PIPELINE_STAGES[0];

const safeDate = (d?: string) => (d ? format(new Date(d), 'MMM dd, yyyy') : '—');
const normalize = (r: any) => ({ ...r, id: r._id ?? r.id });

const EMPTY_JOB: Omit<Job,'id'|'_id'|'createdAt'> = {
  role: '', department: '', skills: '', salaryMin: 0, salaryMax: 0,
  location: 'Nellore, AP', openings: 1, status: 'open', description: '',
};
const EMPTY_CAND = {
  jobId: '', jobRole: '', name: '', email: '', phone: '',
  source: 'Walk-in', status: 'applied' as CandidateStatus, notes: '',
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 9 }) => {
  const colors = [
    'from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)]',
    'from-[oklch(0.75_0.16_240)] to-[oklch(0.65_0.18_240)]',
    'from-[oklch(0.78_0.17_295)] to-[oklch(0.65_0.2_295)]',
    'from-[oklch(0.78_0.17_70)] to-[oklch(0.65_0.17_55)]',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`w-${size} h-${size} rounded-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-[oklch(0.08_0.015_200)] font-bold shrink-0`}
      style={{ fontSize: size > 8 ? '1rem' : '0.7rem' }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const Recruitment: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage_employees');

  const [jobs, setJobs]               = useState<Job[]>([]);
  const [candidates, setCandidates]   = useState<Candidate[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [activeTab, setActiveTab]     = useState<'pipeline' | 'jobs' | 'offers'>('pipeline');

  // Modals & selection
  const [showJobModal, setShowJobModal]     = useState(false);
  const [showCandModal, setShowCandModal]   = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedCand, setSelectedCand]     = useState<Candidate | null>(null);
  const [selectedJob, setSelectedJob]       = useState<string>('all');
  const [search, setSearch]                 = useState('');
  const [movingId, setMovingId]             = useState<string | null>(null);

  // Forms
  const [jobForm, setJobForm]     = useState<Omit<Job,'id'|'_id'|'createdAt'>>(EMPTY_JOB);
  const [candForm, setCandForm]   = useState(EMPTY_CAND);
  const [offerForm, setOfferForm] = useState({ offeredSalary: 0, joiningDate: '' });
  const [saving, setSaving]       = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const [jobsData, candsData] = await Promise.all([
        hrmsApi.jobs.list(),
        hrmsApi.candidates.list(),
      ]);
      setJobs(jobsData.map(normalize));
      setCandidates(candsData.map(normalize));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load recruitment data');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const filteredCands = candidates.filter(c => {
    const matchJob    = selectedJob === 'all' || c.jobId === selectedJob;
    const matchSearch = !search ||
      (c.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.jobRole ?? '').toLowerCase().includes(search.toLowerCase());
    return matchJob && matchSearch;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const saveJob = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const created = await hrmsApi.jobs.create(jobForm);
      setJobs(prev => [normalize(created), ...prev]);
      toast.success(`📋 Job posted: ${jobForm.role}`);
      setShowJobModal(false); setJobForm(EMPTY_JOB);
    } catch (err: any) { toast.error(err.message ?? 'Failed to post job'); }
    finally { setSaving(false); }
  };

  const saveCandidate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const created = await hrmsApi.candidates.create(candForm);
      setCandidates(prev => [normalize(created), ...prev]);
      toast.success(`👤 ${candForm.name} added to pipeline!`);
      setShowCandModal(false); setCandForm(EMPTY_CAND);
    } catch (err: any) { toast.error(err.message ?? 'Failed to add candidate'); }
    finally { setSaving(false); }
  };

  const moveStage = async (cand: Candidate, newStatus: CandidateStatus) => {
    if (movingId) return;
    setMovingId(cand.id);
    try {
      await hrmsApi.candidates.update(cand.id, { status: newStatus });
      setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, status: newStatus } : c));
      if (selectedCand?.id === cand.id) setSelectedCand(p => p ? { ...p, status: newStatus } : null);
      toast.success(`${cand.name} → ${stageCfg(newStatus).label}`);
    } catch (err: any) { toast.error(err.message ?? 'Failed to move stage'); }
    finally { setMovingId(null); }
  };

  const moveNext = (cand: Candidate) => {
    const nonRejected = STAGE_ORDER.filter((s): s is Exclude<CandidateStatus,'rejected'> => s !== 'rejected');
    const curIdx = nonRejected.indexOf(cand.status as Exclude<CandidateStatus,'rejected'>);
    if (curIdx >= 0 && curIdx < nonRejected.length - 1) moveStage(cand, nonRejected[curIdx + 1]);
  };

  const movePrev = (cand: Candidate) => {
    const nonRejected = STAGE_ORDER.filter((s): s is Exclude<CandidateStatus,'rejected'> => s !== 'rejected');
    const curIdx = nonRejected.indexOf(cand.status as Exclude<CandidateStatus,'rejected'>);
    if (curIdx > 0) moveStage(cand, nonRejected[curIdx - 1]);
  };

  const sendOffer = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedCand) return; setSaving(true);
    try {
      const updates = {
        status: 'offered' as CandidateStatus,
        offeredSalary: offerForm.offeredSalary,
        joiningDate: offerForm.joiningDate,
        offerStatus: 'pending' as const,
      };
      await hrmsApi.candidates.update(selectedCand.id, updates);
      setCandidates(prev => prev.map(c => c.id === selectedCand.id ? { ...c, ...updates } : c));
      if (selectedCand) setSelectedCand(p => p ? { ...p, ...updates } : null);
      toast.success(`📩 Offer sent to ${selectedCand.name}!`);
      setShowOfferModal(false);
    } catch (err: any) { toast.error(err.message ?? 'Failed to send offer'); }
    finally { setSaving(false); }
  };

  const convertToEmployee = async (cand: Candidate) => {
    if (!cand.offeredSalary || !cand.joiningDate) {
      toast.error('Set salary & joining date in the offer first'); return;
    }
    try {
      const job = jobs.find(j => j.id === cand.jobId);
      await hrmsApi.employees.create({
        name: cand.name, email: cand.email, phone: cand.phone,
        role: 'employee' as EmployeeRole,
        department: job?.department ?? '',
        salary: cand.offeredSalary,
        joiningDate: cand.joiningDate,
        status: 'active',
        empId: `AQ-${Date.now().toString().slice(-5)}`,
        password: `${cand.name.split(' ')[0]}@${Math.floor(1000+Math.random()*9000)}`,
      });
      await hrmsApi.candidates.update(cand.id, { status: 'selected', convertedToEmp: true });
      setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, status: 'selected' } : c));
      if (selectedCand?.id === cand.id) setSelectedCand(p => p ? { ...p, status: 'selected' } : null);
      toast.success(`✅ ${cand.name} onboarded as Employee!`);
    } catch (err: any) { toast.error(err.message ?? 'Failed to onboard'); }
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this job posting?')) return;
    try {
      await hrmsApi.jobs.remove(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      toast.success('Job deleted');
    } catch (err: any) { toast.error(err.message ?? 'Failed to delete job'); }
  };

  const updateOfferStatus = async (candId: string, offerStatus: 'accepted' | 'declined') => {
    try {
      const extra = offerStatus === 'declined' ? { status: 'rejected' as CandidateStatus } : {};
      await hrmsApi.candidates.update(candId, { offerStatus, ...extra });
      setCandidates(prev => prev.map(c => c.id === candId ? { ...c, offerStatus, ...extra } : c));
    } catch (err: any) { toast.error(err.message ?? 'Failed to update offer'); }
  };

  // ── KPI totals ────────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Open Jobs',    value: jobs.filter(j => j.status === 'open').length,            color: 'oklch(0.72 0.19 167)', icon: Briefcase   },
    { label: 'In Pipeline',  value: candidates.filter(c => c.status !== 'rejected').length,   color: 'oklch(0.75 0.16 240)', icon: TrendingUp  },
    { label: 'Offers Sent',  value: candidates.filter(c => c.status === 'offered').length,    color: 'oklch(0.8 0.17 155)',  icon: Send        },
    { label: 'Hired',        value: candidates.filter(c => c.status === 'selected').length,   color: 'oklch(0.78 0.17 70)',  icon: Award       },
    { label: 'Interviewed',  value: candidates.filter(c => c.status === 'interviewed').length, color: 'oklch(0.78 0.18 295)', icon: Users       },
    { label: 'Rejected',     value: candidates.filter(c => c.status === 'rejected').length,   color: 'oklch(0.72 0.22 25)',  icon: XCircle     },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Recruitment Pipeline
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            End-to-end hiring · {jobs.filter(j => j.status === 'open').length} open positions · {candidates.filter(c => c.status !== 'rejected').length} active candidates
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} disabled={fetching} className="aq-btn-ghost !text-xs !py-2 !px-3">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
          </button>
          {canManage && (
            <>
              <button onClick={() => { setCandForm(EMPTY_CAND); setShowCandModal(true); }}
                className="aq-btn-ghost !text-xs !py-2">
                <UserPlus size={14} /> Add Candidate
              </button>
              <button onClick={() => { setJobForm(EMPTY_JOB); setShowJobModal(true); }}
                className="aq-btn-primary !text-xs !py-2">
                <Plus size={14} /> Post Job
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading bar */}
      <AnimatePresence>
        {fetching && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl text-xs overflow-hidden"
            style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
            <div className="w-3 h-3 border-2 rounded-full animate-spin"
              style={{ borderColor: 'oklch(0.72 0.19 167 / 0.3)', borderTopColor: 'oklch(0.72 0.19 167)' }} />
            <span style={{ color: 'oklch(0.72 0.19 167)' }}>Loading recruitment data…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="aq-stat-card !p-3 !gap-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[8px] uppercase tracking-widest font-bold"
                  style={{ color: 'oklch(0.45 0.02 210)' }}>{k.label}</p>
                <div className="p-1.5 rounded-lg" style={{ background: `${k.color.replace(')', ' / 0.12)')}` }}>
                  <Icon size={11} style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: k.color }}>{k.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
        {[
          { id: 'pipeline', label: '⚡ Pipeline', count: candidates.filter(c => c.status !== 'rejected').length },
          { id: 'jobs',     label: '📋 Job Postings', count: jobs.length },
          { id: 'offers',   label: '📄 Offers', count: candidates.filter(c => c.status === 'offered' || c.offerStatus).length },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            style={activeTab === t.id
              ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }
              : { color: 'oklch(0.55 0.02 210)', border: '1px solid transparent' }}>
            {t.label}
            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ background: activeTab === t.id ? 'oklch(0.72 0.19 167 / 0.2)' : 'oklch(1 0 0 / 6%)' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          PIPELINE TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.45 0.02 210)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search candidates…" className="aq-input pl-8 !py-1.5 !text-xs" />
            </div>
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
              className="aq-input !py-1.5 !text-xs !w-auto">
              <option value="all">All Jobs</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.role} — {j.department}</option>)}
            </select>
          </div>

          {/* Kanban columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {PIPELINE_STAGES.map((stage, stageIdx) => {
              const stageCands = filteredCands.filter(c => c.status === stage.status);
              const StageIcon = stage.icon;
              return (
                <div key={stage.status} className="rounded-2xl overflow-hidden"
                  style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 8%)' }}>

                  {/* Column header */}
                  <div className="px-3 py-2.5 flex items-center gap-2"
                    style={{ background: stage.bg, borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
                    <div className="p-1.5 rounded-lg" style={{ background: 'oklch(0 0 0 / 0.15)' }}>
                      <StageIcon size={11} style={{ color: stage.color }} />
                    </div>
                    <p className="text-[10px] font-bold flex-1 text-white">{stage.label}</p>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ background: 'oklch(0 0 0 / 0.25)' }}>
                      {stageCands.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[120px]">
                    <AnimatePresence>
                      {stageCands.map(cand => {
                        const isMoving = movingId === cand.id;
                        const nonRej = STAGE_ORDER.filter(s => s !== 'rejected');
                        const canGoNext = nonRej.indexOf(cand.status) < nonRej.length - 1;
                        const canGoPrev = nonRej.indexOf(cand.status) > 0;

                        return (
                          <motion.div key={cand.id}
                            initial={{ opacity: 0, scale: 0.94, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: -8 }}
                            layout
                            className="rounded-xl cursor-pointer transition-shadow hover:shadow-lg group"
                            style={{ background: 'oklch(1 0 0 / 5%)', border: '1px solid oklch(1 0 0 / 10%)' }}
                            onClick={() => setSelectedCand(cand)}>

                            <div className="p-2.5">
                              {/* Avatar + Name */}
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[oklch(0.08_0.015_200)] text-[10px] font-black shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${stage.color}, ${stage.color.replace(')', ' / 0.6)')})` }}>
                                  {cand.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold text-white truncate">{cand.name}</p>
                                  <p className="text-[8px] truncate" style={{ color: 'oklch(0.5 0.02 210)' }}>{cand.jobRole || '—'}</p>
                                </div>
                              </div>

                              {/* Source badge */}
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                                  style={{ background: 'oklch(1 0 0 / 6%)', color: 'oklch(0.55 0.02 210)' }}>
                                  {cand.source}
                                </span>
                                {cand.offeredSalary && (
                                  <span className="text-[8px] font-bold" style={{ color: 'oklch(0.78 0.17 70)' }}>
                                    ₹{(cand.offeredSalary/1000).toFixed(0)}k
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stage navigation arrows (only for HR who can manage) */}
                            {canManage && stage.status !== 'rejected' && (
                              <div className="flex border-t opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden"
                                style={{ borderColor: 'oklch(1 0 0 / 8%)' }}>
                                <button
                                  onClick={e => { e.stopPropagation(); movePrev(cand); }}
                                  disabled={!canGoPrev || isMoving}
                                  className="flex-1 py-1.5 flex items-center justify-center transition-colors disabled:opacity-30"
                                  style={{ color: 'oklch(0.55 0.02 210)' }}
                                  title="Move back">
                                  <ChevronLeft size={11} />
                                </button>
                                <div style={{ width: '1px', background: 'oklch(1 0 0 / 8%)' }} />
                                <button
                                  onClick={e => { e.stopPropagation(); moveNext(cand); }}
                                  disabled={!canGoNext || isMoving}
                                  className="flex-1 py-1.5 flex items-center justify-center transition-colors disabled:opacity-30"
                                  style={{ color: stage.color }}
                                  title="Advance stage">
                                  {isMoving
                                    ? <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                                    : <ChevronRight size={11} />
                                  }
                                </button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {stageCands.length === 0 && !fetching && (
                      <div className="py-6 flex flex-col items-center gap-1.5">
                        <StageIcon size={20} style={{ color: 'oklch(0.28 0.02 210)' }} />
                        <p className="text-[9px] text-center" style={{ color: 'oklch(0.38 0.02 210)' }}>No candidates</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {candidates.length === 0 && !fetching && (
            <div className="glass-panel py-16 text-center">
              <Zap size={36} className="mx-auto mb-3" style={{ color: 'oklch(0.3 0.02 210)' }} />
              <p className="text-sm font-bold text-white mb-1">Pipeline is empty</p>
              <p className="text-xs" style={{ color: 'oklch(0.45 0.02 210)' }}>Post a job and add candidates to get started</p>
              {canManage && (
                <div className="flex gap-2 justify-center mt-4">
                  <button onClick={() => setShowJobModal(true)} className="aq-btn-ghost !text-xs !py-2">
                    <Briefcase size={13} /> Post Job
                  </button>
                  <button onClick={() => setShowCandModal(true)} className="aq-btn-primary !text-xs !py-2">
                    <UserPlus size={13} /> Add Candidate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          JOB POSTINGS TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {jobs.length === 0 && !fetching && (
            <div className="glass-panel py-16 text-center">
              <Briefcase size={36} className="mx-auto mb-3" style={{ color: 'oklch(0.3 0.02 210)' }} />
              <p className="text-sm font-bold text-white mb-1">No job postings yet</p>
              {canManage && (
                <button onClick={() => setShowJobModal(true)} className="aq-btn-primary !text-xs mt-3 !py-2">
                  <Plus size={13} /> Post First Job
                </button>
              )}
            </div>
          )}

          {jobs.map((job, i) => {
            const jobCands = candidates.filter(c => c.jobId === job.id);
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }} className="glass-panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'oklch(0.72 0.19 167 / 0.15)', border: '1px solid oklch(0.72 0.19 167 / 0.25)' }}>
                        <Briefcase size={14} style={{ color: 'oklch(0.72 0.19 167)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-white">{job.role}</p>
                          <span className={`aq-badge ${job.status === 'open' ? 'aq-badge-green' : job.status === 'paused' ? 'aq-badge-amber' : 'aq-badge-red'}`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[10px] mt-0.5" style={{ color: 'oklch(0.55 0.02 210)' }}>
                          <span className="flex items-center gap-1"><Building2 size={9} /> {job.department}</span>
                          <span className="flex items-center gap-1"><MapPin size={9} /> {job.location}</span>
                          <span className="flex items-center gap-1"><DollarSign size={9} /> ₹{job.salaryMin.toLocaleString()}–₹{job.salaryMax.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Users size={9} /> {job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    {job.skills && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                          <span key={skill} className="text-[8px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'oklch(0.75 0.16 240 / 0.1)', color: 'oklch(0.75 0.16 240)', border: '1px solid oklch(0.75 0.16 240 / 0.2)' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: pipeline mini-stats + actions */}
                  <div className="shrink-0 flex flex-col items-end gap-3">
                    <div className="flex gap-3">
                      {PIPELINE_STAGES.slice(0, 5).map(s => (
                        <div key={s.status} className="text-center">
                          <p className="text-sm font-black" style={{ color: s.color }}>
                            {jobCands.filter(c => c.status === s.status).length}
                          </p>
                          <p className="text-[7px] uppercase" style={{ color: 'oklch(0.45 0.02 210)' }}>{s.label.slice(0,5)}</p>
                        </div>
                      ))}
                    </div>
                    {canManage && (
                      <div className="flex gap-1.5">
                        <button onClick={() => { setCandForm({ ...EMPTY_CAND, jobId: job.id }); setShowCandModal(true); }}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:opacity-90"
                          style={{ background: 'oklch(0.72 0.19 167 / 0.12)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.25)' }}>
                          + Add Candidate
                        </button>
                        <button onClick={() => deleteJob(job.id)}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:opacity-90"
                          style={{ background: 'oklch(0.65 0.22 25 / 0.1)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          OFFERS TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'offers' && (
        <div className="space-y-3">
          {candidates.filter(c => c.status === 'offered' || c.offerStatus).length === 0 && (
            <div className="glass-panel py-16 text-center">
              <Send size={36} className="mx-auto mb-3" style={{ color: 'oklch(0.3 0.02 210)' }} />
              <p className="text-sm font-bold text-white mb-1">No offers sent yet</p>
              <p className="text-xs" style={{ color: 'oklch(0.45 0.02 210)' }}>Select a candidate and send offer from the pipeline</p>
            </div>
          )}

          {candidates.filter(c => c.status === 'offered' || c.offerStatus).map((cand, i) => (
            <motion.div key={cand.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }} className="glass-panel p-4 flex items-center gap-4">
              <Avatar name={cand.name} size={11} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-white">{cand.name}</p>
                  <span className={`aq-badge ${
                    cand.offerStatus === 'accepted' ? 'aq-badge-green' :
                    cand.offerStatus === 'declined' ? 'aq-badge-red' : 'aq-badge-amber'
                  }`}>
                    {cand.offerStatus ?? 'pending'}
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'oklch(0.55 0.02 210)' }}>
                  {cand.jobRole} · ₹{cand.offeredSalary?.toLocaleString() ?? '—'}/mo
                </p>
                {cand.joiningDate && (
                  <p className="text-[9px] mt-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                    Joining: {safeDate(cand.joiningDate)}
                  </p>
                )}
              </div>

              {canManage && cand.offerStatus === 'accepted' && (
                <button onClick={() => convertToEmployee(cand)} className="aq-btn-primary !text-xs !py-1.5 shrink-0">
                  <UserPlus size={12} /> Onboard
                </button>
              )}
              {canManage && (!cand.offerStatus || cand.offerStatus === 'pending') && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => updateOfferStatus(cand.id, 'accepted')}
                    className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.12)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.25)' }}>
                    ✓ Accepted
                  </button>
                  <button onClick={() => updateOfferStatus(cand.id, 'declined')}
                    className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold"
                    style={{ background: 'oklch(0.65 0.22 25 / 0.1)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                    ✗ Declined
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          CANDIDATE DETAIL SIDE PANEL
      ══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedCand && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedCand(null)}>
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm glass-panel overflow-hidden"
              style={{ maxHeight: '90vh' }}
              onClick={e => e.stopPropagation()}>

              {/* Header strip */}
              <div className="p-5" style={{ background: stageCfg(selectedCand.status).bg, borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 text-white"
                      style={{ background: stageCfg(selectedCand.status).color }}>
                      {selectedCand.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{selectedCand.name}</p>
                      <p className="text-[10px]" style={{ color: 'oklch(0.6 0.02 210)' }}>{selectedCand.jobRole || '—'}</p>
                      <span className="text-[8px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block"
                        style={{ background: 'oklch(0 0 0 / 0.2)', color: stageCfg(selectedCand.status).color }}>
                        {stageCfg(selectedCand.status).label}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCand(null)}
                    className="p-1.5 rounded-xl hover:bg-white/10 transition-colors" style={{ color: 'oklch(0.55 0.02 210)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>

                {/* Stage pipeline stepper */}
                <div className="mb-5">
                  <p className="text-[9px] uppercase tracking-widest font-bold mb-2.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                    Move Stage
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PIPELINE_STAGES.map(s => {
                      const isActive = selectedCand.status === s.status;
                      return (
                        <button key={s.status}
                          onClick={() => canManage && moveStage(selectedCand, s.status)}
                          disabled={!canManage || movingId === selectedCand.id}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold capitalize transition-all"
                          style={isActive
                            ? { background: s.bg, color: s.color, border: `1px solid ${s.color}` }
                            : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }
                          }>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2.5 mb-5">
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'oklch(0.45 0.02 210)' }}>Contact</p>
                  {[
                    { icon: Mail,        val: selectedCand.email || '—' },
                    { icon: Phone,       val: selectedCand.phone || '—' },
                    { icon: Layers,      val: `Source: ${selectedCand.source}` },
                    { icon: CalendarDays, val: `Applied: ${safeDate(selectedCand.createdAt)}` },
                  ].map(({ icon: Icon, val }, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>
                      <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'oklch(1 0 0 / 5%)' }}>
                        <Icon size={11} />
                      </div>
                      <span className="truncate">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Offer details (if any) */}
                {selectedCand.offeredSalary && (
                  <div className="p-3.5 rounded-xl mb-5"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'oklch(0.72 0.19 167)' }}>Offer Details</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'oklch(0.55 0.02 210)' }}>Offered CTC</span>
                        <span className="font-bold text-white">₹{selectedCand.offeredSalary.toLocaleString()}/mo</span>
                      </div>
                      {selectedCand.joiningDate && (
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'oklch(0.55 0.02 210)' }}>Joining Date</span>
                          <span className="font-bold text-white">{safeDate(selectedCand.joiningDate)}</span>
                        </div>
                      )}
                      {selectedCand.offerStatus && (
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'oklch(0.55 0.02 210)' }}>Status</span>
                          <span className={`font-bold ${selectedCand.offerStatus === 'accepted' ? 'text-[oklch(0.72_0.19_167)]' : selectedCand.offerStatus === 'declined' ? 'text-[oklch(0.75_0.18_25)]' : 'text-[oklch(0.78_0.17_70)]'}`}>
                            {selectedCand.offerStatus.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedCand.notes && (
                  <div className="p-3 rounded-xl mb-5" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Notes</p>
                    <p className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>{selectedCand.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {canManage && (
                  <div className="space-y-2.5" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)', paddingTop: '1.25rem' }}>
                    {selectedCand.status === 'selected' && !selectedCand.offerStatus && (
                      <button onClick={() => { setShowOfferModal(true); setOfferForm({ offeredSalary: 0, joiningDate: '' }); }}
                        className="aq-btn-primary w-full justify-center !text-xs">
                        <Send size={13} /> Send Offer Letter
                      </button>
                    )}
                    {selectedCand.status === 'offered' && selectedCand.offerStatus === 'accepted' && (
                      <button onClick={() => convertToEmployee(selectedCand)}
                        className="aq-btn-primary w-full justify-center !text-xs">
                        <UserPlus size={13} /> Convert to Employee
                      </button>
                    )}
                    {selectedCand.status !== 'rejected' && (
                      <button onClick={() => moveStage(selectedCand, 'rejected')}
                        className="aq-btn-ghost w-full justify-center !text-xs"
                        style={{ color: 'oklch(0.75 0.18 25)', borderColor: 'oklch(0.65 0.22 25 / 0.2)' }}>
                        <XCircle size={13} /> Reject Candidate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════════
          POST JOB MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showJobModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowJobModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="w-full max-w-lg glass-panel p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.15)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }}>
                    <Briefcase size={16} style={{ color: 'oklch(0.72 0.19 167)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Post a Job</h3>
                    <p className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>Create a new job requirement</p>
                  </div>
                </div>
                <button onClick={() => setShowJobModal(false)} className="p-1.5 rounded-xl hover:bg-white/5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={saveJob} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Role / Position</label>
                    <input required value={jobForm.role}
                      onChange={e => setJobForm(f => ({ ...f, role: e.target.value }))}
                      list="role-suggestions" placeholder="e.g. Support Agent" className="aq-input text-sm" />
                    <datalist id="role-suggestions">{ROLE_OPTS.map(r => <option key={r} value={r} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Department</label>
                    <select required value={jobForm.department}
                      onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} className="aq-input text-sm">
                      <option value="">Select…</option>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Min Salary (₹)</label>
                    <input type="number" value={jobForm.salaryMin}
                      onChange={e => setJobForm(f => ({ ...f, salaryMin: +e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Max Salary (₹)</label>
                    <input type="number" value={jobForm.salaryMax}
                      onChange={e => setJobForm(f => ({ ...f, salaryMax: +e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Location</label>
                    <input value={jobForm.location}
                      onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Openings</label>
                    <input type="number" min={1} value={jobForm.openings}
                      onChange={e => setJobForm(f => ({ ...f, openings: +e.target.value }))} className="aq-input text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Required Skills</label>
                  <input value={jobForm.skills} onChange={e => setJobForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. Communication, MS Excel, Aquaculture basics" className="aq-input text-sm" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Job Description (optional)</label>
                  <textarea rows={3} value={jobForm.description ?? ''}
                    onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Responsibilities, qualifications…" className="aq-input resize-none text-sm" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowJobModal(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <Briefcase size={14} /> {saving ? 'Posting…' : 'Post Job'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════════
          ADD CANDIDATE MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCandModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowCandModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="w-full max-w-md glass-panel p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'oklch(0.75 0.16 240 / 0.15)', border: '1px solid oklch(0.75 0.16 240 / 0.3)' }}>
                    <UserPlus size={16} style={{ color: 'oklch(0.75 0.16 240)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Add Candidate</h3>
                    <p className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>Add to recruitment pipeline</p>
                  </div>
                </div>
                <button onClick={() => setShowCandModal(false)} className="p-1.5 rounded-xl hover:bg-white/5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={saveCandidate} className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Job Position *</label>
                  <select required value={candForm.jobId}
                    onChange={e => setCandForm(f => ({ ...f, jobId: e.target.value }))} className="aq-input text-sm">
                    <option value="">Select job…</option>
                    {jobs.filter(j => j.status === 'open').map(j => (
                      <option key={j.id} value={j.id}>{j.role} — {j.department}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Full Name *</label>
                    <input required value={candForm.name}
                      onChange={e => setCandForm(f => ({ ...f, name: e.target.value }))} className="aq-input text-sm" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Phone</label>
                    <input value={candForm.phone}
                      onChange={e => setCandForm(f => ({ ...f, phone: e.target.value }))} className="aq-input text-sm" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Email</label>
                    <input type="email" value={candForm.email}
                      onChange={e => setCandForm(f => ({ ...f, email: e.target.value }))} className="aq-input text-sm" placeholder="john@email.com" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Source</label>
                    <select value={candForm.source}
                      onChange={e => setCandForm(f => ({ ...f, source: e.target.value }))} className="aq-input text-sm">
                      {SOURCE_OPTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Notes (optional)</label>
                  <textarea rows={2} value={candForm.notes}
                    onChange={e => setCandForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Initial impression, referral by, qualifications…" className="aq-input resize-none text-sm" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCandModal(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <UserPlus size={14} /> {saving ? 'Adding…' : 'Add Candidate'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════════
          SEND OFFER MODAL
      ══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showOfferModal && selectedCand && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setShowOfferModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="w-full max-w-sm glass-panel p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'oklch(0.8 0.17 155 / 0.15)', border: '1px solid oklch(0.8 0.17 155 / 0.3)' }}>
                    <Send size={15} style={{ color: 'oklch(0.8 0.17 155)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Send Offer</h3>
                    <p className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>To: {selectedCand.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowOfferModal(false)} className="p-1.5 rounded-xl hover:bg-white/5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={sendOffer} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Offered Salary (₹/month) *</label>
                  <input type="number" required min={1} value={offerForm.offeredSalary}
                    onChange={e => setOfferForm(f => ({ ...f, offeredSalary: +e.target.value }))}
                    className="aq-input text-sm" placeholder="e.g. 35000" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Joining Date *</label>
                  <input type="date" required value={offerForm.joiningDate}
                    onChange={e => setOfferForm(f => ({ ...f, joiningDate: e.target.value }))}
                    className="aq-input text-sm" />
                </div>
                {/* Preview */}
                <div className="p-3.5 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                  <p className="text-[9px] font-bold mb-2" style={{ color: 'oklch(0.72 0.19 167)' }}>📄 Offer Letter Preview</p>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span style={{ color: 'oklch(0.55 0.02 210)' }}>Candidate</span>
                      <span className="font-bold text-white">{selectedCand.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'oklch(0.55 0.02 210)' }}>Role</span>
                      <span className="font-bold text-white">{selectedCand.jobRole}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'oklch(0.55 0.02 210)' }}>Salary</span>
                      <span className="font-bold text-white">₹{offerForm.offeredSalary.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'oklch(0.55 0.02 210)' }}>Joining</span>
                      <span className="font-bold text-white">{offerForm.joiningDate || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowOfferModal(false)} className="aq-btn-ghost flex-1 justify-center !text-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="aq-btn-primary flex-1 justify-center !text-sm">
                    <Send size={14} /> {saving ? 'Sending…' : 'Send Offer'}
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

export default Recruitment;
