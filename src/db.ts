/**
 * Custom File-Based Persistent Database Engine for Al Brolosy Group EOS
 * Stores data in database.json and provides high-performance queries
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  Company, Branch, Department, Employee, User, Session, 
  Role, Permission, RolePermission, Customer, Lead, Project, Unit, AuditLog 
} from './types';

const DB_PATH = path.join(process.cwd(), 'database.json');

interface Schema {
  companies: Company[];
  branches: Branch[];
  departments: Department[];
  employees: Employee[];
  users: User[];
  sessions: Session[];
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  customers: Customer[];
  leads: Lead[];
  projects: Project[];
  units: Unit[];
  auditLogs: AuditLog[];
}

// Initial default state (seeded dynamically)
const initialState: Schema = {
  companies: [],
  branches: [],
  departments: [],
  employees: [],
  users: [],
  sessions: [],
  roles: [],
  permissions: [],
  rolePermissions: [],
  customers: [],
  leads: [],
  projects: [],
  units: [],
  auditLogs: []
};

export class Database {
  private data: Schema = initialState;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
        console.log(`[DB] Database loaded successfully with ${this.data.employees.length} employees.`);
      } else {
        console.log('[DB] database.json not found. Initializing seed database...');
        this.seed();
        this.save();
      }
    } catch (e) {
      console.error('[DB] Error loading database, initializing empty', e);
      this.data = initialState;
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('[DB] Error saving database', e);
    }
  }

  // Getters
  public getCompanies(): Company[] { return this.data.companies; }
  public getBranches(): Branch[] { return this.data.branches; }
  public getDepartments(): Department[] { return this.data.departments; }
  public getEmployees(): Employee[] { return this.data.employees; }
  public getUsers(): User[] { return this.data.users; }
  public getSessions(): Session[] { return this.data.sessions; }
  public getRoles(): Role[] { return this.data.roles; }
  public getPermissions(): Permission[] { return this.data.permissions; }
  public getRolePermissions(): RolePermission[] { return this.data.rolePermissions; }
  public getCustomers(): Customer[] { return this.data.customers; }
  public getLeads(): Lead[] { return this.data.leads; }
  public getProjects(): Project[] { return this.data.projects; }
  public getUnits(): Unit[] { return this.data.units; }
  public getAuditLogs(): AuditLog[] { return this.data.auditLogs; }

  // Mutation helper wrappers
  public addSession(session: Session) {
    this.data.sessions.push(session);
    this.save();
  }

  public removeSession(token: string) {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.save();
  }

  public updateUser(user: User) {
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      this.data.users[idx] = user;
      this.save();
    }
  }

  public updateLead(lead: Lead) {
    const idx = this.data.leads.findIndex(l => l.id === lead.id);
    if (idx !== -1) {
      this.data.leads[idx] = lead;
      this.save();
    }
  }

  public addLead(lead: Lead) {
    this.data.leads.unshift(lead);
    this.save();
  }

  public addCustomer(customer: Customer) {
    this.data.customers.unshift(customer);
    this.save();
  }

  public updateUnit(unit: Unit) {
    const idx = this.data.units.findIndex(u => u.id === unit.id);
    if (idx !== -1) {
      this.data.units[idx] = unit;
      this.save();
    }
  }

  public addAuditLog(log: AuditLog) {
    this.data.auditLogs.unshift(log);
    this.save();
  }

  public updateRolePermissions(roleId: string, permissionIds: string[]) {
    // Clear old permissions
    this.data.rolePermissions = this.data.rolePermissions.filter(rp => rp.roleId !== roleId);
    // Add new
    permissionIds.forEach(pid => {
      this.data.rolePermissions.push({ roleId, permissionId: pid });
    });
    this.save();
  }

  // =========================================================================
  // SEED METHOD
  // =========================================================================
  private seed() {
    console.log('[DB] Seeding core roles and permissions...');
    
    // 1. Roles
    const roles: Role[] = [
      { id: 'role-admin', nameAr: 'مدير النظام الرئيسي', nameEn: 'System Administrator', description: 'Full access to all modules and configurations' },
      { id: 'role-exec', nameAr: 'الإدارة العليا', nameEn: 'Executive Director', description: 'High level business insights and financial dashboards' },
      { id: 'role-sales-mgr', nameAr: 'مدير المبيعات', nameEn: 'Sales Manager', description: 'Manages sales agents, pipelines, and quotas' },
      { id: 'role-sales-agent', nameAr: 'مسؤول المبيعات', nameEn: 'Sales Agent', description: 'Manages leads, calls, meetings, and unit reservations' },
      { id: 'role-marketing', nameAr: 'مدير التسويق', nameEn: 'Marketing Specialist', description: 'Manages campaigns, content planning, and design requests' }
    ];
    this.data.roles = roles;

    // 2. Permissions
    const permissions: Permission[] = [
      { id: 'p1', code: 'view_financials', nameAr: 'عرض البيانات المالية', nameEn: 'View Financial Data', module: 'finance' },
      { id: 'p2', code: 'approve_discounts', nameAr: 'اعتماد الخصومات', nameEn: 'Approve Discounts', module: 'finance' },
      { id: 'p3', code: 'manage_users', nameAr: 'إدارة المستخدمين والموظفين', nameEn: 'Manage Users & Employees', module: 'admin' },
      { id: 'p4', code: 'view_audit_logs', nameAr: 'عرض سجل العمليات', nameEn: 'View Audit Logs', module: 'admin' },
      { id: 'p5', code: 'manage_leads', nameAr: 'إدارة العملاء والطلبات', nameEn: 'Manage Leads', module: 'crm' },
      { id: 'p6', code: 'assign_leads', nameAr: 'توزيع العملاء تلقائياً', nameEn: 'Assign Leads Auto', module: 'crm' },
      { id: 'p7', code: 'manage_inventory', nameAr: 'إدارة الوحدات العقارية', nameEn: 'Manage Property Inventory', module: 'inventory' },
      { id: 'p8', code: 'create_reservation', nameAr: 'إنشاء حجز وحدة', nameEn: 'Create Unit Reservation', module: 'sales' },
      { id: 'p9', code: 'manage_campaigns', nameAr: 'إدارة الحملات الإعلانية', nameEn: 'Manage Marketing Campaigns', module: 'marketing' },
      { id: 'p10', code: 'request_design', nameAr: 'طلب تصاميم وميديا', nameEn: 'Request Graphic Designs', module: 'marketing' }
    ];
    this.data.permissions = permissions;

    // 3. Role Permissions mapping
    const rp: RolePermission[] = [
      // Admin gets all
      ...permissions.map(p => ({ roleId: 'role-admin', permissionId: p.id })),
      // Executive gets financials, audit logs, leads, inventory
      { roleId: 'role-exec', permissionId: 'p1' },
      { roleId: 'role-exec', permissionId: 'p4' },
      { roleId: 'role-exec', permissionId: 'p5' },
      { roleId: 'role-exec', permissionId: 'p7' },
      // Sales Manager gets leads, assign leads, inventory, create reservation
      { roleId: 'role-sales-mgr', permissionId: 'p5' },
      { roleId: 'role-sales-mgr', permissionId: 'p6' },
      { roleId: 'role-sales-mgr', permissionId: 'p7' },
      { roleId: 'role-sales-mgr', permissionId: 'p8' },
      // Sales Agent gets leads, create reservation
      { roleId: 'role-sales-agent', permissionId: 'p5' },
      { roleId: 'role-sales-agent', permissionId: 'p8' },
      // Marketing Specialist gets campaigns, designs
      { roleId: 'role-marketing', permissionId: 'p9' },
      { roleId: 'role-marketing', permissionId: 'p10' }
    ];
    this.data.rolePermissions = rp;

    // 4. Seeding Companies
    const companies: Company[] = [
      { id: 'comp-1', nameAr: 'البرلسي للتطوير العقاري', nameEn: 'Al Brolosy Real Estate Development', logo: '/assets/logo.png', createdAt: new Date().toISOString() },
      { id: 'comp-2', nameAr: 'البرلسي للمقاولات والإنشاءات', nameEn: 'Al Brolosy Construction & Contracting', logo: '/assets/logo.png', createdAt: new Date().toISOString() }
    ];
    this.data.companies = companies;

    // 5. Seeding Branches
    const branches: Branch[] = [
      { id: 'br-1', nameAr: 'الفرع الرئيسي - القاهرة الجديدة', nameEn: 'New Cairo Headquarters', companyId: 'comp-1', createdAt: new Date().toISOString() },
      { id: 'br-2', nameAr: 'فرع الإسكندرية', nameEn: 'Alexandria Branch Office', companyId: 'comp-1', createdAt: new Date().toISOString() }
    ];
    this.data.branches = branches;

    // 6. Seeding Departments
    const depts: Department[] = [
      { id: 'dept-sales', nameAr: 'إدارة المبيعات', nameEn: 'Sales Department', branchId: 'br-1', createdAt: new Date().toISOString() },
      { id: 'dept-marketing', nameAr: 'إدارة التسويق الرقمي', nameEn: 'Digital Marketing Dept', branchId: 'br-1', createdAt: new Date().toISOString() },
      { id: 'dept-hr', nameAr: 'إدارة الموارد البشرية', nameEn: 'Human Resources Dept', branchId: 'br-1', createdAt: new Date().toISOString() },
      { id: 'dept-finance', nameAr: 'إدارة الحسابات والمالية', nameEn: 'Accounts & Finance Dept', branchId: 'br-1', createdAt: new Date().toISOString() },
      { id: 'dept-eng', nameAr: 'القطاع الهندسي والتصاميم', nameEn: 'Engineering & Design Sector', branchId: 'br-1', createdAt: new Date().toISOString() }
    ];
    this.data.departments = depts;

    // 7. Seeding 50 Realistic Employees and Accounts
    console.log('[DB] Seeding 50 detailed employee profiles...');
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('Brolosy@2026', salt);

    // List of names to create realistic entries
    const firstNamesAr = ['أحمد', 'محمد', 'مصطفى', 'يوسف', 'عمر', 'إبراهيم', 'خالد', 'طارق', 'عبدالرحمن', 'كريم', 'ياسين', 'شريف', 'هشام', 'سامح', 'عمرو', 'حسن', 'محمود', 'علي', 'رامي', 'وائل', 'سارة', 'مريم', 'ياسمين', 'نور', 'فاطمة', 'ندى', 'منى', 'رانيا', 'دعاء', 'أمل'];
    const firstNamesEn = ['Ahmed', 'Mohamed', 'Mostafa', 'Youssef', 'Omar', 'Ibrahim', 'Khaled', 'Tarek', 'Abdelrahman', 'Karim', 'Yassin', 'Sherif', 'Hesham', 'Sameh', 'Amr', 'Hassan', 'Mahmoud', 'Ali', 'Ramy', 'Wael', 'Sara', 'Mariam', 'Yasmine', 'Nour', 'Fatima', 'Nada', 'Mona', 'Rania', 'Doaa', 'Amal'];
    
    const lastNamesAr = ['البرلسي', 'الشناوي', 'المصري', 'البحيري', 'عزمي', 'الحداد', 'شاهين', 'غنيم', 'راضي', 'سليمان', 'منصور', 'كامل', 'جلال', 'شعلان', 'نجم', 'الراوي', 'زكي', 'سالم', 'أبو الخير', 'صالح'];
    const lastNamesEn = ['Al-Brolosy', 'El-Shenawy', 'El-Masry', 'El-Behairy', 'Azmy', 'El-Haddad', 'Shaheen', 'Ghoneim', 'Rady', 'Soliman', 'Mansour', 'Kamel', 'Galal', 'Shaalan', 'Negm', 'El-Rawy', 'Zaki', 'Salem', 'Aboul-Kheir', 'Saleh'];

    const jobPositions = [
      { roleId: 'role-sales-agent', titleAr: 'مسؤول مبيعات عقارية سينيور', titleEn: 'Senior Property Consultant' },
      { roleId: 'role-sales-agent', titleAr: 'مسؤول علاقات عملاء', titleEn: 'Client Relations Officer' },
      { roleId: 'role-marketing', titleAr: 'منسق حملات رقمية', titleEn: 'Digital Campaign Coordinator' },
      { roleId: 'role-marketing', titleAr: 'صانع محتوى ميديا', titleEn: 'Media Content Specialist' }
    ];

    // System Administrator (The first user requested)
    const adminEmp: Employee = {
      id: 'emp-admin',
      employeeId: 'ABG-1001',
      fullNameAr: 'م. أحمد البرلسي',
      fullNameEn: 'Eng. Ahmed Al-Brolosy',
      email: 'admin@brolosy.com',
      jobPosition: 'رئيس مجلس الإدارة والمدير التقني',
      companyId: 'comp-1',
      branchId: 'br-1',
      departmentId: 'dept-sales',
      targetCalls: 0,
      targetMeetings: 0,
      targetSalesValue: 0,
      createdAt: new Date().toISOString()
    };
    this.data.employees.push(adminEmp);

    const adminUser: User = {
      id: 'usr-admin',
      username: 'admin',
      email: 'admin@brolosy.com',
      passwordHash: defaultPasswordHash,
      employeeId: 'emp-admin',
      roleId: 'role-admin',
      mustChangePassword: true, // As requested, first admin must change password
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(adminUser);

    // Sales Manager
    const salesMgrEmp: Employee = {
      id: 'emp-sales-mgr',
      employeeId: 'ABG-1002',
      fullNameAr: 'محمد الشناوي',
      fullNameEn: 'Mohamed El-Shenawy',
      email: 'm.shenawy@brolosy.com',
      jobPosition: 'مدير قطاع المبيعات',
      companyId: 'comp-1',
      branchId: 'br-1',
      departmentId: 'dept-sales',
      targetCalls: 100,
      targetMeetings: 20,
      targetSalesValue: 5000000.0,
      createdAt: new Date().toISOString()
    };
    this.data.employees.push(salesMgrEmp);

    const salesMgrUser: User = {
      id: 'usr-sales-mgr',
      username: 'sales.manager',
      email: 'm.shenawy@brolosy.com',
      passwordHash: defaultPasswordHash,
      employeeId: 'emp-sales-mgr',
      roleId: 'role-sales-mgr',
      mustChangePassword: false,
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(salesMgrUser);

    // Executive Director
    const execEmp: Employee = {
      id: 'emp-exec',
      employeeId: 'ABG-1003',
      fullNameAr: 'خالد البحيري',
      fullNameEn: 'Khaled El-Behairy',
      email: 'k.behairy@brolosy.com',
      jobPosition: 'الرئيس التنفيذي للتطوير المالي',
      companyId: 'comp-1',
      branchId: 'br-1',
      departmentId: 'dept-finance',
      targetCalls: 0,
      targetMeetings: 0,
      targetSalesValue: 0,
      createdAt: new Date().toISOString()
    };
    this.data.employees.push(execEmp);

    const execUser: User = {
      id: 'usr-exec',
      username: 'executive',
      email: 'k.behairy@brolosy.com',
      passwordHash: defaultPasswordHash,
      employeeId: 'emp-exec',
      roleId: 'role-exec',
      mustChangePassword: false,
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(execUser);

    // Seeding remaining 47 employees to reach exactly 50
    for (let i = 4; i <= 50; i++) {
      const fnIdx = i % firstNamesAr.length;
      const lnIdx = i % lastNamesAr.length;
      const nameAr = `${firstNamesAr[fnIdx]} ${lastNamesAr[lnIdx]}`;
      const nameEn = `${firstNamesEn[fnIdx]} ${lastNamesEn[lnIdx]}`;
      
      const emailLocal = `${firstNamesEn[fnIdx].toLowerCase()}.${lastNamesEn[lnIdx].toLowerCase()}${i}@brolosy.com`;
      const pos = jobPositions[i % jobPositions.length];

      const empId = `emp-gen-${i}`;
      const empCode = `ABG-${1000 + i}`;

      const employee: Employee = {
        id: empId,
        employeeId: empCode,
        fullNameAr: nameAr,
        fullNameEn: nameEn,
        email: emailLocal,
        jobPosition: pos.titleAr,
        companyId: 'comp-1',
        branchId: i % 3 === 0 ? 'br-2' : 'br-1', // distribute branches
        departmentId: pos.roleId === 'role-marketing' ? 'dept-marketing' : 'dept-sales',
        targetCalls: pos.roleId === 'role-sales-agent' ? 400 : 0,
        targetMeetings: pos.roleId === 'role-sales-agent' ? 15 : 0,
        targetSalesValue: pos.roleId === 'role-sales-agent' ? 2000000.0 : 0,
        createdAt: new Date().toISOString()
      };
      this.data.employees.push(employee);

      const user: User = {
        id: `usr-gen-${i}`,
        username: `${firstNamesEn[fnIdx].toLowerCase()}.${lastNamesEn[lnIdx].toLowerCase()}${i}`,
        email: emailLocal,
        passwordHash: defaultPasswordHash,
        employeeId: empId,
        roleId: pos.roleId,
        mustChangePassword: false,
        isActive: true,
        loginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date().toISOString()
      };
      this.data.users.push(user);
    }

    // 8. Seeding Projects
    console.log('[DB] Seeding luxury real estate projects...');
    const projects: Project[] = [
      { id: 'proj-1', nameAr: 'كمبوند ريزيدنس البرلسي - القاهرة الجديدة', nameEn: 'Al Brolosy Compound - New Cairo', locationAr: 'المستثمرين الجنوبية، التجمع الخامس', locationEn: 'Southern Investors, 5th Settlement', description: 'Elite gated residential community with smart facilities', companyId: 'comp-1', createdAt: new Date().toISOString() },
      { id: 'proj-2', nameAr: 'أبراج البرلسي هيلز - العلمين الجديدة', nameEn: 'Al Brolosy Hills Towers - New Alamein', locationAr: 'الصف الأول على البحر، العلمين', locationEn: 'Seafront Row, New Alamein City', description: 'Luxury sea view apartments and penthouses', companyId: 'comp-1', createdAt: new Date().toISOString() },
      { id: 'proj-3', nameAr: 'البرلسي بيزنس هب - العاصمة الإدارية', nameEn: 'Al Brolosy Business Hub - New Capital', locationAr: 'منطقة الداون تاون، العاصمة الإدارية', locationEn: 'Downtown District, Administrative Capital', description: 'State-of-the-art commercial and administrative complex', companyId: 'comp-1', createdAt: new Date().toISOString() }
    ];
    this.data.projects = projects;

    // 9. Seeding Units
    console.log('[DB] Seeding property units inventory...');
    const unitTypes: ('Apartment' | 'Villa' | 'Duplex' | 'Penthouse' | 'Commercial')[] = ['Apartment', 'Villa', 'Duplex', 'Penthouse', 'Commercial'];
    const statuses: ('Available' | 'Temporary Hold' | 'Reserved' | 'Under Contract' | 'Sold')[] = ['Available', 'Available', 'Reserved', 'Available', 'Sold'];

    for (let p = 1; p <= 3; p++) {
      const projId = `proj-${p}`;
      for (let u = 1; u <= 12; u++) {
        const unitType = unitTypes[(u + p) % unitTypes.length];
        const status = statuses[(u * p) % statuses.length];
        const area = unitType === 'Villa' ? 350 : unitType === 'Duplex' ? 240 : 140;
        const price = area * (p === 2 ? 35000 : 22000); // Higher price in Alamein

        const unit: Unit = {
          id: `unit-${p}-${u}`,
          unitCode: `B${p}-FL${Math.ceil(u / 4)}-U${u}`,
          projectId: projId,
          type: unitType,
          area: area,
          price: price,
          status: status,
          createdAt: new Date().toISOString()
        };
        this.data.units.push(unit);
      }
    }

    // 10. Seeding Customers and Leads
    console.log('[DB] Seeding initial customer CRM and marketing Leads...');
    const customerNamesAr = ['ممدوح عبد الغفار', 'رأفت السويدي', 'سليمان الطحان', 'ريهام الجارحي', 'شادي فواز', 'إيهاب النجار', 'عبير غالي', 'أمجد توفيق'];
    const customerNamesEn = ['Mamdouh Abdel-Ghaffar', 'Raaft El-Sewedy', 'Soliman El-Tahan', 'Reham El-Garhy', 'Shady Fawaz', 'Ihab El-Naggar', 'Abeer Ghaly', 'Amjad Tawfik'];
    const phones = ['+201001234567', '+201112223333', '+201223334444', '+201556667777', '+201020304050', '+201101010101', '+201202020202', '+201505050505'];
    const budgets = [3500000, 12000000, 6500000, 4200000, 18000000, 5000000, 8900000, 7200000];
    const leadSources = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'WhatsApp Direct', 'Organic Web', 'Meta Ads', 'Broker Network', 'Organic Web'];

    for (let c = 0; c < customerNamesAr.length; c++) {
      const customerId = `cust-${c + 1}`;
      const customer: Customer = {
        id: customerId,
        fullNameAr: customerNamesAr[c],
        fullNameEn: customerNamesEn[c],
        phone: phones[c],
        email: `cust.${c + 1}@gmail.com`,
        jobAr: 'رجل أعمال مستقل',
        jobEn: 'Independent Businessman',
        country: 'Egypt',
        city: c % 2 === 0 ? 'Cairo' : 'Giza',
        rating: c % 3 === 0 ? 'Gold' : 'Silver',
        createdAt: new Date().toISOString()
      };
      this.data.customers.push(customer);

      const lead: Lead = {
        id: `lead-${c + 1}`,
        customerId: customerId,
        source: leadSources[c],
        interestedIn: c % 2 === 0 ? 'Al Brolosy Compound - New Cairo' : 'Al Brolosy Hills Towers - New Alamein',
        budget: budgets[c],
        status: c === 0 ? 'New Lead' : c === 1 ? 'Qualified' : c === 2 ? 'Contacted' : c === 3 ? 'Reservation' : 'Contacted',
        score: 60 + (c * 5),
        assignedTo: 'ABG-1004', // Assigned to the first generated sales representative
        notes: 'العميل مهتم بوحدات نصف تشطيب ويفضل خطة سداد على 7 سنوات',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.leads.push(lead);
    }

    // 11. Initial Audit logs
    this.data.auditLogs.push({
      id: 'log-1',
      userId: 'usr-admin',
      username: 'admin',
      action: 'SYSTEM_BOOT',
      details: 'المنظومة انطلقت بنجاح وتم توليد البيانات التجريبية لعدد 50 موظفاً والمشروعات.',
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton database instance
export const db = new Database();
