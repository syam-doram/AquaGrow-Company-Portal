/**
 * seed-via-api.mjs  —  Seeds demo HRMS employees via the live API
 *
 * This script calls a special one-time setup endpoint on the backend.
 * Run: node seed-via-api.mjs
 */

const API = 'https://aquagrow.onrender.com/api/hrms';
const SETUP_KEY = 'aquagrow-hrms-setup-2026'; // Must match server

const DEMO_EMPLOYEES = [
  {
    empId: 'AQ-SA001', name: 'Syam Kumar', email: 'superadmin@aquagrow.com',
    phone: '9999999001', password: 'Admin@123', role: 'super_admin',
    department: 'Management', designation: 'CEO', salary: 150000, joiningDate: '2023-01-01',
  },
  {
    empId: 'AQ-HR001', name: 'Priya Sharma', email: 'hr@aquagrow.com',
    phone: '9999999002', password: 'HRMgr@123', role: 'hr_manager',
    department: 'Human Resources', designation: 'HR Manager', salary: 95000, joiningDate: '2023-03-15',
  },
  {
    empId: 'AQ-FN001', name: 'Rahul Verma', email: 'finance@aquagrow.com',
    phone: '9999999003', password: 'Fin@123', role: 'finance_manager',
    department: 'Finance', designation: 'Finance Manager', salary: 90000, joiningDate: '2023-02-01',
  },
  {
    empId: 'AQ-OP001', name: 'Anita Reddy', email: 'ops@aquagrow.com',
    phone: '9999999004', password: 'Ops@123', role: 'operations_manager',
    department: 'Operations', designation: 'Operations Manager', salary: 88000, joiningDate: '2023-04-01',
  },
  {
    empId: 'AQ-SP001', name: 'Vijay Kumar', email: 'support@aquagrow.com',
    phone: '9999999005', password: 'Sup@123', role: 'support_agent',
    department: 'Customer Support', designation: 'Support Agent', salary: 45000, joiningDate: '2023-06-01',
  },
  {
    empId: 'AQ-EMP01', name: 'Meena Patel', email: 'employee@aquagrow.com',
    phone: '9999999006', password: 'Emp@123', role: 'employee',
    department: 'Aquaculture', designation: 'Farm Technician', salary: 35000, joiningDate: '2023-07-01',
  },
];

async function seed() {
  console.log('🌱 Seeding HRMS employees via API...\n');

  const res = await fetch(`${API}/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-setup-key': SETUP_KEY,
    },
    body: JSON.stringify({ employees: DEMO_EMPLOYEES }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Setup failed:', data.error || JSON.stringify(data));
    process.exit(1);
  }

  console.log('✅ Seed complete!\n');
  console.log('Results:');
  (data.results || []).forEach(r => {
    const icon = r.status === 'created' ? '✅' : r.status === 'updated' ? '🔄' : '⚠️';
    console.log(`  ${icon} ${r.empId.padEnd(12)} ${r.status}`);
  });

  console.log('\n📋 Login with these credentials at aquagrowcompanyportal.vercel.app:');
  console.log('─'.repeat(55));
  DEMO_EMPLOYEES.forEach(e => {
    console.log(`  ${e.empId.padEnd(12)} ${e.role.padEnd(22)} ${e.password}`);
  });
  console.log('─'.repeat(55));
}

seed().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
