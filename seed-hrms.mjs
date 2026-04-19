/**
 * seed-hrms.mjs
 * Run once to create demo HRMS employee accounts in MongoDB
 * Usage: node seed-hrms.mjs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = 'mongodb://syamkdoram_db_user:xVMRfYAFMYYZvLzT@aquagrow-cluster-shard-00-00.k6ux81i.mongodb.net:27017,aquagrow-cluster-shard-00-01.k6ux81i.mongodb.net:27017,aquagrow-cluster-shard-00-02.k6ux81i.mongodb.net:27017/aquagrow?ssl=true&replicaSet=atlas-k6ux81i-shard-0&authSource=admin&retryWrites=true&w=majority';

const HREmployeeSchema = new mongoose.Schema({
  empId:       { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  phone:       { type: String },
  role:        { type: String },
  department:  { type: String },
  designation: { type: String },
  joiningDate: { type: String },
  salary:      { type: Number, default: 0 },
  status:      { type: String, default: 'active' },
  photoUrl:    { type: String, default: '' },
  passwordHash:{ type: String },
}, { timestamps: true, collection: 'hremployees' });

const HREmployee = mongoose.model('HREmployee', HREmployeeSchema);

const DEMO_EMPLOYEES = [
  {
    empId: 'AQ-SA001', name: 'Syam Kumar (Super Admin)', email: 'superadmin@aquagrow.com',
    password: 'Admin@123', role: 'super_admin', department: 'Management',
    designation: 'CEO', salary: 150000, joiningDate: '2023-01-01',
  },
  {
    empId: 'AQ-HR001', name: 'Priya Sharma (HR Manager)', email: 'hr@aquagrow.com',
    password: 'HRMgr@123', role: 'hr_manager', department: 'Human Resources',
    designation: 'HR Manager', salary: 95000, joiningDate: '2023-03-15',
  },
  {
    empId: 'AQ-FN001', name: 'Rahul Verma (Finance)', email: 'finance@aquagrow.com',
    password: 'Fin@123', role: 'finance_manager', department: 'Finance',
    designation: 'Finance Manager', salary: 90000, joiningDate: '2023-02-01',
  },
  {
    empId: 'AQ-OP001', name: 'Anita Reddy (Operations)', email: 'ops@aquagrow.com',
    password: 'Ops@123', role: 'operations_manager', department: 'Operations',
    designation: 'Operations Manager', salary: 88000, joiningDate: '2023-04-01',
  },
  {
    empId: 'AQ-SP001', name: 'Vijay Kumar (Support)', email: 'support@aquagrow.com',
    password: 'Sup@123', role: 'support_agent', department: 'Customer Support',
    designation: 'Support Agent', salary: 45000, joiningDate: '2023-06-01',
  },
  {
    empId: 'AQ-EMP01', name: 'Meena Patel (Employee)', email: 'employee@aquagrow.com',
    password: 'Emp@123', role: 'employee', department: 'Aquaculture',
    designation: 'Farm Technician', salary: 35000, joiningDate: '2023-07-01',
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('✅ Connected to MongoDB');

  let created = 0;
  let skipped = 0;

  for (const emp of DEMO_EMPLOYEES) {
    const { password, ...rest } = emp;
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      await HREmployee.findOneAndUpdate(
        { empId: emp.empId },
        { ...rest, passwordHash },
        { upsert: true, new: true }
      );
      console.log(`  ✅ ${emp.empId} — ${emp.name} (${emp.role})`);
      created++;
    } catch (e) {
      console.log(`  ⚠️  ${emp.empId} skipped — ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n🎉 Done! Created/updated: ${created}, Skipped: ${skipped}`);
  console.log('\n📋 Demo Login Credentials:');
  console.log('─'.repeat(50));
  for (const emp of DEMO_EMPLOYEES) {
    console.log(`  ${emp.empId.padEnd(12)} ${emp.role.padEnd(22)} password: ${emp.password}`);
  }
  console.log('─'.repeat(50));
  await mongoose.disconnect();
}

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
