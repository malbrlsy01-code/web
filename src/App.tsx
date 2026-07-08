import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Users, FileText, Settings, ShieldAlert, LogOut, Search, Plus, 
  CheckCircle2, AlertTriangle, Play, HelpCircle, Lock, Eye, EyeOff, Globe, 
  Smartphone, Database, ChevronLeft, ChevronRight, Phone, Calendar, Target,
  TrendingUp, Layers, CheckSquare, RefreshCw, BadgePercent, HardDrive
} from 'lucide-react';
import { translations, Language } from './utils/i18n';
import { User, Lead, Unit, Role, Permission, AuditLog } from './types';
import GoogleDriveManager from './components/GoogleDriveManager';

export default function App() {
  // Locale State
  const [lang, setLang] = useState<Language>('ar');
  const isRtl = lang === 'ar';
  const t = (key: keyof typeof translations.ar) => translations[lang][key] || key;

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('abg_token'));
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('abg_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Login form input
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forced Password Change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // App Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'crm' | 'inventory' | 'roles' | 'audit' | 'drive'>('dashboard');

  // Business Data State
  const [stats, setStats] = useState<any>({
    totalSalesValue: 0,
    totalLeads: 0,
    reservedUnits: 0,
    availableUnits: 0,
    soldUnits: 0,
    employeeCount: 0
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filtering & Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  
  // New Lead Form state
  const [newLeadForm, setNewLeadForm] = useState({
    fullNameAr: '',
    fullNameEn: '',
    phone: '',
    email: '',
    source: 'Meta Ads',
    interestedIn: 'Al Brolosy Compound - New Cairo',
    budget: '',
    notes: ''
  });

  // Roles permission editor state
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-sales-agent');

  // Apply RTL/LTR class to body or HTML
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  // Handle auto-login or fetching user metadata
  useEffect(() => {
    if (token) {
      fetchUserMetadata();
    }
  }, [token]);

  // Fetch all business statistics and entities
  useEffect(() => {
    if (token) {
      fetchDashboardStats();
      fetchLeads();
      fetchUnits();
      fetchRolesAndPermissions();
      fetchAuditLogs();
    }
  }, [token, activeTab]);

  const fetchUserMetadata = async () => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('abg_user', JSON.stringify(data));
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/v1/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/v1/leads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/v1/units', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRolesAndPermissions = async () => {
    try {
      const [resRoles, resPerms, resMapping] = await Promise.all([
        fetch('/api/v1/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/permissions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/role-permissions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (resRoles.ok && resPerms.ok && resMapping.ok) {
        setRoles(await resRoles.json());
        setPermissions(await resPerms.json());
        setRolePermissions(await resMapping.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('abg_token', data.token);
        localStorage.setItem('abg_user', JSON.stringify(data.user));
      } else {
        setLoginError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setLoginError('Error connecting to corporate servers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (userId: string) => {
    setLoginError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await res.json();

      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('abg_token', data.token);
        localStorage.setItem('abg_user', JSON.stringify(data.user));
      } else {
        setLoginError(data.error || 'Quick Login failed');
      }
    } catch (err) {
      setLoginError('Error connecting to corporate servers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {}

    setToken(null);
    setUser(null);
    localStorage.removeItem('abg_token');
    localStorage.removeItem('abg_user');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError(t('mustMatch'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('passLength'));
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (res.ok) {
        setUser({ ...user, mustChangePassword: false });
        const localUser = JSON.parse(localStorage.getItem('abg_user') || '{}');
        localUser.mustChangePassword = false;
        localStorage.setItem('abg_user', JSON.stringify(localUser));
      } else {
        const data = await res.json();
        setPasswordError(data.error || 'Password update failed');
      }
    } catch (err) {
      setPasswordError('Error updating password.');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLeadForm)
      });

      if (res.ok) {
        setIsAddLeadOpen(false);
        setNewLeadForm({
          fullNameAr: '',
          fullNameEn: '',
          phone: '',
          email: '',
          source: 'Meta Ads',
          interestedIn: 'Al Brolosy Compound - New Cairo',
          budget: '',
          notes: ''
        });
        fetchLeads();
        fetchDashboardStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLeadStatus = async () => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/v1/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: updateStatus })
      });

      if (res.ok) {
        setSelectedLead(null);
        fetchLeads();
        fetchDashboardStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePermissions = async (roleId: string, allowedPermissionIds: string[]) => {
    try {
      const res = await fetch(`/api/v1/roles/${roleId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissionIds: allowedPermissionIds })
      });
      if (res.ok) {
        fetchRolesAndPermissions();
        alert('تم حفظ وتحديث صلاحيات الدور الوظيفي بنجاح!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      l.customer?.fullNameAr?.toLowerCase().includes(q) ||
      l.customer?.fullNameEn?.toLowerCase().includes(q) ||
      l.customer?.phone?.includes(q) ||
      l.interestedIn?.toLowerCase().includes(q) ||
      l.status?.toLowerCase().includes(q);
    return matchesSearch;
  });

  // Check if current logged-in user has specific permission code
  const hasPermission = (code: string) => {
    if (!user || !user.permissions) return false;
    // Admin has overriding permission
    if (user.role?.id === 'role-admin') return true;
    return user.permissions.includes(code);
  };

  // Helper formatting currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (!token) {
    // -------------------------------------------------------------
    // RENDER LOGIN SCREEN (Luxury Premium Dark Mode)
    // -------------------------------------------------------------
    return (
      <div className="min-h-screen bg-[#080809] flex flex-col justify-between overflow-hidden relative font-sans">
        {/* Abstract Background Lights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-900/40 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header bar */}
        <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
          <div className="flex items-center space-x-3 gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#ad0404] to-red-800 flex items-center justify-center shadow-lg border border-red-500/30">
              <span className="font-mono text-xl font-bold tracking-wider text-white">ABG</span>
            </div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-tight">AL BROLOSY GROUP</h1>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase">Enterprise Operating System</p>
            </div>
          </div>

          {/* Lang Selector */}
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 rounded-lg border border-[#2a2a2e] text-xs text-gray-300 hover:bg-white/5 transition flex items-center space-x-2 gap-2"
          >
            <Globe className="w-4 h-4 text-gray-400" />
            <span>{t('switchLang')}</span>
          </button>
        </header>

        {/* Center Container */}
        <main className="w-full max-w-md mx-auto px-6 py-8 z-10 my-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-card p-8 rounded-2xl border border-white/[0.06] shadow-2xl relative"
          >
            {/* Red luxury top stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-[#ad0404] to-red-800 rounded-t-2xl"></div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">{t('loginTitle')}</h2>
              <p className="text-xs text-gray-400">{t('loginDesc')}</p>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3.5 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center space-x-3 gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <span>{loginError}</span>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">{t('username')}</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-[#171719] border border-[#2a2a2e] text-sm text-white rounded-xl focus:border-[#ad0404] focus:ring-2 focus:ring-[#ad0404]/20 transition outline-none"
                    placeholder="e.g. admin or admin@brolosy.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">{t('password')}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#171719] border border-[#2a2a2e] text-sm text-white rounded-xl focus:border-[#ad0404] focus:ring-2 focus:ring-[#ad0404]/20 transition outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <label className="flex items-center space-x-2 gap-2 text-gray-400 cursor-pointer hover:text-white transition select-none">
                  <input type="checkbox" className="accent-[#ad0404]" defaultChecked />
                  <span>{t('rememberMe')}</span>
                </label>
                <a href="#forgot" className="text-gray-400 hover:text-white transition">{t('forgotPass')}</a>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#ad0404] hover:bg-[#c10a0a] active:bg-[#8f0303] text-sm font-bold text-white rounded-xl transition shadow-lg shadow-red-950/50 flex items-center justify-center space-x-2 gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('loggingIn')}</span>
                  </>
                ) : (
                  <span>{t('loginBtn')}</span>
                )}
              </button>
            </form>

            {/* Quick Access List Section */}
            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <div className="text-center mb-4">
                <h3 className="text-xs font-bold text-gray-300 tracking-wide uppercase flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  {t('quickAccess')}
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">{t('quickAccessDesc')}</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'usr-admin',
                    name: lang === 'ar' ? 'م. أحمد البرلسي' : 'Eng. Ahmed Al-Brolosy',
                    role: t('quickAdmin'),
                    color: 'border-red-500/20 bg-red-950/10 text-red-300',
                  },
                  {
                    id: 'usr-sales-mgr',
                    name: lang === 'ar' ? 'محمد الشناوي' : 'Mohamed El-Shenawy',
                    role: t('quickSalesMgr'),
                    color: 'border-amber-500/20 bg-amber-950/10 text-amber-300',
                  },
                  {
                    id: 'usr-exec',
                    name: lang === 'ar' ? 'خالد البحيري' : 'Khaled El-Behairy',
                    role: t('quickExec'),
                    color: 'border-emerald-500/20 bg-emerald-950/10 text-emerald-300',
                  },
                  {
                    id: 'usr-gen-4',
                    name: lang === 'ar' ? 'عمر عزمي' : 'Omar Azmy',
                    role: t('quickSalesAgent'),
                    color: 'border-blue-500/20 bg-blue-950/10 text-blue-300',
                  }
                ].map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleQuickLogin(profile.id)}
                    disabled={isSubmitting}
                    className={`w-full p-3 rounded-xl border text-right transition flex items-center justify-between gap-3 text-xs hover:bg-white/[0.03] active:bg-white/[0.05] cursor-pointer disabled:opacity-50`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-xs truncate">{profile.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{profile.role}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono shrink-0 border ${profile.color}`}>
                      {profile.id.replace('usr-', '')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
              <p className="text-[11px] text-gray-500 mb-2">Developed exclusively for Al Brolosy Group employees</p>
              <div className="flex justify-center space-x-2.5 gap-2.5 text-gray-400 text-xs">
                <span className="flex items-center gap-1 text-[11px]"><Smartphone className="w-3.5 h-3.5 text-green-500" /> Web & Mobile Secure Ready</span>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer info */}
        <footer className="w-full text-center py-6 text-[11px] text-gray-500 border-t border-white/[0.03] z-10">
          <p>© 2026 Al Brolosy Group. All Rights Reserved. Al Brolosy Enterprise Operating System v1.4</p>
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER CHANGE PASSWORD FLOW (If logging in first time)
  // -------------------------------------------------------------
  if (user && user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-[#080809] flex items-center justify-center p-6 relative font-sans">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-md w-full p-8 rounded-2xl border border-white/[0.06] shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-[#ad0404] rounded-t-2xl"></div>

          <div className="text-center mb-8">
            <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">{t('changePassTitle')}</h2>
            <p className="text-xs text-gray-400">{t('changePassDesc')}</p>
          </div>

          {passwordError && (
            <div className="mb-5 p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center space-x-2 gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">{t('newPassword')}</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#171719] border border-[#2a2a2e] text-sm text-white rounded-xl focus:border-[#ad0404] focus:ring-2 focus:ring-[#ad0404]/20 transition outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">{t('confirmNewPassword')}</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#171719] border border-[#2a2a2e] text-sm text-white rounded-xl focus:border-[#ad0404] focus:ring-2 focus:ring-[#ad0404]/20 transition outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-[#ad0404] hover:bg-[#c10a0a] text-sm font-bold text-white rounded-xl transition shadow-lg flex items-center justify-center space-x-2 gap-2 cursor-pointer"
            >
              <span>{t('saveAndContinue')}</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN ENTERPRISE OPERATING SYSTEM UI
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#080809] flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-30 bg-[#0d0d0f]/90 backdrop-blur-md border-b border-[#1f1f23] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & title */}
          <div className="flex items-center space-x-3 gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ad0404] flex items-center justify-center">
              <span className="font-mono text-sm font-bold text-white">ABG</span>
            </div>
            <div>
              <div className="flex items-center space-x-2 gap-2">
                <h2 className="text-white font-bold text-md tracking-tight">{t('title')}</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-mono font-bold uppercase tracking-wider">
                  {t('connected')}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">{t('subtitle')}</p>
            </div>
          </div>

          {/* Quick Info & User menu */}
          <div className="flex items-center space-x-4 gap-4 flex-wrap justify-end">
            
            {/* Lang Switcher */}
            <button 
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="px-2.5 py-1.5 rounded-lg border border-[#2a2a2e] text-xs text-gray-300 hover:bg-white/5 transition flex items-center space-x-2 gap-2"
            >
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-[11px] font-bold">{t('switchLang')}</span>
            </button>

            {/* Profile Dropdown info */}
            <div className="flex items-center space-x-3 gap-3 bg-[#111113] p-1.5 pr-3 pl-3 rounded-xl border border-[#2a2a2e]">
              <div className="w-8 h-8 rounded-lg bg-red-950 text-red-400 flex items-center justify-center font-bold text-sm">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-tight">
                  {isRtl ? user.employee?.fullNameAr : user.employee?.fullNameEn}
                </p>
                <p className="text-[10px] text-red-400 leading-tight">
                  {isRtl ? user.role?.nameAr : user.role?.nameEn}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl border border-red-950/30 bg-red-950/10 text-red-400 hover:bg-red-950/20 hover:text-red-300 transition shrink-0 cursor-pointer"
              title={t('logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full px-4 py-3.5 rounded-xl flex items-center space-x-3 gap-3 transition text-sm font-semibold text-right ${activeTab === 'dashboard' ? 'bg-[#ad0404] text-white shadow-lg shadow-red-950/20' : 'bg-[#111113] border border-[#1f1f23] text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Layers className="w-4.5 h-4.5" />
            <span className="flex-1 text-right">{t('dashboard')}</span>
          </button>

          {hasPermission('p5') && (
            <button 
              onClick={() => setActiveTab('crm')}
              className={`w-full px-4 py-3.5 rounded-xl flex items-center space-x-3 gap-3 transition text-sm font-semibold text-right ${activeTab === 'crm' ? 'bg-[#ad0404] text-white shadow-lg shadow-red-950/20' : 'bg-[#111113] border border-[#1f1f23] text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Users className="w-4.5 h-4.5" />
              <span className="flex-1 text-right">{t('crm')}</span>
            </button>
          )}

          {hasPermission('p7') && (
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`w-full px-4 py-3.5 rounded-xl flex items-center space-x-3 gap-3 transition text-sm font-semibold text-right ${activeTab === 'inventory' ? 'bg-[#ad0404] text-white shadow-lg shadow-red-950/20' : 'bg-[#111113] border border-[#1f1f23] text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Building2 className="w-4.5 h-4.5" />
              <span className="flex-1 text-right">{t('inventory')}</span>
            </button>
          )}

          {hasPermission('p3') && (
            <button 
              onClick={() => setActiveTab('roles')}
              className={`w-full px-4 py-3.5 rounded-xl flex items-center space-x-3 gap-3 transition text-sm font-semibold text-right ${activeTab === 'roles' ? 'bg-[#ad0404] text-white shadow-lg shadow-red-950/20' : 'bg-[#111113] border border-[#1f1f23] text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Settings className="w-4.5 h-4.5" />
              <span className="flex-1 text-right">{t('rolesAndPermissions')}</span>
            </button>
          )}

          {hasPermission('p4') && (
            <button 
              onClick={() => setActiveTab('audit')}
              className={`w-full px-4 py-3.5 rounded-xl flex items-center space-x-3 gap-3 transition text-sm font-semibold text-right ${activeTab === 'audit' ? 'bg-[#ad0404] text-white shadow-lg shadow-red-950/20' : 'bg-[#111113] border border-[#1f1f23] text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <FileText className="w-4.5 h-4.5" />
              <span className="flex-1 text-right">{t('auditLogs')}</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('drive')}
            className={`w-full px-4 py-3.5 rounded-xl flex items-center space-x-3 gap-3 transition text-sm font-semibold text-right ${activeTab === 'drive' ? 'bg-[#ad0404] text-white shadow-lg shadow-red-950/20' : 'bg-[#111113] border border-[#1f1f23] text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <HardDrive className="w-4.5 h-4.5" />
            <span className="flex-1 text-right">{t('googleDrive')}</span>
          </button>

          <div className="pt-6 border-t border-[#1f1f23] text-center">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">
              {t('disconnected')}
            </span>
          </div>
        </aside>

        {/* Workspace Display Area */}
        <main className="flex-1 min-w-0 bg-[#111113] p-6 rounded-2xl border border-[#1f1f23] shadow-lg">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? -10 : 10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* -----------------------------------------------------------
                  TAB 1: EXECUTIVE/EMPLOYEE DASHBOARD
                  ----------------------------------------------------------- */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  <div className="border-b border-white/[0.05] pb-5">
                    <h1 className="text-xl font-bold text-white mb-1">
                      {t('welcome')} {isRtl ? user.employee?.fullNameAr : user.employee?.fullNameEn}
                    </h1>
                    <p className="text-xs text-gray-400">
                      {t('subtitle')}
                    </p>
                  </div>

                  {/* Core Metrics Bento Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    
                    <div className="p-5 bg-gradient-to-br from-[#1c1c20] to-[#121214] rounded-xl border border-white/[0.03] flex items-center space-x-4 gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('statsTotalSales')}</p>
                        <p className="text-lg font-bold text-white font-mono mt-0.5">{formatCurrency(stats.totalSalesValue)}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-[#1c1c20] to-[#121214] rounded-xl border border-white/[0.03] flex items-center space-x-4 gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center border border-red-500/20">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('statsTotalLeads')}</p>
                        <p className="text-lg font-bold text-white font-mono mt-0.5">{stats.totalLeads}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-[#1c1c20] to-[#121214] rounded-xl border border-white/[0.03] flex items-center space-x-4 gap-4">
                      <div className="w-12 h-12 rounded-xl bg-yellow-950/40 text-yellow-500 flex items-center justify-center border border-yellow-500/20">
                        <CheckSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('statsReserved')}</p>
                        <p className="text-lg font-bold text-white font-mono mt-0.5">{stats.reservedUnits}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-[#1c1c20] to-[#121214] rounded-xl border border-white/[0.03] flex items-center space-x-4 gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-950/40 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('statsAvailable')}</p>
                        <p className="text-lg font-bold text-white font-mono mt-0.5">{stats.availableUnits}</p>
                      </div>
                    </div>

                  </div>

                  {/* Active Employee Personal KPIs */}
                  <div className="p-6 bg-[#171719] rounded-xl border border-[#2a2a2e] space-y-5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2 gap-2">
                        <Target className="w-4.5 h-4.5 text-[#ad0404]" />
                        <span>{t('kpis')}</span>
                      </h3>
                      <span className="px-2.5 py-1 bg-red-950/50 border border-red-500/20 text-red-400 text-xs font-bold rounded-full">
                        Q3-2026 Target
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="bg-[#121214] p-4 rounded-xl border border-white/[0.03]">
                        <p className="text-[11px] text-gray-400 mb-1">{t('kpiCalls')}</p>
                        <div className="flex justify-between items-end">
                          <span className="text-xl font-bold text-white font-mono">18 / {user.employee?.targetCalls || 40}</span>
                          <span className="text-xs text-emerald-400 font-bold">45%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '45%' }}></div>
                        </div>
                      </div>

                      <div className="bg-[#121214] p-4 rounded-xl border border-white/[0.03]">
                        <p className="text-[11px] text-gray-400 mb-1">{t('kpiMeetings')}</p>
                        <div className="flex justify-between items-end">
                          <span className="text-xl font-bold text-white font-mono">4 / {user.employee?.targetMeetings || 5}</span>
                          <span className="text-xs text-yellow-500 font-bold">80%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div className="bg-yellow-500 h-full rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>

                      <div className="bg-[#121214] p-4 rounded-xl border border-white/[0.03]">
                        <p className="text-[11px] text-gray-400 mb-1">{t('kpiSalesValue')}</p>
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-bold text-white font-mono">
                            {formatCurrency(user.employee?.targetSalesValue || 1500000)}
                          </span>
                          <span className="text-xs text-red-500 font-bold">Pending Approval</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div className="bg-red-500 h-full rounded-full" style={{ width: '15%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive pipeline status banner */}
                  <div className="p-5 bg-gradient-to-r from-red-950/20 to-stone-900/40 rounded-xl border border-red-950/30 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-right">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <BadgePercent className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                        حملة الخصم الصيفي للبرلسي للتطوير
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">خصم حصري يصل إلى 15% على وحدات الدوبلكس والتاون هاوس في التجمع الخامس حتى نهاية الأسبوع.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('crm')} 
                      className="px-4 py-2.5 bg-[#ad0404] hover:bg-[#c10a0a] text-xs font-bold text-white rounded-lg transition"
                    >
                      متابعة عملاء الحملة الإعلانية
                    </button>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB 2: CUSTOMER CRM & LEADS MANAGEMENT
                  ----------------------------------------------------------- */}
              {activeTab === 'crm' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-white/[0.05]">
                    <div>
                      <h1 className="text-xl font-bold text-white">{t('crm')}</h1>
                      <p className="text-xs text-gray-400">متابعة طلبات العملاء العقارية، وتحديث حالات البيع والمتابعات</p>
                    </div>
                    <button 
                      onClick={() => setIsAddLeadOpen(true)}
                      className="px-4 py-2.5 bg-[#ad0404] hover:bg-[#c10a0a] text-xs font-bold text-white rounded-lg transition flex items-center space-x-2 gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('addLeadBtn')}</span>
                    </button>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3.5 text-gray-500 w-4 h-4" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-3 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-xl focus:border-[#ad0404] outline-none"
                      />
                    </div>
                  </div>

                  {/* CRM Grid Table */}
                  <div className="bg-[#171719] rounded-xl border border-[#2a2a2e] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#121214] text-gray-400 uppercase font-bold border-b border-[#2a2a2e]">
                          <tr>
                            <th className="px-5 py-4">{t('tableFullName')}</th>
                            <th className="px-5 py-4">{t('tablePhone')}</th>
                            <th className="px-5 py-4">{t('tableSource')}</th>
                            <th className="px-5 py-4">{t('tableProject')}</th>
                            <th className="px-5 py-4">{t('tableBudget')}</th>
                            <th className="px-5 py-4">{t('tableStatus')}</th>
                            <th className="px-5 py-4">{t('tableActions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {filteredLeads.map(l => (
                            <tr key={l.id} className="hover:bg-white/[0.02] transition">
                              <td className="px-5 py-4 font-semibold text-white">
                                {isRtl ? l.customer?.fullNameAr : l.customer?.fullNameEn}
                              </td>
                              <td className="px-5 py-4 font-mono text-gray-300">
                                {l.customer?.phone}
                              </td>
                              <td className="px-5 py-4">
                                <span className="px-2 py-1 bg-[#1a1a1e] border border-white/[0.04] text-gray-400 rounded">
                                  {l.source}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-gray-300">
                                {l.interestedIn}
                              </td>
                              <td className="px-5 py-4 font-mono font-bold text-white">
                                {formatCurrency(l.budget)}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  l.status === 'New Lead' ? 'bg-blue-950 text-blue-400 border border-blue-500/20' :
                                  l.status === 'Contacted' ? 'bg-amber-950 text-amber-400 border border-amber-500/20' :
                                  l.status === 'Qualified' ? 'bg-teal-950 text-teal-400 border border-teal-500/20' :
                                  l.status === 'Reservation' ? 'bg-purple-950 text-purple-400 border border-purple-500/20' :
                                  l.status === 'Won' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                                  'bg-red-950 text-red-400 border border-red-500/20'
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <button 
                                  onClick={() => {
                                    setSelectedLead(l);
                                    setUpdateStatus(l.status);
                                  }}
                                  className="px-2.5 py-1.5 bg-[#ad0404]/10 border border-[#ad0404]/30 text-[#ad0404] hover:bg-[#ad0404]/20 hover:text-white rounded transition text-[11px] font-bold cursor-pointer"
                                >
                                  تحديث الحالة
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB 3: PROPERTY INVENTORY
                  ----------------------------------------------------------- */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="pb-5 border-b border-white/[0.05]">
                    <h1 className="text-xl font-bold text-white">{t('inventory')}</h1>
                    <p className="text-xs text-gray-400">استعرض الوحدات السكنية والتجارية، والمباني، وإدارتها بشكل كامل</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {units.map((u: Unit) => (
                      <div key={u.id} className="p-5 bg-[#171719] border border-[#2a2a2e] rounded-xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] bg-red-950 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold">
                              {u.unitCode}
                            </span>
                            <h3 className="text-sm font-bold text-white mt-1.5">{u.project?.nameAr}</h3>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'Available' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                            u.status === 'Reserved' ? 'bg-amber-950 text-amber-400 border border-amber-500/20' :
                            'bg-red-950 text-red-400 border border-red-500/20'
                          }`}>
                            {u.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                          <div>المساحة: <span className="text-white font-mono">{u.area} م²</span></div>
                          <div>النوع: <span className="text-white">{u.type}</span></div>
                        </div>

                        <div className="pt-3 border-t border-white/[0.03] flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-gray-500">القيمة المالية الكلية</p>
                            <p className="text-xs font-bold text-white font-mono mt-0.5">{formatCurrency(u.price)}</p>
                          </div>
                          
                          <select 
                            value={u.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              await fetch(`/api/v1/units/${u.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ status: newStatus })
                              });
                              fetchUnits();
                            }}
                            className="bg-[#121214] border border-[#2a2a2e] text-[10px] text-gray-300 rounded px-2 py-1 focus:border-[#ad0404]"
                          >
                            <option value="Available">Available</option>
                            <option value="Reserved">Reserved</option>
                            <option value="Sold">Sold</option>
                            <option value="Blocked">Blocked</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB 4: ROLES & PERMISSIONS MANAGEMENT (BENTLEY DESIGN)
                  ----------------------------------------------------------- */}
              {activeTab === 'roles' && (
                <div className="space-y-6">
                  <div className="pb-5 border-b border-white/[0.05]">
                    <h1 className="text-xl font-bold text-white">{t('rolesAndPermissions')}</h1>
                    <p className="text-xs text-gray-400">إسناد وتعديل صلاحيات الوصول لكافة الأقسام والمجموعات الوظيفية بالمنظومة</p>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Role selector panel */}
                    <div className="w-full lg:w-1/3 space-y-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('rolesList')}</h3>
                      <div className="space-y-2">
                        {roles.map(r => (
                          <button 
                            key={r.id}
                            onClick={() => setSelectedRoleId(r.id)}
                            className={`w-full text-right p-4 rounded-xl border transition flex flex-col gap-1 cursor-pointer ${selectedRoleId === r.id ? 'bg-[#ad0404]/10 border-[#ad0404] text-white' : 'bg-[#171719] border-white/[0.04] text-gray-400 hover:text-white'}`}
                          >
                            <span className="text-xs font-bold text-white">{isRtl ? r.nameAr : r.nameEn}</span>
                            <span className="text-[10px] text-gray-400">{r.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Checkbox Permission Grid */}
                    <div className="flex-1 p-6 bg-[#171719] border border-[#2a2a2e] rounded-2xl space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {t('permissionsList')} 
                          <span className="text-[#ad0404]">
                            {isRtl ? roles.find(r => r.id === selectedRoleId)?.nameAr : roles.find(r => r.id === selectedRoleId)?.nameEn}
                          </span>
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-1">قم بتحديد أو إلغاء الصلاحيات لحسابات الموظفين المرتبطة بهذا الدور.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {permissions.map(p => {
                          const isChecked = rolePermissions.some(rp => rp.roleId === selectedRoleId && rp.permissionId === p.id);
                          return (
                            <label key={p.id} className="flex items-center space-x-3 gap-3 p-3 bg-[#121214] rounded-xl border border-white/[0.03] hover:border-[#ad0404]/30 transition cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                className="accent-[#ad0404] w-4 h-4 shrink-0"
                                onChange={(e) => {
                                  let currentPermIds = rolePermissions
                                    .filter(rp => rp.roleId === selectedRoleId)
                                    .map(rp => rp.permissionId);
                                  
                                  if (e.target.checked) {
                                    currentPermIds.push(p.id);
                                  } else {
                                    currentPermIds = currentPermIds.filter(id => id !== p.id);
                                  }
                                  
                                  // Update immediately locally
                                  const filtered = rolePermissions.filter(rp => rp.roleId !== selectedRoleId);
                                  const added = currentPermIds.map(pid => ({ roleId: selectedRoleId, permissionId: pid }));
                                  setRolePermissions([...filtered, ...added]);
                                }}
                              />
                              <div>
                                <p className="text-xs font-bold text-white">{isRtl ? p.nameAr : p.nameEn}</p>
                                <p className="text-[10px] text-gray-500 font-mono">{p.module} / {p.code}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="pt-4 border-t border-white/[0.04]">
                        <button 
                          onClick={() => {
                            const pIds = rolePermissions
                              .filter(rp => rp.roleId === selectedRoleId)
                              .map(rp => rp.permissionId);
                            handleSavePermissions(selectedRoleId, pIds);
                          }}
                          className="px-5 py-3 bg-[#ad0404] hover:bg-[#c10a0a] text-xs font-bold text-white rounded-xl transition cursor-pointer"
                        >
                          {t('updatePermissionsBtn')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -----------------------------------------------------------
                  TAB 5: SYSTEM AUDIT LOGS
                  ----------------------------------------------------------- */}
              {activeTab === 'audit' && (
                <div className="space-y-6">
                  <div className="pb-5 border-b border-white/[0.05]">
                    <h1 className="text-xl font-bold text-white">{t('auditLogs')}</h1>
                    <p className="text-xs text-gray-400">سجل كامل بجميع العمليات التقنية والمالية وحالات تسجيل الدخول وتعديلات الملفات</p>
                  </div>

                  {/* Audit Logs Table */}
                  <div className="bg-[#171719] rounded-xl border border-[#2a2a2e] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#121214] text-gray-400 uppercase font-bold border-b border-[#2a2a2e]">
                          <tr>
                            <th className="px-5 py-4">{t('auditTime')}</th>
                            <th className="px-5 py-4">{t('auditUser')}</th>
                            <th className="px-5 py-4">{t('auditAction')}</th>
                            <th className="px-5 py-4">{t('auditDetails')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {auditLogs.map(l => (
                            <tr key={l.id} className="hover:bg-white/[0.01] transition">
                              <td className="px-5 py-4 font-mono text-gray-500">
                                {new Date(l.timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                              </td>
                              <td className="px-5 py-4 font-semibold text-white">
                                @{l.username}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  l.action === 'LOGIN' ? 'bg-emerald-950 text-emerald-400' :
                                  l.action === 'LOGOUT' ? 'bg-amber-950 text-amber-400' :
                                  l.action === 'CREATE_LEAD' ? 'bg-blue-950 text-blue-400' :
                                  'bg-red-950 text-red-400'
                                }`}>
                                  {l.action}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-gray-300">
                                {l.details}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'drive' && (
                <GoogleDriveManager lang={lang} />
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* -----------------------------------------------------------
          MODAL A: ADD NEW CUSTOMER LEAD FORM
          ----------------------------------------------------------- */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card max-w-xl w-full p-8 rounded-2xl relative border border-white/[0.08]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-red-800 rounded-t-2xl"></div>

            <h3 className="text-lg font-bold text-white mb-6">{t('addLeadTitle')}</h3>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">{t('tableFullName')} (Ar) *</label>
                  <input 
                    type="text"
                    required
                    value={newLeadForm.fullNameAr}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, fullNameAr: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
                    placeholder="أحمد منصور السويدي"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">{t('tableFullName')} (En)</label>
                  <input 
                    type="text"
                    value={newLeadForm.fullNameEn}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, fullNameEn: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
                    placeholder="Ahmed Mansour El-Sewedy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">{t('formPhone')} *</label>
                  <input 
                    type="text"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
                    placeholder="+2010XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">{t('formEmail')}</label>
                  <input 
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
                    placeholder="client@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">{t('formSource')}</label>
                  <select 
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
                  >
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="TikTok Ads">TikTok Ads</option>
                    <option value="Organic Web">Organic Web</option>
                    <option value="Broker Network">Broker Network</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">{t('formBudget')} (EGP) *</label>
                  <input 
                    type="number"
                    required
                    value={newLeadForm.budget}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, budget: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none font-mono"
                    placeholder="e.g. 5000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1.5">{t('formInterestedIn')}</label>
                <input 
                  type="text"
                  value={newLeadForm.interestedIn}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, interestedIn: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
                  placeholder="e.g. Al Brolosy Hills Towers - New Alamein"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1.5">{t('formNotes')}</label>
                <textarea 
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none h-20 resize-none"
                  placeholder="تفاصيل إضافية للطلب..."
                />
              </div>

              <div className="flex justify-end space-x-3 gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2 bg-[#1c1c20] hover:bg-white/5 border border-white/[0.04] text-xs font-bold text-gray-400 rounded-lg transition"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#ad0404] hover:bg-[#c10a0a] text-xs font-bold text-white rounded-lg transition"
                >
                  حفظ العميل والطلب
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* -----------------------------------------------------------
          MODAL B: UPDATE PIPELINE STAGE FORM
          ----------------------------------------------------------- */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card max-w-sm w-full p-6 rounded-xl relative border border-white/[0.08]"
          >
            <h3 className="text-sm font-bold text-white mb-4">{t('editStatusTitle')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5">العميل</label>
                <p className="text-xs font-bold text-white">{isRtl ? selectedLead.customer?.fullNameAr : selectedLead.customer?.fullNameEn}</p>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5">{t('tableStatus')}</label>
                <select 
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
                >
                  <option value="New Lead">{t('pipelineNew')}</option>
                  <option value="Contacted">{t('pipelineContacted')}</option>
                  <option value="Qualified">{t('pipelineQualified')}</option>
                  <option value="Reservation">{t('pipelineReservation')}</option>
                  <option value="Won">{t('pipelineWon')}</option>
                  <option value="Lost">{t('pipelineLost')}</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 gap-2 pt-4">
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="px-3 py-2 bg-[#1c1c20] border border-white/[0.04] text-xs text-gray-400 rounded-lg"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleUpdateLeadStatus}
                  className="px-4 py-2 bg-[#ad0404] hover:bg-[#c10a0a] text-xs font-bold text-white rounded-lg transition"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="w-full text-center py-6 text-[11px] text-gray-500 border-t border-white/[0.03]">
        <p>© 2026 Al Brolosy Group. Designed for corporate enterprise systems. All operations securely encrypted and recorded.</p>
      </footer>

    </div>
  );
}
