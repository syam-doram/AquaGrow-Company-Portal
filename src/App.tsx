import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// ─── Existing Pages ────────────────────────────────────────────────────────────
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payslips from './pages/Payslips';

import Courses from './pages/Courses';
import Profile from './pages/Profile';

// ─── New HRMS Pages ────────────────────────────────────────────────────────────
import HRDashboard from './pages/HRDashboard';
import EmployeeOnboarding from './pages/EmployeeOnboarding';
import Recruitment from './pages/Recruitment';
import PayrollManagement from './pages/PayrollManagement';
import LeaveApproval from './pages/LeaveApproval';
import TicketSystem from './pages/TicketSystem';
import PerformanceReviews from './pages/PerformanceReviews';
import AdminReports from './pages/AdminReports';
import FullFinalSettlement from './pages/FullFinalSettlement';

import { Toaster } from './components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Waves, Zap, Shield, Users, ChevronRight } from 'lucide-react';

// ─── Demo Accounts ─────────────────────────────────────────────────────────────
// All roles are treated as employees in the portal.
// Only super_admin & hr_manager get additional HR/Admin sections.
const DEMO_ACCOUNTS = [
  { empId: 'AQ-SA001', role: 'Super Admin (Founder)',    color: 'oklch(0.78 0.17 295)', password: 'Admin@123' },
  { empId: 'AQ-HR001', role: 'HR Manager',               color: 'oklch(0.72 0.19 167)', password: 'HRMgr@123' },
  { empId: 'AQ-FN001', role: 'Finance Manager',          color: 'oklch(0.75 0.16 240)', password: 'Fin@123'    },
  { empId: 'AQ-OP001', role: 'Operations Manager',       color: 'oklch(0.78 0.17 70)',  password: 'Ops@123'    },
  { empId: 'AQ-SP001', role: 'Support Agent',            color: 'oklch(0.75 0.18 25)',  password: 'Sup@123'    },
  { empId: 'AQ-EMP01', role: 'Employee',                 color: 'oklch(0.6 0.02 210)',  password: 'Emp@123'    },
];

