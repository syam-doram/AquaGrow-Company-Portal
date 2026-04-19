import React, { useState } from 'react';
import { useAuth, type EmployeeRole, ROLE_LABELS, ROLE_COLORS } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Clock, CalendarDays, CreditCard, BookOpen,
  UserCircle, Bell, LogOut, Menu, Waves, ChevronRight, Users, Banknote,
  Ticket, FileText, BarChart3, Award, Package, ShieldCheck, Settings,
  ClipboardList, TrendingUp, Building2,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ─── Nav Item Definition ──────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles?: EmployeeRole[];        // if set, only these roles see it
  minRole?: EmployeeRole;        // alias for "super_admin or hr_manager" hierarchy
  badge?: string;
}

const ALL_NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
      { id: 'hr-dashboard',label: 'HR Dashboard',    icon: Building2,   roles: ['super_admin','hr_manager','operations_manager'] },
    ],
  },
  {
    group: 'My Workspace',
    items: [
      { id: 'attendance', label: 'Attendance',        icon: Clock },
      { id: 'leaves',     label: 'My Leaves',         icon: CalendarDays },
      { id: 'payslips',   label: 'Payslips',          icon: CreditCard },

      { id: 'courses',    label: 'Courses',           icon: BookOpen },
      { id: 'tickets',    label: 'My Tickets',        icon: Ticket },
      { id: 'profile',    label: 'Profile',           icon: UserCircle },
    ],
  },
  {
    group: 'HR & Admin',
    items: [
      { id: 'employees',    label: 'Employees',       icon: Users,       roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'leave-admin',  label: 'Leave Approvals', icon: CalendarDays,roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'att-admin',    label: 'Attendance Admin',icon: Clock,       roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'performance',  label: 'Performance',     icon: TrendingUp,  roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'documents',    label: 'Documents',       icon: FileText,    roles: ['super_admin','hr_manager'] },
      { id: 'assets',       label: 'Assets',          icon: Package,     roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'ff-settlement',label: 'F&F Settlement',  icon: ClipboardList,roles: ['super_admin','hr_manager'] },
    ],
  },
  {
    group: 'Finance & Payroll',
    items: [
      { id: 'payroll',  label: 'Payroll',             icon: Banknote,    roles: ['super_admin','hr_manager','finance_manager'] },
      { id: 'reports',  label: 'Finance Reports',     icon: BarChart3,   roles: ['super_admin','hr_manager','finance_manager'] },
    ],
  },
  {
    group: 'Support',
    items: [
      { id: 'tickets-admin', label: 'All Tickets',   icon: Ticket,      roles: ['super_admin','hr_manager','operations_manager','support_agent'] },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'roles',    label: 'Role Manager',        icon: ShieldCheck, roles: ['super_admin'] },
    ],
  },
];

// ─── NavBtn (module-level so `key` is correctly treated as a React reserved prop) ─
interface NavBtnProps {
  item: NavItem;
  activeTab: string;
  setActiveTab: (id: string) => void;
  onClose?: () => void;
}

