import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import { db } from './src/db';
import { Session, User, AuditLog, Lead, Customer } from './src/types';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Simple JWT/Session Auth Middleware
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const session = db.getSessions().find(s => s.token === token);
    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) db.removeSession(token); // clean up expired
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    const user = db.getUsers().find(u => u.id === session.userId);
    if (!user) {
      res.status(401).json({ error: 'User associated with session not found' });
      return;
    }

    // Attach user and token to request
    (req as any).user = user;
    (req as any).token = token;
    next();
  };

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  // Login
  app.post('/api/v1/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = db.getUsers().find(
      u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
      return;
    }

    // Check account lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      res.status(403).json({ error: `Account is locked. Try again later.` });
      return;
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);

    if (!isPasswordValid) {
      const attempts = user.loginAttempts + 1;
      const updatedUser = { ...user, loginAttempts: attempts };
      if (attempts >= 5) {
        // lock for 15 minutes
        updatedUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        updatedUser.loginAttempts = 0;
        db.updateUser(updatedUser);
        res.status(403).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
        return;
      }
      db.updateUser(updatedUser);
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Clear login attempts
    db.updateUser({ ...user, loginAttempts: 0, lockedUntil: null });

    // Generate simple token session
    const token = 'brolosy_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const newSession: Session = {
      id: 'sess_' + Math.random().toString(36).substring(2),
      userId: user.id,
      token,
      deviceInfo: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || '127.0.0.1',
      expiresAt,
      createdAt: new Date().toISOString()
    };

    db.addSession(newSession);

    // Fetch associated employee
    const employee = db.getEmployees().find(e => e.id === user.employeeId);
    const role = db.getRoles().find(r => r.id === user.roleId);

    // Get permissions list
    const pIds = db.getRolePermissions().filter(rp => rp.roleId === user.roleId).map(rp => rp.permissionId);
    const permissions = db.getPermissions().filter(p => pIds.includes(p.id)).map(p => p.code);

    // Add Audit Log
    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      details: `تم تسجيل دخول الموظف ${employee?.fullNameAr || user.username} بنجاح.`,
      timestamp: new Date().toISOString()
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
        employee,
        role,
        permissions
      }
    });
  });

  // Quick Bypass Login for easy developer / admin quick access
  app.post('/api/v1/auth/quick-login', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required for quick login' });
      return;
    }

    const user = db.getUsers().find(u => u.id === userId || u.username === userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    // Generate simple token session
    const token = 'brolosy_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const newSession: Session = {
      id: 'sess_' + Math.random().toString(36).substring(2),
      userId: user.id,
      token,
      deviceInfo: req.headers['user-agent'] || 'Unknown Device (Quick Login)',
      ipAddress: req.ip || '127.0.0.1',
      expiresAt,
      createdAt: new Date().toISOString()
    };

    db.addSession(newSession);

    // Fetch associated employee
    const employee = db.getEmployees().find(e => e.id === user.employeeId);
    const role = db.getRoles().find(r => r.id === user.roleId);

    // Get permissions list
    const pIds = db.getRolePermissions().filter(rp => rp.roleId === user.roleId).map(rp => rp.permissionId);
    const permissions = db.getPermissions().filter(p => pIds.includes(p.id)).map(p => p.code);

    // Add Audit Log
    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      details: `[وصول سريع] تم تسجيل دخول الموظف ${employee?.fullNameAr || user.username} بنجاح عبر قائمة الدخول السريع.`,
      timestamp: new Date().toISOString()
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
        employee,
        role,
        permissions
      }
    });
  });

  // Logout
  app.post('/api/v1/auth/logout', authenticateToken, (req, res) => {
    const token = (req as any).token;
    const user = (req as any).user;

    db.removeSession(token);

    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'LOGOUT',
      details: `تم تسجيل خروج المستخدم ${user.username} بنجاح.`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  });

  // Get current session user info
  app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const employee = db.getEmployees().find(e => e.id === user.employeeId);
    const role = db.getRoles().find(r => r.id === user.roleId);

    const pIds = db.getRolePermissions().filter(rp => rp.roleId === user.roleId).map(rp => rp.permissionId);
    const permissions = db.getPermissions().filter(p => pIds.includes(p.id)).map(p => p.code);

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      employee,
      role,
      permissions
    });
  });

  // Change Password
  app.post('/api/v1/auth/change-password', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    db.updateUser({
      ...user,
      passwordHash,
      mustChangePassword: false
    });

    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'CHANGE_PASSWORD',
      details: `تم تغيير كلمة المرور للمستخدم ${user.username} بنجاح.`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  });

  // ==========================================
  // ROLES & PERMISSIONS ENDPOINTS
  // ==========================================

  // Get roles
  app.get('/api/v1/roles', authenticateToken, (req, res) => {
    res.json(db.getRoles());
  });

  // Get permissions
  app.get('/api/v1/permissions', authenticateToken, (req, res) => {
    res.json(db.getPermissions());
  });

  // Get mapping of role permissions
  app.get('/api/v1/role-permissions', authenticateToken, (req, res) => {
    res.json(db.getRolePermissions());
  });

  // Update role permissions
  app.post('/api/v1/roles/:roleId/permissions', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!roleId || !Array.isArray(permissionIds)) {
      res.status(400).json({ error: 'Role ID and permissionIds array are required' });
      return;
    }

    db.updateRolePermissions(roleId, permissionIds);

    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'UPDATE_ROLE_PERMISSIONS',
      details: `تم تعديل صلاحيات الدور الوظيفي ذو المعرف (${roleId}) بواسطة ${user.username}.`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  });

  // ==========================================
  // CRM / LEADS ENDPOINTS
  // ==========================================

  // Get Leads
  app.get('/api/v1/leads', authenticateToken, (req, res) => {
    const leads = db.getLeads();
    const customers = db.getCustomers();
    const employees = db.getEmployees();

    // Map lead details with customers and employees
    const fullLeads = leads.map(l => {
      const customer = customers.find(c => c.id === l.customerId);
      const agent = employees.find(e => e.employeeId === l.assignedTo);
      return {
        ...l,
        customer,
        agent
      };
    });

    res.json(fullLeads);
  });

  // Create Lead
  app.post('/api/v1/leads', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { fullNameAr, fullNameEn, phone, email, source, interestedIn, budget, notes, assignedTo } = req.body;

    if (!fullNameAr || !phone || !interestedIn || !budget) {
      res.status(400).json({ error: 'fullNameAr, phone, interestedIn, and budget are required' });
      return;
    }

    // Check if customer exists or create new
    let customer = db.getCustomers().find(c => c.phone === phone);
    if (!customer) {
      customer = {
        id: 'cust_' + Math.random().toString(36).substring(2),
        fullNameAr,
        fullNameEn: fullNameEn || fullNameAr,
        phone,
        email: email || '',
        country: 'Egypt',
        city: 'Cairo',
        rating: 'Silver',
        createdAt: new Date().toISOString()
      };
      db.addCustomer(customer);
    }

    const newLead: Lead = {
      id: 'lead_' + Math.random().toString(36).substring(2),
      customerId: customer.id,
      source: source || 'Manual Entry',
      interestedIn,
      budget: parseFloat(budget),
      status: 'New Lead',
      score: 50,
      assignedTo: assignedTo || 'ABG-1004', // default assigned agent
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.addLead(newLead);

    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'CREATE_LEAD',
      details: `تمت إضافة عميل جديد (${fullNameAr}) للوحدة المهتم بها (${interestedIn}).`,
      timestamp: new Date().toISOString()
    });

    res.json({ ...newLead, customer });
  });

  // Update Lead Status / Pipeline stage
  app.put('/api/v1/leads/:id', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { id } = req.params;
    const { status, budget, notes, assignedTo } = req.body;

    const lead = db.getLeads().find(l => l.id === id);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const updatedLead: Lead = {
      ...lead,
      status: status || lead.status,
      budget: budget !== undefined ? parseFloat(budget) : lead.budget,
      notes: notes !== undefined ? notes : lead.notes,
      assignedTo: assignedTo || lead.assignedTo,
      updatedAt: new Date().toISOString()
    };

    db.updateLead(updatedLead);

    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'UPDATE_LEAD',
      details: `تم تحديث حالة طلب العميل ذو المعرف (${id}) إلى ${updatedLead.status}.`,
      timestamp: new Date().toISOString()
    });

    res.json(updatedLead);
  });

  // ==========================================
  // INVENTORY ENDPOINTS
  // ==========================================

  // Get Inventory
  app.get('/api/v1/units', authenticateToken, (req, res) => {
    const units = db.getUnits();
    const projects = db.getProjects();

    const fullUnits = units.map(u => {
      const project = projects.find(p => p.id === u.projectId);
      return {
        ...u,
        project
      };
    });

    res.json(fullUnits);
  });

  // Get Projects
  app.get('/api/v1/projects', authenticateToken, (req, res) => {
    res.json(db.getProjects());
  });

  // Update Unit Status (Reservations/Sales flow)
  app.put('/api/v1/units/:id', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { id } = req.params;
    const { status } = req.body;

    const unit = db.getUnits().find(u => u.id === id);
    if (!unit) {
      res.status(404).json({ error: 'Unit not found' });
      return;
    }

    const updatedUnit = {
      ...unit,
      status: status || unit.status
    };

    db.updateUnit(updatedUnit);

    db.addAuditLog({
      id: 'log_' + Math.random().toString(36).substring(2),
      userId: user.id,
      username: user.username,
      action: 'UPDATE_UNIT',
      details: `تم تغيير حالة الوحدة السكنية (${unit.unitCode}) إلى ${updatedUnit.status}.`,
      timestamp: new Date().toISOString()
    });

    res.json(updatedUnit);
  });

  // ==========================================
  // AUDIT LOGS ENDPOINTS
  // ==========================================
  app.get('/api/v1/audit', authenticateToken, (req, res) => {
    res.json(db.getAuditLogs());
  });

  // Get Employees API
  app.get('/api/v1/employees', authenticateToken, (req, res) => {
    res.json(db.getEmployees());
  });

  // Get stats dashboard data
  app.get('/api/v1/dashboard/stats', authenticateToken, (req, res) => {
    const leads = db.getLeads();
    const units = db.getUnits();
    const employees = db.getEmployees();

    const totalSalesValue = leads
      .filter(l => l.status === 'Won' || l.status === 'Reservation')
      .reduce((sum, l) => sum + l.budget, 0);

    const totalLeads = leads.length;
    const reservedUnits = units.filter(u => u.status === 'Reserved').length;
    const availableUnits = units.filter(u => u.status === 'Available').length;
    const soldUnits = units.filter(u => u.status === 'Sold').length;

    res.json({
      totalSalesValue,
      totalLeads,
      reservedUnits,
      availableUnits,
      soldUnits,
      activeCampaignsCount: 4,
      employeeCount: employees.length
    });
  });

  // ==========================================
  // VITE PLAYGROUND OR STATIC SERVER ROUTING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Al Brolosy Group ERP running at http://localhost:${PORT}`);
  });
}

startServer();
