import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, DEPARTMENTS, type EmployeeRole } from '../context/AuthContext';
import {
  Briefcase, Plus, Search, X, Save, ChevronRight, Users, FileText,
  CheckCircle, XCircle, Clock, Send, UserPlus, Filter, Mail,
  Phone, MapPin, DollarSign, ArrowRight, Star, MoreHorizontal,
  Layers, AlertCircle, CalendarDays, Building2, RefreshCw,
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
  createdAt: string;
}

type CandidateStatus = 'applied' | 'shortlisted' | 'interviewed' | 'selected' | 'rejected' | 'offered';

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
const PIPELINE_STAGES: { status: CandidateStatus; label: string; color: string; icon: any }[] = [
  { status: 'applied',     label: 'Applied',     color: 'oklch(0.75 0.16 240)', icon: FileText },
  { status: 'shortlisted', label: 'Shortlisted', color: 'oklch(0.78 0.17 70)',  icon: Star },
  { status: 'interviewed', label: 'Interviewed', color: 'oklch(0.75 0.16 280)', icon: Users },
  { status: 'selected',    label: 'Selected',    color: 'oklch(0.72 0.19 167)', icon: CheckCircle },
  { status: 'offered',     label: 'Offer Sent',  color: 'oklch(0.72 0.17 155)', icon: Send },
  { status: 'rejected',    label: 'Rejected',    color: 'oklch(0.65 0.22 25)',  icon: XCircle },
];

const SOURCE_OPTS = ['Walk-in', 'Referral', 'Job Portal', 'LinkedIn', 'Direct'];

