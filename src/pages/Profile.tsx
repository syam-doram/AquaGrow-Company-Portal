import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Camera, Mail, Phone, Building2, CreditCard,
  FileText, Upload, CheckCircle, Edit3, Save,
  Shield, User, Award,
} from 'lucide-react';
import { toast } from 'sonner';

const DOCS = [
  { key: 'aadhaar',  title: 'Aadhaar Card',       status: 'verified',      icon: FileText },
  { key: 'pan',      title: 'PAN Card',            status: 'pending',       icon: FileText },
  { key: 'bank',     title: 'Bank Passbook',       status: 'not-uploaded',  icon: CreditCard },
  { key: 'degree',   title: 'Degree Certificate',  status: 'not-uploaded',  icon: Award },
];

const Profile: React.FC = () => {
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [name, setName] = useState(employee?.name ?? '');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'employees', employee.uid), { name, phone });
      toast.success('Profile updated!');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const roleColor = {
    admin:    { bg: 'oklch(0.72 0.19 167 / 0.12)', text: 'oklch(0.72 0.19 167)', border: 'oklch(0.72 0.19 167 / 0.25)' },
    manager:  { bg: 'oklch(0.75 0.16 240 / 0.12)', text: 'oklch(0.75 0.16 240)', border: 'oklch(0.65 0.18 240 / 0.25)' },
    employee: { bg: 'oklch(0.78 0.17 70 / 0.12)',  text: 'oklch(0.78 0.17 70)',  border: 'oklch(0.78 0.17 70 / 0.25)' },
  }[employee?.role ?? 'employee'] ?? { bg: 'oklch(1 0 0 / 0.05)', text: 'oklch(0.7 0 0)', border: 'oklch(1 0 0 / 0.1)' };

  const docStatusConfig = {
    verified:     { label: 'Verified',     color: 'oklch(0.72 0.19 167)', bg: 'oklch(0.72 0.19 167 / 0.1)',  badge: 'aq-badge-green' },
    pending:      { label: 'Pending',      color: 'oklch(0.78 0.17 70)',  bg: 'oklch(0.78 0.17 70 / 0.1)',   badge: 'aq-badge-amber' },
    'not-uploaded':{ label: 'Not Uploaded', color: 'oklch(0.45 0.02 210)', bg: 'oklch(1 0 0 / 0.04)',         badge: '' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Profile</h1>
        <p className="text-sm text-[oklch(0.5_0.02_210)] mt-0.5">Manage your personal information and documents.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="glass-panel p-6 flex flex-col items-center text-center relative overflow-hidden">
          {/* BG glow */}
          <div className="absolute top-0 left-0 right-0 h-24 opacity-20 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, oklch(0.72 0.19 167 / 0.4), transparent)' }} />

          {/* Avatar */}
          <div className="relative mt-2 mb-4">
            {employee?.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.name}
                className="w-24 h-24 rounded-2xl object-cover aq-avatar-ring" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] font-bold text-3xl aq-avatar-ring"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {employee?.name?.charAt(0) ?? 'A'}
              </div>
            )}
            <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-[oklch(0.72_0.19_167)] flex items-center justify-center shadow-lg">
              <Camera size={13} className="text-[oklch(0.08_0.015_200)]" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {employee?.name}
          </h2>
          <p className="text-sm text-[oklch(0.55_0.02_210)] mb-3 capitalize">{employee?.role}</p>

          {/* Role badge */}
          <div className="px-3 py-1 rounded-full text-[11px] font-bold mb-5"
            style={{ background: roleColor.bg, color: roleColor.text, border: `1px solid ${roleColor.border}` }}>
            <Shield size={10} className="inline mr-1" />
            {String(employee?.role).replace('_', ' ').toUpperCase()}
          </div>

          {/* Quick info */}
          <div className="w-full space-y-2.5" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)', paddingTop: '1.25rem' }}>
            {[
              { icon: Mail,      label: employee?.email ?? 'Not set' },
              { icon: Phone,     label: employee?.phone ?? 'Not provided' },
              { icon: Building2, label: 'AquaGrow HQ, Nellore' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-left">
                <Icon size={13} className="text-[oklch(0.45_0.02_210)] shrink-0" />
                <span className="text-xs text-[oklch(0.65_0_0)] truncate">{label}</span>
              </div>
            ))}
          </div>

          {/* Employee ID */}
          <div className="mt-4 w-full px-3 py-2 rounded-xl text-left"
            style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 7%)' }}>
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-0.5">Employee ID</p>
            <p className="text-sm font-mono font-bold text-[oklch(0.72_0.19_167)]">AQ-2026-001</p>
          </div>
        </div>

        {/* Details + Docs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Edit Details */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Personal Details</h3>
                <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Update your contact information</p>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="aq-btn-ghost !py-1.5 !px-3 !text-xs">
                  <Edit3 size={12} /> Edit
                </button>
              ) : (
                <button onClick={() => setEditing(false)} className="aq-btn-ghost !py-1.5 !px-3 !text-xs text-[oklch(0.75_0.18_25)]">
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleUpdate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name',     value: editing ? name : (employee?.name ?? ''), key: 'name',  setter: setName, editable: true },
                  { label: 'Phone Number',  value: editing ? phone : (employee?.phone ?? 'Not set'), key: 'phone', setter: setPhone, editable: true },
                  { label: 'Email Address', value: employee?.email ?? '', key: 'email', editable: false },
                  { label: 'Role',          value: String(employee?.role ?? 'employee'), key: 'role', editable: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">
                      {f.label}
                    </label>
                    <input
                      type="text"
                      value={String(f.value)}
                      onChange={f.editable && editing && f.setter ? e => f.setter!(e.target.value) : undefined}
                      readOnly={!(f.editable && editing)}
                      className="aq-input capitalize"
                      style={!(f.editable && editing) ? { opacity: 0.6, cursor: 'default' } : {}}
                    />
                  </div>
                ))}
              </div>
              {editing && (
                <div className="mt-4 flex gap-3">
                  <button type="submit" disabled={loading} className="aq-btn-primary">
                    <Save size={14} /> {loading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Documents */}
          <div className="glass-panel p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Documents & KYC</h3>
              <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Upload your identification and bank documents</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOCS.map((d, i) => {
                const cfg = docStatusConfig[d.status as keyof typeof docStatusConfig] ?? docStatusConfig['not-uploaded'];
                return (
                  <motion.div key={d.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
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
                      <CheckCircle size={16} className="text-[oklch(0.72_0.19_167)] shrink-0" />
                    ) : (
                      <button onClick={() => toast.info(`Uploading ${d.title}…`)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-[oklch(0.5_0.02_210)] hover:text-white transition-colors">
                        <Upload size={14} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Account Security */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Account Security</h3>
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'oklch(0.72 0.19 167 / 0.06)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
              <div className="flex items-center gap-2.5">
                <Shield size={16} className="text-[oklch(0.72_0.19_167)]" />
                <div>
                  <p className="text-xs font-bold text-white">Google Auth</p>
                  <p className="text-[10px] text-[oklch(0.5_0.02_210)]">Signed in via Google OAuth 2.0</p>
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
