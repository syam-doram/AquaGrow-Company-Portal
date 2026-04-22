import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Upload, Waves, User, Phone, Briefcase, CreditCard, FileText, ChevronRight, ChevronLeft, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

const BASE = 'https://aquagrow.onrender.com/api/hrms';

// ── Privileged fetch (same logic as api.ts) ────────────────────────────────
let _tok: string | null = null;
async function getPrivToken() {
  if (_tok) return _tok;
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empId: 'AQ-SA001', password: 'Admin@123' }),
  });
  const d = await r.json();
  _tok = d.token ?? '';
  setTimeout(() => { _tok = null; }, 50 * 60 * 1000);
  return _tok!;
}
async function privFetch(path: string, opts: RequestInit = {}) {
  const tok = await getPrivToken();
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}`, ...opts.headers },
  });
  if (!r.ok) throw new Error(`${r.status}`);
  if (r.status === 204) return undefined;
  return r.json();
}

// ── File → base64 ─────────────────────────────────────────────────────────
function fileToB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ── Steps ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Personal',    icon: User,      color: 'oklch(0.58 0.18 240)' },
  { id: 2, title: 'Contact',     icon: Phone,     color: 'oklch(0.55 0.17 187)' },
  { id: 3, title: 'Professional',icon: Briefcase, color: 'oklch(0.60 0.20 295)' },
  { id: 4, title: 'Bank',        icon: CreditCard,color: 'oklch(0.70 0.18 80)'  },
  { id: 5, title: 'Documents',   icon: Upload,    color: 'oklch(0.72 0.19 167)' },
  { id: 6, title: 'Submit',      icon: CheckCircle,color:'oklch(0.55 0.19 167)' },
];

interface Docs { aadhaar?: string; pan?: string; resume?: string; photo?: string; degree?: string; experience?: string; }

// ── Field helper ──────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', placeholder = '', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) => (
  <div>
    <label className="block text-xs font-semibold mb-1" style={{ color: 'oklch(0.45 0.02 210)' }}>
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
      style={{ background: 'var(--aq-stat-bg)', border: '1px solid var(--aq-glass-border)', color: 'var(--aq-text-primary)' }} />
  </div>
);

const UploadBox = ({ label, name, docs, onUpload }: {
  label: string; name: keyof Docs; docs: Docs; onUpload: (name: keyof Docs, file: File) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const done = !!docs[name];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:shadow-sm"
      style={{ background: done ? 'oklch(0.55 0.19 167 / 0.06)' : 'var(--aq-stat-bg)', border: `1px solid ${done ? 'oklch(0.55 0.19 167 / 0.3)' : 'var(--aq-glass-border)'}` }}
      onClick={() => ref.current?.click()}>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={e => { if (e.target.files?.[0]) onUpload(name, e.target.files[0]); }} />
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: done ? 'oklch(0.55 0.19 167 / 0.15)' : 'var(--aq-ghost-bg)' }}>
        {done ? <CheckCircle size={14} style={{ color: 'oklch(0.55 0.19 167)' }} />
               : <Upload size={14} style={{ color: 'var(--aq-text-muted)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--aq-text-primary)' }}>{label}</p>
        <p className="text-[10px]" style={{ color: done ? 'oklch(0.55 0.19 167)' : 'var(--aq-text-faint)' }}>
          {done ? '✓ Uploaded' : 'Click to upload PDF / JPG / PNG'}
        </p>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
interface Props { candidateId?: string; }

const CandidatePortal: React.FC<Props> = ({ candidateId }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!candidateId);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [error, setError] = useState('');

  // Form state
  const [personal, setPersonal] = useState({ fullName: '', dob: '', gender: 'Male', fatherName: '', address: '', city: '', state: '', pincode: '' });
  const [contact, setContact]   = useState({ phone: '', altPhone: '', personalEmail: '', emergencyName: '', emergencyRel: '', emergencyPhone: '' });
  const [prof, setProf]         = useState({ prevCompany: '', experience: '', skills: '', currentCTC: '', expectedCTC: '', noticePeriod: '' });
  const [bank, setBank]         = useState({ bankName: '', accountNo: '', confirmNo: '', ifsc: '', holder: '' });
  const [docs, setDocs]         = useState<Docs>({});
  const [declared, setDeclared] = useState(false);

  // Fetch candidate on load
  // NOTE: The backend does not expose GET /candidates/:id.
  // We fetch the full list and find the candidate by _id client-side.
  useEffect(() => {
    if (!candidateId) return;
    (async () => {
      try {
        const list: any[] = await privFetch('/candidates');
        const data = list.find(
          (c: any) => c._id === candidateId || c.id === candidateId
        );
        if (!data) throw new Error('not_found');
        setCandidate(data);
        setPersonal(p => ({ ...p, fullName: data.name ?? '' }));
        setContact(c => ({ ...c, phone: data.phone ?? '', personalEmail: data.email ?? '' }));
      } catch {
        setError('This onboarding link is invalid or has expired. Please contact HR.');
      } finally { setLoading(false); }
    })();
  }, [candidateId]);

  const handleUpload = async (name: keyof Docs, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return; }
    const b64 = await fileToB64(file);
    setDocs(d => ({ ...d, [name]: b64 }));
    toast.success(`${name} uploaded ✓`);
  };

  const handleSubmit = async () => {
    if (!declared) { toast.error('Please accept the declaration'); return; }
    if (bank.accountNo !== bank.confirmNo) { toast.error('Account numbers do not match'); return; }
    setSaving(true);
    try {
      const payload = { onboardingData: { personal, contact, prof, bank, docs, submittedAt: new Date().toISOString() }, onboardingStatus: 'submitted' };
      if (candidateId) {
        await privFetch(`/candidates/${candidateId}`, { method: 'PUT', body: JSON.stringify(payload) });
      }
      setDone(true);
    } catch { toast.error('Failed to submit. Please try again.'); }
    finally { setSaving(false); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="flex flex-col items-center gap-3">
        <Loader size={32} className="animate-spin" style={{ color: 'oklch(0.60 0.17 167)' }} />
        <p className="text-sm" style={{ color: 'var(--aq-text-muted)' }}>Loading your onboarding form…</p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="max-w-sm text-center">
        <AlertCircle size={40} className="mx-auto mb-3" style={{ color: 'oklch(0.62 0.22 25)' }} />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--aq-text-primary)' }}>Invalid Link</h2>
        <p className="text-sm" style={{ color: 'var(--aq-text-muted)' }}>{error}</p>
      </div>
    </div>
  );

  // ── Done ──────────────────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'oklch(0.55 0.19 167 / 0.12)', border: '2px solid oklch(0.55 0.19 167 / 0.4)' }}>
          <CheckCircle size={36} style={{ color: 'oklch(0.55 0.19 167)' }} />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--aq-text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
          Onboarding Complete! 🎉
        </h2>
        <p className="text-sm mb-1" style={{ color: 'var(--aq-text-secondary)' }}>
          Welcome to <strong>AquaGrow Technologies</strong>, {personal.fullName || candidate?.name}!
        </p>
        <p className="text-xs" style={{ color: 'var(--aq-text-muted)' }}>
          Your details have been submitted. HR will review and contact you soon.
        </p>
      </motion.div>
    </div>
  );

  const cur = STEPS[step - 1];

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: 'var(--card)', borderBottom: '1px solid var(--aq-glass-border)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'oklch(0.60 0.17 167)' }}>
          <Waves size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>AquaGrow Onboarding</p>
          {candidate && <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>{candidate.name} · {candidate.jobRole}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Step progress */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done2 = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ background: done2 ? 'oklch(0.55 0.19 167)' : active ? s.color : 'var(--aq-ghost-bg)', border: `2px solid ${active ? s.color : done2 ? 'oklch(0.55 0.19 167)' : 'var(--aq-glass-border)'}` }}>
                    {done2 ? <CheckCircle size={12} className="text-white" /> : <Icon size={11} style={{ color: active ? '#fff' : 'var(--aq-text-faint)' }} />}
                  </div>
                  <span className="text-[8px] font-bold text-center hidden sm:block" style={{ color: active ? s.color : 'var(--aq-text-faint)' }}>{s.title}</span>
                </div>
                {i < STEPS.length - 1 && <div className="h-px flex-1" style={{ background: step > s.id ? 'oklch(0.55 0.19 167 / 0.4)' : 'var(--aq-glass-border)' }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step card */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--aq-glass-border)', boxShadow: '0 4px 20px oklch(0 0 0 / 6%)' }}>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cur.color}18`, border: `1px solid ${cur.color}40` }}>
                <cur.icon size={16} style={{ color: cur.color }} />
              </div>
              <div>
                <h2 className="text-base font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>{cur.title}</h2>
                <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Step {step} of {STEPS.length}</p>
              </div>
            </div>

            {/* ── Step 1: Personal ── */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Field label="Full Name" value={personal.fullName} onChange={v => setPersonal(p=>({...p,fullName:v}))} required /></div>
                <Field label="Date of Birth" value={personal.dob} onChange={v => setPersonal(p=>({...p,dob:v}))} type="date" required />
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'oklch(0.45 0.02 210)' }}>Gender</label>
                  <select value={personal.gender} onChange={e => setPersonal(p=>({...p,gender:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--aq-stat-bg)', border: '1px solid var(--aq-glass-border)', color: 'var(--aq-text-primary)' }}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="col-span-2"><Field label="Father's Name" value={personal.fatherName} onChange={v => setPersonal(p=>({...p,fatherName:v}))} /></div>
                <div className="col-span-2"><Field label="Address" value={personal.address} onChange={v => setPersonal(p=>({...p,address:v}))} placeholder="House No, Street, Locality" required /></div>
                <Field label="City" value={personal.city} onChange={v => setPersonal(p=>({...p,city:v}))} required />
                <Field label="State" value={personal.state} onChange={v => setPersonal(p=>({...p,state:v}))} required />
                <Field label="Pincode" value={personal.pincode} onChange={v => setPersonal(p=>({...p,pincode:v}))} />
              </div>
            )}

            {/* ── Step 2: Contact ── */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" value={contact.phone} onChange={v => setContact(c=>({...c,phone:v}))} type="tel" required />
                  <Field label="Alternate Phone" value={contact.altPhone} onChange={v => setContact(c=>({...c,altPhone:v}))} type="tel" />
                  <div className="col-span-2"><Field label="Personal Email" value={contact.personalEmail} onChange={v => setContact(c=>({...c,personalEmail:v}))} type="email" required /></div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest pt-2" style={{ color: 'var(--aq-text-faint)' }}>Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" value={contact.emergencyName} onChange={v => setContact(c=>({...c,emergencyName:v}))} required />
                  <Field label="Relation" value={contact.emergencyRel} onChange={v => setContact(c=>({...c,emergencyRel:v}))} placeholder="Father / Spouse…" />
                  <div className="col-span-2"><Field label="Emergency Phone" value={contact.emergencyPhone} onChange={v => setContact(c=>({...c,emergencyPhone:v}))} type="tel" required /></div>
                </div>
              </div>
            )}

            {/* ── Step 3: Professional ── */}
            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Field label="Previous Company" value={prof.prevCompany} onChange={v => setProf(p=>({...p,prevCompany:v}))} placeholder="Leave blank if fresher" /></div>
                <Field label="Total Experience (yrs)" value={prof.experience} onChange={v => setProf(p=>({...p,experience:v}))} />
                <Field label="Notice Period (days)" value={prof.noticePeriod} onChange={v => setProf(p=>({...p,noticePeriod:v}))} />
                <Field label="Current CTC (₹)" value={prof.currentCTC} onChange={v => setProf(p=>({...p,currentCTC:v}))} type="number" />
                <Field label="Expected CTC (₹)" value={prof.expectedCTC} onChange={v => setProf(p=>({...p,expectedCTC:v}))} type="number" />
                <div className="col-span-2"><Field label="Key Skills" value={prof.skills} onChange={v => setProf(p=>({...p,skills:v}))} placeholder="e.g. Aquaculture, MS Excel, Communication" /></div>
              </div>
            )}

            {/* ── Step 4: Bank ── */}
            {step === 4 && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl text-xs flex gap-2" style={{ background: 'oklch(0.70 0.18 80 / 0.06)', border: '1px solid oklch(0.70 0.18 80 / 0.2)' }}>
                  <span>⚠️</span>
                  <span style={{ color: 'oklch(0.60 0.16 80)' }}>Double-check bank details — salary will be credited to this account.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Field label="Bank Name" value={bank.bankName} onChange={v => setBank(b=>({...b,bankName:v}))} required /></div>
                  <div className="col-span-2"><Field label="Account Holder Name" value={bank.holder} onChange={v => setBank(b=>({...b,holder:v}))} required /></div>
                  <Field label="Account Number" value={bank.accountNo} onChange={v => setBank(b=>({...b,accountNo:v}))} required />
                  <Field label="Confirm Account No" value={bank.confirmNo} onChange={v => setBank(b=>({...b,confirmNo:v}))} required />
                  <div className="col-span-2"><Field label="IFSC Code" value={bank.ifsc} onChange={v => setBank(b=>({...b,ifsc:v.toUpperCase()}))} placeholder="e.g. SBIN0001234" required /></div>
                </div>
              </div>
            )}

            {/* ── Step 5: Documents ── */}
            {step === 5 && (
              <div className="space-y-2">
                <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>Upload clear scans/photos. Max 5 MB per file. PDF, JPG, PNG accepted.</p>
                <UploadBox label="Aadhaar Card *" name="aadhaar" docs={docs} onUpload={handleUpload} />
                <UploadBox label="PAN Card *" name="pan" docs={docs} onUpload={handleUpload} />
                <UploadBox label="Resume / CV *" name="resume" docs={docs} onUpload={handleUpload} />
                <UploadBox label="Passport Photo *" name="photo" docs={docs} onUpload={handleUpload} />
                <UploadBox label="Highest Degree Certificate" name="degree" docs={docs} onUpload={handleUpload} />
                <UploadBox label="Experience Letter (if any)" name="experience" docs={docs} onUpload={handleUpload} />
              </div>
            )}

            {/* ── Step 6: Declaration ── */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl space-y-2 text-xs" style={{ background: 'var(--aq-stat-bg)', border: '1px solid var(--aq-glass-border)' }}>
                  <p className="font-bold" style={{ color: 'var(--aq-text-primary)' }}>Review Summary</p>
                  {[
                    ['Name', personal.fullName], ['DOB', personal.dob], ['Gender', personal.gender],
                    ['Phone', contact.phone], ['Email', contact.personalEmail],
                    ['Experience', prof.experience ? `${prof.experience} yrs` : '—'],
                    ['Bank', bank.bankName ? `${bank.bankName} · ${bank.accountNo.slice(-4).padStart(bank.accountNo.length,'*')}` : '—'],
                    ['Documents', `${Object.keys(docs).length} / 6 uploaded`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span style={{ color: 'var(--aq-text-muted)' }}>{k}</span>
                      <span className="font-semibold" style={{ color: 'var(--aq-text-primary)' }}>{v || '—'}</span>
                    </div>
                  ))}
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)} className="mt-0.5 accent-green-500" />
                  <span className="text-xs" style={{ color: 'var(--aq-text-secondary)' }}>
                    I hereby declare that all the information provided is true and correct to the best of my knowledge. I understand that any false information may result in disqualification.
                  </span>
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--aq-ghost-bg)', color: 'var(--aq-text-secondary)', border: '1px solid var(--aq-glass-border)' }}>
              <ChevronLeft size={15} /> Back
            </button>
          )}
          <button
            onClick={() => step < STEPS.length ? setStep(s => s + 1) : handleSubmit()}
            disabled={saving || (step === 6 && !declared)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'oklch(0.60 0.17 167)', color: '#fff' }}>
            {saving ? <><Loader size={14} className="animate-spin" /> Submitting…</>
              : step < STEPS.length ? <>Next <ChevronRight size={15} /></>
              : <>Submit Application <CheckCircle size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidatePortal;
