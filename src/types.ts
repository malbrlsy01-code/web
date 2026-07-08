/**
 * Global TypeScript Types for Al Brolosy Group EOS
 */

export interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
  logo?: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
  companyId: string;
  createdAt: string;
}

export interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
  branchId: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeId: string; // e.g., ABG-1001
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  jobPosition: string;
  companyId: string;
  branchId: string;
  departmentId: string;
  targetCalls: number;
  targetMeetings: number;
  targetSalesValue: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  employeeId: string;
  roleId: string;
  mustChangePassword: boolean;
  isActive: boolean;
  loginAttempts: number;
  lockedUntil?: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceInfo?: string;
  ipAddress?: string;
  expiresAt: string;
  createdAt: string;
}

export interface Role {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
}

export interface Permission {
  id: string;
  code: string; // e.g., 'view_financials', 'manage_users'
  nameAr: string;
  nameEn: string;
  module: string; // crm, marketing, finance, hr, projects
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface Customer {
  id: string;
  fullNameAr: string;
  fullNameEn: string;
  phone: string;
  email?: string;
  jobAr?: string;
  jobEn?: string;
  country: string;
  city: string;
  rating: 'Silver' | 'Gold' | 'Platinum' | 'VIP';
  createdAt: string;
}

export interface Lead {
  id: string;
  customerId: string;
  customer?: Customer;
  source: string; // Meta Ads, Google Ads, Organic, Walk-in, Broker
  interestedIn: string; // Project Name or Unit details
  budget: number;
  status: 'New Lead' | 'Contacted' | 'Qualified' | 'Reservation' | 'Won' | 'Lost';
  score: number; // 0-100
  assignedTo?: string; // Employee ID
  agent?: Employee;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  nameAr: string;
  nameEn: string;
  locationAr: string;
  locationEn: string;
  description?: string;
  companyId: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  unitCode: string; // e.g., B3-FL2-U12
  projectId: string;
  project?: Project;
  type: 'Apartment' | 'Villa' | 'Duplex' | 'Penthouse' | 'Commercial';
  area: number;
  price: number;
  status: 'Available' | 'Temporary Hold' | 'Reserved' | 'Under Contract' | 'Sold' | 'Blocked';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}
