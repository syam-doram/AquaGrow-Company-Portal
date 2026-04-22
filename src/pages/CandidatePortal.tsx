import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, CheckCircle, Upload, Waves,
  User, Phone, Briefcase, CreditCard, FileText, Shield, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────
interface FormData {
  // Section 1 — Personal
  fullName: string; dob: string; gender: string;
  address: string; city: string; state: string; pincode: string;
  // Section 2 — Contact
  phone: string; alternatePhone: string;
  // Section 3 — Professional
  previousCompany: string; experience: string; skills: string;
  currentCTC: string; expectedCTC: string; noticePeriod: string;
  // Section 4 — Bank
  bankAccount: string; confirmAccount: string; ifsc: string;
  bankName: string; accountHolder: string;
  // Section 5 — Documents (simulated file names)
  aadhaar: string; pan: string; resume: string; photo: string;
  // Section 6 — Declaration
  declared: boolean;
}

const BLANK: FormData = {
  fullName: '', dob: '', gender: 'Male',
  address: '', city: '', state: '', pincode: '',
  phone: '', alternatePhone: '',
  previousCompany: '', experience: '', skills: '',
  currentCTC: '', expectedCTC: '', noticePeriod: '',
  bankAccount: '', confirmAccount: '', ifsc: '', bankName: '', accountHolder: '',
  aadhaar: '', pan: '', resume: '', photo: '',
  declared: false,
};

interface StepConfig {
  id: number; title: string; subtitle: string; emoji: string; color: string;
}

