import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Target, MapPin, ClipboardList, Wallet,
  Award, BookOpen, BarChart2, ChevronRight, Search, Filter,
  CheckCircle, XCircle, Clock, Star, TrendingUp, Phone,
  Mail, Calendar, Briefcase, Shield, Zap, Fuel, Receipt,
  AlertCircle, Edit2, Trash2, Eye, X, Plus, ChevronDown,
  ArrowUp, ArrowDown, Activity, Map, Navigation, FileText,
  DollarSign, Percent, Gift, UserCheck, RadioTower
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

type EmployeeRole =
  // Sales / Growth
  | 'SALES_EXECUTIVE' | 'FIELD_OFFICER' | 'DIGITAL_MARKETING'
  // Tech
  | 'BACKEND_DEV' | 'FRONTEND_DEV' | 'IOT_ENGINEER' | 'QA_TESTER'
  // Field
  | 'FIELD_TECHNICIAN' | 'IOT_SPECIALIST'
  // Operations
  | 'OPS_MANAGER' | 'ORDER_EXEC' | 'DISPATCH_EXEC'
  // Warehouse
  | 'WAREHOUSE_MANAGER' | 'INVENTORY_CTRL' | 'PICKER_PACKER'
  // Logistics
  | 'DELIVERY_COORD' | 'DELIVERY_AGENT'
  // Support
  | 'SUPPORT_EXEC' | 'AQUA_EXPERT'
  // Admin
  | 'ADMIN';
type EmpStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'WFH' | 'ON_LEAVE';

interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  empId: string;
  role: EmployeeRole;
  area: string;
  district: string;
  joiningDate: string;
  status: EmpStatus;
  avatar: string;
  salary: number;
  reportingTo: string;
}

interface Target {
  employeeId: string;
  month: string;
  salesTarget: number;
  salesAchieved: number;
  subscriptionTarget: number;
  subscriptionAchieved: number;
  onboardingTarget: number;
  onboardingAchieved: number;
  iotTarget: number;
  iotAchieved: number;
}

interface FieldVisit {
  id: string;
  employeeId: string;
  farmName: string;
  farmerName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  location: string;
  purpose: string;
  outcome: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  workHours: number;
}

interface Task {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: TaskStatus;
  dueDate: string;
  assignedDate: string;
}

interface Expense {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  category: 'FUEL' | 'FOOD' | 'TRAVEL' | 'ACCOMMODATION' | 'OTHER';
  description: string;
  status: ExpenseStatus;
  rejectionReason?: string;
  receipt?: string;
}

