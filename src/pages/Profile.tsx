import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Mail, Phone, Building2, CreditCard,
  FileText, Upload, CheckCircle, Edit3, Save,
  Shield, User, Award, RefreshCw, MapPin, Calendar,
  Banknote, Lock, Eye, EyeOff, AlertTriangle, X,
  Hash, Landmark, ChevronRight, Info, Zap, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import hrmsApi from '../api';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────
interface BankDetails {
  accountNumber: string;
  ifscCode:      string;
  bankName:      string;
  accountHolder: string;
  accountType:   'savings' | 'current' | 'salary';
  branchName:    string;
  panCard:       string;
  upiId:         string;
}

const EMPTY_BANK: BankDetails = {
  accountNumber: '',
  ifscCode:      '',
  bankName:      '',
  accountHolder: '',
  accountType:   'salary',
  branchName:    '',
  panCard:       '',
  upiId:         '',
};

const DOCS = [
  { key: 'aadhaar', title: 'Aadhaar Card',      status: 'verified',     icon: FileText   },
  { key: 'pan',     title: 'PAN Card',           status: 'pending',      icon: FileText   },
  { key: 'bank',    title: 'Bank Passbook',      status: 'not-uploaded', icon: CreditCard },
  { key: 'degree',  title: 'Degree Certificate', status: 'not-uploaded', icon: Award      },
];

const BANKS = [
  'HDFC Bank','ICICI Bank','State Bank of India','Axis Bank','Kotak Mahindra Bank',
  'Punjab National Bank','Bank of Baroda','Canara Bank','IndusInd Bank','Yes Bank','Other',
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const maskAccNo = (n: string) => n.length > 4 ? '•••• •••• ' + n.slice(-4) : n;

const isIFSCValid = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
const isPANValid  = (pan: string)  => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());

const docStatusConfig = {
  verified:      { label: 'Verified',     color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.1)',  badge: 'aq-badge-green' },
  pending:       { label: 'Pending',      color: 'oklch(0.78 0.17 70)',  bg: 'oklch(0.78 0.17 70 / 0.1)',   badge: 'aq-badge-amber' },
  'not-uploaded':{ label: 'Not Uploaded', color: 'oklch(0.4 0.02 210)',  bg: 'oklch(1 0 0 / 0.03)',         badge: '' },
};

