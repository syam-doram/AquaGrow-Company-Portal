import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import hrmsApi from '../api';
import {
  UserPlus, Search, X, CheckCircle, XCircle, Clock,
  Mail, ChevronRight, Eye, Download, Copy, Users,
  Shield, Star, FileText, Building, CreditCard, Phone,
  ArrowRight, MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useHiring } from '../context/HiringContext';

// ── Types ──────────────────────────────────────────────────────────────────────
export type HiringStatus =
  | 'invited' | 'submitted' | 'hr_approved'
  | 'founder_approved' | 'bgv_pending' | 'bgv_clear'
  | 'hired' | 'rejected';

interface CandidateDoc {
  name: string; url: string;
  type: 'aadhaar' | 'pan' | 'resume' | 'photo' | 'other';
  uploadedAt: string;
}

interface CandidateDetails {
  dob: string; gender: string; address: string;
  city: string; state: string; pincode: string;
  alternatePhone: string; previousCompany: string; experience: string;
  skills: string; currentCTC: string; expectedCTC: string;
  noticePeriod: string; bankAccount: string; ifsc: string;
  bankName: string; accountHolder: string;
}

export interface Candidate {
  id: string; name: string; email: string; phone: string;
  appliedRole: string; department: string; status: HiringStatus;
  invitedAt: string; submittedAt?: string; hrApprovedAt?: string;
  founderApprovedAt?: string; bgvClearedAt?: string;
  hiredAt?: string; rejectedAt?: string;
  rejectionReason?: string; bgvNote?: string;
  hrNote?: string; founderNote?: string;
  details?: Partial<CandidateDetails>;
  documents?: CandidateDoc[];
  employeeId?: string;
  avatar: string;
}

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<HiringStatus, { label: string; color: string; bg: string; emoji: string; order: number }> = {
  invited:          { label: 'Invited',         color: 'oklch(0.58 0.18 240)', bg: 'oklch(0.58 0.18 240 / 0.14)', emoji: '📧', order: 1 },
  submitted:        { label: 'Submitted',        color: 'oklch(0.70 0.18 80)',  bg: 'oklch(0.70 0.18 80  / 0.14)', emoji: '📝', order: 2 },
  hr_approved:      { label: 'HR Approved',      color: 'oklch(0.55 0.17 187)', bg: 'oklch(0.55 0.17 187 / 0.14)', emoji: '✅', order: 3 },
  founder_approved: { label: 'Founder Approved', color: 'oklch(0.60 0.20 295)', bg: 'oklch(0.60 0.20 295 / 0.14)', emoji: '⭐', order: 4 },
  bgv_pending:      { label: 'BGV Pending',      color: 'oklch(0.70 0.18 80)',  bg: 'oklch(0.70 0.18 80  / 0.14)', emoji: '🔍', order: 5 },
  bgv_clear:        { label: 'BGV Clear',        color: 'oklch(0.55 0.19 167)', bg: 'oklch(0.55 0.19 167 / 0.14)', emoji: '🛡️', order: 6 },
  hired:            { label: 'Hired',            color: 'oklch(0.55 0.19 167)', bg: 'oklch(0.55 0.19 167 / 0.14)', emoji: '🏆', order: 7 },
  rejected:         { label: 'Rejected',         color: 'oklch(0.62 0.22 25)',  bg: 'oklch(0.62 0.22 25  / 0.14)', emoji: '❌', order: 8 },
};

const PIPELINE_STAGES: HiringStatus[] = [
  'invited', 'submitted', 'hr_approved', 'founder_approved', 'bgv_clear', 'hired',
];

const OPEN_ROLES = [
  'Backend Developer', 'Frontend Developer', 'IoT Engineer', 'QA Tester',
  'Sales Executive', 'Field Officer', 'Field Technician', 'IoT Specialist',
  'Operations Manager', 'Warehouse Manager', 'Delivery Coordinator',
  'Support Executive', 'Aquaculture Expert', 'Digital Marketing',
];

const DEPT_MAP: Record<string, string> = {
  'Backend Developer': 'Tech', 'Frontend Developer': 'Tech',
  'IoT Engineer': 'Tech', 'QA Tester': 'Tech', 'IoT Specialist': 'Tech',
  'Sales Executive': 'Growth & Sales', 'Field Officer': 'Growth & Sales',
  'Field Technician': 'Growth & Sales', 'Digital Marketing': 'Growth & Sales',
  'Operations Manager': 'Operations', 'Warehouse Manager': 'Warehouse',
  'Delivery Coordinator': 'Logistics',
  'Support Executive': 'Customer Support', 'Aquaculture Expert': 'Customer Support',
};

const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500',
  'bg-pink-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500',
];