interface Training {
  id: string;
  employeeId: string;
  module: string;
  completedDate: string;
  score: number;
  certified: boolean;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_EMPLOYEES: Employee[] = [
  { id: 'E001', name: 'Ravi Kumar',    phone: '+91 98765 43210', email: 'ravi@aquagrow.in',    empId: 'AG-001', role: 'SALES_EXECUTIVE',   area: 'Nellore Central',  district: 'Nellore',       joiningDate: '2023-03-15', status: 'ACTIVE',   avatar: 'RK', salary: 28000, reportingTo: 'Admin' },
  { id: 'E002', name: 'Priya Sharma',  phone: '+91 87654 32109', email: 'priya@aquagrow.in',   empId: 'AG-002', role: 'FIELD_TECHNICIAN', area: 'Kavali Mandal',     district: 'Nellore',       joiningDate: '2023-06-01', status: 'ACTIVE',   avatar: 'PS', salary: 24000, reportingTo: 'Admin' },
  { id: 'E003', name: 'Suresh Babu',   phone: '+91 76543 21098', email: 'suresh@aquagrow.in',  empId: 'AG-003', role: 'IOT_SPECIALIST',   area: 'Ongole Zone',       district: 'Prakasam',      joiningDate: '2023-01-10', status: 'ACTIVE',   avatar: 'SB', salary: 32000, reportingTo: 'Admin' },
  { id: 'E004', name: 'Anitha Reddy',  phone: '+91 65432 10987', email: 'anitha@aquagrow.in',  empId: 'AG-004', role: 'FIELD_OFFICER',    area: 'Chirala Belt',      district: 'Bapatla',       joiningDate: '2023-09-20', status: 'ACTIVE',   avatar: 'AR', salary: 22000, reportingTo: 'Admin' },
  { id: 'E005', name: 'Venkat Rao',    phone: '+91 54321 09876', email: 'venkat@aquagrow.in',  empId: 'AG-005', role: 'SALES_EXECUTIVE',  area: 'Bhimavaram',        district: 'West Godavari', joiningDate: '2024-01-05', status: 'INACTIVE', avatar: 'VR', salary: 26000, reportingTo: 'Admin' },
  { id: 'E006', name: 'Lakshmi Devi',  phone: '+91 43210 98765', email: 'lakshmi@aquagrow.in', empId: 'AG-006', role: 'FIELD_TECHNICIAN', area: 'Narasapur',         district: 'West Godavari', joiningDate: '2024-03-12', status: 'ON_LEAVE', avatar: 'LD', salary: 23000, reportingTo: 'Admin' },
  // Operations Team
  { id: 'E007', name: 'Kiran Reddy',   phone: '+91 90001 11001', email: 'kiran@aquagrow.in',   empId: 'AG-007', role: 'OPS_MANAGER',      area: 'HQ - Hyderabad',    district: 'Hyderabad',     joiningDate: '2022-11-01', status: 'ACTIVE',   avatar: 'KR', salary: 55000, reportingTo: 'CEO' },
  { id: 'E008', name: 'Meena Kumari',  phone: '+91 90001 22002', email: 'meena@aquagrow.in',   empId: 'AG-008', role: 'ORDER_EXEC',       area: 'HQ - Hyderabad',    district: 'Hyderabad',     joiningDate: '2023-08-15', status: 'ACTIVE',   avatar: 'MK', salary: 28000, reportingTo: 'Kiran Reddy' },
  { id: 'E009', name: 'Arun Prasad',   phone: '+91 90001 33003', email: 'arun@aquagrow.in',    empId: 'AG-009', role: 'DISPATCH_EXEC',    area: 'HQ - Hyderabad',    district: 'Hyderabad',     joiningDate: '2023-10-01', status: 'ACTIVE',   avatar: 'AP', salary: 24000, reportingTo: 'Kiran Reddy' },
  // Warehouse Team
  { id: 'E010', name: 'Satish Goud',   phone: '+91 90002 11001', email: 'satish@aquagrow.in',  empId: 'AG-010', role: 'WAREHOUSE_MANAGER',area: 'Vijayawada WH',     district: 'Krishna',       joiningDate: '2023-02-01', status: 'ACTIVE',   avatar: 'SG', salary: 38000, reportingTo: 'Kiran Reddy' },
  { id: 'E011', name: 'Rupa Devi',     phone: '+91 90002 22002', email: 'rupa@aquagrow.in',    empId: 'AG-011', role: 'INVENTORY_CTRL',   area: 'Vijayawada WH',     district: 'Krishna',       joiningDate: '2023-02-15', status: 'ACTIVE',   avatar: 'RD', salary: 26000, reportingTo: 'Satish Goud' },
  { id: 'E012', name: 'Balu Naidu',    phone: '+91 90002 33003', email: 'balu@aquagrow.in',    empId: 'AG-012', role: 'PICKER_PACKER',    area: 'Nellore WH',        district: 'Nellore',       joiningDate: '2023-05-01', status: 'ACTIVE',   avatar: 'BN', salary: 18000, reportingTo: 'Satish Goud' },
  // Logistics Team
  { id: 'E013', name: 'Srinivas Rao',  phone: '+91 90003 11001', email: 'srini@aquagrow.in',   empId: 'AG-013', role: 'DELIVERY_COORD',   area: 'AP Zone',           district: 'Guntur',        joiningDate: '2023-07-01', status: 'ACTIVE',   avatar: 'SR', salary: 30000, reportingTo: 'Kiran Reddy' },
  { id: 'E014', name: 'Ramesh Dora',   phone: '+91 90003 22002', email: 'ramesh@aquagrow.in',  empId: 'AG-014', role: 'DELIVERY_AGENT',   area: 'Kavali–Nellore',    district: 'Nellore',       joiningDate: '2023-09-10', status: 'ACTIVE',   avatar: 'RD', salary: 16000, reportingTo: 'Srinivas Rao' },
  // Support Team
  { id: 'E015', name: 'Divya Sri',     phone: '+91 90004 11001', email: 'divya@aquagrow.in',   empId: 'AG-015', role: 'SUPPORT_EXEC',     area: 'Remote / HQ',       district: 'Hyderabad',     joiningDate: '2023-04-01', status: 'ACTIVE',   avatar: 'DS', salary: 25000, reportingTo: 'Admin' },
  { id: 'E016', name: 'Dr. Gopi Raju', phone: '+91 90004 22002', email: 'gopi@aquagrow.in',    empId: 'AG-016', role: 'AQUA_EXPERT',      area: 'Remote / HQ',       district: 'Hyderabad',     joiningDate: '2022-06-01', status: 'ACTIVE',   avatar: 'GR', salary: 52000, reportingTo: 'Admin' },
  // Tech Team
  { id: 'E017', name: 'Tarun Khanna',  phone: '+91 90005 11001', email: 'tarun@aquagrow.in',   empId: 'AG-017', role: 'BACKEND_DEV',      area: 'Remote / Pune',     district: 'Pune',          joiningDate: '2023-01-15', status: 'ACTIVE',   avatar: 'TK', salary: 70000, reportingTo: 'Admin' },
  { id: 'E018', name: 'Pooja Menon',   phone: '+91 90005 22002', email: 'pooja@aquagrow.in',   empId: 'AG-018', role: 'FRONTEND_DEV',     area: 'Remote / Bangalore',district: 'Bangalore',     joiningDate: '2023-03-01', status: 'ACTIVE',   avatar: 'PM', salary: 65000, reportingTo: 'Admin' },
  { id: 'E019', name: 'Raj Patel',     phone: '+91 90005 33003', email: 'raj@aquagrow.in',     empId: 'AG-019', role: 'IOT_ENGINEER',     area: 'Remote / Bangalore',district: 'Bangalore',     joiningDate: '2023-06-01', status: 'ACTIVE',   avatar: 'RP', salary: 68000, reportingTo: 'Admin' },
  { id: 'E020', name: 'Nisha Varma',   phone: '+91 90005 44004', email: 'nisha@aquagrow.in',   empId: 'AG-020', role: 'QA_TESTER',        area: 'Remote / Hyderabad',district: 'Hyderabad',     joiningDate: '2023-07-01', status: 'ACTIVE',   avatar: 'NV', salary: 40000, reportingTo: 'Admin' },
];

const SEED_TARGETS: Target[] = [
  { employeeId: 'E001', month: '2026-04', salesTarget: 150000, salesAchieved: 127500, subscriptionTarget: 20, subscriptionAchieved: 17, onboardingTarget: 15, onboardingAchieved: 12, iotTarget: 5, iotAchieved: 4 },
  { employeeId: 'E002', month: '2026-04', salesTarget: 80000, salesAchieved: 72000, subscriptionTarget: 10, subscriptionAchieved: 9, onboardingTarget: 8, onboardingAchieved: 7, iotTarget: 12, iotAchieved: 10 },
  { employeeId: 'E003', month: '2026-04', salesTarget: 60000, salesAchieved: 68000, subscriptionTarget: 6, subscriptionAchieved: 7, onboardingTarget: 5, onboardingAchieved: 6, iotTarget: 20, iotAchieved: 22 },
  { employeeId: 'E004', month: '2026-04', salesTarget: 50000, salesAchieved: 38000, subscriptionTarget: 8, subscriptionAchieved: 5, onboardingTarget: 20, onboardingAchieved: 14, iotTarget: 3, iotAchieved: 2 },
  { employeeId: 'E005', month: '2026-04', salesTarget: 120000, salesAchieved: 45000, subscriptionTarget: 15, subscriptionAchieved: 6, onboardingTarget: 10, onboardingAchieved: 4, iotTarget: 4, iotAchieved: 1 },
  { employeeId: 'E006', month: '2026-04', salesTarget: 70000, salesAchieved: 21000, subscriptionTarget: 8, subscriptionAchieved: 3, onboardingTarget: 6, onboardingAchieved: 2, iotTarget: 8, iotAchieved: 3 },
];

const SEED_VISITS: FieldVisit[] = [
  { id: 'V001', employeeId: 'E001', farmName: 'Sri Lakshmi Aqua Farm', farmerName: 'Govind Rao', date: '2026-04-17', checkIn: '09:30', checkOut: '11:45', location: 'Nellore, AP', purpose: 'Product Demo', outcome: 'Closed deal – Azolla 50kg + Probiotics', status: 'COMPLETED' },
  { id: 'V002', employeeId: 'E002', farmName: 'Raju Fish Farm', farmerName: 'Raju Babu', date: '2026-04-17', checkIn: '10:00', checkOut: '13:30', location: 'Kavali, AP', purpose: 'Aerator Repair', outcome: 'Replaced impeller, system operational', status: 'COMPLETED' },
  { id: 'V003', employeeId: 'E003', farmName: 'Modern Aqua Ltd', farmerName: 'Suryanarayana', date: '2026-04-17', checkIn: '08:00', checkOut: '16:00', location: 'Ongole, AP', purpose: 'IoT Installation', outcome: 'Installed 4 sensors + gateway', status: 'COMPLETED' },
  { id: 'V004', employeeId: 'E004', farmName: 'Krishna Prawn Farm', farmerName: 'Krishnamurthy', date: '2026-04-16', checkIn: '07:30', checkOut: '10:00', location: 'Chirala, AP', purpose: 'Farm Guidance', outcome: 'Advised on water quality management', status: 'COMPLETED' },
  { id: 'V005', employeeId: 'E001', farmName: 'Nellore Gold Farms', farmerName: 'Venkatesh', date: '2026-04-18', checkIn: '11:00', checkOut: '', location: 'Nellore, AP', purpose: 'Follow-up Visit', outcome: 'Pending', status: 'PENDING' },
];

const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: 'A001', employeeId: 'E001', date: '2026-04-18', checkIn: '09:05', checkOut: '18:30', status: 'PRESENT', workHours: 9.4 },
  { id: 'A002', employeeId: 'E002', date: '2026-04-18', checkIn: '08:55', checkOut: '18:00', status: 'PRESENT', workHours: 9.1 },
  { id: 'A003', employeeId: 'E003', date: '2026-04-18', checkIn: '08:00', checkOut: '17:00', status: 'PRESENT', workHours: 9.0 },
  { id: 'A004', employeeId: 'E004', date: '2026-04-18', checkIn: '09:30', checkOut: '14:30', status: 'HALF_DAY', workHours: 5.0 },
  { id: 'A005', employeeId: 'E005', date: '2026-04-18', checkIn: '', checkOut: '', status: 'ABSENT', workHours: 0 },
  { id: 'A006', employeeId: 'E006', date: '2026-04-18', checkIn: '', checkOut: '', status: 'ON_LEAVE', workHours: 0 },
];

const SEED_TASKS: Task[] = [
  { id: 'T001', employeeId: 'E001', title: 'Onboard 5 New Farmers – Nellore Zone', description: 'Visit and register 5 new farmers in the Nellore central area this week.', priority: 'HIGH', status: 'IN_PROGRESS', dueDate: '2026-04-22', assignedDate: '2026-04-15' },
  { id: 'T002', employeeId: 'E002', title: 'Aerator Maintenance – Kavali Cluster', description: 'Service all 8 aerators in the Kavali cluster and log service reports.', priority: 'HIGH', status: 'COMPLETED', dueDate: '2026-04-17', assignedDate: '2026-04-10' },
  { id: 'T003', employeeId: 'E003', title: 'IoT Deployment – Modern Aqua Ltd', description: 'Deploy 4 units at Modern Aqua Ltd facility and verify connectivity.', priority: 'HIGH', status: 'COMPLETED', dueDate: '2026-04-17', assignedDate: '2026-04-12' },
  { id: 'T004', employeeId: 'E004', title: 'Water Quality Survey – Chirala Belt', description: 'Conduct a water quality survey across 10 ponds and prepare report.', priority: 'MEDIUM', status: 'IN_PROGRESS', dueDate: '2026-04-25', assignedDate: '2026-04-16' },
  { id: 'T005', employeeId: 'E001', title: 'Monthly Sales Report – April', description: 'Compile and submit the monthly sales performance report.', priority: 'MEDIUM', status: 'PENDING', dueDate: '2026-04-30', assignedDate: '2026-04-18' },
  { id: 'T006', employeeId: 'E005', title: 'Q1 Recovery Plan', description: 'Submit revised targets and action plan for Q2 follow-up.', priority: 'HIGH', status: 'OVERDUE', dueDate: '2026-04-10', assignedDate: '2026-04-01' },
];

