import React from 'react';
import { motion } from 'motion/react';
import {
  Waves, MapPin, Rocket, Leaf, Zap, Heart, Target,
  CheckCircle, Globe2, Phone, Mail, Building2, Calendar,
  Users, Award,
} from 'lucide-react';

// ── Core Values ────────────────────────────────────────────────────────────────
const VALUES = [
  { icon: Leaf,   color: 'oklch(0.72 0.19 167)', title: 'Sustainability', desc: 'Responsible aquaculture at the heart of every decision.' },
  { icon: Target, color: 'oklch(0.78 0.17 295)', title: 'Precision',      desc: 'Data-driven insights for smarter harvests & operations.' },
  { icon: Heart,  color: 'oklch(0.75 0.18 25)',  title: 'Farmer First',   desc: 'Empowering farmers with technology and fair market access.' },
  { icon: Zap,    color: 'oklch(0.78 0.17 70)',  title: 'Innovation',     desc: 'Continuous R&D in IoT, AI prediction & supply chain.' },
];

// ── Company Info ───────────────────────────────────────────────────────────────
const COMPANY_INFO = [
  { label: 'Company Name',   value: 'AquaGrow Technologies Pvt. Ltd.',  icon: Building2,  color: 'oklch(0.72 0.19 167)' },
  { label: 'Founded',        value: '2026',                              icon: Calendar,   color: 'oklch(0.78 0.17 70)'  },
  { label: 'Founder & CEO',  value: 'Syam Kumar Reddy',                  icon: Award,      color: 'oklch(0.78 0.17 295)' },
  { label: 'Headquarters',  value: 'Nellore, Andhra Pradesh',            icon: MapPin,     color: 'oklch(0.75 0.18 25)'  },
  { label: 'Industry',       value: 'AgriTech · AquaTech',              icon: Globe2,     color: 'oklch(0.72 0.19 167)' },
  { label: 'Team Members',  value: '48 Employees',                       icon: Users,      color: 'oklch(0.78 0.17 70)'  },
];