// ── Seed Data ──────────────────────────────────────────────────────────────────
export const SEED: Candidate[] = [
  {
    id: 'C001', avatar: 'AM', name: 'Arjun Mehta',
    email: 'arjun.m@gmail.com', phone: '+91 98765 11111',
    appliedRole: 'Backend Developer', department: 'Tech',
    status: 'submitted', invitedAt: '2026-04-15', submittedAt: '2026-04-17',
    details: {
      dob: '1998-07-15', gender: 'Male', address: '12 MG Road', city: 'Bengaluru',
      state: 'Karnataka', pincode: '560001', alternatePhone: '+91 98765 11112',
      previousCompany: 'Infosys Ltd', experience: '3 years',
      skills: 'Node.js, MongoDB, AWS, Docker',
      currentCTC: '8 LPA', expectedCTC: '13 LPA', noticePeriod: '30 days',
      bankAccount: '1234567890', ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank', accountHolder: 'Arjun Mehta',
    },
    documents: [
      { name: 'Aadhaar.pdf', url: '#', type: 'aadhaar', uploadedAt: '2026-04-17' },
      { name: 'PAN_Card.pdf', url: '#', type: 'pan', uploadedAt: '2026-04-17' },
      { name: 'Resume_Arjun.pdf', url: '#', type: 'resume', uploadedAt: '2026-04-17' },
    ],
  },
  {
    id: 'C002', avatar: 'PN', name: 'Preethi Nair',
    email: 'preethi.n@gmail.com', phone: '+91 87654 22222',
    appliedRole: 'Sales Executive', department: 'Growth & Sales',
    status: 'hr_approved', invitedAt: '2026-04-12',
    submittedAt: '2026-04-14', hrApprovedAt: '2026-04-16',
    hrNote: 'Strong sales background, good communication.',
    details: {
      dob: '2000-03-22', gender: 'Female', address: '45 Anna Nagar', city: 'Chennai',
      state: 'Tamil Nadu', pincode: '600040', alternatePhone: '',
      previousCompany: 'Bajaj Finance', experience: '2 years',
      skills: 'Sales, CRM, Tele-calling',
      currentCTC: '4 LPA', expectedCTC: '6.5 LPA', noticePeriod: '15 days',
      bankAccount: '9876543210', ifsc: 'ICIC0002345',
      bankName: 'ICICI Bank', accountHolder: 'Preethi Nair',
    },
    documents: [
      { name: 'Aadhaar.pdf', url: '#', type: 'aadhaar', uploadedAt: '2026-04-14' },
      { name: 'Resume_Preethi.pdf', url: '#', type: 'resume', uploadedAt: '2026-04-14' },
    ],
  },
  {
    id: 'C003', avatar: 'VS', name: 'Vikram Shetty',
    email: 'vikram.s@gmail.com', phone: '+91 76543 33333',
    appliedRole: 'IoT Engineer', department: 'Tech',
    status: 'founder_approved', invitedAt: '2026-04-10',
    submittedAt: '2026-04-12', hrApprovedAt: '2026-04-14',
    founderApprovedAt: '2026-04-16',
    hrNote: 'Excellent IoT experience.',
    founderNote: 'Approved. BGV me proceed chesandi.',
  },
  {
    id: 'C004', avatar: 'SP', name: 'Sneha Patil',
    email: 'sneha.p@gmail.com', phone: '+91 65432 44444',
    appliedRole: 'Support Executive', department: 'Customer Support',
    status: 'bgv_clear', invitedAt: '2026-04-05',
    submittedAt: '2026-04-07', hrApprovedAt: '2026-04-09',
    founderApprovedAt: '2026-04-10', bgvClearedAt: '2026-04-18',
    bgvNote: 'All docs verified. Previous employer confirmed.',
    details: {
      dob: '1999-11-05', gender: 'Female', address: '8 Sector 12', city: 'Pune',
      state: 'Maharashtra', pincode: '411001', alternatePhone: '',
      previousCompany: 'Teleperformance', experience: '1.5 years',
      skills: 'Customer Support, Issue Resolution',
      currentCTC: '3 LPA', expectedCTC: '4.5 LPA', noticePeriod: 'Immediate',
      bankAccount: '5678901234', ifsc: 'PUNB0001234',
      bankName: 'Punjab National Bank', accountHolder: 'Sneha Patil',
    },
    documents: [
      { name: 'Aadhaar.pdf', url: '#', type: 'aadhaar', uploadedAt: '2026-04-07' },
      { name: 'PAN.pdf', url: '#', type: 'pan', uploadedAt: '2026-04-07' },
      { name: 'Resume.pdf', url: '#', type: 'resume', uploadedAt: '2026-04-07' },
      { name: 'Photo.jpg', url: '#', type: 'photo', uploadedAt: '2026-04-07' },
    ],
  },
  {
    id: 'C005', avatar: 'KG', name: 'Karan Gupta',
    email: 'karan.g@gmail.com', phone: '+91 54321 55555',
    appliedRole: 'Field Officer', department: 'Growth & Sales',
    status: 'invited', invitedAt: '2026-04-20',
  },
  {
    id: 'C006', avatar: 'MR', name: 'Meera Rao',
    email: 'meera.r@gmail.com', phone: '+91 43210 66666',
    appliedRole: 'Sales Executive', department: 'Growth & Sales',
    status: 'hired', invitedAt: '2026-03-20',
    submittedAt: '2026-03-22', hrApprovedAt: '2026-03-24',
    founderApprovedAt: '2026-03-26', bgvClearedAt: '2026-03-30',
    hiredAt: '2026-04-01', employeeId: 'AQ-EMP021',
  },
  {
    id: 'C007', avatar: 'RJ', name: 'Rohit Joshi',
    email: 'rohit.j@gmail.com', phone: '+91 32109 77777',
    appliedRole: 'QA Tester', department: 'Tech',
    status: 'rejected', invitedAt: '2026-04-08',
    submittedAt: '2026-04-10', rejectedAt: '2026-04-12',
    rejectionReason: 'Experience requirement not met. Reapply after 6 months.',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const StatusPill = ({ status }: { status: HiringStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div className="flex items-start justify-between gap-4 py-2"
      style={{ borderBottom: '1px solid var(--aq-card-border)' }}>
      <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 w-28"
        style={{ color: 'var(--aq-text-muted)' }}>{label}</span>
      <span className="text-xs text-right" style={{ color: 'var(--aq-text-primary)' }}>{value}</span>
    </div>
  ) : null;

// ── Progress Bar ───────────────────────────────────────────────────────────────
const StatusFlow = ({ status }: { status: HiringStatus }) => {
  if (status === 'rejected') return null;
  const steps = PIPELINE_STAGES;
  const current = steps.indexOf(status);
  return (
    <div className="flex items-center gap-0 mb-4">
      {steps.map((s, i) => {
        const cfg = STATUS_CONFIG[s];
        const active = i === current;
        const done = i < current;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center" style={{ minWidth: 40 }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                style={{
                  background: done ? 'oklch(0.55 0.19 167)' : active ? cfg.color : 'var(--aq-ghost-bg)',
                  color: done || active ? '#fff' : 'var(--aq-text-faint)',
                  transition: 'all 0.3s',
                }}>
                {done ? '✓' : cfg.emoji}
              </div>
              <span className="text-[7px] mt-0.5 text-center leading-none"
                style={{ color: active ? cfg.color : 'var(--aq-text-faint)', maxWidth: 36 }}>
                {cfg.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mb-4"
                style={{ background: i < current ? 'oklch(0.55 0.19 167)' : 'var(--aq-card-border)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Add Candidate Modal ────────────────────────────────────────────────────────
const AddCandidateModal = ({
  onClose, onAdd,
}: { onClose: () => void; onAdd: (c: Candidate) => void }) => {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', appliedRole: OPEN_ROLES[0],
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    const avatar = form.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const c: Candidate = {
      id: `C${Date.now().toString().slice(-4)}`,
      avatar,
      ...form,
      department: DEPT_MAP[form.appliedRole] ?? 'Other',
      status: 'invited',
      invitedAt: new Date().toISOString().slice(0, 10),
    };
    onAdd(c);
    toast.success(`✉️ Invitation sent to ${form.email}`);
    onClose();
    setSending(false);
  };

  const I = ({ label, k, type = 'text', placeholder = '' }: {
    label: string; k: keyof typeof form; type?: string; placeholder?: string;
  }) => (
    <div>
      <label className="aq-section-label mb-1.5">{label}</label>
      <input type={type} value={form[k]}
        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
        placeholder={placeholder} required className="aq-input" />
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="aq-card overflow-hidden">
            <div className="p-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--aq-card-border)', background: 'oklch(0.55 0.19 167 / 0.06)' }}>
              <div>
                <h3 className="font-display font-bold text-base" style={{ color: 'var(--aq-text-primary)' }}>
                  Add Candidate
                </h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
                  Onboarding link sent automatically
                </p>
              </div>
              <button onClick={onClose} className="aq-btn-ghost !p-2"><X size={15} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <I label="Full Name *" k="name" placeholder="e.g. Arjun Mehta" />
              <I label="Personal Email *" k="email" type="email" placeholder="arjun@gmail.com" />
              <I label="Phone" k="phone" placeholder="+91 XXXXX XXXXX" />
              <div>
                <label className="aq-section-label mb-1.5">Applied Position *</label>
                <select value={form.appliedRole}
                  onChange={e => setForm(f => ({ ...f, appliedRole: e.target.value }))}
                  className="aq-input">
                  {OPEN_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div className="p-3 rounded-xl"
                style={{ background: 'oklch(0.55 0.19 167 / 0.08)', border: '1px solid oklch(0.55 0.19 167 / 0.2)' }}>
                <p className="text-[10px]" style={{ color: 'oklch(0.55 0.19 167)' }}>
                  📧 <strong>What happens next:</strong> Candidate receives an email with their personal onboarding
                  portal link. They fill in all details, upload documents and submit.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 aq-btn-ghost">Cancel</button>
                <button type="submit" disabled={sending} className="flex-1 aq-btn-primary">
                  {sending
                    ? <span className="flex items-center gap-2 justify-center">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Sending…
                    </span>
                    : '📧 Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Candidate Detail Panel ─────────────────────────────────────────────────────
const CandidatePanel = ({
  candidate, idx, onClose, onStatusUpdate,
}: {
  candidate: Candidate;
  idx: number;
  onClose: () => void;
  onStatusUpdate: (id: string, status: HiringStatus, extras?: Partial<Candidate>) => void;
}) => {
  const { hasRole } = useAuth();
  const isHR      = hasRole('hr_manager') || hasRole('super_admin');
  const isFounder = hasRole('super_admin');

  const [tab, setTab] = useState<'overview' | 'details' | 'docs' | 'timeline'>('overview');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);

  const act = async (status: HiringStatus, extras: Partial<Candidate> = {}) => {
    setActing(true);
    await new Promise(r => setTimeout(r, 700));
    onStatusUpdate(candidate.id, status, extras);
    toast.success(`${STATUS_CONFIG[status].emoji} Moved to ${STATUS_CONFIG[status].label}`);
    setActing(false);
    setShowReject(false);
    setNote('');
    setRejectReason('');
    onClose(); // Close panel so kanban updates are visible immediately
  };

  const { status } = candidate;
  const cfg = STATUS_CONFIG[status];

  const renderActions = () => {
    // HR: review submitted
    if (status === 'submitted' && isHR) return (
      <div className="space-y-3">
        <div>
          <label className="aq-section-label mb-1.5">HR Notes (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Add notes…" className="aq-input !h-auto resize-none" />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 aq-btn-primary" disabled={acting}
            onClick={() => act('hr_approved', { hrNote: note, hrApprovedAt: new Date().toISOString().slice(0, 10) })}>
            ✅ HR Approve
          </button>
          <button className="flex-1 aq-btn-ghost !text-red-500"
            disabled={acting} onClick={() => setShowReject(r => !r)}>
            ❌ Reject
          </button>
        </div>
        {showReject && (
          <div className="space-y-2">
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
              placeholder="Rejection reason…" className="aq-input !h-auto resize-none"
              style={{ borderColor: 'oklch(0.62 0.22 25 / 0.4)' }} />
            <button disabled={!rejectReason || acting}
              onClick={() => act('rejected', { rejectionReason: rejectReason, rejectedAt: new Date().toISOString().slice(0, 10) })}
              className="w-full py-2.5 rounded-xl text-xs font-bold"
              style={{ background: 'oklch(0.62 0.22 25 / 0.15)', color: 'oklch(0.62 0.22 25)', border: '1px solid oklch(0.62 0.22 25 / 0.3)' }}>
              Confirm Rejection
            </button>
          </div>
        )}
      </div>
    );

    // Founder: review HR-approved
    if (status === 'hr_approved' && isFounder) return (
      <div className="space-y-3">
        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.60 0.20 295 / 0.08)', border: '1px solid oklch(0.60 0.20 295 / 0.25)' }}>
          <p className="text-[10px] font-bold" style={{ color: 'oklch(0.60 0.20 295)' }}>⭐ Founder Approval Required</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>HR has reviewed and approved this candidate.</p>
        </div>
        <div>
          <label className="aq-section-label mb-1.5">Founder Notes (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Your comments…" className="aq-input !h-auto resize-none" />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 aq-btn-primary" disabled={acting}
            onClick={() => act('founder_approved', { founderNote: note, founderApprovedAt: new Date().toISOString().slice(0, 10) })}>
            ⭐ Founder Approve
          </button>
          <button className="flex-1 aq-btn-ghost !text-red-500"
            disabled={acting} onClick={() => setShowReject(r => !r)}>
            ❌ Reject
          </button>
        </div>
        {showReject && (
          <div className="space-y-2">
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
              placeholder="Rejection reason…" className="aq-input !h-auto resize-none"
              style={{ borderColor: 'oklch(0.62 0.22 25 / 0.4)' }} />
            <button disabled={!rejectReason || acting}
              onClick={() => act('rejected', { rejectionReason: rejectReason, rejectedAt: new Date().toISOString().slice(0, 10) })}
              className="w-full py-2.5 rounded-xl text-xs font-bold"
              style={{ background: 'oklch(0.62 0.22 25 / 0.15)', color: 'oklch(0.62 0.22 25)', border: '1px solid oklch(0.62 0.22 25 / 0.3)' }}>
              Confirm Rejection
            </button>
          </div>
        )}
      </div>
    );

    // HR: BGV after founder approval
    if (status === 'founder_approved' && isHR) return (
      <div className="space-y-3">
        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.70 0.18 80 / 0.08)', border: '1px solid oklch(0.70 0.18 80 / 0.25)' }}>
          <p className="text-[10px] font-bold" style={{ color: 'oklch(0.70 0.18 80)' }}>🔍 Background Verification</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>Verify documents, previous employer, and identity.</p>
        </div>
        <div>
          <label className="aq-section-label mb-1.5">BGV Findings</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Verification findings…" className="aq-input !h-auto resize-none" />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 aq-btn-primary" disabled={acting}
            onClick={() => act('bgv_clear', { bgvNote: note, bgvClearedAt: new Date().toISOString().slice(0, 10) })}>
            🛡️ BGV Clear
          </button>
          <button className="flex-1 py-2.5 rounded-xl text-xs font-bold" disabled={acting}
            onClick={() => act('rejected', { rejectionReason: 'BGV Failed: ' + note, rejectedAt: new Date().toISOString().slice(0, 10) })}
            style={{ background: 'oklch(0.62 0.22 25 / 0.15)', color: 'oklch(0.62 0.22 25)' }}>
            ❌ BGV Failed
          </button>
        </div>
      </div>
    );

    // HR: Confirm Hire
    if (status === 'bgv_clear' && isHR) {
      const empId = `AQ-EMP${(Math.random() * 1000 | 0).toString().padStart(3, '0')}`;
      return (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl"
            style={{ background: 'oklch(0.55 0.19 167 / 0.08)', border: '1px solid oklch(0.55 0.19 167 / 0.25)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'oklch(0.55 0.19 167)' }}>🎉 Ready to Hire!</p>
            <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
              Clicking "Confirm Hire" will:<br />
              • Generate Employee ID: <strong>{empId}</strong><br />
              • Activate portal access<br />
              • Send welcome + credentials email
            </p>
          </div>
          <button className="w-full aq-btn-primary !py-3" disabled={acting}
            onClick={() => act('hired', {
              employeeId: empId,
              hiredAt: new Date().toISOString().slice(0, 10),
            })}>
            🏆 Confirm Hire → Convert to Employee
          </button>
        </div>
      );
    }

    return null;
  };

  const timeline = [
    candidate.invitedAt && { date: candidate.invitedAt, label: 'Invitation Sent', emoji: '📧', color: 'oklch(0.58 0.18 240)' },
    candidate.submittedAt && { date: candidate.submittedAt, label: 'Details Submitted', emoji: '📝', color: 'oklch(0.70 0.18 80)' },
    candidate.hrApprovedAt && { date: candidate.hrApprovedAt, label: 'HR Approved', note: candidate.hrNote, emoji: '✅', color: 'oklch(0.55 0.17 187)' },
    candidate.founderApprovedAt && { date: candidate.founderApprovedAt, label: 'Founder Approved', note: candidate.founderNote, emoji: '⭐', color: 'oklch(0.60 0.20 295)' },
    candidate.bgvClearedAt && { date: candidate.bgvClearedAt, label: 'BGV Cleared', note: candidate.bgvNote, emoji: '🛡️', color: 'oklch(0.55 0.19 167)' },
    candidate.hiredAt && { date: candidate.hiredAt, label: '🎉 Hired — ' + (candidate.employeeId ?? ''), emoji: '🏆', color: 'oklch(0.55 0.19 167)' },
    candidate.rejectedAt && { date: candidate.rejectedAt, label: 'Rejected', note: candidate.rejectionReason, emoji: '❌', color: 'oklch(0.62 0.22 25)' },
  ].filter(Boolean) as { date: string; label: string; note?: string; emoji: string; color: string }[];

  const sections = [
    { id: 'overview', emoji: '👤', label: 'Overview' },
    { id: 'details',  emoji: '📋', label: 'Details'  },
    { id: 'docs',     emoji: '📎', label: 'Docs'     },
    { id: 'timeline', emoji: '🕐', label: 'Timeline' },
  ] as const;

  const actions = renderActions();

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-end"
        onClick={onClose}>
        <motion.div initial={{ x: 460, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 460, opacity: 0 }}
          transition={{ type: 'spring', damping: 26 }}
          className="w-full max-w-lg h-full overflow-y-auto"
          style={{ background: 'var(--aq-card-bg)', borderLeft: '1px solid var(--aq-card-border)' }}
          onClick={e => e.stopPropagation()}>

          {/* Sticky header */}
          <div className="p-5 sticky top-0 z-10"
            style={{ background: 'var(--aq-card-bg)', borderBottom: '1px solid var(--aq-card-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold`}>
                  {candidate.avatar}
                </div>
                <div>
                  <p className="font-display font-bold" style={{ color: 'var(--aq-text-primary)' }}>{candidate.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                    {candidate.appliedRole} · {candidate.department}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="aq-btn-ghost !p-2"><X size={15} /></button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={status} />
              {candidate.employeeId && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'oklch(0.55 0.19 167 / 0.12)', color: 'oklch(0.55 0.19 167)' }}>
                  {candidate.employeeId}
                </span>
              )}
            </div>

            {/* Status flow bar */}
            <div className="mt-4">
              <StatusFlow status={status} />
            </div>
          </div>

          {/* Section tab bar */}
          <div className="px-5 pt-4">
            <div className="flex gap-1 p-1 rounded-xl aq-card">
              {sections.map(s => (
                <button key={s.id} onClick={() => setTab(s.id)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={tab === s.id
                    ? { background: `${cfg.color}18`, color: cfg.color }
                    : { color: 'var(--aq-text-muted)' }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <>
                <div className="aq-card p-4 space-y-0">
                  <InfoRow label="Email"       value={candidate.email} />
                  <InfoRow label="Phone"       value={candidate.phone} />
                  <InfoRow label="Applied For" value={candidate.appliedRole} />
                  <InfoRow label="Department"  value={candidate.department} />
                  <InfoRow label="Invited On"  value={candidate.invitedAt} />
                </div>

                {status === 'invited' && (
                  <div className="aq-card aq-bg-blue p-4">
                    <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--aq-text-primary)' }}>
                      📎 Onboarding Link
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-[9px] flex-1 truncate" style={{ color: 'var(--aq-text-muted)' }}>
                        portal.aquagrow.in/onboarding/{candidate.id}
                      </code>
                      <button className="aq-btn-ghost !py-1 !px-2"
                        onClick={() => { navigator.clipboard?.writeText(`portal.aquagrow.in/onboarding/${candidate.id}`); toast.success('Copied!'); }}>
                        <Copy size={11} />
                      </button>
                      <button className="aq-btn-ghost !py-1 !px-2"><Mail size={11} /></button>
                    </div>
                  </div>
                )}

                {actions && (
                  <div className="aq-card p-4">
                    <p className="aq-section-label mb-3">Actions</p>
                    {actions}
                  </div>
                )}
              </>
            )}

            {/* DETAILS */}
            {tab === 'details' && (
              candidate.details ? (
                <>
                  <div className="aq-card p-4">
                    <p className="aq-section-label mb-2">Personal Info</p>
                    <InfoRow label="Date of Birth"  value={candidate.details.dob} />
                    <InfoRow label="Gender"         value={candidate.details.gender} />
                    <InfoRow label="Address"        value={candidate.details.address} />
                    <InfoRow label="City"           value={candidate.details.city} />
                    <InfoRow label="State"          value={candidate.details.state} />
                    <InfoRow label="Pincode"        value={candidate.details.pincode} />
                    <InfoRow label="Alt. Phone"     value={candidate.details.alternatePhone} />
                  </div>
                  <div className="aq-card p-4">
                    <p className="aq-section-label mb-2">Professional Details</p>
                    <InfoRow label="Previous Co."  value={candidate.details.previousCompany} />
                    <InfoRow label="Experience"    value={candidate.details.experience} />
                    <InfoRow label="Skills"        value={candidate.details.skills} />
                    <InfoRow label="Current CTC"   value={candidate.details.currentCTC} />
                    <InfoRow label="Expected CTC"  value={candidate.details.expectedCTC} />
                    <InfoRow label="Notice Period" value={candidate.details.noticePeriod} />
                  </div>
                  <div className="aq-card p-4">
                    <p className="aq-section-label mb-2">Bank Details</p>
                    <InfoRow label="Account No."   value={candidate.details.bankAccount} />
                    <InfoRow label="IFSC"          value={candidate.details.ifsc} />
                    <InfoRow label="Bank"          value={candidate.details.bankName} />
                    <InfoRow label="Holder"        value={candidate.details.accountHolder} />
                  </div>
                </>
              ) : (
                <div className="aq-card aq-bg-amber p-8 text-center">
                  <p className="text-3xl mb-2">⏳</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>Awaiting Submission</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--aq-text-muted)' }}>
                    Candidate hasn't completed their onboarding form yet.
                  </p>
                </div>
              )
            )}

            {/* DOCUMENTS */}
            {tab === 'docs' && (
              candidate.documents && candidate.documents.length > 0 ? (
                <div className="space-y-3">
                  {candidate.documents.map((doc, i) => (
                    <div key={i} className="aq-card p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: 'oklch(0.55 0.19 167 / 0.1)' }}>
                        {doc.type === 'aadhaar' ? '🪪' : doc.type === 'pan' ? '💳' : doc.type === 'resume' ? '📄' : doc.type === 'photo' ? '📷' : '📎'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>{doc.name}</p>
                        <p className="text-[9px]" style={{ color: 'var(--aq-text-muted)' }}>Uploaded: {doc.uploadedAt}</p>
                      </div>
                      <button className="aq-btn-ghost !py-1.5 !px-2"><Eye size={12} /></button>
                      <button className="aq-btn-ghost !py-1.5 !px-2"><Download size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aq-card aq-bg-amber p-8 text-center">
                  <p className="text-3xl mb-2">📂</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>No Documents Yet</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--aq-text-muted)' }}>
                    Candidate hasn't uploaded documents.
                  </p>
                </div>
              )
            )}

            {/* TIMELINE */}
            {tab === 'timeline' && (
              <div className="aq-card p-4">
                <p className="aq-section-label mb-4">Application Timeline</p>
                <div className="space-y-0">
                  {timeline.map((event, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                          style={{ background: `${event.color}18`, border: `2px solid ${event.color}40` }}>
                          {event.emoji}
                        </div>
                        {i < timeline.length - 1 && (
                          <div className="w-px flex-1 my-1" style={{ background: 'var(--aq-card-border)' }} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-xs font-bold" style={{ color: 'var(--aq-text-primary)' }}>{event.label}</p>
                        <p className="text-[9px]" style={{ color: 'var(--aq-text-muted)' }}>{event.date}</p>
                        {event.note && (
                          <p className="text-[9px] mt-1 italic" style={{ color: 'var(--aq-text-muted)' }}>"{event.note}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const HiringPipeline: React.FC = () => {
  // ── Source of truth: shared HiringContext (fed by Recruitment page) ──────
  const {
    candidates,
    addCandidate,
    updateCandidate,
  } = useHiring();

  const [selected, setSelected] = useState<Candidate | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HiringStatus | 'all'>('all');
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');

  // ── Sync onboarding submissions from MongoDB → HiringContext ─────────────
  // Runs on mount and every 30s. When a candidate has submitted their
  // self-onboarding form (onboardingStatus === 'submitted') but is still
  // 'invited' in the local context, we promote them and populate their details.
  const syncFromBackend = useCallback(async () => {
    try {
      const apiCandidates: any[] = await hrmsApi.candidates.list();
      apiCandidates.forEach((apiC) => {
        const candidateId = apiC._id ?? apiC.id;
        const local = candidates.find(c => c.id === candidateId);
        if (!local) return;

        const apiHiringStatus: HiringStatus = apiC.hiringStatus ?? 'invited';
        const apiOnboardingStatus = apiC.onboardingStatus;

        // ── Sync hiringStatus: if DB is ahead of local context, promote ──────
        // This covers: HR Approve, Founder Approve, BGV, Hire (persisted to DB)
        const STATUS_ORDER: HiringStatus[] = ['invited','submitted','hr_approved','founder_approved','bgv_clear','hired','rejected'];
        const localIdx = STATUS_ORDER.indexOf(local.status);
        const apiIdx   = STATUS_ORDER.indexOf(apiHiringStatus);

        if (apiIdx > localIdx && apiHiringStatus !== 'invited') {
          // DB stage is ahead — sync it without overwriting onboarding details
          updateCandidate(local.id, apiHiringStatus, {});
          return; // Don't also run onboarding sync below for this candidate
        }

        // ── Sync onboarding submission: invited → submitted with details ─────
        if (apiOnboardingStatus !== 'submitted') return;
        if (local.status !== 'invited') return; // already promoted above or manually

        const od = apiC.onboardingData ?? {};
        const p  = od.personal ?? {};
        const ct = od.contact  ?? {};
        const pr = od.prof     ?? {};
        const bk = od.bank     ?? {};
        const dc = od.docs     ?? {};

        const details: Partial<Candidate['details']> = {
          dob:             p.dob            ?? '',
          gender:          p.gender         ?? '',
          address:         `${p.address ?? ''}, ${p.city ?? ''}, ${p.state ?? ''}`.replace(/^, |, $/g, ''),
          city:            p.city           ?? '',
          state:           p.state          ?? '',
          pincode:         p.pincode        ?? '',
          alternatePhone:  ct.altPhone      ?? '',
          previousCompany: pr.prevCompany   ?? '',
          experience:      pr.experience    ?? '',
          skills:          pr.skills        ?? '',
          currentCTC:      pr.currentCTC    ?? '',
          expectedCTC:     pr.expectedCTC   ?? '',
          noticePeriod:    pr.noticePeriod  ?? '',
          bankAccount:     bk.accountNo     ?? '',
          ifsc:            bk.ifsc          ?? '',
          bankName:        bk.bankName      ?? '',
          accountHolder:   bk.holder        ?? '',
        };

        const docTypes: { key: keyof typeof dc; type: 'aadhaar' | 'pan' | 'resume' | 'photo' | 'other'; name: string }[] = [
          { key: 'aadhaar',    type: 'aadhaar', name: 'Aadhaar Card'       },
          { key: 'pan',        type: 'pan',     name: 'PAN Card'           },
          { key: 'resume',     type: 'resume',  name: 'Resume / CV'        },
          { key: 'photo',      type: 'photo',   name: 'Passport Photo'     },
          { key: 'degree',     type: 'other',   name: 'Degree Certificate' },
          { key: 'experience', type: 'other',   name: 'Experience Letter'  },
        ];
        const documents = docTypes
          .filter(d => !!dc[d.key])
          .map(d => ({
            name: d.name, url: dc[d.key] as string, type: d.type,
            uploadedAt: od.submittedAt ? od.submittedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          }));

        updateCandidate(local.id, 'submitted', {
          details, documents,
          submittedAt: od.submittedAt ? od.submittedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          phone: local.phone || ct.phone || '',
          email: local.email || ct.personalEmail || '',
        });
      });
    } catch {
      // Silently fail — pipeline still works with local state
    }
  }, [candidates, updateCandidate]);


  // Run on mount and every 30 seconds
  useEffect(() => {
    syncFromBackend();
    const interval = setInterval(syncFromBackend, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => candidates.filter(c => {
    const ms = search === '' || c.name.toLowerCase().includes(search.toLowerCase())
      || c.appliedRole.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === 'all' || c.status === statusFilter;
    return ms && mf;
  }), [candidates, search, statusFilter]);

  const kpis = useMemo(() => ({
    total:    candidates.length,
    invited:  candidates.filter(c => c.status === 'invited').length,
    pending:  candidates.filter(c => c.status === 'submitted').length,
    bgv:      candidates.filter(c => ['founder_approved', 'bgv_clear'].includes(c.status)).length,
    hired:    candidates.filter(c => c.status === 'hired').length,
    rejected: candidates.filter(c => c.status === 'rejected').length,
  }), [candidates]);

  const handleAdd = (c: Candidate) => addCandidate(c);
  const handleStatusUpdate = async (id: string, status: HiringStatus, extras: Partial<Candidate> = {}) => {
    // Stamp today's date when hiring is confirmed
    const finalExtras = status === 'hired'
      ? { ...extras, hiredAt: new Date().toISOString().slice(0, 10) }
      : extras;

    // Update local context immediately (optimistic)
    updateCandidate(id, status, finalExtras);
    setSelected(p => p?.id === id ? { ...p!, status, ...finalExtras } : p);

    // Persist hiringStatus to MongoDB so it survives refreshes / cross-session
    try {
      await hrmsApi.candidates.update(id, { hiringStatus: status });
    } catch {
      // Non-fatal — context is already updated; silently fail
    }

    // Notify on key milestones
    if (status === 'hired') {
      const name = candidates.find(c => c.id === id)?.name ?? 'Candidate';
      const empId = finalExtras.employeeId ?? extras.employeeId;
      toast.success(
        `🎉 ${name} is now an Employee!${empId ? ` · ${empId}` : ''}`,
        { description: 'Auto-added to the Employee Directory.' }
      );
    }
  };

  const selIdx = selected ? candidates.findIndex(c => c.id === selected.id) : 0;

  return (
    <div className="space-y-5 pb-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
            Hiring Pipeline
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--aq-text-muted)' }}>
            Invite → Submit → HR Review → Founder → BGV → Hire
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl aq-card">
            {(['pipeline', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={view === v
                  ? { background: 'oklch(0.55 0.19 167 / 0.15)', color: 'oklch(0.55 0.19 167)' }
                  : { color: 'var(--aq-text-muted)' }}>
                {v === 'pipeline' ? '⚡ Pipeline' : '📋 List'}
              </button>
            ))}
          </div>
          {/* Candidates enter via Recruitment → Offer Accepted → Auto-added here */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-semibold"
            style={{ background: 'oklch(0.55 0.19 167 / 0.08)', color: 'var(--aq-text-muted)', border: '1px solid oklch(0.55 0.19 167 / 0.15)' }}>
            📥 Candidates arrive from Recruitment
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Total',    value: kpis.total,    emoji: '👥', color: 'oklch(0.58 0.18 240)' },
          { label: 'Invited',  value: kpis.invited,  emoji: '📧', color: 'oklch(0.58 0.18 240)' },
          { label: 'Review',   value: kpis.pending,  emoji: '📝', color: 'oklch(0.70 0.18 80)'  },
          { label: 'BGV',      value: kpis.bgv,      emoji: '🔍', color: 'oklch(0.60 0.20 295)' },
          { label: 'Hired',    value: kpis.hired,    emoji: '🏆', color: 'oklch(0.55 0.19 167)' },
          { label: 'Rejected', value: kpis.rejected, emoji: '❌', color: 'oklch(0.62 0.22 25)'  },
        ].map((k, i) => (
          <motion.div key={k.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }} className="aq-kpi-card">
            <span className="aq-kpi-icon">{k.emoji}</span>
            <span className="aq-kpi-number" style={{ color: k.color }}>{k.value}</span>
            <span className="aq-kpi-label">{k.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="aq-card p-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search size={13} style={{ color: 'var(--aq-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or role…"
            className="bg-transparent text-sm outline-none flex-1"
            style={{ color: 'var(--aq-text-primary)' }} />
        </div>
        <select value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as HiringStatus | 'all')}
          className="aq-input !py-1.5 !text-xs !w-auto">
          <option value="all">All Statuses</option>
          {(Object.entries(STATUS_CONFIG) as [HiringStatus, typeof STATUS_CONFIG[HiringStatus]][])
            .map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
      </div>

      {/* PIPELINE VIEW */}
      {view === 'pipeline' && (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex gap-3" style={{ minWidth: `${(PIPELINE_STAGES.length + 1) * 220}px` }}>
            {[...PIPELINE_STAGES, 'rejected' as HiringStatus].map(stage => {
              const cfg = STATUS_CONFIG[stage];
              const stageCands = filtered.filter(c => c.status === stage);
              return (
                <div key={stage} className="w-52 shrink-0">
                  <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {stageCands.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {stageCands.length === 0 && (
                      <div className="aq-card p-3 text-center border-dashed"
                        style={{ borderColor: `${cfg.color}30`, borderStyle: 'dashed' }}>
                        <p className="text-[9px]" style={{ color: 'var(--aq-text-faint)' }}>Empty</p>
                      </div>
                    )}
                    {stageCands.map(c => {
                      const realIdx = candidates.findIndex(x => x.id === c.id);
                      return (
                        <motion.div key={c.id} layout whileHover={{ y: -2, scale: 1.015 }}
                          onClick={() => setSelected(c)}
                          className="aq-card p-3 cursor-pointer"
                          style={{ borderLeft: `3px solid ${cfg.color}`, opacity: stage === 'rejected' ? 0.6 : 1 }}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-7 h-7 rounded-lg ${AVATAR_COLORS[realIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                              {c.avatar}
                            </div>
                            <p className="text-xs font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>
                              {c.name}
                            </p>
                          </div>
                          <p className="text-[9px]" style={{ color: 'var(--aq-text-muted)' }}>{c.appliedRole}</p>
                          {c.submittedAt && (
                            <p className="text-[8px] mt-1" style={{ color: 'var(--aq-text-faint)' }}>
                              {c.submittedAt}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="aq-card overflow-hidden">
          {filtered.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>No candidates found</p>
            </div>
          )}
          <div className="divide-y" style={{ borderColor: 'var(--aq-card-border)' }}>
            {filtered.map((c, i) => {
              const realIdx = candidates.findIndex(x => x.id === c.id);
              return (
                <motion.div key={c.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(c)}
                  className="p-4 flex items-center gap-4 cursor-pointer group transition-colors"
                  style={{ ':hover': { background: 'var(--aq-ghost-bg)' } } as React.CSSProperties}>
                  <div className={`w-9 h-9 rounded-xl ${AVATAR_COLORS[realIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--aq-text-primary)' }}>{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                      {c.appliedRole} · {c.email}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <StatusPill status={c.status} />
                    <span className="text-[10px]" style={{ color: 'var(--aq-text-faint)' }}>
                      {c.invitedAt}
                    </span>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--aq-text-faint)' }}
                    className="group-hover:translate-x-1 transition-transform" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {selected && (
        <CandidatePanel
          candidate={selected}
          idx={selIdx}
          onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

export default HiringPipeline;
