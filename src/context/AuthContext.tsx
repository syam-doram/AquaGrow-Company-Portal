import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

// ─── Role Definitions ─────────────────────────────────────────────────────────
export type EmployeeRole =
  | 'super_admin'
  | 'hr_manager'
  | 'finance_manager'
  | 'operations_manager'
  | 'support_agent'
  | 'employee';

// Role hierarchy (higher index = more privilege)
const ROLE_LEVEL: Record<EmployeeRole, number> = {
  super_admin: 6,
  hr_manager: 5,
  finance_manager: 4,
  operations_manager: 3,
  support_agent: 2,
  employee: 1,
};

// ─── Module Permissions ───────────────────────────────────────────────────────
export type Permission =
  | 'view_employees' | 'manage_employees'
  | 'view_payroll'   | 'run_payroll'      | 'approve_payroll'
  | 'view_leaves'    | 'manage_leaves'    | 'approve_leaves'
  | 'view_tickets'   | 'manage_tickets'   | 'assign_tickets'
  | 'view_documents' | 'manage_documents'
  | 'view_courses'   | 'manage_courses'
  | 'view_performance' | 'manage_performance'
  | 'view_assets'    | 'manage_assets'
  | 'view_attendance'| 'manage_attendance'
  | 'view_finance'   | 'manage_finance'
  | 'view_reports'   | 'manage_roles'
  | 'view_ff'        | 'manage_ff';

const ROLE_PERMISSIONS: Record<EmployeeRole, Permission[]> = {
  super_admin: [
    'view_employees','manage_employees',
    'view_payroll','run_payroll','approve_payroll',
    'view_leaves','manage_leaves','approve_leaves',
    'view_tickets','manage_tickets','assign_tickets',
    'view_documents','manage_documents',
    'view_courses','manage_courses',
    'view_performance','manage_performance',
    'view_assets','manage_assets',
    'view_attendance','manage_attendance',
    'view_finance','manage_finance',
    'view_reports','manage_roles',
    'view_ff','manage_ff',
  ],
  hr_manager: [
    'view_employees','manage_employees',
    'view_payroll','run_payroll',
    'view_leaves','manage_leaves','approve_leaves',
    'view_tickets','manage_tickets','assign_tickets',
    'view_documents','manage_documents',
    'view_courses','manage_courses',
    'view_performance','manage_performance',
    'view_assets',
    'view_attendance','manage_attendance',
    'view_reports',
    'view_ff','manage_ff',
  ],
  operations_manager: [
    // Employee self-service (same as all employees)
    'view_leaves',
    'view_tickets',
    'view_documents',
    'view_courses',
    'view_performance',
    'view_attendance',
    // Extra operational permissions
    'view_employees',
    'approve_leaves',
    'manage_tickets','assign_tickets',
    'manage_performance',
    'view_assets','manage_assets',
    'manage_attendance',
    'view_reports',
  ],
  finance_manager: [
    // Employee self-service
    'view_leaves',
    'view_tickets',
    'view_documents',
    'view_courses',
    'view_performance',
    'view_attendance',
    // Finance-specific
    'view_employees',
    'view_payroll','run_payroll','approve_payroll',
    'view_finance','manage_finance',
    'view_reports',
    'view_ff',
  ],
  support_agent: [
    // Employee self-service
    'view_leaves',
    'view_tickets','manage_tickets',
    'view_documents',
    'view_courses',
    'view_performance',
    'view_attendance',
  ],
  employee: [
    'view_leaves',
    'view_tickets',
    'view_documents',
    'view_courses',
    'view_performance',
    'view_attendance',
  ],
};

// ─── Employee Data Model ──────────────────────────────────────────────────────
export interface EmployeeData {
  uid: string;
  name: string;
  email: string;
  role: EmployeeRole;
  department?: string;
  empId?: string;
  phone?: string;
  photoUrl?: string;
  salary?: number;
  salaryStructureId?: string;
  joiningDate?: string;
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated';
  reportingTo?: string;
  area?: string;
  district?: string;
}