const SEED_EXPENSES: Expense[] = [
  { id: 'EX001', employeeId: 'E001', date: '2026-04-17', amount: 850, category: 'FUEL', description: 'Fuel for Nellore–Kavali round trip', status: 'APPROVED' },
  { id: 'EX002', employeeId: 'E001', date: '2026-04-16', amount: 350, category: 'FOOD', description: 'Lunch during field visit', status: 'APPROVED' },
  { id: 'EX003', employeeId: 'E002', date: '2026-04-17', amount: 1200, category: 'TRAVEL', description: 'Auto fare Kavali–Nellore HQ', status: 'PENDING' },
  { id: 'EX004', employeeId: 'E003', date: '2026-04-17', amount: 2500, category: 'ACCOMMODATION', description: 'Hotel stay – Ongole overnight', status: 'PENDING' },
  { id: 'EX005', employeeId: 'E004', date: '2026-04-16', amount: 600, category: 'FUEL', description: 'Scooter fuel for farm visits', status: 'APPROVED' },
  { id: 'EX006', employeeId: 'E005', date: '2026-04-15', amount: 4000, category: 'TRAVEL', description: 'Train ticket Bhimavaram–Hyderabad', status: 'REJECTED', rejectionReason: 'Not pre-approved travel' },
];

const SEED_TRAINING: Training[] = [
  { id: 'TR001', employeeId: 'E001', module: 'Product Knowledge – Aqua Feed', completedDate: '2024-01-20', score: 92, certified: true },
  { id: 'TR002', employeeId: 'E001', module: 'Sales Techniques & CRM', completedDate: '2024-02-10', score: 88, certified: true },
  { id: 'TR003', employeeId: 'E002', module: 'Aerator Maintenance Certification', completedDate: '2024-01-15', score: 96, certified: true },
  { id: 'TR004', employeeId: 'E003', module: 'IoT Device Configuration', completedDate: '2023-12-10', score: 98, certified: true },
  { id: 'TR005', employeeId: 'E003', module: 'Network & Connectivity Basics', completedDate: '2024-03-05', score: 85, certified: true },
  { id: 'TR006', employeeId: 'E004', module: 'Aquaculture Field Guidance', completedDate: '2024-02-20', score: 79, certified: true },
];