const NavBtn: React.FC<NavBtnProps> = ({ item, activeTab, setActiveTab, onClose }) => {
  const active = activeTab === item.id;
  return (
    <button
      onClick={() => { setActiveTab(item.id); onClose?.(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
        active
          ? 'bg-[oklch(0.72_0.19_167/0.15)] text-[oklch(0.72_0.19_167)] border border-[oklch(0.72_0.19_167/0.2)]'
          : 'text-[oklch(0.55_0.02_210)] hover:text-[oklch(0.85_0_0)] hover:bg-white/5'
      }`}
    >
      <item.icon size={15} className={active ? 'text-[oklch(0.72_0.19_167)]' : 'opacity-50'} />
      <span className="flex-1 text-left">{item.label}</span>
      {active && <ChevronRight size={12} className="opacity-50" />}
      {item.badge && (
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[oklch(0.75_0.18_25/0.2)] text-[oklch(0.75_0.18_25)]">
          {item.badge}
        </span>
      )}
    </button>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { employee, logout, hasRole } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Filter nav items based on current user role
  const visibleGroups = ALL_NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => {
      if (!item.roles) return true; // visible to all
      return item.roles.some(r => hasRole(r));
    }),
  })).filter(g => g.items.length > 0);

  const allItems = visibleGroups.flatMap(g => g.items);
  const currentPage = allItems.find(i => i.id === activeTab) ?? allItems[0];

  const roleLabel    = employee ? ROLE_LABELS[employee.role] ?? employee.role : 'Employee';
  const roleBadge    = employee ? ROLE_COLORS[employee.role] : 'aq-badge-blue';



  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full" style={{ background: 'oklch(0.07 0.018 205)', borderRight: '1px solid oklch(1 0 0 / 6%)' }}>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center shadow-lg">
          <Waves size={16} className="text-[oklch(0.08_0.015_200)]" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>AquaGrow</h1>
          <p className="text-[9px] text-[oklch(0.4_0.02_210)] uppercase tracking-widest font-bold mt-0.5">HRMS Portal</p>
        </div>
      </div>

      {/* Employee Card */}
      <div className="px-3 mb-4 shrink-0">
        <div className="glass-panel p-3 flex items-center gap-2.5">
          {employee?.photoUrl ? (
            <img src={employee.photoUrl} alt={employee.name} className="w-8 h-8 rounded-xl object-cover aq-avatar-ring" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] font-bold text-xs aq-avatar-ring">
              {employee?.name?.charAt(0) ?? 'A'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{employee?.name ?? 'Employee'}</p>
            <span className={`aq-badge ${roleBadge} text-[8px]`}>{roleLabel}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.19_167)] pulse-ring shrink-0" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-4 pb-2">
        {visibleGroups.map(group => (
          <div key={group.group}>
            <p className="text-[9px] uppercase tracking-widest font-bold text-[oklch(0.32_0.02_210)] px-3 mb-1">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
              <NavBtn
                key={item.id}
                item={item}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={onClose}
              />
            ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-4 h-4 rounded bg-[oklch(0.72_0.19_167/0.15)] flex items-center justify-center">
            <ShieldCheck size={9} className="text-[oklch(0.72_0.19_167)]" />
          </div>
          <p className="text-[10px] text-[oklch(0.4_0.02_210)]">v2.0 · HRMS</p>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[oklch(0.5_0.02_210)] hover:text-[oklch(0.75_0.18_25)] hover:bg-red-500/8 transition-all">
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'oklch(0.08 0.015 200)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col shrink-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileOpen(false)} />
            <motion.aside initial={{ x: -224 }} animate={{ x: 0 }} exit={{ x: -224 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-56 lg:hidden overflow-hidden">
              <SidebarContent onClose={() => setIsMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-13 shrink-0 flex items-center justify-between px-4 lg:px-5 gap-3"
          style={{ background: 'oklch(0.09 0.018 205)', borderBottom: '1px solid oklch(1 0 0 / 6%)', minHeight: '52px' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden aq-btn-ghost !p-1.5">
              <Menu size={17} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {currentPage?.label ?? 'Dashboard'}
              </h2>
              <p className="text-[10px] text-[oklch(0.42_0.02_210)] hidden sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-1.5 rounded-xl hover:bg-white/5 text-[oklch(0.5_0.02_210)] hover:text-white transition-colors">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.19_167)] pulse-ring" />
            </button>
            {/* Avatar */}
            {employee?.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.name} className="w-7 h-7 rounded-xl object-cover border border-white/10 cursor-pointer" />
            ) : (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_167)] to-[oklch(0.6_0.16_187)] flex items-center justify-center text-[oklch(0.08_0.015_200)] font-bold text-[10px] cursor-pointer">
                {employee?.name?.charAt(0) ?? 'A'}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
