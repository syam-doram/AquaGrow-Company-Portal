import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type EmployeeRole, ROLE_LABELS, ROLE_COLORS } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Clock, CalendarDays, CreditCard, BookOpen,
  UserCircle, Bell, LogOut, Menu, Waves, ChevronRight, Users, Banknote,
  Ticket, FileText, BarChart3, Package, ShieldCheck,
  ClipboardList, TrendingUp, Building2, UserPlus, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, ChevronDown, Zap, Home,
  CheckSquare, DollarSign, GitBranch, Briefcase,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ── Nav item definition ────────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  sub?: string;          // Short description shown in expanded mode
  icon: React.ComponentType<any>;
  roles?: EmployeeRole[];
  badge?: string;
  badgeColor?: string;   // custom badge color
  isNew?: boolean;
}

// ── Color per group ───────────────────────────────────────────────────────────
const GROUP_META: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  'Overview':         { icon: Home,         color: 'oklch(0.75 0.16 240)' },
  'My Workspace':     { icon: CheckSquare,  color: 'oklch(0.72 0.19 167)' },
  'HR & Admin':       { icon: Users,        color: 'oklch(0.78 0.17 295)' },
  'Finance & Payroll':{ icon: DollarSign,   color: 'oklch(0.78 0.17 70)'  },
  'Support':          { icon: Briefcase,    color: 'oklch(0.75 0.18 25)'  },
  'System':           { icon: ShieldCheck,  color: 'oklch(0.65 0.02 210)' },
};

const ALL_NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard',    label: 'Dashboard',     sub: 'Your daily snapshot',     icon: LayoutDashboard },
      { id: 'hr-dashboard', label: 'HR Dashboard',  sub: 'People analytics',        icon: Building2, roles: ['super_admin','hr_manager'] },
    ],
  },
  {
    group: 'My Workspace',
    items: [
      { id: 'attendance',   label: 'Attendance',    sub: 'Check in / Check out',    icon: Clock },
      { id: 'leaves',       label: 'My Leaves',     sub: 'Apply & track requests',  icon: CalendarDays },
      { id: 'payslips',     label: 'Payslips',      sub: 'Salary history',          icon: CreditCard },
      { id: 'courses',      label: 'Courses',       sub: 'Learning & training',     icon: BookOpen },
      { id: 'tickets',      label: 'My Tickets',    sub: 'Raise support issues',    icon: Ticket },
      { id: 'profile',      label: 'Profile',       sub: 'Personal info & docs',    icon: UserCircle },
    ],
  },
  {
    group: 'HR & Admin',
    items: [
      { id: 'recruitment',  label: 'Recruitment',   sub: 'Hire & onboard talent',   icon: UserPlus,    roles: ['super_admin','hr_manager'], isNew: true },
      { id: 'employees',    label: 'Employees',     sub: 'Team directory',          icon: Users,       roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'leave-admin',  label: 'Leave Approvals', sub: 'Approve requests',     icon: CalendarDays,roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'att-admin',    label: 'Attendance Admin', sub: 'Full team records',   icon: Clock,       roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'performance',  label: 'Performance',   sub: 'Reviews & ratings',      icon: TrendingUp,  roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'documents',    label: 'Documents',     sub: 'Vault & verification',   icon: FileText,    roles: ['super_admin','hr_manager'] },
      { id: 'assets',       label: 'Assets',        sub: 'Company equipment',      icon: Package,     roles: ['super_admin','hr_manager','operations_manager'] },
      { id: 'ff-settlement',label: 'F&F Settlement',sub: 'Full & final process',   icon: ClipboardList,roles: ['super_admin','hr_manager'] },
    ],
  },
  {
    group: 'Finance & Payroll',
    items: [
      { id: 'payroll',      label: 'Payroll',       sub: 'Run & manage salaries',  icon: Banknote,    roles: ['super_admin','hr_manager','finance_manager'] },
      { id: 'reports',      label: 'Finance Reports', sub: 'P&L, analytics',       icon: BarChart3,   roles: ['super_admin','hr_manager','finance_manager'] },
    ],
  },
  {
    group: 'Support',
    items: [
      { id: 'tickets-admin', label: 'All Tickets', sub: 'View & resolve team issues', icon: Ticket, roles: ['super_admin','hr_manager','operations_manager','support_agent'] },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'roles', label: 'Role Manager', sub: 'Permissions & access', icon: ShieldCheck, roles: ['super_admin'] },
    ],
  },
];

// ── NavBtn ─────────────────────────────────────────────────────────────────────
interface NavBtnProps {
  item: NavItem;
  activeTab: string;
  setActiveTab: (id: string) => void;
  collapsed: boolean;
  groupColor: string;
  onClose?: () => void;
}