const performanceData = [
  { month: 'Jan', ravi: 82, priya: 75, suresh: 90, anitha: 68 },
  { month: 'Feb', ravi: 85, priya: 80, suresh: 88, anitha: 72 },
  { month: 'Mar', ravi: 79, priya: 85, suresh: 95, anitha: 74 },
  { month: 'Apr', ravi: 85, priya: 90, suresh: 110, anitha: 76 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_META: Record<EmployeeRole, { label: string; color: string; icon: React.ReactNode; team: string }> = {
  // Growth / Sales
  SALES_EXECUTIVE:  { label: 'Sales Executive',    color: 'text-blue-400 bg-blue-500/10',    icon: <TrendingUp size={10} />,  team: 'Growth & Sales' },
  FIELD_OFFICER:    { label: 'Field Officer',       color: 'text-emerald-400 bg-emerald-500/10', icon: <Map size={10} />,        team: 'Growth & Sales' },
  DIGITAL_MARKETING:{ label: 'Digital Marketing',  color: 'text-sky-400 bg-sky-500/10',      icon: <Zap size={10} />,         team: 'Growth & Sales' },
  // Tech
  BACKEND_DEV:      { label: 'Backend Dev',         color: 'text-violet-400 bg-violet-500/10',icon: <RadioTower size={10} />,  team: 'Tech' },
  FRONTEND_DEV:     { label: 'Frontend Dev',        color: 'text-purple-400 bg-purple-500/10',icon: <RadioTower size={10} />,  team: 'Tech' },
  IOT_ENGINEER:     { label: 'IoT Engineer',        color: 'text-indigo-400 bg-indigo-500/10',icon: <RadioTower size={10} />,  team: 'Tech' },
  QA_TESTER:        { label: 'QA Tester',           color: 'text-fuchsia-400 bg-fuchsia-500/10', icon: <Shield size={10} />,    team: 'Tech' },
  // Field
  FIELD_TECHNICIAN: { label: 'Field Technician',   color: 'text-orange-400 bg-orange-500/10',icon: <Briefcase size={10} />,   team: 'Growth & Sales' },
  IOT_SPECIALIST:   { label: 'IoT Specialist',      color: 'text-purple-400 bg-purple-500/10',icon: <RadioTower size={10} />,  team: 'Tech' },
  // Operations
  OPS_MANAGER:      { label: 'Ops Manager',         color: 'text-red-400 bg-red-500/10',      icon: <Shield size={10} />,      team: 'Operations' },
  ORDER_EXEC:       { label: 'Order Executive',     color: 'text-rose-400 bg-rose-500/10',    icon: <ClipboardList size={10} />, team: 'Operations' },
  DISPATCH_EXEC:    { label: 'Dispatch Executive',  color: 'text-pink-400 bg-pink-500/10',    icon: <Navigation size={10} />,  team: 'Operations' },
  // Warehouse
  WAREHOUSE_MANAGER:{ label: 'Warehouse Manager',  color: 'text-amber-400 bg-amber-500/10',  icon: <Briefcase size={10} />,   team: 'Warehouse' },
  INVENTORY_CTRL:   { label: 'Inventory Controller',color: 'text-yellow-400 bg-yellow-500/10',icon: <ClipboardList size={10} />, team: 'Warehouse' },
  PICKER_PACKER:    { label: 'Picker / Packer',    color: 'text-lime-400 bg-lime-500/10',    icon: <Briefcase size={10} />,   team: 'Warehouse' },
  // Logistics
  DELIVERY_COORD:   { label: 'Delivery Coordinator',color: 'text-teal-400 bg-teal-500/10',   icon: <Navigation size={10} />,  team: 'Logistics' },
  DELIVERY_AGENT:   { label: 'Delivery Agent',      color: 'text-cyan-400 bg-cyan-500/10',    icon: <MapPin size={10} />,      team: 'Logistics' },
  // Support
  SUPPORT_EXEC:     { label: 'Support Executive',  color: 'text-green-400 bg-green-500/10',  icon: <Phone size={10} />,       team: 'Customer Support' },
  AQUA_EXPERT:      { label: 'Aquaculture Expert',  color: 'text-emerald-300 bg-emerald-300/10', icon: <Star size={10} />,     team: 'Customer Support' },
  // Admin
  ADMIN:            { label: 'Admin',               color: 'text-red-400 bg-red-500/10',      icon: <Shield size={10} />,      team: 'Operations' },
};

const STATUS_META: Record<EmpStatus, { label: string; dot: string }> = {
  ACTIVE: { label: 'Active', dot: 'bg-emerald-400' },
  INACTIVE: { label: 'Inactive', dot: 'bg-red-400' },
  ON_LEAVE: { label: 'On Leave', dot: 'bg-amber-400' },
};

const pct = (achieved: number, target: number) => Math.min(100, Math.round((achieved / target) * 100));

const avatarColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500'];

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProgressBar = ({ value, color = 'bg-emerald-500' }: { value: number; color?: string }) => (
  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
    <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
  </div>
);

const StatCard = ({ label, value, sub, emoji, color }: { label: string; value: string | number; sub?: string; emoji: string; color: string }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="aq-kpi-card">
    <span className="aq-kpi-icon">{emoji}</span>
    <span className="aq-kpi-number" style={{ color }}>{value}</span>
    <span className="aq-kpi-label">{label}</span>
    {sub && <span style={{ fontSize: '0.55rem', color: 'var(--aq-text-muted)', marginTop: '-0.1rem' }}>{sub}</span>}
  </motion.div>
);

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-6">
    <h3 className="text-base font-display font-bold text-zinc-100">{title}</h3>
    {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
  </div>
);

// ─── Add/Edit Employee Modal ──────────────────────────────────────────────────

const BLANK_EMP: Omit<Employee, 'id' | 'avatar'> = {
  name: '', phone: '', email: '', empId: '',
  role: 'SALES_EXECUTIVE', area: '', district: '',
  joiningDate: new Date().toISOString().slice(0, 10),
  status: 'ACTIVE', salary: 20000, reportingTo: 'Admin',
};

const EmployeeModal = ({ emp, onClose, onSave }: {
  emp: Employee | null;
  onClose: () => void;
  onSave: (e: Employee) => void;
}) => {
  const isEdit = !!emp;
  const [form, setForm] = useState<Omit<Employee, 'id' | 'avatar'>>(emp ? { ...emp } : { ...BLANK_EMP });

  const handleSave = () => {
    const id = emp?.id ?? `E${String(Date.now()).slice(-4)}`;
    const avatar = form.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    onSave({ ...form, id, avatar });
    onClose();
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">{label}</label>
      <input
        type={type}
        value={String(form[key])}
        onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 transition-colors"
      />
    </div>
  );

  // Roles that can be ASSIGNED via the UI — never allow promoting someone to ADMIN/founder
  const ASSIGNABLE_ROLES = Object.keys(ROLE_META).filter(k => k !== 'ADMIN') as EmployeeRole[];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 transition-colors"><X size={18} /></button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Full Name', 'name')}
            {field('Employee ID', 'empId')}
            {field('Phone', 'phone')}
            {field('Email', 'email', 'email')}
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as EmployeeRole }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 transition-colors">
                {ASSIGNABLE_ROLES.map(k => (
                  <option key={k} value={k} className="bg-zinc-900">{ROLE_META[k].label}</option>
                ))}
              </select>
              <p className="text-[9px] text-zinc-600 mt-1">⚠ Founder / Admin role cannot be assigned via UI</p>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EmpStatus }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 transition-colors">
                <option value="ACTIVE" className="bg-zinc-900">Active</option>
                <option value="INACTIVE" className="bg-zinc-900">Inactive</option>
                <option value="ON_LEAVE" className="bg-zinc-900">On Leave</option>
              </select>
            </div>
            {field('Assigned Area', 'area')}
            {field('District', 'district')}
            {field('Joining Date', 'joiningDate', 'date')}
            {field('Salary (₹)', 'salary', 'number')}
          </div>
          <div className="p-6 border-t border-white/5 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-900 text-sm font-bold transition-colors">
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Expense Approval Row ─────────────────────────────────────────────────────

type ExpenseRowProps = {
  exp: Expense; empName: string;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
};

const ExpenseRow: React.FC<ExpenseRowProps> = ({ exp, empName, onApprove, onReject }) => {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const catIcon = { FUEL: <Fuel size={14} />, FOOD: <Receipt size={14} />, TRAVEL: <Navigation size={14} />, ACCOMMODATION: <Map size={14} />, OTHER: <FileText size={14} /> };

  return (
    <div className="p-4 hover:bg-white/3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-white/5 text-zinc-400">{catIcon[exp.category]}</div>
          <div>
            <p className="text-sm font-bold text-zinc-100">{exp.description}</p>
            <p className="text-[10px] text-zinc-500">{empName} · {exp.date} · <span className="uppercase">{exp.category}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono font-bold text-white">₹{exp.amount.toLocaleString()}</span>
          {exp.status === 'PENDING' ? (
            <div className="flex items-center gap-2">
              <button onClick={() => onApprove(exp.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"><CheckCircle size={16} /></button>
              <button onClick={() => setShowReject(r => !r)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><XCircle size={16} /></button>
            </div>
          ) : (
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${exp.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {exp.status}
            </span>
          )}
        </div>
      </div>
      {showReject && (
        <div className="mt-3 flex gap-2">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Rejection reason…"
            className="flex-1 bg-white/5 border border-red-500/30 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none" />
          <button onClick={() => { onReject(exp.id, reason); setShowReject(false); }}
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors">
            Confirm
          </button>
        </div>
      )}
      {exp.status === 'REJECTED' && exp.rejectionReason && (
        <p className="mt-2 text-[10px] text-red-400/70 pl-12">Reason: {exp.rejectionReason}</p>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: 'teams',      label: 'Teams',        icon: <Users size={14} /> },
  { id: 'overview',  label: 'All Staff',     icon: <UserCheck size={14} /> },
  { id: 'targets',   label: 'Targets',       icon: <Target size={14} /> },
  { id: 'visits',    label: 'Field Visits',  icon: <MapPin size={14} /> },
  { id: 'attendance',label: 'Attendance',    icon: <CheckCircle size={14} /> },
  { id: 'tasks',     label: 'Tasks',         icon: <ClipboardList size={14} /> },
  { id: 'expenses',  label: 'Expenses',      icon: <Wallet size={14} /> },
  { id: 'incentives',label: 'Incentives',    icon: <Award size={14} /> },
  { id: 'training',  label: 'Training',      icon: <BookOpen size={14} /> },
  { id: 'analytics', label: 'Analytics',     icon: <BarChart2 size={14} /> },
];

// ─── 6-Team Structure ─────────────────────────────────────────────────────────
const TEAM_CONFIG = [
  {
    id: 'operations', name: 'Operations Team', emoji: '🧠', subtitle: 'Backbone — Order to Delivery',
    gradient: 'from-red-500/10 to-rose-500/5', border: 'border-red-500/20', accent: 'text-red-400',
    roles: ['OPS_MANAGER', 'ORDER_EXEC', 'DISPATCH_EXEC'],
    dailyTasks: ['Order verification & confirmation', 'Complete flow control (order → delivery)', 'Issue resolution & escalation', 'Warehouse & logistics coordination', 'Dispatch assign & tracking'],
    kpis: ['Orders confirmed / day', 'Issue resolution time', 'SLA compliance %'],
  },
  {
    id: 'warehouse', name: 'Warehouse Team', emoji: '📦', subtitle: 'Physical product handling',
    gradient: 'from-amber-500/10 to-yellow-500/5', border: 'border-amber-500/20', accent: 'text-amber-400',
    roles: ['WAREHOUSE_MANAGER', 'INVENTORY_CTRL', 'PICKER_PACKER'],
    dailyTasks: ['Stock update (in/out) every morning', 'Medicine expiry check (daily)', 'Batch number verification', 'Packing accuracy check before dispatch', 'Cold storage monitoring'],
    kpis: ['Stock accuracy %', 'Pack error rate', 'Expiry alerts cleared'],
  },
  {
    id: 'logistics', name: 'Logistics Team', emoji: '🚚', subtitle: 'Last-mile delivery management',
    gradient: 'from-teal-500/10 to-cyan-500/5', border: 'border-teal-500/20', accent: 'text-teal-400',
    roles: ['DELIVERY_COORD', 'DELIVERY_AGENT'],
    dailyTasks: ['Route planning for the day', 'Delivery status update every 2h', 'Farmer confirmation on delivery', 'Rural manual delivery tracking', 'Failed delivery rescheduling'],
    kpis: ['On-time delivery %', 'Failed delivery rate', 'Avg delivery time (hrs)'],
  },
  {
    id: 'support', name: 'Customer Support', emoji: '📞', subtitle: 'Most important for farmer trust',
    gradient: 'from-green-500/10 to-emerald-500/5', border: 'border-green-500/20', accent: 'text-green-400',
    roles: ['SUPPORT_EXEC', 'AQUA_EXPERT'],
    dailyTasks: ['Product usage guidance to farmers', 'Ticket resolution (call/chat)', 'Farmer guidance (oxygen, feed, disease)', 'Escalate complex issues to Aqua Expert', 'Pond condition review from app logs'],
    kpis: ['Tickets resolved / day', 'CSAT score', 'Avg first response time'],
  },
  {
    id: 'tech', name: 'Tech Team', emoji: '💻', subtitle: 'Critical for platform stability',
    gradient: 'from-violet-500/10 to-purple-500/5', border: 'border-violet-500/20', accent: 'text-violet-400',
    roles: ['BACKEND_DEV', 'FRONTEND_DEV', 'IOT_ENGINEER', 'QA_TESTER'],
    dailyTasks: ['App maintenance & bug fixes', 'Notification pipeline health check', 'IoT device connectivity monitoring', 'Release testing & QA sign-off', 'API uptime monitoring'],
    kpis: ['App uptime %', 'Bug resolution SLA', 'IoT device online rate'],
  },
  {
    id: 'growth', name: 'Growth & Sales', emoji: '📊', subtitle: 'Farmer acquisition & product awareness',
    gradient: 'from-blue-500/10 to-sky-500/5', border: 'border-blue-500/20', accent: 'text-blue-400',
    roles: ['SALES_EXECUTIVE', 'FIELD_OFFICER', 'FIELD_TECHNICIAN', 'DIGITAL_MARKETING'],
    dailyTasks: ['Farmer onboarding visits (5 per week)', 'Product demo at farms', 'Local market awareness drives', 'AquaShop order follow-up', 'Social media & WhatsApp campaigns'],
    kpis: ['Farmers onboarded / month', 'Sales revenue / field exec', 'Subscription conversions'],
  },
] as const;

const EmployeeManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('teams');
  const [employees, setEmployees] = useState<Employee[]>(SEED_EMPLOYEES);
  const [targets] = useState<Target[]>(SEED_TARGETS);
  const [visits] = useState<FieldVisit[]>(SEED_VISITS);
  const [attendance] = useState<AttendanceRecord[]>(SEED_ATTENDANCE);
  const [tasks] = useState<Task[]>(SEED_TASKS);
  const [expenses, setExpenses] = useState<Expense[]>(SEED_EXPENSES);
  const [training] = useState<Training[]>(SEED_TRAINING);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'ALL'>('ALL');

  const filteredEmployees = useMemo(() => employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(searchQ.toLowerCase()) || e.area.toLowerCase().includes(searchQ.toLowerCase());
    const matchRole = roleFilter === 'ALL' || e.role === roleFilter;
    return matchSearch && matchRole;
  }), [employees, searchQ, roleFilter]);

  // ─── Derived: employees by team ───────────────────────────────────────────
  const empsByTeam = useMemo(() => {
    return Object.fromEntries(
      TEAM_CONFIG.map(team => [
        team.id,
        employees.filter(e => (team.roles as readonly string[]).includes(e.role))
      ])
    );
  }, [employees]);

  const handleSaveEmployee = (emp: Employee) => {
    setEmployees(prev => {
      const exists = prev.find(e => e.id === emp.id);
      return exists ? prev.map(e => e.id === emp.id ? emp : e) : [...prev, emp];
    });
  };

  const handleApproveExpense = (id: string) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'APPROVED' } : e));
  const handleRejectExpense = (id: string, reason: string) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, status: 'REJECTED', rejectionReason: reason } : e));

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? id;

  const totalStats = useMemo(() => ({
    active: employees.filter(e => e.status === 'ACTIVE').length,
    onLeave: employees.filter(e => e.status === 'ON_LEAVE').length,
    pendingExpenses: expenses.filter(e => e.status === 'PENDING').length,
    pendingAmount: expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0),
    totalVisitsToday: visits.filter(v => v.date === '2026-04-18').length,
    avgTargetAchievement: Math.round(targets.reduce((s, t) => s + pct(t.salesAchieved, t.salesTarget), 0) / targets.length),
  }), [employees, expenses, visits, targets]);

  // ─── TAB: Overview ─────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Staff"   value={totalStats.active}           emoji="👥" color="oklch(0.55 0.19 167)" sub={`${totalStats.onLeave} on leave`} />
        <StatCard label="Today's Visits" value={totalStats.totalVisitsToday}  emoji="📍" color="oklch(0.58 0.18 240)" sub="Field activities" />
        <StatCard label="Pending Claims" value={`₹${totalStats.pendingAmount.toLocaleString()}`} emoji="💰" color="oklch(0.70 0.18 80)" sub={`${totalStats.pendingExpenses} awaiting approval`} />
        <StatCard label="Avg Target Hit" value={`${totalStats.avgTargetAchievement}%`} emoji="🎯" color="oklch(0.60 0.20 295)" sub="This month" />
      </div>

      <div className="aq-card overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <Search size={14} className="text-zinc-500" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search employees or area…"
              className="bg-transparent text-sm text-zinc-100 outline-none flex-1 placeholder:text-zinc-600" />
          </div>
          <div className="flex items-center gap-3">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as EmployeeRole | 'ALL')}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none">
              <option value="ALL" className="bg-zinc-900">All Roles</option>
              {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k} className="bg-zinc-900">{v.label}</option>)}
            </select>
            <button onClick={() => { setEditEmp(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-900 text-xs font-bold transition-colors">
              <UserPlus size={14} /> Add Employee
            </button>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {filteredEmployees.map((emp, i) => {
            const empTarget = targets.find(t => t.employeeId === emp.id);
            const salesPct = empTarget ? pct(empTarget.salesAchieved, empTarget.salesTarget) : 0;
            const attToday = attendance.find(a => a.employeeId === emp.id && a.date === '2026-04-18');
            return (
              <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-5 flex items-center gap-5 hover:bg-white/3 transition-all cursor-pointer group"
                onClick={() => setSelectedEmp(emp)}>
                <div className={`w-10 h-10 rounded-xl ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {emp.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-zinc-100">{emp.name}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${ROLE_META[emp.role].color}`}>
                      {ROLE_META[emp.role].icon} {ROLE_META[emp.role].label}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{emp.empId} · {emp.area} · {emp.district}</p>
                </div>
                <div className="hidden md:flex flex-col items-center w-28">
                  <div className="flex items-center justify-between w-full mb-1">
                    <p className="text-[9px] text-zinc-500 uppercase font-bold">Target</p>
                    <p className={`text-[10px] font-bold ${salesPct >= 100 ? 'text-emerald-400' : salesPct >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>{salesPct}%</p>
                  </div>
                  <ProgressBar value={salesPct} color={salesPct >= 100 ? 'bg-emerald-500' : salesPct >= 75 ? 'bg-blue-500' : 'bg-amber-500'} />
                </div>
                <div className="hidden md:block text-center">
                  <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
                    attToday?.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400' :
                    attToday?.status === 'ABSENT' ? 'bg-red-500/10 text-red-400' :
                    attToday?.status === 'ON_LEAVE' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-500/10 text-zinc-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      attToday?.status === 'PRESENT' ? 'bg-emerald-400' :
                      attToday?.status === 'ABSENT' ? 'bg-red-400' : 'bg-amber-400'
                    }`} />
                    {attToday?.status ?? 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded-full font-bold ${STATUS_META[emp.status].dot === 'bg-emerald-400' ? 'bg-emerald-500/10 text-emerald-400' : STATUS_META[emp.status].dot === 'bg-red-400' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[emp.status].dot}`} />
                    {STATUS_META[emp.status].label}
                  </span>
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={e => { e.stopPropagation(); setEditEmp(emp); setShowModal(true); }}>
                    <Edit2 size={14} />
                  </button>
                  <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── TAB: Targets ───────────────────────────────────────────────────────────

  const renderTargets = () => (
    <div className="space-y-6">
      <SectionHeader title="Target vs. Achieved — April 2026" sub="Track monthly performance against assigned targets per employee" />
      <div className="space-y-4">
        {targets.map(t => {
          const emp = employees.find(e => e.id === t.employeeId);
          if (!emp) return null;
          const i = employees.indexOf(emp);
          const items = [
            { label: 'Sales Revenue', target: `₹${(t.salesTarget / 1000).toFixed(0)}K`, achieved: `₹${(t.salesAchieved / 1000).toFixed(0)}K`, pct: pct(t.salesAchieved, t.salesTarget), color: 'bg-emerald-500' },
            { label: 'Subscriptions', target: t.subscriptionTarget, achieved: t.subscriptionAchieved, pct: pct(t.subscriptionAchieved, t.subscriptionTarget), color: 'bg-blue-500' },
            { label: 'Farmer Onboarding', target: t.onboardingTarget, achieved: t.onboardingAchieved, pct: pct(t.onboardingAchieved, t.onboardingTarget), color: 'bg-purple-500' },
            { label: 'IoT Installations', target: t.iotTarget, achieved: t.iotAchieved, pct: pct(t.iotAchieved, t.iotTarget), color: 'bg-amber-500' },
          ];
          const overall = Math.round(items.reduce((s, x) => s + x.pct, 0) / items.length);
          return (
            <div key={t.employeeId} className="glass-panel p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-9 h-9 rounded-xl ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{emp.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{emp.name}</p>
                      <p className="text-[10px] text-zinc-500">{ROLE_META[emp.role].label} · {emp.area}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-display font-bold ${overall >= 100 ? 'text-emerald-400' : overall >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>{overall}%</p>
                      <p className="text-[9px] text-zinc-500 uppercase font-bold">Overall</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">{item.label}</p>
                      <p className="text-[10px] font-mono text-zinc-300">{item.achieved} / {item.target}</p>
                    </div>
                    <ProgressBar value={item.pct} color={item.color} />
                    <p className={`text-[10px] font-bold mt-1 ${item.pct >= 100 ? 'text-emerald-400' : item.pct >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>{item.pct}% achieved</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── TAB: Field Visits ──────────────────────────────────────────────────────

  const renderVisits = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Visits" value={visits.length} emoji="📍" color="oklch(0.58 0.18 240)" />
        <StatCard label="Completed" value={visits.filter(v => v.status === 'COMPLETED').length} emoji="✅" color="oklch(0.55 0.19 167)" />
        <StatCard label="Today's Visits" value={visits.filter(v => v.date === '2026-04-18').length} emoji="📅" color="oklch(0.60 0.20 295)" />
        <StatCard label="Pending" value={visits.filter(v => v.status === 'PENDING').length} emoji="⏳" color="oklch(0.70 0.18 80)" />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-white/3">
          <h4 className="font-display font-bold">Field Visit Log</h4>
        </div>
        <div className="divide-y divide-white/5">
          {visits.map((v, i) => {
            const emp = employees.find(e => e.id === v.employeeId);
            const empIdx = employees.indexOf(emp!);
            const duration = v.checkOut
              ? `${Math.round((new Date(`2000-01-01T${v.checkOut}`).getTime() - new Date(`2000-01-01T${v.checkIn}`).getTime()) / 60000)}m`
              : 'Ongoing';
            return (
              <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="p-5 hover:bg-white/3 transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 mt-0.5"><MapPin size={15} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-zinc-100">{v.farmName}</p>
                        <p className="text-[10px] text-zinc-500">{v.farmerName} · {v.location}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full shrink-0 ${v.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : v.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Calendar size={10} /> {v.date}</span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Clock size={10} /> {v.checkIn}{v.checkOut ? ` – ${v.checkOut}` : ''} ({duration})</span>
                      <span className="text-[10px] text-blue-400 font-bold">{v.purpose}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1.5 italic">"{v.outcome}"</p>
                    <div className={`inline-flex items-center gap-1.5 mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${avatarColors[empIdx % avatarColors.length]} bg-opacity-10`}>
                      <span className={`w-3.5 h-3.5 rounded-full ${avatarColors[empIdx % avatarColors.length]} flex items-center justify-center text-white text-[7px] font-bold`}>{emp?.avatar?.slice(0, 1)}</span>
                      {emp?.name}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── TAB: Attendance ────────────────────────────────────────────────────────

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Present Today" value={attendance.filter(a => a.status === 'PRESENT').length} emoji="?" color="oklch(0.55 0.19 167)" />
        <StatCard label="Absent" value={attendance.filter(a => a.status === 'ABSENT').length} emoji="?" color="oklch(0.62 0.22 25)" />
        <StatCard label="Half Day" value={attendance.filter(a => a.status === 'HALF_DAY').length} emoji="?" color="oklch(0.70 0.18 80)" />
        <StatCard label="On Leave" value={attendance.filter(a => a.status === 'ON_LEAVE').length} emoji="??" color="oklch(0.60 0.20 295)" />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-white/3 flex items-center justify-between">
          <h4 className="font-display font-bold">Today's Attendance — April 18, 2026</h4>
        </div>
        <div className="divide-y divide-white/5">
          {attendance.map((a, i) => {
            const emp = employees.find(e => e.id === a.employeeId);
            const empIdx = employees.indexOf(emp!);
            const statusColors: Record<AttendanceStatus, string> = {
              PRESENT: 'bg-emerald-500/10 text-emerald-400',
              ABSENT: 'bg-red-500/10 text-red-400',
              HALF_DAY: 'bg-amber-500/10 text-amber-400',
              WFH: 'bg-blue-500/10 text-blue-400',
              ON_LEAVE: 'bg-purple-500/10 text-purple-400',
            };
            return (
              <div key={a.id} className="p-5 flex items-center gap-4 hover:bg-white/3 transition-all">
                <div className={`w-9 h-9 rounded-xl ${avatarColors[empIdx % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{emp?.avatar}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-zinc-100">{emp?.name}</p>
                  <p className="text-[10px] text-zinc-500">{ROLE_META[emp?.role ?? 'ADMIN'].label} · {emp?.area}</p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-center">
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Check In</p>
                    <p className="text-xs font-mono font-bold text-zinc-200">{a.checkIn || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Check Out</p>
                    <p className="text-xs font-mono font-bold text-zinc-200">{a.checkOut || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Hours</p>
                    <p className="text-xs font-mono font-bold text-zinc-200">{a.workHours > 0 ? `${a.workHours}h` : '—'}</p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${statusColors[a.status]}`}>{a.status.replace('_', ' ')}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── TAB: Tasks ─────────────────────────────────────────────────────────────

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={tasks.length} emoji="??" color="oklch(0.58 0.18 240)" />
        <StatCard label="Completed" value={tasks.filter(t => t.status === 'COMPLETED').length} emoji="?" color="oklch(0.55 0.19 167)" />
        <StatCard label="In Progress" value={tasks.filter(t => t.status === 'IN_PROGRESS').length} emoji="?" color="oklch(0.60 0.20 295)" />
        <StatCard label="Overdue" value={tasks.filter(t => t.status === 'OVERDUE').length} emoji="??" color="oklch(0.62 0.22 25)" />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-white/3 flex items-center justify-between">
          <h4 className="font-display font-bold">All Tasks</h4>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors">
            <Plus size={12} /> Assign Task
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {tasks.map((task, i) => {
            const emp = employees.find(e => e.id === task.employeeId);
            const empIdx = employees.indexOf(emp!);
            const statusColors: Record<TaskStatus, string> = {
              PENDING: 'bg-zinc-500/10 text-zinc-400',
              IN_PROGRESS: 'bg-blue-500/10 text-blue-400',
              COMPLETED: 'bg-emerald-500/10 text-emerald-400',
              OVERDUE: 'bg-red-500/10 text-red-400',
            };
            const priorityColors = { HIGH: 'text-red-400', MEDIUM: 'text-amber-400', LOW: 'text-zinc-500' };
            return (
              <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="p-5 hover:bg-white/3 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-1 h-full rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'OVERDUE' ? 'bg-red-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-zinc-600'} self-stretch min-h-[48px]`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-zinc-100">{task.title}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{task.description}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statusColors[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className={`text-[10px] font-bold ${priorityColors[task.priority]}`}>● {task.priority}</span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Calendar size={10} /> Due: {task.dueDate}</span>
                      <div className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${avatarColors[empIdx % avatarColors.length]} bg-opacity-10 text-zinc-300`}>
                        <span className={`w-3 h-3 rounded-full ${avatarColors[empIdx % avatarColors.length]} flex items-center justify-center text-white text-[7px] font-bold`}>{emp?.avatar?.slice(0, 1)}</span>
                        {emp?.name}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── TAB: Expenses ──────────────────────────────────────────────────────────

  const renderExpenses = () => {
    const pending = expenses.filter(e => e.status === 'PENDING');
    const approved = expenses.filter(e => e.status === 'APPROVED');
    const rejected = expenses.filter(e => e.status === 'REJECTED');
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pending Review" value={pending.length} emoji="⏳" color="oklch(0.70 0.18 80)" sub={`₹${pending.reduce((s, e) => s + e.amount, 0).toLocaleString()}`} />
          <StatCard label="Approved (MTD)" value={approved.length} emoji="✅" color="oklch(0.55 0.19 167)" sub={`₹${approved.reduce((s, e) => s + e.amount, 0).toLocaleString()}`} />
          <StatCard label="Rejected" value={rejected.length} emoji="❌" color="oklch(0.62 0.22 25)" />
          <StatCard label="Total Claims" value={expenses.length} emoji="💰" color="oklch(0.58 0.18 240)" />
        </div>

        {pending.length > 0 && (
          <div className="glass-panel overflow-hidden border border-amber-500/10">
            <div className="p-5 border-b border-amber-500/10 bg-amber-500/5 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400" />
              <h4 className="font-display font-bold text-amber-300">Pending Approval</h4>
            </div>
            <div className="divide-y divide-white/5">
              {pending.map((exp: Expense) => (
                <ExpenseRow key={exp.id} exp={exp} empName={empName(exp.employeeId)}
                  onApprove={handleApproveExpense} onReject={handleRejectExpense} />
              ))}
            </div>
          </div>
        )}

        <div className="glass-panel overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-white/3">
            <h4 className="font-display font-bold">All Expense Claims</h4>
          </div>
          <div className="divide-y divide-white/5">
            {expenses.map((exp: Expense) => (
              <ExpenseRow key={exp.id} exp={exp} empName={empName(exp.employeeId)}
                onApprove={handleApproveExpense} onReject={handleRejectExpense} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── TAB: Incentives ────────────────────────────────────────────────────────

  const renderIncentives = () => {
    const slabs = [
      { min: 0, max: 60, pct: 0, label: 'Below 60%' },
      { min: 60, max: 80, pct: 3, label: '60–80%' },
      { min: 80, max: 100, pct: 5, label: '80–100%' },
      { min: 100, max: 999, pct: 8, label: 'Above 100%' },
    ];
    return (
      <div className="space-y-6">
        <div className="glass-panel p-6">
          <SectionHeader title="Commission Slab Structure" sub="Applied to sales revenue achieved vs target" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {slabs.map(s => (
              <div key={s.label} className={`p-4 rounded-2xl border ${s.pct > 5 ? 'border-emerald-500/30 bg-emerald-500/5' : s.pct > 0 ? 'border-blue-500/20 bg-blue-500/5' : 'border-white/5 bg-white/3'}`}>
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{s.label}</p>
                <p className={`text-3xl font-display font-bold ${s.pct > 5 ? 'text-emerald-400' : s.pct > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>{s.pct}%</p>
                <p className="text-[9px] text-zinc-600 mt-0.5">of sales achieved</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-white/3">
            <h4 className="font-display font-bold">MTD Incentive Calculation</h4>
          </div>
          <div className="divide-y divide-white/5">
            {targets.map((t, i) => {
              const emp = employees.find(e => e.id === t.employeeId);
              if (!emp) return null;
              const empIdx = employees.indexOf(emp);
              const achievementPct = pct(t.salesAchieved, t.salesTarget);
              const commPct = achievementPct >= 100 ? 8 : achievementPct >= 80 ? 5 : achievementPct >= 60 ? 3 : 0;
              const incentive = Math.round(t.salesAchieved * commPct / 100);
              return (
                <div key={t.employeeId} className="p-5 flex items-center gap-4 hover:bg-white/3 transition-all">
                  <div className={`w-9 h-9 rounded-xl ${avatarColors[empIdx % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{emp.avatar}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{emp.name}</p>
                    <p className="text-[10px] text-zinc-500">{ROLE_META[emp.role].label}</p>
                  </div>
                  <div className="hidden md:block text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-bold">Sales Achieved</p>
                    <p className="text-sm font-mono font-bold text-zinc-200">₹{t.salesAchieved.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-bold">Achievement</p>
                    <p className={`text-sm font-bold ${achievementPct >= 100 ? 'text-emerald-400' : achievementPct >= 80 ? 'text-blue-400' : 'text-amber-400'}`}>{achievementPct}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-bold">Commission</p>
                    <p className="text-xs font-bold text-zinc-400">@ {commPct}%</p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-[9px] text-zinc-500 uppercase font-bold">Incentive</p>
                    <p className={`text-lg font-display font-bold ${incentive > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {incentive > 0 ? `₹${incentive.toLocaleString()}` : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── TAB: Training ──────────────────────────────────────────────────────────

  const renderTraining = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Certifications" value={training.filter(t => t.certified).length} emoji="🏆" color="oklch(0.55 0.19 167)" />
        <StatCard label="Avg Score" value={`${Math.round(training.reduce((s, t) => s + t.score, 0) / training.length)}%`} emoji="⭐" color="oklch(0.70 0.18 80)" />
        <StatCard label="Modules Completed" value={training.length} emoji="📖" color="oklch(0.58 0.18 240)" />
      </div>

      <div className="space-y-4">
        {employees.slice(0, 4).map((emp, i) => {
          const empTraining = training.filter(t => t.employeeId === emp.id);
          if (empTraining.length === 0) return null;
          return (
            <div key={emp.id} className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-xl ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold`}>{emp.avatar}</div>
                <div>
                  <p className="text-sm font-bold">{emp.name}</p>
                  <p className="text-[10px] text-zinc-500">{ROLE_META[emp.role].label}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-lg font-display font-bold text-emerald-400">{empTraining.length} certified</p>
                </div>
              </div>
              <div className="space-y-3">
                {empTraining.map(tr => (
                  <div key={tr.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><Award size={12} /></div>
                      <div>
                        <p className="text-xs font-bold text-zinc-200">{tr.module}</p>
                        <p className="text-[9px] text-zinc-500">Completed: {tr.completedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${tr.score >= 90 ? 'text-emerald-400' : tr.score >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>{tr.score}%</p>
                      </div>
                      {tr.certified && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">CERTIFIED</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── TAB: Analytics ─────────────────────────────────────────────────────────

  const renderAnalytics = () => {
    const leaderboard = targets
      .map(t => ({ emp: employees.find(e => e.id === t.employeeId)!, score: pct(t.salesAchieved, t.salesTarget) }))
      .filter(x => !!x.emp)
      .sort((a, b) => b.score - a.score);

    return (
      <div className="space-y-8">
        <div>
          <SectionHeader title="Performance Trends — Jan to Apr 2026" sub="Monthly achievement % per top employee" />
          <div className="glass-panel p-6">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} domain={[50, 120]} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="ravi" name="Ravi Kumar" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="priya" name="Priya Sharma" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="suresh" name="Suresh Babu" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="anitha" name="Anitha Reddy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionHeader title="Sales Achievement by Role" />
            <div className="glass-panel p-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { role: 'Sales', target: 270000, achieved: 172500 },
                  { role: 'Technician', target: 150000, achieved: 93000 },
                  { role: 'IoT', target: 60000, achieved: 68000 },
                  { role: 'Field Officer', target: 50000, achieved: 38000 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="role" tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="target" name="Target" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="achieved" name="Achieved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <SectionHeader title="🏆 Leaderboard — April 2026" />
            <div className="glass-panel overflow-hidden">
              {leaderboard.map((entry, rank) => (
                <div key={entry.emp.id} className={`p-4 flex items-center gap-4 border-b border-white/5 last:border-0 ${rank === 0 ? 'bg-emerald-500/5' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 ${rank === 0 ? 'bg-amber-500 text-zinc-900' : rank === 1 ? 'bg-zinc-400 text-zinc-900' : rank === 2 ? 'bg-amber-700 text-zinc-100' : 'bg-white/5 text-zinc-500'}`}>
                    {rank + 1}
                  </div>
                  <div className={`w-8 h-8 rounded-xl ${avatarColors[rank % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{entry.emp.avatar}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-100">{entry.emp.name}</p>
                    <p className="text-[10px] text-zinc-500">{ROLE_META[entry.emp.role].label}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-display font-bold ${entry.score >= 100 ? 'text-emerald-400' : entry.score >= 80 ? 'text-blue-400' : 'text-amber-400'}`}>{entry.score}%</p>
                    {rank === 0 && <p className="text-[9px] text-amber-400 font-bold">TOP PERFORMER</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── TAB: Teams ─────────────────────────────────────────────────────────────

  const renderTeams = () => (
    <div className="space-y-8">
      {/* Org headline */}
      <div className="aq-card aq-bg-green p-6" style={{ borderLeft: '4px solid oklch(0.55 0.19 167)' }}>
        <h2 className="text-xl font-display font-bold mb-1" style={{ color: 'var(--aq-text-primary)' }}>AquaGrow Internal Team Structure</h2>
        <p className="text-sm" style={{ color: 'var(--aq-text-muted)' }}>6 teams working end-to-end: Supplier → Admin → Inventory → Farmer Order → Packing → Shipping → Delivery → Support → Feedback</p>
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 flex-wrap">
          {['🏭 Supplier', '→', '🧠 Operations', '→', '📦 Warehouse', '→', '🚚 Logistics', '→', '👨‍🌾 Farmer', '→', '📞 Support', '→', '📊 Growth'].map((s, i) => (
            s === '→'
              ? <span key={i} className="text-zinc-400 font-bold shrink-0">→</span>
              : <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-xl aq-card aq-bg-blue text-zinc-300 shrink-0">{s}</span>
          ))}
        </div>
      </div>

      {/* Team summary stats — aq-kpi-card per team */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {TEAM_CONFIG.map(team => (
          <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="aq-kpi-card">
            <span className="aq-kpi-icon">{team.emoji}</span>
            <span className="aq-kpi-number" style={{ color: 'var(--aq-text-primary)' }}>{empsByTeam[team.id]?.length ?? 0}</span>
            <span className="aq-kpi-label">{team.name.split(' ')[0]}</span>
          </motion.div>
        ))}
      </div>

      {/* Per team cards — colored left border per team */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TEAM_CONFIG.map(team => {
          const teamEmps = empsByTeam[team.id] ?? [];
          // Map team gradient colors to a solid left border color
          const borderColors: Record<string, string> = {
            operations: 'oklch(0.62 0.22 25)',
            warehouse:  'oklch(0.70 0.18 80)',
            logistics:  'oklch(0.55 0.17 187)',
            support:    'oklch(0.55 0.19 167)',
            tech:       'oklch(0.60 0.20 295)',
            growth:     'oklch(0.58 0.18 240)',
          };
          const borderColor = borderColors[team.id] ?? 'oklch(0.55 0.19 167)';
          return (
            <motion.div key={team.id} whileHover={{ y: -2, scale: 1.01 }}
              className="aq-card flex flex-col overflow-hidden"
              style={{ borderLeft: `4px solid ${borderColor}` }}>
              {/* Team header */}
              <div className="p-5" style={{ borderBottom: '1px solid var(--aq-card-border)', background: `${borderColor}10` }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{team.emoji}</span>
                    <div>
                      <h3 className="font-display font-bold text-base" style={{ color: 'var(--aq-text-primary)' }}>{team.name}</h3>
                      <p className="text-[10px]" style={{ color: 'var(--aq-text-muted)' }}>{team.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${borderColor}18`, color: borderColor, border: `1px solid ${borderColor}35` }}>
                    {teamEmps.length} staff
                  </span>
                </div>
              </div>

              {/* Members */}
              <div className="p-4 space-y-2">
                <p className="aq-section-label">Team Members</p>
                {teamEmps.length === 0 && <p className="text-xs italic" style={{ color: 'var(--aq-text-faint)' }}>No staff assigned yet</p>}
                {teamEmps.map((emp, i) => (
                  <div key={emp.id} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>{emp.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--aq-text-primary)' }}>{emp.name}</p>
                      <p className="text-[9px]" style={{ color: 'var(--aq-text-muted)' }}>{ROLE_META[emp.role].label}</p>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                      emp.status === 'ON_LEAVE' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>{emp.status}</span>
                  </div>
                ))}
              </div>

              {/* Daily tasks */}
              <div className="px-4 pb-4 flex-1">
                <p className="aq-section-label mb-2">Daily Responsibilities</p>
                <ul className="space-y-1.5">
                  {team.dailyTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0"
                        style={{ background: `${borderColor}18`, color: borderColor }}>{i + 1}</span>
                      <span className="text-[10px] leading-snug" style={{ color: 'var(--aq-text-muted)' }}>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* KPIs */}
              <div className="px-4 pb-5">
                <p className="aq-section-label mb-2">KPIs Tracked</p>
                <div className="flex flex-wrap gap-1">
                  {team.kpis.map(kpi => (
                    <span key={kpi} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${borderColor}14`, color: borderColor, border: `1px solid ${borderColor}30` }}>{kpi}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* End-to-end workflow */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-white/3">
          <h3 className="font-display font-bold text-base">Complete Order Workflow — Team Handoffs</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Who does what at each stage</p>
        </div>
        <div className="p-6">
          <div className="space-y-0">
            {[
              { step: '1', team: '📊 Growth / Sales', action: 'Farmer visits → Product awareness → AquaShop order placed', color: 'border-blue-500/30 bg-blue-500/5', badge: 'bg-blue-500/10 text-blue-400' },
              { step: '2', team: '🧠 Operations', action: 'Order verify → Payment check → Confirm to farmer', color: 'border-red-500/30 bg-red-500/5', badge: 'bg-red-500/10 text-red-400' },
              { step: '3', team: '📦 Warehouse', action: 'Stock pick → Batch expiry check → Pack as per order → Dispatch ready', color: 'border-amber-500/30 bg-amber-500/5', badge: 'bg-amber-500/10 text-amber-400' },
              { step: '4', team: '🚚 Logistics', action: 'Route plan → Pickup from warehouse → Delivery to farmer → Confirmation', color: 'border-teal-500/30 bg-teal-500/5', badge: 'bg-teal-500/10 text-teal-400' },
              { step: '5', team: '📞 Customer Support', action: 'Usage guidance → Issue resolution → Feedback collection → Return/replacement if needed', color: 'border-green-500/30 bg-green-500/5', badge: 'bg-green-500/10 text-green-400' },
              { step: '6', team: '💻 Tech Team', action: 'Notifications fire → Tracking updates → IoT alerts → App health', color: 'border-violet-500/30 bg-violet-500/5', badge: 'bg-violet-500/10 text-violet-400' },
            ].map((row, i, arr) => (
              <div key={row.step} className="flex items-stretch gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold shrink-0 ${row.badge}`}>{row.step}</div>
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-white/5 my-1" />}
                </div>
                <div className={`flex-1 p-4 rounded-xl border mb-3 ${row.color}`}>
                  <p className="text-xs font-bold text-zinc-200 mb-0.5">{row.team}</p>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">{row.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Employee Detail Panel ──────────────────────────────────────────────────

  const renderDetailPanel = () => {
    if (!selectedEmp) return null;
    const empIdx = employees.indexOf(selectedEmp);
    const empTarget = targets.find(t => t.employeeId === selectedEmp.id);
    const empVisits = visits.filter(v => v.employeeId === selectedEmp.id);
    const empTasks = tasks.filter(t => t.employeeId === selectedEmp.id);
    const empExpenses = expenses.filter(e => e.employeeId === selectedEmp.id);
    const empTraining = training.filter(t => t.employeeId === selectedEmp.id);

    return (
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-start justify-end"
          onClick={() => setSelectedEmp(null)}>
          <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-full max-w-xl h-full bg-zinc-950 border-l border-white/10 overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className={`p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-b border-white/5 relative overflow-hidden`}>
              <div className={`absolute inset-0 opacity-10 ${avatarColors[empIdx % avatarColors.length]}`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${avatarColors[empIdx % avatarColors.length]} flex items-center justify-center text-white text-xl font-bold`}>
                    {selectedEmp.avatar}
                  </div>
                  <button onClick={() => setSelectedEmp(null)} className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 transition-colors"><X size={18} /></button>
                </div>
                <h3 className="text-xl font-display font-bold text-zinc-100">{selectedEmp.name}</h3>
                <p className="text-sm text-zinc-500">{selectedEmp.empId} · {selectedEmp.email}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${ROLE_META[selectedEmp.role].color}`}>
                    {ROLE_META[selectedEmp.role].icon} {ROLE_META[selectedEmp.role].label}
                  </span>
                  <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${selectedEmp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[selectedEmp.status].dot}`} />
                    {STATUS_META[selectedEmp.status].label}
                  </span>
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-white/5 text-zinc-400">{selectedEmp.district}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Area</p>
                  <p className="text-xs font-bold text-zinc-200">{selectedEmp.area}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Phone</p>
                  <p className="text-xs font-bold text-zinc-200">{selectedEmp.phone}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Joining Date</p>
                  <p className="text-xs font-bold text-zinc-200">{selectedEmp.joiningDate}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Salary</p>
                  <p className="text-xs font-bold text-emerald-400">₹{selectedEmp.salary.toLocaleString()}</p>
                </div>
              </div>

              {/* Targets */}
              {empTarget && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">April Targets</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Sales', val: `₹${(empTarget.salesAchieved / 1000).toFixed(0)}K`, target: `₹${(empTarget.salesTarget / 1000).toFixed(0)}K`, p: pct(empTarget.salesAchieved, empTarget.salesTarget), color: 'bg-emerald-500' },
                      { label: 'Subscriptions', val: empTarget.subscriptionAchieved, target: empTarget.subscriptionTarget, p: pct(empTarget.subscriptionAchieved, empTarget.subscriptionTarget), color: 'bg-blue-500' },
                      { label: 'Onboarding', val: empTarget.onboardingAchieved, target: empTarget.onboardingTarget, p: pct(empTarget.onboardingAchieved, empTarget.onboardingTarget), color: 'bg-purple-500' },
                      { label: 'IoT Installs', val: empTarget.iotAchieved, target: empTarget.iotTarget, p: pct(empTarget.iotAchieved, empTarget.iotTarget), color: 'bg-amber-500' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] text-zinc-400 font-bold">{item.label}</p>
                          <p className="text-[10px] font-mono text-zinc-300">{item.val} / {item.target}</p>
                        </div>
                        <ProgressBar value={item.p} color={item.color} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Visits */}
              {empVisits.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Recent Field Visits</p>
                  <div className="space-y-2">
                    {empVisits.slice(0, 3).map(v => (
                      <div key={v.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{v.farmName}</p>
                          <p className="text-[9px] text-zinc-500">{v.date} · {v.purpose}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${v.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {empTasks.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Assigned Tasks ({empTasks.length})</p>
                  <div className="space-y-2">
                    {empTasks.map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-200 flex-1 pr-3 leading-snug">{t.title}</p>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : t.status === 'OVERDUE' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training */}
              {empTraining.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Certifications ({empTraining.length})</p>
                  <div className="space-y-2">
                    {empTraining.map(tr => (
                      <div key={tr.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-200 flex-1 pr-3">{tr.module}</p>
                        <span className="text-[10px] font-bold text-emerald-400">{tr.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MTD Incentive */}
              {empTarget && (() => {
                const ap = pct(empTarget.salesAchieved, empTarget.salesTarget);
                const cp = ap >= 100 ? 8 : ap >= 80 ? 5 : ap >= 60 ? 3 : 0;
                const incentive = Math.round(empTarget.salesAchieved * cp / 100);
                return (
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">MTD Incentive Earned</p>
                    <p className="text-3xl font-display font-bold text-emerald-400">₹{incentive.toLocaleString()}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">@ {cp}% commission on ₹{empTarget.salesAchieved.toLocaleString()} achieved</p>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={() => { setEditEmp(selectedEmp); setShowModal(true); setSelectedEmp(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2">
                  <Edit2 size={14} /> Edit Profile
                </button>
                <button className="flex-1 py-2.5 rounded-xl bg-white/5 text-zinc-400 text-sm font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  <Phone size={14} /> Call
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-zinc-100">Staff & Teams</h1>
          <p className="text-sm text-zinc-500 mt-0.5">6 teams · {employees.length} staff members · Operations, Warehouse, Logistics, Support, Tech, Growth</p>
        </div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-900 text-sm font-bold transition-all">
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {MAIN_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeTab === 'teams'      && renderTeams()}
          {activeTab === 'overview'   && renderOverview()}
          {activeTab === 'targets'    && renderTargets()}
          {activeTab === 'visits'     && renderVisits()}
          {activeTab === 'attendance' && renderAttendance()}
          {activeTab === 'tasks'      && renderTasks()}
          {activeTab === 'expenses'   && renderExpenses()}
          {activeTab === 'incentives' && renderIncentives()}
          {activeTab === 'training'   && renderTraining()}
          {activeTab === 'analytics'  && renderAnalytics()}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {showModal && <EmployeeModal emp={editEmp} onClose={() => { setShowModal(false); setEditEmp(null); }} onSave={handleSaveEmployee} />}
      {selectedEmp && renderDetailPanel()}
    </div>
  );
};

export default EmployeeManagement;
