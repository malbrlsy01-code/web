import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('[SEED] Starting database seeding and admin setup...');

  // Ensure env variables are loaded or fall back to defaults
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Brolosy@2026';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@brolosy.com';
  const adminNameAr = process.env.ADMIN_NAME_AR || 'م. أحمد البرلسي';
  const adminNameEn = process.env.ADMIN_NAME_EN || 'Eng. Ahmed Al-Brolosy';

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(adminPassword, salt);

  const employees = db.getEmployees();
  const users = db.getUsers();

  // Find or create admin employee profile
  let adminEmp = employees.find(e => e.id === 'emp-admin');
  if (adminEmp) {
    adminEmp.fullNameAr = adminNameAr;
    adminEmp.fullNameEn = adminNameEn;
    adminEmp.email = adminEmail;
    console.log(`[SEED] Updated existing admin employee profile: ${adminEmp.fullNameAr}`);
  } else {
    adminEmp = {
      id: 'emp-admin',
      employeeId: 'ABG-1001',
      fullNameAr: adminNameAr,
      fullNameEn: adminNameEn,
      email: adminEmail,
      jobPosition: 'رئيس مجلس الإدارة والمدير التقني',
      companyId: 'comp-1',
      branchId: 'br-1',
      departmentId: 'dept-sales',
      targetCalls: 0,
      targetMeetings: 0,
      targetSalesValue: 0,
      createdAt: new Date().toISOString()
    };
    employees.push(adminEmp);
    console.log(`[SEED] Created new admin employee profile: ${adminEmp.fullNameAr}`);
  }

  // Find or create admin user account
  let adminUser = users.find(u => u.id === 'usr-admin' || u.username.toLowerCase() === adminUsername.toLowerCase());
  if (adminUser) {
    adminUser.username = adminUsername;
    adminUser.email = adminEmail;
    adminUser.passwordHash = passwordHash;
    adminUser.mustChangePassword = false; // Initialized securely via env, no forced change needed
    adminUser.loginAttempts = 0;
    adminUser.lockedUntil = null;
    adminUser.isActive = true;
    console.log(`[SEED] Updated existing admin user account and reset locks: ${adminUser.username}`);
  } else {
    adminUser = {
      id: 'usr-admin',
      username: adminUsername,
      email: adminEmail,
      passwordHash: passwordHash,
      employeeId: 'emp-admin',
      roleId: 'role-admin',
      mustChangePassword: false,
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString()
    };
    users.push(adminUser);
    console.log(`[SEED] Created new admin user account: ${adminUser.username}`);
  }

  // Save changes
  db.save();
  console.log('[SEED] Database seeding and administrator setup completed successfully!');
}

main().catch(err => {
  console.error('[SEED] Seeding failed:', err);
  process.exit(1);
});