// ══════════════════════════════════════════════════════════════════════════════
const Profile: React.FC = () => {
  const { employee, refreshEmployee } = useAuth();
  const [liveProfile, setLiveProfile] = useState<any>(null);
  const [refreshing, setRefreshing]   = useState(false);

  // Personal details edit
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [savingPersonal, setSavingPersonal]   = useState(false);
  const [phone, setPhone]   = useState('');
  const [name, setName]     = useState('');

  // Bank details
  const [bank, setBank]           = useState<BankDetails>(EMPTY_BANK);
  const [bankSaved, setBankSaved] = useState<BankDetails | null>(null);
  const [editingBank, setEditingBank]   = useState(false);
  const [savingBank, setSavingBank]     = useState(false);
  const [showAccNo, setShowAccNo]       = useState(false);

  // Onboarding banner
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await hrmsApi.auth.me();
      setLiveProfile(data);
      setName(data?.name ?? employee?.name ?? '');
      setPhone(data?.phone ?? employee?.phone ?? '');

      // Load saved bank details from profile
      if (data?.bankDetails) {
        setBankSaved(data.bankDetails);
        setBank(data.bankDetails);
      } else {
        // No bank details — show onboarding banner
        setShowOnboarding(true);
      }
    } catch (err: any) {
      console.warn('[Profile] loadProfile failed:', err.message);
      setName(employee?.name ?? '');
      setPhone(employee?.phone ?? '');
    } finally {
      setRefreshing(false);
    }
  }, [employee]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const profile = liveProfile ?? employee;

  /**
   * Resolve the MongoDB _id to use in PUT /employees/:id
   * Priority: liveProfile._id (from /auth/me) → employee.uid (mapped from _id in AuthContext)
   * The AuthContext maps emp._id → employee.uid during loginWithEmpId
   */
  const getMongoId = (): string => {
    const id =
      liveProfile?._id ??
      (employee as any)?._id ??
      employee?.uid ?? // AuthContext stores MongoDB _id here for JWT sessions
      '';
    if (!id) console.error('[Profile] Could not resolve MongoDB employee ID!');
    return id;
  };

  // ── Save personal ─────────────────────────────────────────────────────────
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSavingPersonal(true);
    try {
      const id = getMongoId();
      if (!id) { toast.error('Cannot identify employee — please log out and back in'); return; }
      console.log('[Profile] Updating employee ID:', id, { name, phone });
      await hrmsApi.employees.update(id, { name, phone });
      toast.success('✅ Personal details updated!');
      setEditingPersonal(false);
      await loadProfile();
    } catch (err: any) {
      console.error('[Profile] Save personal failed:', err);
      toast.error(err.message ?? 'Failed to update profile');
    } finally {
      setSavingPersonal(false);
    }
  };

  // ── Save bank ─────────────────────────────────────────────────────────────
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!bank.accountNumber.trim()) { toast.error('Account number is required'); return; }
    if (!isIFSCValid(bank.ifscCode))  { toast.error('Invalid IFSC code (format: ABCD0123456)'); return; }
    if (bank.panCard && !isPANValid(bank.panCard)) { toast.error('Invalid PAN card format (format: ABCDE1234F)'); return; }
    if (!bank.accountHolder.trim()) { toast.error('Account holder name is required'); return; }
    if (!bank.bankName) { toast.error('Please select a bank'); return; }

    setSavingBank(true);
    try {
      const id = getMongoId();
      if (!id) { toast.error('Cannot identify employee — please log out and back in'); return; }

      const payload = {
        bankDetails: {
          ...bank,
          ifscCode: bank.ifscCode.toUpperCase(),
          panCard:  bank.panCard.toUpperCase(),
        },
      };
      console.log('[Profile] Saving bank details to employee ID:', id, payload);
      await hrmsApi.employees.update(id, payload);

      const saved = { ...bank, ifscCode: bank.ifscCode.toUpperCase(), panCard: bank.panCard.toUpperCase() };
      setBankSaved(saved);
      setBank(saved);
      setEditingBank(false);
      setShowOnboarding(false);
      toast.success('✅ Bank details saved securely!');
      await loadProfile(); // re-fetch to confirm persistence
    } catch (err: any) {
      console.error('[Profile] Save bank failed:', err);
      toast.error(err.message ?? 'Failed to save bank details');
    } finally {
      setSavingBank(false);
    }
  };

  const handleBankChange = (field: keyof BankDetails, val: string) =>
    setBank(b => ({ ...b, [field]: val }));

  // ── UI helpers ────────────────────────────────────────────────────────────
  const roleColor = {
    super_admin:        { bg: 'oklch(0.72 0.19 167 / 0.12)', text: 'oklch(0.72 0.19 167)', border: 'oklch(0.72 0.19 167 / 0.25)' },
    hr_manager:         { bg: 'oklch(0.75 0.16 240 / 0.12)', text: 'oklch(0.75 0.16 240)', border: 'oklch(0.65 0.18 240 / 0.25)' },
    finance_manager:    { bg: 'oklch(0.75 0.16 240 / 0.12)', text: 'oklch(0.75 0.16 240)', border: 'oklch(0.65 0.18 240 / 0.25)' },
    operations_manager: { bg: 'oklch(0.78 0.17 70 / 0.12)',  text: 'oklch(0.78 0.17 70)',  border: 'oklch(0.78 0.17 70 / 0.25)'  },
    support_agent:      { bg: 'oklch(0.75 0.18 25 / 0.12)',  text: 'oklch(0.75 0.18 25)',  border: 'oklch(0.75 0.18 25 / 0.25)'  },
    employee:           { bg: 'oklch(0.78 0.17 70 / 0.12)',  text: 'oklch(0.78 0.17 70)',  border: 'oklch(0.78 0.17 70 / 0.25)'  },
  }[employee?.role ?? 'employee'] ?? { bg: 'oklch(1 0 0 / 5%)', text: 'oklch(0.7 0 0)', border: 'oklch(1 0 0 / 10%)' };

  const empId  = profile?.empId  ?? employee?.empId  ?? '—';
  const dept   = profile?.department ?? employee?.department ?? 'AquaGrow';
  const desig  = profile?.designation ?? '';
  const salary = profile?.salary ?? employee?.salary;
  const joined = profile?.joiningDate ?? employee?.joiningDate;
  const status = profile?.status ?? employee?.status ?? 'active';

  const isBankComplete = !!(bankSaved?.accountNumber && bankSaved?.ifscCode && bankSaved?.bankName);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Profile</h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
            Personal info · Bank details · KYC documents
          </p>
        </div>
        <button onClick={loadProfile} disabled={refreshing} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Onboarding Banner ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="p-4 rounded-2xl flex items-start gap-4 relative"
              style={{ background: 'oklch(0.78 0.17 70 / 0.08)', border: '1px solid oklch(0.78 0.17 70 / 0.25)' }}>
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'oklch(0.78 0.17 70 / 0.15)' }}>
                <Zap size={18} style={{ color: 'oklch(0.78 0.17 70)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white mb-0.5">Complete Your Onboarding</p>
                <p className="text-xs" style={{ color: 'oklch(0.6 0.02 210)' }}>
                  Please add your <strong className="text-white">Bank Account details</strong> below so HR can process your salary directly to your account each month. This takes less than 2 minutes.
                </p>
                <div className="flex gap-4 mt-2.5">
                  {['Bank Account No.', 'IFSC Code', 'PAN Card'].map(step => (
                    <div key={step} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'oklch(0.55 0.02 210)' }}>
                      <ChevronRight size={10} style={{ color: 'oklch(0.78 0.17 70)' }} />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowOnboarding(false)} className="p-1.5 rounded-lg hover:bg-white/10 shrink-0" style={{ color: 'oklch(0.5 0.02 210)' }}>
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Profile Card ──────────────────────────────────────────── */}
        <div className="glass-panel p-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-24 opacity-20 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, oklch(0.72 0.19 167 / 0.4), transparent)' }} />

          {/* Avatar */}
          <div className="relative mt-2 mb-4">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.name}
                className="w-24 h-24 rounded-2xl object-cover aq-avatar-ring" />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white aq-avatar-ring"
                style={{ fontFamily: 'Space Grotesk, sans-serif', background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
                {profile?.name?.charAt(0) ?? 'A'}
              </div>
            )}
            <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'oklch(0.72 0.19 167)' }}>
              <Camera size={13} style={{ color: 'oklch(0.08 0.015 200)' }} />
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {profile?.name ?? '—'}
          </h2>
          {desig && <p className="text-xs mb-1" style={{ color: 'oklch(0.6 0.02 210)' }}>{desig}</p>}
          <p className="text-sm mb-3 capitalize" style={{ color: 'oklch(0.55 0.02 210)' }}>
            {(employee?.role ?? '').replace(/_/g, ' ')}
          </p>

          <div className="px-3 py-1 rounded-full text-[11px] font-bold mb-4"
            style={{ background: roleColor.bg, color: roleColor.text, border: `1px solid ${roleColor.border}` }}>
            <Shield size={10} className="inline mr-1" />
            {String(employee?.role ?? 'employee').replace(/_/g, ' ').toUpperCase()}
          </div>

          <span className={`aq-badge mb-4 ${status === 'active' ? 'aq-badge-green' : status === 'on_leave' ? 'aq-badge-amber' : 'aq-badge-red'}`}>
            {status.replace('_', ' ')}
          </span>

          {/* Quick info */}
          <div className="w-full space-y-2.5 pt-4" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
            {[
              { icon: Mail,      val: profile?.email ?? 'Not set' },
              { icon: Phone,     val: profile?.phone ?? 'Not provided' },
              { icon: Building2, val: dept },
              ...(joined ? [{ icon: Calendar, val: `Joined ${format(new Date(joined), 'MMM yyyy')}` }] : []),
            ].map(({ icon: Icon, val }) => (
              <div key={val} className="flex items-center gap-2.5 text-left">
                <Icon size={13} style={{ color: 'oklch(0.45 0.02 210)' }} className="shrink-0" />
                <span className="text-xs truncate" style={{ color: 'oklch(0.65 0 0)' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* ID and Salary chips */}
          <div className="mt-4 w-full px-3 py-2 rounded-xl text-left"
            style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
            <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Employee ID</p>
            <p className="text-sm font-mono font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>{empId}</p>
          </div>
          {salary && (
            <div className="mt-2 w-full px-3 py-2 rounded-xl text-left"
              style={{ background: 'oklch(0.72 0.19 167 / 0.06)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
              <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: 'oklch(0.45 0.02 210)' }}>Monthly CTC</p>
              <p className="text-sm font-mono font-bold" style={{ color: 'oklch(0.72 0.19 167)' }}>₹{Number(salary).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* ── Right: Details ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal Details */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Personal Details</h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>Update your contact information</p>
              </div>
              {!editingPersonal ? (
                <button onClick={() => setEditingPersonal(true)} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
                  <Edit3 size={12} /> Edit
                </button>
              ) : (
                <button onClick={() => setEditingPersonal(false)} className="aq-btn-ghost !py-1.5 !px-3 !text-xs" style={{ color: 'oklch(0.75 0.18 25)' }}>
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleSavePersonal}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name',   val: editingPersonal ? name  : (profile?.name  ?? ''), key: 'name',  setter: setName,  editable: true  },
                  { label: 'Phone',       val: editingPersonal ? phone : (profile?.phone ?? 'Not set'), key: 'phone', setter: setPhone, editable: true },
                  { label: 'Email',       val: profile?.email ?? '', key: 'email',       editable: false },
                  { label: 'Role',        val: String(employee?.role ?? '').replace(/_/g, ' '), key: 'role', editable: false },
                  { label: 'Department',  val: dept, key: 'dept',   editable: false },
                  { label: 'Designation', val: desig || '—', key: 'desg', editable: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                      {f.label}
                    </label>
                    <input
                      type="text"
                      value={String(f.val)}
                      onChange={f.editable && editingPersonal && f.setter ? e => f.setter!(e.target.value) : undefined}
                      readOnly={!(f.editable && editingPersonal)}
                      className="aq-input capitalize"
                      style={!(f.editable && editingPersonal) ? { opacity: 0.55, cursor: 'default' } : {}}
                    />
                  </div>
                ))}
              </div>
              {editingPersonal && (
                <div className="mt-4 flex gap-3">
                  <button type="submit" disabled={savingPersonal} className="aq-btn-primary">
                    <Save size={14} /> {savingPersonal ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              BANK ACCOUNT & PAYMENT DETAILS
          ══════════════════════════════════════════════════════════════════ */}
          <div className="glass-panel overflow-hidden">
            {/* Section header */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 7%)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl shrink-0"
                  style={{ background: isBankComplete ? 'oklch(0.72 0.19 167 / 0.12)' : 'oklch(0.78 0.17 70 / 0.12)' }}>
                  <Landmark size={15} style={{ color: isBankComplete ? 'oklch(0.72 0.19 167)' : 'oklch(0.78 0.17 70)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Bank Account & Payment Details
                  </h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                    Used by HR for monthly salary transfers via NEFT / IMPS / UPI
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isBankComplete && (
                  <span className="aq-badge aq-badge-green flex items-center gap-1">
                    <CheckCircle size={9} /> Saved
                  </span>
                )}
                {!editingBank ? (
                  <button onClick={() => setEditingBank(true)} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
                    <Edit3 size={12} /> {isBankComplete ? 'Update' : 'Add Details'}
                  </button>
                ) : (
                  <button onClick={() => { setEditingBank(false); if (bankSaved) setBank(bankSaved); }}
                    className="aq-btn-ghost !py-1.5 !px-3 !text-xs" style={{ color: 'oklch(0.75 0.18 25)' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Saved view */}
            {!editingBank && isBankComplete && bankSaved && (
              <div className="p-5">
                {/* Bank identity row */}
                <div className="flex items-center gap-4 mb-5 p-4 rounded-xl"
                  style={{ background: 'oklch(0.72 0.19 167 / 0.06)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: 'oklch(0.72 0.19 167 / 0.12)' }}>
                    🏦
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-white">{bankSaved.bankName}</p>
                    <p className="text-xs" style={{ color: 'oklch(0.55 0.02 210)' }}>
                      {bankSaved.branchName || 'Branch not specified'} · {bankSaved.accountType} account
                    </p>
                  </div>
                  <span className="aq-badge aq-badge-green capitalize">{bankSaved.accountType}</span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: User,       label: 'Account Holder',  val: bankSaved.accountHolder },
                    { icon: Hash,       label: 'Account Number',  val: showAccNo ? bankSaved.accountNumber : maskAccNo(bankSaved.accountNumber), sensitive: true },
                    { icon: Landmark,   label: 'IFSC Code',       val: bankSaved.ifscCode },
                    { icon: FileText,   label: 'PAN Card',        val: bankSaved.panCard || '—' },
                    { icon: Banknote,   label: 'UPI ID',          val: bankSaved.upiId   || '—' },
                    { icon: Building2,  label: 'Branch',          val: bankSaved.branchName || '—' },
                  ].map(({ icon: Icon, label, val, sensitive }) => (
                    <div key={label} className="p-3 rounded-xl flex items-center gap-3"
                      style={{ background: 'oklch(1 0 0 / 3%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
                      <div className="p-2 rounded-lg shrink-0" style={{ background: 'oklch(1 0 0 / 5%)' }}>
                        <Icon size={12} style={{ color: 'oklch(0.5 0.02 210)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: 'oklch(0.42 0.02 210)' }}>{label}</p>
                        <p className="text-xs font-bold text-white font-mono truncate">{val}</p>
                      </div>
                      {sensitive && (
                        <button onClick={() => setShowAccNo(s => !s)}
                          className="p-1.5 rounded-lg hover:bg-white/10 shrink-0" style={{ color: 'oklch(0.5 0.02 210)' }}>
                          {showAccNo ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Payment method note */}
                <div className="mt-4 p-3 rounded-xl flex items-start gap-3"
                  style={{ background: 'oklch(0.75 0.16 240 / 0.06)', border: '1px solid oklch(0.75 0.16 240 / 0.15)' }}>
                  <Info size={13} style={{ color: 'oklch(0.75 0.16 240)' }} className="shrink-0 mt-0.5" />
                  <p className="text-[10px]" style={{ color: 'oklch(0.55 0.02 210)' }}>
                    HR processes salary via <strong className="text-white">NEFT / IMPS</strong> on the last working day of each month.
                    UPI transfers are used for same-day reimbursements. Ensure your account details are correct.
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!editingBank && !isBankComplete && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'oklch(0.78 0.17 70 / 0.1)', border: '1px solid oklch(0.78 0.17 70 / 0.2)' }}>
                  <Landmark size={28} style={{ color: 'oklch(0.78 0.17 70)' }} />
                </div>
                <p className="text-sm font-bold text-white mb-1">No Bank Details Added</p>
                <p className="text-xs mb-4" style={{ color: 'oklch(0.45 0.02 210)' }}>
                  Add your bank account so HR can process your monthly salary via NEFT / IMPS
                </p>
                <button onClick={() => setEditingBank(true)} className="aq-btn-primary mx-auto">
                  <Landmark size={14} /> Add Bank Details
                </button>
              </div>
            )}

            {/* Edit / Add form */}
            <AnimatePresence>
              {editingBank && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <form onSubmit={handleSaveBank} className="p-5 space-y-5">

                    {/* Security note */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl"
                      style={{ background: 'oklch(0.72 0.19 167 / 0.06)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
                      <Lock size={13} style={{ color: 'oklch(0.72 0.19 167)' }} className="shrink-0 mt-0.5" />
                      <p className="text-[10px]" style={{ color: 'oklch(0.55 0.02 210)' }}>
                        Your bank details are <strong className="text-white">encrypted and stored securely</strong>. Only HR and Finance have access. Never share your details externally.
                      </p>
                    </div>

                    {/* Account holder + Bank */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          Account Holder Name *
                        </label>
                        <input type="text" required value={bank.accountHolder}
                          onChange={e => handleBankChange('accountHolder', e.target.value)}
                          placeholder="As printed on bank passbook" className="aq-input" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          Bank Name *
                        </label>
                        <select value={bank.bankName} onChange={e => handleBankChange('bankName', e.target.value)}
                          required className="aq-input">
                          <option value="">Select bank…</option>
                          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Account number + IFSC */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          Account Number *
                        </label>
                        <div className="relative">
                          <input
                            type={showAccNo ? 'text' : 'password'}
                            required
                            value={bank.accountNumber}
                            onChange={e => handleBankChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter account number"
                            className="aq-input pr-10"
                            maxLength={18}
                          />
                          <button type="button" onClick={() => setShowAccNo(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.5 0.02 210)' }}>
                            {showAccNo ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          IFSC Code *
                        </label>
                        <input type="text" required value={bank.ifscCode}
                          onChange={e => handleBankChange('ifscCode', e.target.value.toUpperCase())}
                          placeholder="e.g. HDFC0001234" className="aq-input font-mono uppercase"
                          maxLength={11} />
                        {bank.ifscCode && (
                          <p className="text-[9px] mt-1" style={{ color: isIFSCValid(bank.ifscCode) ? 'oklch(0.72 0.19 167)' : 'oklch(0.75 0.18 25)' }}>
                            {isIFSCValid(bank.ifscCode) ? '✓ Valid IFSC format' : '⚠ Format: ABCD0123456'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Account type + Branch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          Account Type
                        </label>
                        <div className="flex gap-2">
                          {(['savings','salary','current'] as const).map(t => (
                            <button key={t} type="button" onClick={() => handleBankChange('accountType', t)}
                              className="flex-1 py-2 rounded-xl text-[10px] font-bold capitalize transition-all"
                              style={bank.accountType === t
                                ? { background: 'oklch(0.72 0.19 167 / 0.18)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.35)' }
                                : { background: 'oklch(1 0 0 / 4%)', color: 'oklch(0.5 0.02 210)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          Branch Name
                        </label>
                        <input type="text" value={bank.branchName}
                          onChange={e => handleBankChange('branchName', e.target.value)}
                          placeholder="e.g. Nellore Main Branch" className="aq-input" />
                      </div>
                    </div>

                    {/* PAN + UPI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          PAN Card Number
                          <span className="ml-1 normal-case font-normal" style={{ color: 'oklch(0.5 0.02 210)' }}>(for TDS & ITR)</span>
                        </label>
                        <input type="text" value={bank.panCard}
                          onChange={e => handleBankChange('panCard', e.target.value.toUpperCase())}
                          placeholder="e.g. ABCDE1234F" className="aq-input font-mono uppercase"
                          maxLength={10} />
                        {bank.panCard && (
                          <p className="text-[9px] mt-1" style={{ color: isPANValid(bank.panCard) ? 'oklch(0.72 0.19 167)' : 'oklch(0.75 0.18 25)' }}>
                            {isPANValid(bank.panCard) ? '✓ Valid PAN format' : '⚠ Format: ABCDE1234F'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: 'oklch(0.45 0.02 210)' }}>
                          UPI ID
                          <span className="ml-1 normal-case font-normal" style={{ color: 'oklch(0.5 0.02 210)' }}>(optional, for reimbursements)</span>
                        </label>
                        <input type="text" value={bank.upiId}
                          onChange={e => handleBankChange('upiId', e.target.value)}
                          placeholder="e.g. name@okaxis" className="aq-input" />
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => { setEditingBank(false); if (bankSaved) setBank(bankSaved); }}
                        className="aq-btn-ghost flex-1 justify-center">Cancel</button>
                      <button type="submit" disabled={savingBank} className="aq-btn-primary flex-1 justify-center">
                        <Save size={14} /> {savingBank ? 'Saving…' : 'Save Bank Details'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* KYC Documents */}
          <div className="glass-panel p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Documents & KYC</h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.5 0.02 210)' }}>
                Upload Aadhaar, PAN and bank documents for salary account opening
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOCS.map((d, i) => {
                const cfg = docStatusConfig[d.status as keyof typeof docStatusConfig] ?? docStatusConfig['not-uploaded'];
                return (
                  <motion.div key={d.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="p-3 rounded-xl flex items-center justify-between"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.color}` }}>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl" style={{ background: 'oklch(1 0 0 / 5%)' }}>
                        <d.icon size={14} style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{d.title}</p>
                        <p className="text-[9px] uppercase tracking-wide font-bold" style={{ color: cfg.color }}>
                          {cfg.label}
                        </p>
                      </div>
                    </div>
                    {d.status === 'verified' ? (
                      <CheckCircle size={16} style={{ color: 'oklch(0.72 0.19 167)' }} className="shrink-0" />
                    ) : (
                      <button onClick={() => toast.info(`Uploading ${d.title}…`)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'oklch(0.5 0.02 210)' }}>
                        <Upload size={14} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Corporate salary account info */}
            <div className="mt-4 p-3 rounded-xl"
              style={{ background: 'oklch(0.75 0.16 240 / 0.05)', border: '1px solid oklch(0.75 0.16 240 / 0.12)' }}>
              <p className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: 'oklch(0.75 0.16 240)' }}>
                💼 Corporate Salary Account Option
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'oklch(0.55 0.02 210)' }}>
                AquaGrow Technologies has a tie-up with HDFC Bank for <strong className="text-white">zero-balance corporate salary accounts</strong>.
                You can request HR to open one on your behalf by submitting your Aadhaar card, PAN card, and 2 passport-size photos.
                The ATM card and chequebook will be delivered directly to you.
              </p>
            </div>
          </div>

          {/* Account Security */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Account Security</h3>
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'oklch(0.72 0.19 167 / 0.06)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
              <div className="flex items-center gap-2.5">
                <Shield size={16} style={{ color: 'oklch(0.72 0.19 167)' }} />
                <div>
                  <p className="text-xs font-bold text-white">HRMS Authentication</p>
                  <p className="text-[10px]" style={{ color: 'oklch(0.5 0.02 210)' }}>
                    Authenticated via Employee ID & Password · JWT secured
                  </p>
                </div>
              </div>
              <span className="aq-badge aq-badge-green">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