const ROLE_OPTS = [
  'Support Agent', 'HR Executive', 'Finance Analyst', 'Operations Manager',
  'Warehouse Staff', 'Field Technician', 'Developer', 'Data Analyst', 'Team Lead',
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const stageCfg = (status: CandidateStatus) =>
  PIPELINE_STAGES.find(s => s.status === status) ?? PIPELINE_STAGES[0];

const EMPTY_JOB = {
  role: '', department: '', skills: '', salaryMin: 0, salaryMax: 0,
  location: 'Nellore, AP', openings: 1, status: 'open' as const,
};
const EMPTY_CANDIDATE = {
  jobId: '', jobRole: '', name: '', email: '', phone: '',
  source: 'Walk-in', status: 'applied' as CandidateStatus, notes: '',
};

// ══════════════════════════════════════════════════════════════════════════════
const normalize = (r: any) => ({ ...r, id: r._id ?? r.id });

const Recruitment: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage_employees');

  const [jobs, setJobs]               = useState<Job[]>([]);
  const [candidates, setCandidates]   = useState<Candidate[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [activeTab, setActiveTab]     = useState<'pipeline' | 'jobs' | 'offers'>('pipeline');

  // Modals
  const [showJobModal, setShowJobModal]       = useState(false);
  const [showCandModal, setShowCandModal]     = useState(false);
  const [showOfferModal, setShowOfferModal]   = useState(false);
  const [selectedCand, setSelectedCand]       = useState<Candidate | null>(null);
  const [selectedJob, setSelectedJob]         = useState<string>('all');
  const [search, setSearch]                   = useState('');

  // Forms
  const [jobForm, setJobForm]     = useState(EMPTY_JOB);
  const [candForm, setCandForm]   = useState(EMPTY_CANDIDATE);
  const [offerForm, setOfferForm] = useState({ offeredSalary: 0, joiningDate: '' });
  const [saving, setSaving]       = useState(false);

  // ── Fetch from MongoDB ────────────────────────────────────────────────────────
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

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filteredCands = candidates.filter(c => {
    const matchJob    = selectedJob === 'all' || c.jobId === selectedJob;
    const matchSearch = !search ||
      (c.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.jobRole ?? '').toLowerCase().includes(search.toLowerCase());
    return matchJob && matchSearch;
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const saveJob = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const created = await hrmsApi.jobs.create(jobForm);
      setJobs(prev => [normalize(created), ...prev]);
      toast.success(`Job posted: ${jobForm.role}`);
      setShowJobModal(false); setJobForm(EMPTY_JOB);
    } catch (err: any) { toast.error(err.message ?? 'Failed to post job'); }
    finally { setSaving(false); }
  };

  const saveCandidate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const created = await hrmsApi.candidates.create(candForm);
      setCandidates(prev => [normalize(created), ...prev]);
      toast.success(`${candForm.name} added to pipeline!`);
      setShowCandModal(false); setCandForm(EMPTY_CANDIDATE);
    } catch (err: any) { toast.error(err.message ?? 'Failed to add candidate'); }
    finally { setSaving(false); }
  };

  const moveStage = async (cand: Candidate, newStatus: CandidateStatus) => {
    try {
      await hrmsApi.candidates.update(cand.id, { status: newStatus });
      setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, status: newStatus } : c));
      if (selectedCand?.id === cand.id) setSelectedCand(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`${cand.name} → ${stageCfg(newStatus).label}`);
    } catch (err: any) { toast.error(err.message ?? 'Failed to move stage'); }
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
      toast.success(`Offer sent to ${selectedCand.name}!`);
      setShowOfferModal(false); setSelectedCand(null);
    } catch (err: any) { toast.error(err.message ?? 'Failed to send offer'); }
    finally { setSaving(false); }
  };

  /** Convert an accepted candidate to an HRMS employee via API */
  const convertToEmployee = async (cand: Candidate) => {
    if (!cand.offeredSalary || !cand.joiningDate) {
      toast.error('Send offer first with salary & joining date'); return;
    }
    try {
      const job = jobs.find(j => j.id === cand.jobId);
      await hrmsApi.employees.create({
        name: cand.name,
        email: cand.email,
        phone: cand.phone,
        role: 'employee' as EmployeeRole,
        department: job?.department ?? '',
        salary: cand.offeredSalary,
        joiningDate: cand.joiningDate,
        status: 'active',
        empId: `AQ-${Date.now().toString().slice(-5)}`,
      });
      // Mark candidate as converted in DB
      await hrmsApi.candidates.update(cand.id, { status: 'selected', convertedToEmp: true });
      setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, status: 'selected' } : c));
      toast.success(`✅ ${cand.name} onboarded as Employee!`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to onboard employee');
    }
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
      setCandidates(prev => prev.map(c => c.id === candId
        ? { ...c, offerStatus, ...extra }
        : c));
    } catch (err: any) { toast.error(err.message ?? 'Failed to update offer status'); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Recruitment Pipeline
          </h1>
          <p className="text-xs text-[oklch(0.5_0.02_210)] mt-0.5">
            Hiring → Selection → Offer → Onboarding
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={fetchAll} disabled={fetching} className="aq-btn-ghost !text-xs !py-2 !px-3">
              <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { setCandForm(EMPTY_CANDIDATE); setShowCandModal(true); }}
              className="aq-btn-ghost !text-xs !py-2">
              <UserPlus size={14} /> Add Candidate
            </button>
            <button onClick={() => { setJobForm(EMPTY_JOB); setShowJobModal(true); }}
              className="aq-btn-primary !text-xs !py-2">
              <Plus size={14} /> Post Job
            </button>
          </div>
        )}
      </div>

      {/* Loading bar */}
      {fetching && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
          style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
          <div className="w-3.5 h-3.5 border-2 border-[oklch(0.72_0.19_167/0.3)] border-t-[oklch(0.72_0.19_167)] rounded-full animate-spin" />
          <span className="text-[oklch(0.72_0.19_167)] font-medium">Loading recruitment data from database…</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {PIPELINE_STAGES.map(s => {
          const count = candidates.filter(c => c.status === s.status).length;
          return (
            <div key={s.status} className="aq-stat-card cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={() => setActiveTab('pipeline')}>
              <p className="text-[8px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: s.color }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 8%)' }}>
        {[
          { id: 'pipeline', label: '🔄 Pipeline' },
          { id: 'jobs',     label: '📋 Job Postings' },
          { id: 'offers',   label: '📄 Offers' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all"
            style={activeTab === t.id
              ? { background: 'oklch(0.72 0.19 167 / 0.15)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.25)' }
              : { color: 'oklch(0.55 0.02 210)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PIPELINE TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search candidate…" className="aq-input pl-8 !py-1.5 !text-xs" />
            </div>
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
              className="aq-input !py-1.5 !text-xs !w-auto">
              <option value="all">All Jobs</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.role} — {j.department}</option>)}
            </select>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {PIPELINE_STAGES.map(stage => {
              const stageCands = filteredCands.filter(c => c.status === stage.status);
              const Icon = stage.icon;
              return (
                <div key={stage.status} className="glass-panel overflow-hidden">
                  {/* Column header */}
                  <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                    <div className="p-1.5 rounded-lg" style={{ background: `${stage.color} / 0.12` }}>
                      <Icon size={12} style={{ color: stage.color }} />
                    </div>
                    <p className="text-[10px] font-bold text-white flex-1">{stage.label}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${stage.color} / 0.15`, color: stage.color }}>
                      {stageCands.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[80px]">
                    {stageCands.map(cand => (
                      <motion.div key={cand.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className="p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                        style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 8%)' }}
                        onClick={() => setSelectedCand(cand)}>
                        <p className="text-[10px] font-bold text-white truncate">{cand.name}</p>
                        <p className="text-[9px] text-[oklch(0.5_0.02_210)] truncate">{cand.jobRole}</p>
                        <p className="text-[9px] text-[oklch(0.45_0.02_210)] mt-1">{cand.source}</p>
                      </motion.div>
                    ))}
                    {stageCands.length === 0 && (
                      <p className="text-[9px] text-center text-[oklch(0.35_0.02_210)] py-4">No candidates</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── JOBS TAB ──────────────────────────────────────────────────────────── */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {jobs.length === 0 && (
            <div className="glass-panel py-14 text-center">
              <Briefcase size={32} className="mx-auto mb-2 text-[oklch(0.3_0.02_210)]" />
              <p className="text-xs text-[oklch(0.45_0.02_210)]">No job postings yet.</p>
              {canManage && (
                <button onClick={() => setShowJobModal(true)} className="aq-btn-primary !text-xs mt-3 !py-2">
                  <Plus size={13} /> Post First Job
                </button>
              )}
            </div>
          )}
          {jobs.map(job => {
            const jobCands = candidates.filter(c => c.jobId === job.id);
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white">{job.role}</p>
                      <span className={`aq-badge ${job.status === 'open' ? 'aq-badge-green' : job.status === 'paused' ? 'aq-badge-amber' : 'aq-badge-red'}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-[oklch(0.55_0.02_210)]">
                      <span className="flex items-center gap-1"><Building2 size={10} /> {job.department}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} /> {job.location}</span>
                      <span className="flex items-center gap-1"><DollarSign size={10} /> ₹{job.salaryMin.toLocaleString()} – ₹{job.salaryMax.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                    </div>
                    {job.skills && (
                      <p className="text-[9px] text-[oklch(0.5_0.02_210)] mt-1.5">Skills: {job.skills}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex gap-4 text-center">
                      {PIPELINE_STAGES.slice(0, 4).map(s => (
                        <div key={s.status}>
                          <p className="text-sm font-bold" style={{ color: s.color }}>
                            {jobCands.filter(c => c.status === s.status).length}
                          </p>
                          <p className="text-[8px] text-[oklch(0.45_0.02_210)]">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button onClick={() => {
                          setCandForm({ ...EMPTY_CANDIDATE, jobId: job.id });
                          setShowCandModal(true);
                        }} className="px-2 py-1 rounded-lg text-[9px] font-bold"
                          style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                          + Candidate
                        </button>
                        <button onClick={() => deleteJob(job.id)}
                          className="px-2 py-1 rounded-lg text-[9px] font-bold"
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

      {/* ── OFFERS TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'offers' && (
        <div className="space-y-3">
          {candidates.filter(c => c.status === 'offered' || c.offerStatus).length === 0 && (
            <div className="glass-panel py-14 text-center">
              <Send size={32} className="mx-auto mb-2 text-[oklch(0.3_0.02_210)]" />
              <p className="text-xs text-[oklch(0.45_0.02_210)]">No offers sent yet.</p>
            </div>
          )}
          {candidates.filter(c => c.status === 'offered' || c.offerStatus).map(cand => (
            <motion.div key={cand.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-panel p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] font-bold text-sm shrink-0">
                {cand.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-white">{cand.name}</p>
                  <span className={`aq-badge ${cand.offerStatus === 'accepted' ? 'aq-badge-green' : cand.offerStatus === 'declined' ? 'aq-badge-red' : 'aq-badge-amber'}`}>
                    {cand.offerStatus ?? 'pending'}
                  </span>
                </div>
                <p className="text-[10px] text-[oklch(0.55_0.02_210)]">{cand.jobRole} · ₹{cand.offeredSalary?.toLocaleString()}/mo</p>
                {cand.joiningDate && (
                  <p className="text-[9px] text-[oklch(0.45_0.02_210)] mt-0.5">
                    Joining: {format(new Date(cand.joiningDate), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
              {canManage && cand.offerStatus === 'accepted' && (
                <button onClick={() => convertToEmployee(cand)} className="aq-btn-primary !text-xs !py-1.5 shrink-0">
                  <UserPlus size={12} /> Onboard
                </button>
              )}
              {canManage && cand.offerStatus === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => updateOfferStatus(cand.id, 'accepted')}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.1)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
                    Mark Accepted
                  </button>
                  <button onClick={() => updateOfferStatus(cand.id, 'declined')}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold"
                    style={{ background: 'oklch(0.65 0.22 25 / 0.1)', color: 'oklch(0.75 0.18 25)', border: '1px solid oklch(0.65 0.22 25 / 0.2)' }}>
                    Declined
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── CANDIDATE DETAIL SIDE PANEL ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCand && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedCand(null)}>
            <motion.div initial={{ scale: 0.93, x: 40 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0.93, x: 40 }}
              className="w-full max-w-md glass-panel p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] font-bold text-base">
                    {selectedCand.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedCand.name}</p>
                    <p className="text-[10px] text-[oklch(0.5_0.02_210)]">{selectedCand.jobRole}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCand(null)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]">
                  <X size={16} />
                </button>
              </div>

              {/* Status Badge + Pipeline */}
              <div className="mb-4">
                <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-2">Current Stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.filter(s => s.status !== 'rejected').map(s => (
                    <button key={s.status}
                      onClick={() => canManage && moveStage(selectedCand, s.status)}
                      className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold capitalize transition-all"
                      style={selectedCand.status === s.status
                        ? { background: `${s.color} / 0.15`, color: s.color, border: `1px solid ${s.color} / 0.3` }
                        : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                {[
                  { icon: Mail,   val: selectedCand.email },
                  { icon: Phone,  val: selectedCand.phone },
                  { icon: Layers, val: `Source: ${selectedCand.source}` },
                  { icon: CalendarDays, val: `Applied: ${format(selectedCand.createdAt.toDate(), 'MMM dd, yyyy')}` },
                ].map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-[oklch(0.6_0.02_210)]">
                      <Icon size={11} className="shrink-0" /> {row.val}
                    </div>
                  );
                })}
                {selectedCand.offeredSalary && (
                  <div className="flex items-center gap-2 text-[10px] text-[oklch(0.72_0.19_167)]">
                    <DollarSign size={11} /> Offered: ₹{selectedCand.offeredSalary.toLocaleString()}/mo
                    {selectedCand.joiningDate && ` · Joining: ${format(new Date(selectedCand.joiningDate), 'MMM dd, yyyy')}`}
                  </div>
                )}
                {selectedCand.notes && (
                  <div className="p-2.5 rounded-xl mt-2" style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                    <p className="text-[9px] text-[oklch(0.5_0.02_210)]">{selectedCand.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {canManage && (
                <div className="space-y-2" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '1rem' }}>
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
                  <button onClick={() => moveStage(selectedCand, 'rejected')}
                    className="aq-btn-ghost w-full justify-center !text-xs"
                    style={{ color: 'oklch(0.75 0.18 25)', borderColor: 'oklch(0.65 0.22 25 / 0.2)' }}>
                    <XCircle size={13} /> Reject Candidate
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── POST JOB MODAL ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showJobModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowJobModal(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-lg glass-panel p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Post a Job</h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Create a new job requirement</p>
                </div>
                <button onClick={() => setShowJobModal(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]"><X size={16} /></button>
              </div>
              <form onSubmit={saveJob} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Role / Position</label>
                    <input required value={jobForm.role} onChange={e => setJobForm(f => ({ ...f, role: e.target.value }))}
                      list="role-suggestions" placeholder="e.g. Support Agent" className="aq-input text-sm" />
                    <datalist id="role-suggestions">{ROLE_OPTS.map(r => <option key={r} value={r} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Department</label>
                    <select required value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} className="aq-input text-sm">
                      <option value="">Select…</option>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Min Salary (₹)</label>
                    <input type="number" value={jobForm.salaryMin} onChange={e => setJobForm(f => ({ ...f, salaryMin: +e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Max Salary (₹)</label>
                    <input type="number" value={jobForm.salaryMax} onChange={e => setJobForm(f => ({ ...f, salaryMax: +e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Location</label>
                    <input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Openings</label>
                    <input type="number" min={1} value={jobForm.openings} onChange={e => setJobForm(f => ({ ...f, openings: +e.target.value }))} className="aq-input text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Required Skills</label>
                  <input value={jobForm.skills} onChange={e => setJobForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. Communication, MS Excel, Aquaculture basics" className="aq-input text-sm" />
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

      {/* ── ADD CANDIDATE MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCandModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowCandModal(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-md glass-panel p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Add Candidate</h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Add to recruitment pipeline</p>
                </div>
                <button onClick={() => setShowCandModal(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]"><X size={16} /></button>
              </div>
              <form onSubmit={saveCandidate} className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Job Position</label>
                  <select required value={candForm.jobId} onChange={e => setCandForm(f => ({ ...f, jobId: e.target.value }))} className="aq-input text-sm">
                    <option value="">Select job…</option>
                    {jobs.filter(j => j.status === 'open').map(j => <option key={j.id} value={j.id}>{j.role} — {j.department}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Full Name</label>
                    <input required value={candForm.name} onChange={e => setCandForm(f => ({ ...f, name: e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Phone</label>
                    <input value={candForm.phone} onChange={e => setCandForm(f => ({ ...f, phone: e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Email</label>
                    <input type="email" value={candForm.email} onChange={e => setCandForm(f => ({ ...f, email: e.target.value }))} className="aq-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Source</label>
                    <select value={candForm.source} onChange={e => setCandForm(f => ({ ...f, source: e.target.value }))} className="aq-input text-sm">
                      {SOURCE_OPTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Notes (optional)</label>
                  <textarea rows={2} value={candForm.notes} onChange={e => setCandForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Initial impression, referral by, etc." className="aq-input resize-none text-sm" />
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

      {/* ── SEND OFFER MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOfferModal && selectedCand && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowOfferModal(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className="w-full max-w-sm glass-panel p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Send Offer</h3>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">To: {selectedCand.name}</p>
                </div>
                <button onClick={() => setShowOfferModal(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)]"><X size={16} /></button>
              </div>
              <form onSubmit={sendOffer} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Offered Salary (₹/month)</label>
                  <input type="number" required min={1} value={offerForm.offeredSalary}
                    onChange={e => setOfferForm(f => ({ ...f, offeredSalary: +e.target.value }))} className="aq-input text-sm" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Joining Date</label>
                  <input type="date" required value={offerForm.joiningDate}
                    onChange={e => setOfferForm(f => ({ ...f, joiningDate: e.target.value }))} className="aq-input text-sm" />
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
                  <p className="text-[9px] text-[oklch(0.72_0.19_167)] font-bold mb-1">📄 Offer Letter will include:</p>
                  <ul className="text-[9px] text-[oklch(0.6_0.02_210)] space-y-0.5">
                    <li>• Role: {selectedCand.jobRole}</li>
                    <li>• Salary: ₹{offerForm.offeredSalary.toLocaleString()}/month</li>
                    <li>• Joining: {offerForm.joiningDate || '(select date)'}</li>
                  </ul>
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