const STEPS: StepConfig[] = [
  { id: 1, title: 'Personal Details',  subtitle: 'Your identity information',    emoji: '👤', color: 'oklch(0.58 0.18 240)' },
  { id: 2, title: 'Contact Info',      subtitle: 'How we reach you',             emoji: '📞', color: 'oklch(0.55 0.17 187)' },
  { id: 3, title: 'Professional',      subtitle: 'Work history & skills',        emoji: '💼', color: 'oklch(0.60 0.20 295)' },
  { id: 4, title: 'Bank Details',      subtitle: 'For salary & reimbursements',  emoji: '💳', color: 'oklch(0.70 0.18 80)'  },
  { id: 5, title: 'Documents',         subtitle: 'Upload required files',        emoji: '📎', color: 'oklch(0.75 0.16 25)'  },
  { id: 6, title: 'Declaration',       subtitle: 'Review & confirm',             emoji: '✅', color: 'oklch(0.55 0.19 167)' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const Inp = ({
  label, value, onChange, type = 'text', placeholder = '', required = false, hint = '',
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; hint?: string;
}) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5"
      style={{ color: 'var(--aq-text-muted)' }}>
      {label}{required && <span style={{ color: 'oklch(0.62 0.22 25)' }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="aq-input"
    />
    {hint && <p className="text-[9px] mt-1" style={{ color: 'var(--aq-text-faint)' }}>{hint}</p>}
  </div>
);

const Sel = ({
  label, value, onChange, options, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5"
      style={{ color: 'var(--aq-text-muted)' }}>
      {label}{required && <span style={{ color: 'oklch(0.62 0.22 25)' }}> *</span>}
    </label>
    <select value={value} onChange={e => onChange(e.target.value)} required={required} className="aq-input">
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

// Simulated file upload button
const FileUpload = ({
  label, value, onChange, accept, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  accept?: string; hint?: string;
}) => {
  const handleClick = () => {
    // In production, this opens a real file picker connected to storage API
    const fakeName = `${label.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    onChange(fakeName);
    toast.success(`📎 ${fakeName} uploaded`);
  };

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5"
        style={{ color: 'var(--aq-text-muted)' }}>
        {label} <span style={{ color: 'oklch(0.62 0.22 25)' }}>*</span>
      </label>
      {value ? (
        <div className="aq-card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'oklch(0.55 0.19 167 / 0.12)' }}>
            <FileText size={14} style={{ color: 'oklch(0.55 0.19 167)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>{value}</p>
            <p className="text-[9px]" style={{ color: 'oklch(0.55 0.19 167)' }}>✓ Uploaded</p>
          </div>
          <button type="button" onClick={() => onChange('')}
            className="text-[9px] font-bold" style={{ color: 'oklch(0.62 0.22 25)' }}>
            Remove
          </button>
        </div>
      ) : (
        <button type="button" onClick={handleClick}
          className="w-full p-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-colors hover:border-current"
          style={{ borderColor: 'var(--aq-card-border)', color: 'var(--aq-text-muted)' }}>
          <Upload size={20} />
          <span className="text-xs font-bold">Click to Upload</span>
          <span className="text-[9px]">{hint ?? 'PDF, JPG or PNG · Max 5MB'}</span>
        </button>
      )}
    </div>
  );
};

// ── OTP Login Step ─────────────────────────────────────────────────────────────
const OTPLogin = ({ onSuccess, candidateName }: { onSuccess: (name: string, role: string) => void; candidateName?: string }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'email' | 'otp'>('email');
  const [sending, setSending] = useState(false);
  const [showOTP, setShowOTP] = useState(false);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    setStage('otp');
    toast.success('OTP sent! Check your email. (Demo OTP: 123456)');
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '123456') {
      toast.error('Invalid OTP. Use 123456 for demo.');
      return;
    }
    setSending(true);
    await new Promise(r => setTimeout(r, 600));
    setSending(false);
    onSuccess('Arjun Mehta', 'Backend Developer');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--aq-bg)' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
            <Waves size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-display font-black" style={{ color: 'var(--aq-text-primary)' }}>
            AquaGrow HRMS
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--aq-text-muted)' }}>
            Candidate Onboarding Portal
          </p>
        </div>

        <div className="aq-card p-6">
          {stage === 'email' ? (
            <>
              <div className="mb-5">
                <h2 className="font-display font-bold text-base" style={{ color: 'var(--aq-text-primary)' }}>
                  Verify Your Email
                </h2>
                <p className="text-[10px] mt-1" style={{ color: 'var(--aq-text-muted)' }}>
                  Enter the email where you received your invitation from AquaGrow.
                </p>
              </div>
              <form onSubmit={sendOTP} className="space-y-4">
                <div>
                  <label className="aq-section-label mb-1.5">Personal Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com" required className="aq-input font-mono" />
                </div>
                <button type="submit" disabled={sending} className="w-full aq-btn-primary !py-3">
                  {sending
                    ? <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Sending OTP…
                    </span>
                    : '📧 Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="font-display font-bold text-base" style={{ color: 'var(--aq-text-primary)' }}>
                  Enter OTP
                </h2>
                <p className="text-[10px] mt-1" style={{ color: 'var(--aq-text-muted)' }}>
                  A 6-digit code was sent to <strong>{email}</strong>
                </p>
                <div className="mt-2 p-2 rounded-lg"
                  style={{ background: 'oklch(0.70 0.18 80 / 0.1)', border: '1px solid oklch(0.70 0.18 80 / 0.2)' }}>
                  <p className="text-[9px]" style={{ color: 'oklch(0.70 0.18 80)' }}>
                    🧪 Demo mode — use OTP: <strong>123456</strong>
                  </p>
                </div>
              </div>
              <form onSubmit={verifyOTP} className="space-y-4">
                <div className="relative">
                  <label className="aq-section-label mb-1.5">6-Digit OTP</label>
                  <input type={showOTP ? 'text' : 'password'} value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="• • • • • •" maxLength={6} required className="aq-input font-mono tracking-[0.5em] text-center !text-lg pr-10" />
                  <button type="button" onClick={() => setShowOTP(s => !s)}
                    className="absolute right-3 top-8 text-xs" style={{ color: 'var(--aq-text-muted)' }}>
                    {showOTP ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button type="submit" disabled={sending} className="w-full aq-btn-primary !py-3">
                  {sending
                    ? <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Verifying…
                    </span>
                    : '🔓 Verify & Continue'}
                </button>
                <button type="button" onClick={() => setStage('email')}
                  className="w-full text-[10px] text-center" style={{ color: 'var(--aq-text-muted)' }}>
                  ← Change email
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[9px] mt-4" style={{ color: 'var(--aq-text-faint)' }}>
          AquaGrow Technologies Pvt. Ltd. · Internal use only
        </p>
      </motion.div>
    </div>
  );
};

// ── Progress Indicator ─────────────────────────────────────────────────────────
const StepProgress = ({ step, total }: { step: number; total: number }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="h-1.5 rounded-full flex-1 transition-all duration-500"
        style={{
          background: i < step
            ? 'oklch(0.55 0.19 167)'
            : i === step - 1
              ? 'oklch(0.72 0.19 167)'
              : 'var(--aq-ghost-bg)',
        }} />
    ))}
  </div>
);

// ── Summary Review ─────────────────────────────────────────────────────────────
const SummaryItem = ({ label, value }: { label: string; value: string }) =>
  value ? (
    <div className="flex justify-between py-1.5"
      style={{ borderBottom: '1px solid var(--aq-card-border)' }}>
      <span className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>{label}</span>
      <span className="text-[10px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>{value}</span>
    </div>
  ) : null;

// ── Success Screen ─────────────────────────────────────────────────────────────
const SuccessScreen = ({ name, role }: { name: string; role: string }) => (
  <div className="min-h-screen flex items-center justify-center p-4"
    style={{ background: 'var(--aq-bg)' }}>
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      className="w-full max-w-sm text-center">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'oklch(0.55 0.19 167)' }}>
        <span className="text-4xl">🎉</span>
      </motion.div>

      <h2 className="text-2xl font-display font-black mb-2" style={{ color: 'var(--aq-text-primary)' }}>
        Submitted!
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--aq-text-muted)' }}>
        Thank you <strong>{name}</strong>! Your onboarding form for <strong>{role}</strong> has been submitted successfully.
      </p>

      <div className="aq-card p-5 text-left space-y-3 mb-6">
        <p className="text-xs font-bold" style={{ color: 'var(--aq-text-primary)' }}>What happens next?</p>
        {[
          { emoji: '✅', step: 'HR team reviews your application (1–2 days)' },
          { emoji: '⭐', step: 'Founder gives final approval' },
          { emoji: '🔍', step: 'Background verification is conducted' },
          { emoji: '🏆', step: 'Offer letter & Employee ID issued' },
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-base shrink-0">{s.emoji}</span>
            <p className="text-[11px]" style={{ color: 'var(--aq-text-muted)' }}>{s.step}</p>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-xl text-center"
        style={{ background: 'oklch(0.55 0.19 167 / 0.08)', border: '1px solid oklch(0.55 0.19 167 / 0.2)' }}>
        <p className="text-[10px]" style={{ color: 'oklch(0.55 0.19 167)' }}>
          📧 HR will contact you at your registered email.<br />
          Keep your phone reachable: <strong>+91-XXXXX-XXXXX</strong>
        </p>
      </div>
    </motion.div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const CandidatePortal: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(BLANK);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const goNext = () => { setDirection(1); setStep(s => Math.min(s + 1, 6)); };
  const goPrev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    if (!form.declared) { toast.error('Please accept the declaration'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
    toast.success('🎉 Onboarding form submitted!');
  };

  // Not logged in yet
  if (!loggedIn) {
    return (
      <OTPLogin
        onSuccess={(name, role) => {
          setCandidateName(name);
          setCandidateRole(role);
          setLoggedIn(true);
        }}
      />
    );
  }

  if (submitted) return <SuccessScreen name={candidateName} role={candidateRole} />;

  const currentStep = STEPS[step - 1];
  const pct = Math.round(((step - 1) / STEPS.length) * 100);

  const variants = {
    enter: (d: number) => ({ x: d * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d * -60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--aq-bg)' }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-20 px-4 py-3"
        style={{ background: 'var(--aq-card-bg)', borderBottom: '1px solid var(--aq-card-border)' }}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'oklch(0.72 0.19 167)' }}>
                <Waves size={14} className="text-white" />
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                Candidate Onboarding
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'oklch(0.55 0.19 167 / 0.12)', color: 'oklch(0.55 0.19 167)' }}>
                {candidateRole}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
                Step {step}/{STEPS.length}
              </span>
            </div>
          </div>
          <StepProgress step={step} total={STEPS.length} />
        </div>
      </div>

      {/* Step Icons Row */}
      <div className="sticky top-[57px] z-10 bg-[var(--aq-card-bg)] border-b"
        style={{ borderColor: 'var(--aq-card-border)' }}>
        <div className="max-w-xl mx-auto px-4 py-2">
          <div className="flex gap-1">
            {STEPS.map(s => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => s.id < step && setStep(s.id)}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all"
                    style={{
                      background: done ? 'oklch(0.55 0.19 167)' : active ? s.color : 'var(--aq-ghost-bg)',
                      color: done || active ? '#fff' : 'var(--aq-text-faint)',
                      transform: active ? 'scale(1.15)' : 'scale(1)',
                    }}>
                    {done ? '✓' : s.emoji}
                  </div>
                  <span className="text-[7px] text-center leading-none hidden sm:block"
                    style={{ color: active ? s.color : 'var(--aq-text-faint)' }}>
                    {s.title.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Step Header */}
        <motion.div
          key={`header-${step}`}
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: `${currentStep.color}18` }}>
              {currentStep.emoji}
            </div>
            <div>
              <h2 className="font-display font-bold text-base" style={{ color: 'var(--aq-text-primary)' }}>
                {currentStep.title}
              </h2>
              <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>{currentStep.subtitle}</p>
            </div>
          </div>
          <div className="h-0.5 rounded-full" style={{ background: `${currentStep.color}30` }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: currentStep.color }} />
          </div>
        </motion.div>

        {/* Animated step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={step} custom={direction}
            variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}>

            <div className="aq-card p-5 space-y-4">

              {/* STEP 1: Personal */}
              {step === 1 && (
                <>
                  <Inp label="Full Name" value={form.fullName} onChange={v => set('fullName', v)}
                    required placeholder="As per Aadhaar card" />
                  <div className="grid grid-cols-2 gap-4">
                    <Inp label="Date of Birth" value={form.dob} onChange={v => set('dob', v)}
                      type="date" required />
                    <Sel label="Gender" value={form.gender} onChange={v => set('gender', v)}
                      options={['Male', 'Female', 'Non-binary', 'Prefer not to say']} required />
                  </div>
                  <Inp label="Current Address" value={form.address} onChange={v => set('address', v)}
                    required placeholder="Door no., Street, Colony" />
                  <div className="grid grid-cols-3 gap-3">
                    <Inp label="City" value={form.city} onChange={v => set('city', v)} required placeholder="Nellore" />
                    <Inp label="State" value={form.state} onChange={v => set('state', v)} required placeholder="Andhra Pradesh" />
                    <Inp label="Pincode" value={form.pincode} onChange={v => set('pincode', v)} required placeholder="524001" />
                  </div>
                </>
              )}

              {/* STEP 2: Contact */}
              {step === 2 && (
                <>
                  <Inp label="Primary Phone" value={form.phone} onChange={v => set('phone', v)}
                    type="tel" required placeholder="+91 XXXXX XXXXX"
                    hint="This will be your primary contact number in the system" />
                  <Inp label="Alternate Phone" value={form.alternatePhone} onChange={v => set('alternatePhone', v)}
                    type="tel" placeholder="+91 XXXXX XXXXX (optional)"
                    hint="Family member or emergency contact" />
                  <div className="p-3 rounded-xl"
                    style={{ background: 'oklch(0.55 0.17 187 / 0.08)', border: '1px solid oklch(0.55 0.17 187 / 0.2)' }}>
                    <p className="text-[10px]" style={{ color: 'oklch(0.55 0.17 187)' }}>
                      📞 Your personal email on record: <strong style={{ color: 'var(--aq-text-primary)' }}>arjun.m@gmail.com</strong>
                    </p>
                  </div>
                </>
              )}

              {/* STEP 3: Professional */}
              {step === 3 && (
                <>
                  <Inp label="Previous Company" value={form.previousCompany} onChange={v => set('previousCompany', v)}
                    placeholder="e.g. Infosys Ltd (leave blank if fresher)" />
                  <div className="grid grid-cols-2 gap-4">
                    <Sel label="Total Experience" value={form.experience} onChange={v => set('experience', v)}
                      options={['Fresher', '< 1 year', '1 year', '2 years', '3 years', '4 years', '5+ years', '7+ years', '10+ years']}
                      required />
                    <Sel label="Notice Period" value={form.noticePeriod} onChange={v => set('noticePeriod', v)}
                      options={['Immediate', '15 days', '30 days', '45 days', '60 days', '90 days']}
                      required />
                  </div>
                  <div>
                    <label className="aq-section-label mb-1.5">Key Skills *</label>
                    <textarea value={form.skills} onChange={e => set('skills', e.target.value)}
                      placeholder="e.g. Node.js, React, MongoDB, AWS…"
                      rows={3} required className="aq-input !h-auto resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Inp label="Current CTC" value={form.currentCTC} onChange={v => set('currentCTC', v)}
                      placeholder="e.g. 8 LPA" />
                    <Inp label="Expected CTC" value={form.expectedCTC} onChange={v => set('expectedCTC', v)}
                      required placeholder="e.g. 13 LPA" />
                  </div>
                </>
              )}

              {/* STEP 4: Bank */}
              {step === 4 && (
                <>
                  <div className="p-3 rounded-xl"
                    style={{ background: 'oklch(0.62 0.22 25 / 0.06)', border: '1px solid oklch(0.62 0.22 25 / 0.2)' }}>
                    <p className="text-[10px]" style={{ color: 'oklch(0.62 0.22 25)' }}>
                      🔒 Bank details are encrypted and only used for salary and reimbursement purposes.
                    </p>
                  </div>
                  <Inp label="Account Holder Name" value={form.accountHolder} onChange={v => set('accountHolder', v)}
                    required placeholder="As per bank records" />
                  <Inp label="Account Number" value={form.bankAccount} onChange={v => set('bankAccount', v)}
                    required placeholder="Enter account number" />
                  <Inp label="Confirm Account Number" value={form.confirmAccount} onChange={v => set('confirmAccount', v)}
                    required placeholder="Re-enter to confirm" />
                  {form.bankAccount && form.confirmAccount && form.bankAccount !== form.confirmAccount && (
                    <p className="text-[10px]" style={{ color: 'oklch(0.62 0.22 25)' }}>
                      ⚠️ Account numbers do not match
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Inp label="IFSC Code" value={form.ifsc} onChange={v => set('ifsc', v.toUpperCase())}
                      required placeholder="HDFC0001234" />
                    <Inp label="Bank Name" value={form.bankName} onChange={v => set('bankName', v)}
                      required placeholder="HDFC Bank" />
                  </div>
                </>
              )}

              {/* STEP 5: Documents */}
              {step === 5 && (
                <>
                  <div className="p-3 rounded-xl mb-2"
                    style={{ background: 'oklch(0.58 0.18 240 / 0.08)', border: '1px solid oklch(0.58 0.18 240 / 0.2)' }}>
                    <p className="text-[10px]" style={{ color: 'oklch(0.58 0.18 240)' }}>
                      📎 Upload clear, legible copies. All files must be under 5MB. PDF preferred.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileUpload label="Aadhaar Card" value={form.aadhaar} onChange={v => set('aadhaar', v)}
                      hint="Both sides scanned as PDF" />
                    <FileUpload label="PAN Card" value={form.pan} onChange={v => set('pan', v)}
                      hint="Clear photo or scanned copy" />
                    <FileUpload label="Resume / CV" value={form.resume} onChange={v => set('resume', v)}
                      hint="Updated PDF, max 2MB" />
                    <FileUpload label="Passport Photo" value={form.photo} onChange={v => set('photo', v)}
                      hint="White background, JPG/PNG" />
                  </div>
                </>
              )}

              {/* STEP 6: Declaration */}
              {step === 6 && (
                <>
                  <div className="aq-card aq-bg-green p-4">
                    <p className="text-sm font-bold mb-3" style={{ color: 'var(--aq-text-primary)' }}>
                      📋 Review Summary
                    </p>
                    <div className="space-y-0 text-[10px]">
                      <SummaryItem label="Full Name"          value={form.fullName} />
                      <SummaryItem label="Date of Birth"      value={form.dob} />
                      <SummaryItem label="Gender"             value={form.gender} />
                      <SummaryItem label="City / State"       value={`${form.city}, ${form.state}`} />
                      <SummaryItem label="Primary Phone"      value={form.phone} />
                      <SummaryItem label="Previous Company"   value={form.previousCompany || 'Fresher'} />
                      <SummaryItem label="Experience"         value={form.experience} />
                      <SummaryItem label="Expected CTC"       value={form.expectedCTC} />
                      <SummaryItem label="Notice Period"      value={form.noticePeriod} />
                      <SummaryItem label="Bank"               value={form.bankName} />
                      <SummaryItem label="IFSC"               value={form.ifsc} />
                      <SummaryItem label="Aadhaar"            value={form.aadhaar ? '✅ Uploaded' : '❌ Missing'} />
                      <SummaryItem label="PAN"                value={form.pan ? '✅ Uploaded' : '❌ Missing'} />
                      <SummaryItem label="Resume"             value={form.resume ? '✅ Uploaded' : '❌ Missing'} />
                      <SummaryItem label="Photo"              value={form.photo ? '✅ Uploaded' : '❌ Missing'} />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl"
                    style={{ background: 'var(--aq-ghost-bg)', border: '1px solid var(--aq-card-border)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'var(--aq-text-primary)' }}>
                      Declaration
                    </p>
                    <p className="text-[10px] leading-relaxed mb-3" style={{ color: 'var(--aq-text-muted)' }}>
                      I, <strong>{form.fullName || '[Your Name]'}</strong>, hereby confirm that all the information
                      provided above is true and accurate to the best of my knowledge. I understand that any
                      false information may lead to immediate termination of employment and legal proceedings.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.declared}
                        onChange={e => set('declared', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-emerald-500" />
                      <span className="text-[10px] font-bold" style={{ color: 'var(--aq-text-primary)' }}>
                        I confirm that all details provided are correct and I agree to the above declaration.
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-5">
          {step > 1 && (
            <button onClick={goPrev} className="aq-btn-ghost flex items-center gap-2">
              <ArrowLeft size={14} /> Back
            </button>
          )}

          <div className="flex-1" />

          {step < 6 && (
            <button onClick={goNext} className="aq-btn-primary flex items-center gap-2">
              Next <ArrowRight size={14} />
            </button>
          )}

          {step === 6 && (
            <button onClick={handleSubmit} disabled={!form.declared || submitting}
              className="aq-btn-primary flex items-center gap-2 !px-8"
              style={{ opacity: !form.declared ? 0.5 : 1 }}>
              {submitting
                ? <><span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Submitting…</>
                : <><CheckCircle size={14} /> Submit Application</>}
            </button>
          )}
        </div>

        {/* Save note */}
        <p className="text-center text-[9px] mt-4" style={{ color: 'var(--aq-text-faint)' }}>
          💾 Your progress is saved automatically. You can return later.
        </p>
      </div>
    </div>
  );
};

export default CandidatePortal;