// ─── Login Screen ──────────────────────────────────────────────────────────────
const LoginScreen: React.FC<{ onLogin: () => void; onLoginWithEmpId: (id: string, pw: string) => Promise<void> }> = ({ onLogin: _onLogin, onLoginWithEmpId }) => {
  const [empId, setEmpId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showDemo, setShowDemo] = React.useState(false);

  const handleEmpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
    try {
      await onLoginWithEmpId(empId, password);
    } catch (err: any) {
      const msg: string = err.message ?? 'Login failed';
      setError(msg.includes('auth/') ? 'Invalid Employee ID or password.' : msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmpId(acc.empId); setPassword(acc.password); setError('');
  };

  return (
    <div className="aq-login-bg min-h-screen w-full flex items-center justify-center relative overflow-hidden py-8">
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-30 animate-float"
        style={{ background: 'radial-gradient(circle, oklch(0.72 0.19 167), transparent)' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[100px] opacity-20"
        style={{ background: 'radial-gradient(circle, oklch(0.5 0.18 240), transparent)' }} />
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] mx-4 space-y-3">

        {/* Card */}
        <div className="glass-panel p-7 glow-teal">
          <div className="flex flex-col items-center mb-6">
            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center mb-3 glow-teal">
              <Waves size={28} className="text-[oklch(0.08_0.015_200)]" />
            </motion.div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>AquaGrow HRMS</h1>
            <p className="text-[9px] text-[oklch(0.45_0.02_210)] uppercase tracking-widest font-bold mt-0.5">Employee Portal</p>
          </div>

          {/* EmpID-only login — no tabs, direct form */}
          <div className="flex items-center gap-2 mb-5 p-2.5 rounded-xl"
            style={{ background: 'oklch(0.72 0.19 167 / 0.08)', border: '1px solid oklch(0.72 0.19 167 / 0.2)' }}>
            <span style={{ fontSize: '14px' }}>🔑</span>
            <p className="text-[10px] leading-snug" style={{ color: 'oklch(0.72 0.19 167)' }}>
              <strong>Employee ID login only.</strong> Use the ID &amp; password provided by HR in your offer letter.
            </p>
          </div>

          <form onSubmit={handleEmpLogin} className="space-y-3">
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Employee ID</label>
              <input value={empId} onChange={e => setEmpId(e.target.value.toUpperCase())}
                placeholder="e.g. AQ-HR001" className="aq-input font-mono !text-sm tracking-widest"
                autoComplete="username" required />
              <p className="text-[9px] text-[oklch(0.4_0.02_210)] mt-1">From your offer letter — e.g. AQ-SA001, AQ-HR001</p>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-[oklch(0.45_0.02_210)] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Your password"
                  className="aq-input pr-10 !text-sm" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.45_0.02_210)] hover:text-white text-xs">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-xl text-xs"
                style={{ background: 'oklch(0.65 0.22 25 / 0.1)', border: '1px solid oklch(0.65 0.22 25 / 0.2)', color: 'oklch(0.8 0.1 25)' }}>
                ⚠️ {error}
              </motion.div>
            )}
            <button type="submit" disabled={loggingIn}
              className="aq-btn-primary w-full justify-center !py-3 !text-sm" style={{ opacity: loggingIn ? 0.7 : 1 }}>
              {loggingIn
                ? <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />Signing in…
                </span>
                : '🔐 Sign In'}
            </button>
          </form>

          <p className="text-center text-[9px] text-[oklch(0.35_0.02_210)] mt-4">Internal use only · Role-based access enforced</p>
        </div>

        {/* Demo Credentials */}
        <div className="glass-panel overflow-hidden">
          <button onClick={() => setShowDemo(s => !s)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-[oklch(0.55_0.02_210)] hover:text-white transition-colors">
            <span>🧪 Demo Credentials <span className="font-normal text-[oklch(0.4_0.02_210)]">— click row to auto-fill</span></span>
            <span className="text-[10px]">{showDemo ? '▲' : '▼'}</span>
          </button>
          <AnimatePresence>
            {showDemo && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
                <div className="p-3 space-y-1">
                  {DEMO_ACCOUNTS.map(acc => (
                    <button key={acc.empId} onClick={() => fillDemo(acc)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-all group text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: acc.color }} />
                        <div>
                          <p className="text-xs font-bold text-white font-mono">{acc.empId}</p>
                          <p className="text-[9px] text-[oklch(0.45_0.02_210)]">{acc.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-[oklch(0.5_0.02_210)] group-hover:text-[oklch(0.72_0.19_167)] transition-colors">{acc.password}</p>
                        <p className="text-[8px] text-[oklch(0.35_0.02_210)]">click to fill →</p>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-[oklch(0.35_0.02_210)] text-center pb-3">⚠️ Remove before production deployment</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.19_167)] pulse-ring" />
          <p className="text-[10px] text-[oklch(0.4_0.02_210)]">AquaGrow HRMS © 2026</p>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Loading Screen ────────────────────────────────────────────────────────────
const LoadingScreen: React.FC = () => (
  <div className="aq-login-bg h-screen w-full flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 border-2 border-[oklch(0.72_0.19_167/0.2)] rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-t-[oklch(0.72_0.19_167)] rounded-full animate-spin" />
      </div>
      <p className="text-[oklch(0.5_0.02_210)] text-sm font-medium">Loading AquaGrow HRMS…</p>
    </div>
  </div>
);

// ─── App Content ───────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { user, employee, loading, login, loginWithEmpId, hasPermission, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) return <LoadingScreen />;
  if (!employee) return <LoginScreen onLogin={login} onLoginWithEmpId={loginWithEmpId} />;

  const renderPage = () => {
    switch (activeTab) {
      // ── Employee Self-Service — accessible to ALL authenticated roles ───
      case 'dashboard':   return <Dashboard />;
      case 'attendance':  return <Attendance />;      // Timesheet
      case 'leaves':      return <Leaves />;          // My Leaves
      case 'payslips':    return <Payslips />;         // Payslips
      case 'courses':     return <Courses />;          // Learning
      case 'profile':     return <Profile />;          // My Profile
      case 'tickets':     return <TicketSystem admin={false} />; // My Tickets

      // ── HR & Admin (super_admin + hr_manager only) ─────────────────────
      case 'hr-dashboard':
        return (hasRole('hr_manager') || hasRole('super_admin'))
          ? <HRDashboard /> : <Dashboard />;
      case 'recruitment':
        return hasPermission('manage_employees') ? <Recruitment /> : <Dashboard />;
      case 'employees':
        return hasPermission('view_employees') ? <EmployeeOnboarding /> : <Dashboard />;
      case 'leave-admin':
        return hasPermission('approve_leaves') ? <LeaveApproval /> : <Leaves />;
      case 'att-admin':
        return hasPermission('manage_attendance') ? <Attendance /> : <Attendance />;
      case 'performance':
        return hasPermission('view_performance') ? <PerformanceReviews /> : <Dashboard />;
      case 'ff-settlement':
        return (hasRole('hr_manager') || hasRole('super_admin') || hasRole('finance_manager'))
          ? <FullFinalSettlement /> : <Dashboard />;

      // ── Finance & Payroll (finance_manager + hr + super_admin) ─────────
      case 'payroll':
        return hasPermission('view_payroll') ? <PayrollManagement /> : <Payslips />;
      case 'reports':
        return hasPermission('view_finance') ? <AdminReports /> : <Dashboard />;

      // ── Support ────────────────────────────────────────────────────────
      case 'tickets-admin':
        return hasPermission('manage_tickets')
          ? <TicketSystem admin={true} /> : <TicketSystem admin={false} />;

      // ── System ─────────────────────────────────────────────────────────
      case 'roles':
        return hasRole('super_admin') ? <AdminReports /> : <Dashboard />;

      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" richColors theme="dark" />
    </AuthProvider>
  );
}