const NavBtn: React.FC<NavBtnProps> = ({ item, activeTab, setActiveTab, collapsed, groupColor, onClose }) => {
  const active = activeTab === item.id;
  const Icon = item.icon;

  return (
    <motion.button
      onClick={() => { setActiveTab(item.id); onClose?.(); }}
      title={collapsed ? item.label : undefined}
      whileHover={{ x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full flex items-center gap-2.5 rounded-xl transition-colors duration-150 group"
      style={{
        padding: collapsed ? '0.55rem' : '0.5rem 0.7rem',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active
          ? `color-mix(in oklch, ${groupColor} 14%, transparent)`
          : 'transparent',
        border: active
          ? `1px solid color-mix(in oklch, ${groupColor} 22%, transparent)`
          : '1px solid transparent',
        color: active ? groupColor : 'var(--aq-nav-color)',
      }}
    >
      {/* Active left bar */}
      {active && !collapsed && (
        <motion.span
          layoutId="nav-active-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-full"
          style={{ background: groupColor }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}

      {/* Icon with glow when active */}
      <span
        className="shrink-0 flex items-center justify-center w-[30px] h-[30px] rounded-lg transition-all duration-200"
        style={{
          background: active ? `color-mix(in oklch, ${groupColor} 18%, transparent)` : 'transparent',
          boxShadow: active ? `0 0 10px color-mix(in oklch, ${groupColor} 30%, transparent)` : 'none',
        }}
      >
        <Icon
          size={14}
          style={{ color: active ? groupColor : 'currentColor', opacity: active ? 1 : 0.55 }}
        />
      </span>

      {/* Label + sub (expanded only) */}
      {!collapsed && (
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-semibold truncate leading-none">{item.label}</span>
            {item.isNew && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: 'oklch(0.72 0.19 167 / 20%)', color: 'oklch(0.72 0.19 167)' }}>
                New
              </span>
            )}
          </div>
          {item.sub && (
            <p className="text-[10px] truncate mt-0.5 leading-none"
              style={{ color: active ? `color-mix(in oklch, ${groupColor} 75%, var(--aq-text-muted))` : 'var(--aq-text-faint)' }}>
              {item.sub}
            </p>
          )}
        </div>
      )}

      {/* Arrow / badge */}
      {!collapsed && (
        <>
          {item.badge && (
            <span className="ml-auto shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: 'oklch(0.75 0.18 25 / 20%)', color: 'oklch(0.75 0.18 25)' }}>
              {item.badge}
            </span>
          )}
        </>
      )}

      {/* Collapsed tooltip (hover) */}
      {collapsed && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none z-[200]
          opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ whiteSpace: 'nowrap' }}>
          <div className="glass-panel px-2.5 py-1.5" style={{ borderRadius: '0.5rem' }}>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--aq-text-primary)' }}>{item.label}</p>
            {item.sub && <p className="text-[9px]" style={{ color: 'var(--aq-text-faint)' }}>{item.sub}</p>}
          </div>
        </div>
      )}
    </motion.button>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { employee, logout, hasRole } = useAuth();
  const [isMobileOpen, setIsMobileOpen]   = useState(false);
  const [isCollapsed, setIsCollapsed]     = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('aq-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-light', !isDark);
    root.classList.toggle('theme-dark', isDark);
    localStorage.setItem('aq-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(d => !d), []);

  // ── Nav filtering ──────────────────────────────────────────────────────────
  const visibleGroups = ALL_NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => !item.roles || item.roles.some(r => hasRole(r))),
  })).filter(g => g.items.length > 0);

  const allItems     = visibleGroups.flatMap(g => g.items);
  const currentPage  = allItems.find(i => i.id === activeTab) ?? allItems[0];
  const currentGroup = visibleGroups.find(g => g.items.some(i => i.id === activeTab));

  const roleLabel = employee ? ROLE_LABELS[employee.role] ?? employee.role : 'Employee';
  const roleBadge = employee ? ROLE_COLORS[employee.role] : 'aq-badge-blue';

  const toggleGroup = (g: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(g) ? next.delete(g) : next.add(g);
    return next;
  });

  // ── Sidebar inner content ──────────────────────────────────────────────────
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
    const collapsed = !onClose && isCollapsed; // mobile is never collapsed

    return (
      <div className="flex flex-col h-full aq-sidebar overflow-hidden" style={{ width: '100%' }}>

        {/* ── Logo Row ──────────────────────────────────────────────────────── */}
        <div className="flex items-center shrink-0 overflow-hidden"
          style={{
            padding: collapsed ? '1.1rem 0' : '1rem 0.875rem 0.875rem',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--aq-sidebar-border)',
          }}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))' }}>
              <Waves size={15} style={{ color: 'oklch(0.08 0.015 200)' }} />
            </div>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <p className="text-[13px] font-black leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                  AquaGrow
                </p>
                <p className="text-[8px] uppercase tracking-[0.18em] font-bold mt-0.5" style={{ color: 'var(--aq-text-faint)' }}>
                  HRMS Portal
                </p>
              </motion.div>
            )}
          </div>
          {/* Collapse toggle — desktop only */}
          {!onClose && (
            <button onClick={() => setIsCollapsed(c => !c)}
              className="hidden lg:flex shrink-0 p-1.5 rounded-lg transition-colors duration-200"
              style={{ color: 'var(--aq-text-faint)' }}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed
                ? <PanelLeftOpen size={14} />
                : <PanelLeftClose size={14} />}
            </button>
          )}
        </div>

        {/* ── User Profile Card ─────────────────────────────────────────────── */}
        <div className="shrink-0 px-2 pt-3 pb-2">
          <div className="rounded-xl flex items-center gap-2.5 overflow-hidden transition-all duration-200"
            style={{
              padding: collapsed ? '0.6rem' : '0.65rem 0.75rem',
              background: 'color-mix(in oklch, var(--primary) 8%, var(--aq-glass-bg))',
              border: '1px solid color-mix(in oklch, var(--primary) 15%, var(--aq-glass-border))',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
            {/* Avatar */}
            {employee?.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.name}
                className="shrink-0 w-8 h-8 rounded-lg object-cover"
                style={{ boxShadow: '0 0 0 2px var(--primary)', opacity: 0.9 }} />
            ) : (
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))',
                  color: 'oklch(0.08 0.015 200)',
                  boxShadow: '0 0 0 2px var(--primary)',
                }}>
                {employee?.name?.charAt(0) ?? 'A'}
              </div>
            )}

            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate leading-none" style={{ color: 'var(--aq-text-primary)' }}>
                  {employee?.name ?? 'Employee'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`aq-badge ${roleBadge}`} style={{ fontSize: '7.5px' }}>{roleLabel}</span>
                  {employee?.empId && (
                    <span className="text-[9px] font-mono" style={{ color: 'var(--aq-text-faint)' }}>
                      {employee.empId}
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {!collapsed && (
              <span className="shrink-0 w-2 h-2 rounded-full pulse-ring"
                style={{ background: 'oklch(0.72 0.19 167)' }} />
            )}
          </div>
        </div>

        {/* ── Navigation ────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 space-y-1"
          style={{ scrollbarWidth: 'thin' }}>
          {visibleGroups.map((group, gi) => {
            const meta         = GROUP_META[group.group] ?? { icon: Zap, color: 'var(--primary)' };
            const GroupIcon    = meta.icon;
            const groupColor   = meta.color;
            const isGCollapsed = !collapsed && collapsedGroups.has(group.group);

            return (
              <div key={group.group}>
                {/* Group header */}
                {collapsed ? (
                  // In collapsed mode: just a thin colored divider
                  gi > 0 && (
                    <div className="my-2 mx-auto w-5 h-px rounded-full"
                      style={{ background: `color-mix(in oklch, ${groupColor} 25%, transparent)` }} />
                  )
                ) : (
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg mb-0.5 transition-colors"
                    style={{ color: 'var(--aq-text-faint)' }}
                  >
                    <GroupIcon size={10} style={{ color: groupColor, opacity: 0.9 }} />
                    <span className="flex-1 text-left text-[9px] uppercase tracking-[0.14em] font-black">
                      {group.group}
                    </span>
                    <ChevronDown size={9}
                      className="transition-transform duration-200"
                      style={{ transform: isGCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                  </button>
                )}

                {/* Group items */}
                <AnimatePresence initial={false}>
                  {!isGCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className={collapsed ? 'space-y-1' : 'space-y-0.5'}>
                        {group.items.map(item => (
                          <NavBtn
                            key={item.id}
                            item={item}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            collapsed={collapsed}
                            groupColor={groupColor}
                            onClose={onClose}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-2 pb-3 space-y-1" style={{ borderTop: '1px solid var(--aq-sidebar-border)', paddingTop: '0.5rem' }}>
          {/* Version badge */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: 'var(--aq-glass-bg)' }}>
              <Zap size={9} style={{ color: 'oklch(0.72 0.19 167)', flexShrink: 0 }} />
              <p className="text-[9px]" style={{ color: 'var(--aq-text-faint)' }}>
                AquaGrow HRMS <span style={{ color: 'oklch(0.72 0.19 167)' }}>v2.1</span>
              </p>
            </div>
          )}
          {/* Sign out */}
          <motion.button
            whileHover={{ x: collapsed ? 0 : 2 }}
            onClick={logout}
            title="Sign Out"
            className="w-full flex items-center rounded-xl transition-all duration-150 group"
            style={{
              padding: collapsed ? '0.6rem' : '0.55rem 0.75rem',
              gap: collapsed ? 0 : '0.6rem',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'var(--aq-text-faint)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'oklch(0.65 0.22 25 / 10%)';
              (e.currentTarget as HTMLElement).style.color = 'oklch(0.75 0.18 25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--aq-text-faint)';
            }}
          >
            <LogOut size={14} className="shrink-0" />
            {!collapsed && <span className="text-[12.5px] font-semibold">Sign Out</span>}
          </motion.button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--aq-body-bg)' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: isCollapsed ? 64 : 224 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="hidden lg:flex flex-col shrink-0 overflow-visible"
        style={{ position: 'relative', zIndex: 10 }}
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile Drawer ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -224 }} animate={{ x: 0 }} exit={{ x: -224 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-56 lg:hidden"
            >
              <SidebarContent onClose={() => setIsMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Header ────────────────────────────────────────────────────── */}
        <header
          className="shrink-0 flex items-center justify-between gap-3 px-4 lg:px-5"
          style={{
            minHeight: '54px',
            background: 'var(--aq-sidebar-bg)',
            borderBottom: '1px solid var(--aq-sidebar-border)',
          }}
        >
          {/* Left: mobile burger + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden shrink-0 p-1.5 rounded-xl aq-btn-ghost !p-1.5"
            >
              <Menu size={17} />
            </button>

            {/* Breadcrumb */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {currentGroup && (
                  <>
                    <span className="text-[10px] font-bold hidden sm:inline truncate"
                      style={{ color: GROUP_META[currentGroup.group]?.color ?? 'var(--primary)' }}>
                      {currentGroup.group}
                    </span>
                    <ChevronRight size={9} className="hidden sm:inline shrink-0" style={{ color: 'var(--aq-text-faint)' }} />
                  </>
                )}
                <h2 className="text-[13px] font-bold truncate"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--aq-text-primary)' }}>
                  {currentPage?.label ?? 'Dashboard'}
                </h2>
              </div>
              <p className="text-[10px] hidden sm:block truncate mt-0.5"
                style={{ color: 'var(--aq-text-faint)' }}>
                {currentPage?.sub ?? new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-300"
              style={{
                background: isDark ? 'oklch(0.72 0.19 167 / 10%)' : 'oklch(0.50 0.14 60 / 10%)',
                border: `1px solid ${isDark ? 'oklch(0.72 0.19 167 / 22%)' : 'oklch(0.50 0.14 60 / 25%)'}`,
              }}
            >
              <motion.div
                key={isDark ? 'dark' : 'light'}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {isDark
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="oklch(0.78 0.17 70)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="oklch(0.40 0.14 240)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </motion.div>
              <span className="text-[10px] font-bold hidden sm:inline"
                style={{ color: isDark ? 'oklch(0.78 0.17 70)' : 'oklch(0.40 0.14 240)' }}>
                {isDark ? 'Light' : 'Dark'}
              </span>
            </motion.button>

            {/* Notification bell */}
            <motion.button
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
              className="relative p-2 rounded-xl transition-colors"
              style={{ color: 'var(--aq-text-muted)', background: 'var(--aq-glass-bg)', border: '1px solid var(--aq-glass-border)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full pulse-ring"
                style={{ background: 'oklch(0.72 0.19 167)' }} />
            </motion.button>

            {/* User avatar chip */}
            <motion.div whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 rounded-xl cursor-pointer px-2 py-1.5"
              style={{ background: 'var(--aq-glass-bg)', border: '1px solid var(--aq-glass-border)' }}>
              {employee?.photoUrl ? (
                <img src={employee.photoUrl} alt={employee.name}
                  className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px]"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.72 0.19 167), oklch(0.6 0.16 187))',
                    color: 'oklch(0.08 0.015 200)',
                  }}>
                  {employee?.name?.charAt(0) ?? 'A'}
                </div>
              )}
              <span className="text-[11px] font-semibold hidden sm:inline max-w-[80px] truncate"
                style={{ color: 'var(--aq-text-primary)' }}>
                {employee?.name?.split(' ')[0] ?? 'Me'}
              </span>
            </motion.div>

          </div>
        </header>

        {/* ── Page Content ────────────────────────────────────────────────────── */}
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
