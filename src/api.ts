/**
 * api.ts — Centralised API client for the AquaGrow HRMS Employee Portal
 *
 * Base URL: https://aquagrow.onrender.com/api/hrms
 *
 * Auth: Every request attaches the JWT from localStorage as a Bearer token.
 * The JWT is issued by POST /api/hrms/auth/login (empId + password).
 */

const BASE = 'https://aquagrow.onrender.com/api/hrms';

// ── Token helpers ──────────────────────────────────────────────────────────────
export const getToken  = () => localStorage.getItem('hrms_token') ?? '';
export const setToken  = (t: string) => localStorage.setItem('hrms_token', t);
export const clearToken = () => localStorage.removeItem('hrms_token');

// ── Core fetch wrapper ─────────────────────────────────────────────────────────
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json()).error ?? message; } catch {}
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as any;
  return res.json();
}

const get  = <T>(path: string) => apiFetch<T>(path);
const post = <T>(path: string, body: any) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const put  = <T>(path: string, body: any) => apiFetch<T>(path, { method: 'PUT',  body: JSON.stringify(body) });
const patch = <T>(path: string, body?: any) => apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const del  = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' });

// ════════════════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════════════════
export const hrmsApi = {
  auth: {
    /** Login with empId + password. Stores JWT automatically. */
    login: async (empId: string, password: string) => {
      const data = await post<{ token: string; employee: any }>('/auth/login', { empId, password });
      setToken(data.token);
      return data;
    },
    /** Verify token and return own profile. */
    me: () => get<any>('/auth/me'),
    logout: () => { clearToken(); },
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  EMPLOYEES
  // ════════════════════════════════════════════════════════════════════════════
  employees: {
    list: (params?: { dept?: string; status?: string; search?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/employees${q}`);
    },
    get:    (id: string) => get<any>(`/employees/${id}`),
    create: (data: any) => post<any>('/employees', data),
    update: (id: string, data: any) => put<any>(`/employees/${id}`, data),
    remove: (id: string) => del<any>(`/employees/${id}`),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  ATTENDANCE
  // ════════════════════════════════════════════════════════════════════════════
  attendance: {
    list: (params?: { empId?: string; month?: string; date?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/attendance${q}`);
    },
    checkIn:  () => post<any>('/attendance/checkin', {}),
    checkOut: () => post<any>('/attendance/checkout', {}),
    update:   (id: string, data: any) => put<any>(`/attendance/${id}`, data),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  LEAVES
  // ════════════════════════════════════════════════════════════════════════════
  leaves: {
    list:    (params?: { empId?: string; status?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/leaves${q}`);
    },
    apply:   (data: any) => post<any>('/leaves', data),
    update:  (id: string, data: any) => put<any>(`/leaves/${id}`, data),
    comment: (id: string, text: string) => post<any>(`/leaves/${id}/comment`, { text }),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  PAYROLL
  // ════════════════════════════════════════════════════════════════════════════
  payroll: {
    list:         (params?: { month?: string; empId?: string; status?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/payroll${q}`);
    },
    myPayslips:   () => get<any[]>('/payslips'),
    create:       (data: any) => post<any>('/payroll', data),
    bulkGenerate: (month: string) => post<any>('/payroll/bulk-generate', { month }),
    update:       (id: string, data: any) => put<any>(`/payroll/${id}`, data),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  RECRUITMENT — JOBS
  // ════════════════════════════════════════════════════════════════════════════
  jobs: {
    list:   (params?: { status?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/jobs${q}`);
    },
    create: (data: any) => post<any>('/jobs', data),
    update: (id: string, data: any) => put<any>(`/jobs/${id}`, data),
    remove: (id: string) => del<any>(`/jobs/${id}`),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  RECRUITMENT — CANDIDATES
  // ════════════════════════════════════════════════════════════════════════════
  candidates: {
    list:   (params?: { jobId?: string; status?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/candidates${q}`);
    },
    create: (data: any) => post<any>('/candidates', data),
    update: (id: string, data: any) => put<any>(`/candidates/${id}`, data),
    remove: (id: string) => del<any>(`/candidates/${id}`),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  TICKETS
  // ════════════════════════════════════════════════════════════════════════════
  tickets: {
    list:    (params?: { status?: string; category?: string; priority?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/tickets${q}`);
    },
    create:  (data: any) => post<any>('/tickets', data),
    update:  (id: string, data: any) => put<any>(`/tickets/${id}`, data),
    message: (id: string, text: string) => post<any>(`/tickets/${id}/message`, { text }),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  PERFORMANCE
  // ════════════════════════════════════════════════════════════════════════════
  performance: {
    list:   (params?: { empId?: string; period?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/performance${q}`);
    },
    create: (data: any) => post<any>('/performance', data),
    update: (id: string, data: any) => put<any>(`/performance/${id}`, data),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════
  dashboard: {
    stats: () => get<{
      totalEmployees: number;
      activeEmployees: number;
      presentToday: number;
      pendingLeaves: number;
      openTickets: number;
      payrollDrafts: number;
      attendanceRate: number;
      deptBreakdown: { _id: string; count: number }[];
    }>('/dashboard'),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════
  notifications: {
    list:     () => get<any[]>('/notifications'),
    markRead: () => patch('/notifications/mark-read'),
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  FULL & FINAL SETTLEMENT
  // ════════════════════════════════════════════════════════════════════════════
  fnf: {
    /** List all F&F settlements (HR/Finance view) */
    list: (params?: { status?: string; empId?: string }) => {
      const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return get<any[]>(`/fnf${q}`);
    },
    /** Get a specific F&F record */
    get: (id: string) => get<any>(`/fnf/${id}`),
    /** Initiate a new F&F for an employee (marks them as resigned/terminated) */
    create: (data: {
      employeeId: string;
      separationType: 'resignation' | 'termination' | 'retirement' | 'voluntary';
      lastWorkingDay: string;
      noticePeriodDays?: number;
      noticePeriodServed?: boolean;
      notes?: string;
    }) => post<any>('/fnf', data),
    /** Update settlement amounts / status */
    update: (id: string, data: {
      status?: string;
      gratuityAmount?: number;
      leaveEncashment?: number;
      noticePayDeduction?: number;
      bonusAmount?: number;
      otherDeductions?: number;
      otherEarnings?: number;
      settledAt?: string;
      hrNotes?: string;
    }) => put<any>(`/fnf/${id}`, data),
    /** HR/Finance approval */
    approve: (id: string) => patch<any>(`/fnf/${id}/approve`),
    /** Mark as settled/disbursed */
    disburse: (id: string, data: { paymentMode: string; transactionRef?: string }) =>
      patch<any>(`/fnf/${id}/disburse`, data),
  },
  // ════════════════════════════════════════════════════════════════════════════
  //  ADMIN USERS (create admin panel accounts from HRMS hires)
  // ════════════════════════════════════════════════════════════════════════════
  adminUsers: {
    /**
     * Provisions a new Admin Panel user.
     * Calls POST /api/admin/staff on the shared AquaGrow backend.
     * This makes the new hire immediately login-able on the admin panel.
     */
    create: (data: {
      name: string;
      phoneNumber: string;
      password: string;
      role: string;     // e.g. 'hr_admin', 'finance_admin', 'operations_admin' etc.
      email?: string;
      location?: string;
    }) =>
      apiFetch<any>('/admin/staff', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => apiFetch<any[]>('/admin/staff'),
    update: (id: string, data: { role?: string; isActive?: boolean; name?: string; email?: string }) =>
      apiFetch<any>(`/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => apiFetch<any>(`/admin/staff/${id}`, { method: 'DELETE' }),
  },
};

export default hrmsApi;