// ══════════════════════════════════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
        <img src="/aq-hero.png" alt="AquaGrow Technologies"
          className="w-full object-cover" style={{ height: '220px', objectPosition: 'center 40%' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-8"
          style={{ background: 'linear-gradient(to right, oklch(0.08 0.015 200 / 92%) 0%, oklch(0.08 0.015 200 / 30%) 65%, transparent 100%)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
              <Waves size={15} style={{ color: 'oklch(0.08 0.015 200)' }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Est. 2026</span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight mb-1"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            AquaGrow Technologies<br />
            <span style={{ color: 'oklch(0.72 0.19 167)' }}>Pvt. Ltd.</span>
          </h1>
          <p className="text-xs text-white/55 max-w-xs mt-1">
            Smart Aquaculture · Sustainable Future · Nellore, Andhra Pradesh
          </p>
        </div>
      </motion.div>

      {/* ── Founder + About ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Founder image */}
        <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
          className="lg:col-span-2 relative rounded-2xl overflow-hidden"
          style={{ border: '1px solid oklch(0.72 0.19 167 / 0.15)', minHeight: '270px' }}>
          <img src="/aq-founder.png" alt="Syam Kumar Reddy"
            className="w-full h-full object-cover" style={{ minHeight: '270px' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, oklch(0.08 0.015 200 / 97%) 0%, oklch(0.08 0.015 200 / 35%) 55%, transparent 100%)' }}>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2.5"
                style={{ background: 'oklch(0.72 0.19 167 / 0.2)', color: 'oklch(0.72 0.19 167)', border: '1px solid oklch(0.72 0.19 167 / 0.3)' }}>
                <Rocket size={9} /> Founder &amp; CEO
              </span>
              <h2 className="text-xl font-black text-white leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Syam Kumar Reddy
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={10} style={{ color: 'oklch(0.78 0.17 70)' }} />
                <p className="text-[11px] text-white/55">Nellore, Andhra Pradesh</p>
              </div>
              <p className="text-[10px] text-white/35 mt-0.5">Founded AquaGrow Technologies · 2026</p>
            </div>
          </div>
        </motion.div>

        {/* About text */}
        <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
          className="lg:col-span-3 glass-panel p-6 flex flex-col gap-5 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={12} style={{ color: 'oklch(0.78 0.17 70)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'oklch(0.78 0.17 70)' }}>
                Nellore, Andhra Pradesh · Est. 2026
              </span>
            </div>
            <h3 className="text-xl font-black mb-3"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Transforming Indian Aquaculture
            </h3>
            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>
              <strong style={{ color: 'var(--aq-text-primary)' }}>AquaGrow Technologies Pvt. Ltd.</strong> was founded in 2026
              by <strong style={{ color: 'var(--aq-text-primary)' }}>Syam Kumar Reddy</strong> in Nellore, Andhra Pradesh —
              with a bold vision to give every fish farmer in India access to the same precision tools that industry leaders use.
            </p>
            <p className="text-[12px] leading-relaxed mt-3" style={{ color: 'var(--aq-text-muted)' }}>
              We built IoT monitoring sensors, a real-time mobile platform, and a full supply-chain marketplace that connects
              farmers directly with buyers — eliminating middlemen, increasing transparency, and maximising farmer income.
              Our mission is to make aquaculture smarter, safer, and more profitable across India.
            </p>
          </div>

          {/* Core values */}
          <div className="grid grid-cols-2 gap-2.5">
            {VALUES.map(v => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{
                    background: `color-mix(in oklch, ${v.color} 7%, var(--aq-glass-bg))`,
                    border: `1px solid color-mix(in oklch, ${v.color} 15%, var(--aq-glass-border))`,
                  }}>
                  <div className="shrink-0 p-1.5 rounded-lg" style={{ background: `color-mix(in oklch, ${v.color} 18%, transparent)` }}>
                    <Icon size={12} style={{ color: v.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold leading-none" style={{ color: 'var(--aq-text-primary)' }}>{v.title}</p>
                    <p className="text-[9.5px] mt-0.5 leading-snug" style={{ color: 'var(--aq-text-muted)' }}>{v.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Company Details Info Grid ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'oklch(0.72 0.19 167 / 0.12)' }}>
            <Building2 size={15} style={{ color: 'oklch(0.72 0.19 167)' }} />
          </div>
          <div>
            <h3 className="text-sm font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
              Company Details
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>
              AquaGrow Technologies Pvt. Ltd.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMPANY_INFO.map((row, i) => {
            const Icon = row.icon;
            return (
              <motion.div key={row.label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  background: `color-mix(in oklch, ${row.color} 6%, var(--aq-glass-bg))`,
                  border: `1px solid color-mix(in oklch, ${row.color} 14%, var(--aq-glass-border))`,
                }}>
                <div className="shrink-0 p-2 rounded-xl"
                  style={{ background: `color-mix(in oklch, ${row.color} 15%, transparent)` }}>
                  <Icon size={15} style={{ color: row.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--aq-text-faint)' }}>
                    {row.label}
                  </p>
                  <p className="text-[13px] font-bold mt-0.5 leading-snug truncate" style={{ color: 'var(--aq-text-primary)' }}>
                    {row.value}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mission strip */}
        <div className="mt-4 p-4 rounded-xl flex items-start gap-3"
          style={{ background: 'oklch(0.72 0.19 167 / 0.06)', border: '1px solid oklch(0.72 0.19 167 / 0.15)' }}>
          <CheckCircle size={16} style={{ color: 'oklch(0.72 0.19 167)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: 'oklch(0.72 0.19 167)' }}>
              Our Mission
            </p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--aq-text-secondary)' }}>
              To democratise aquaculture technology in India — empowering farmers with real-time data, AI-driven insights,
              and direct market access to build a sustainable and profitable fishery ecosystem across every state.
            </p>
          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default Dashboard;