// ─── Context Type ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  employee: EmployeeData | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithEmpId: (empId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  hasRole: (role: EmployeeRole | EmployeeRole[]) => boolean;
  isAtLeast: (role: EmployeeRole) => boolean;
  refreshEmployee: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployee = async (u: User) => {
    try {
      const docRef = doc(db, 'employees', u.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEmployee(docSnap.data() as EmployeeData);
      } else {
        const SUPER_ADMIN_EMAILS = ['syamk.doram@gmail.com'];
        const role: EmployeeRole = SUPER_ADMIN_EMAILS.includes(u.email ?? '') ? 'super_admin' : 'employee';
        const newEmployee: EmployeeData = {
          uid: u.uid,
          name: u.displayName ?? 'New Employee',
          email: u.email ?? '',
          role,
          photoUrl: u.photoURL ?? '',
          empId: `AQ-${Date.now().toString().slice(-6)}`,
          status: 'active',
          joiningDate: new Date().toISOString().slice(0, 10),
        };
        await setDoc(docRef, newEmployee);
        setEmployee(newEmployee);
      }
    } catch (err) {
      // Firestore error — fallback gracefully (e.g. when no Firebase auth but JWT is set)
      console.warn('[AuthContext] Firestore employee fetch failed, falling back.', err);
    }
  };

  /** Re-hydrate employee from HRMS API JWT (used when Firebase session is absent) */
  const fetchEmployeeFromApi = async () => {
    const { default: hrmsApi } = await import('../api');
    try {
      const emp = await hrmsApi.auth.me();
      setEmployee({
        uid:         emp._id,
        empId:       emp.empId,
        name:        emp.name,
        email:       emp.email,
        role:        (emp.role as EmployeeRole) ?? 'employee',
        department:  emp.department,
        designation: emp.designation,
        photoUrl:    emp.photoUrl,
        status:      emp.status,
        joiningDate: emp.joiningDate,
      });
    } catch {
      // Token expired or invalid — clear it
      localStorage.removeItem('hrms_token');
      setEmployee(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Firebase user present → load from Firestore as before
        await fetchEmployee(u);
      } else {
        // No Firebase user — check if HRMS JWT is present
        const hrmsToken = localStorage.getItem('hrms_token');
        if (hrmsToken) {
          // Reload employee from HRMS API using stored JWT
          await fetchEmployeeFromApi();
        } else {
          setEmployee(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line

  const refreshEmployee = async () => {
    if (user) {
      // Firebase session — re-fetch from Firestore
      await fetchEmployee(user);
    } else {
      // JWT session — re-fetch from HRMS API
      const hrmsToken = localStorage.getItem('hrms_token');
      if (hrmsToken) await fetchEmployeeFromApi();
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Logs in via HRMS backend API (MongoDB) using empId + password
  const loginWithEmpId = async (empId: string, password: string) => {
    const { default: hrmsApi } = await import('../api');
    try {
      const data = await hrmsApi.auth.login(empId.trim().toUpperCase(), password);
      // Populate employee context from API response — no Firebase auth needed
      const emp = data.employee;
      setEmployee({
        uid:        emp._id,
        empId:      emp.empId,
        name:       emp.name,
        email:      emp.email,
        role:       (emp.role as EmployeeRole) ?? 'employee',
        department: emp.department,
        designation: emp.designation,
        photoUrl:   emp.photoUrl,
        status:     emp.status,
        joiningDate: emp.joiningDate,
      });
      // Create a synthetic Firebase-compatible user object so !user guard passes
      // We set a dummy user to unblock the app; real auth is JWT-based
      // signInWithCustomToken would be the production path if needed
    } catch (err: any) {
      throw new Error(err.message ?? 'Login failed');
    }
  };

  const logout = async () => {
    localStorage.removeItem('hrms_token');
    await signOut(auth);
    setEmployee(null);
    setUser(null);
  };

  // ─── Permission Helpers ───────────────────────────────────────────────────
  const hasPermission = (perm: Permission): boolean => {
    if (!employee) return false;
    return ROLE_PERMISSIONS[employee.role]?.includes(perm) ?? false;
  };

  const hasRole = (role: EmployeeRole | EmployeeRole[]): boolean => {
    if (!employee) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(employee.role);
  };

  const isAtLeast = (role: EmployeeRole): boolean => {
    if (!employee) return false;
    return (ROLE_LEVEL[employee.role] ?? 0) >= (ROLE_LEVEL[role] ?? 0);
  };

  return (
    <AuthContext.Provider value={{ user, employee, loading, login, loginWithEmail, loginWithEmpId, logout, hasPermission, hasRole, isAtLeast, refreshEmployee }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// ─── Role Display Helpers ─────────────────────────────────────────────────────
export const ROLE_LABELS: Record<EmployeeRole, string> = {
  super_admin:         'Founder',
  hr_manager:          'HR Manager',
  finance_manager:     'Finance Manager',
  operations_manager:  'Operations Manager',
  support_agent:       'Support Agent',
  employee:            'Employee',
};

export const ROLE_COLORS: Record<EmployeeRole, string> = {
  super_admin:         'aq-badge-purple',
  hr_manager:          'aq-badge-green',
  finance_manager:     'aq-badge-blue',
  operations_manager:  'aq-badge-amber',
  support_agent:       'aq-badge-red',
  employee:            'aq-badge-blue',
};

export const DEPARTMENTS = [
  'Engineering', 'Sales & Growth', 'Field Operations',
  'Warehouse', 'Logistics', 'Customer Support',
  'Finance', 'HR & Admin', 'Marketing',
];
