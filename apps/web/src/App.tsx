import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users, CalendarClock, CreditCard, Box, 
  TrendingUp, CircleUser, Bell, Search, Sun, Moon, Sparkles, 
  Send, Upload, Plus, Check, X, FileText, ChevronRight, Menu, 
  ChevronLeft, Trash2, Edit3, ArrowUpRight, ArrowDownRight, Briefcase, FileUp, Key,
  Eye, EyeOff
} from 'lucide-react';
import api from './utils/api';
import axios from 'axios';

// --- Types & Enums ---
type View = 'dashboard' | 'employees' | 'attendance' | 'inventory' | 'sales' | 'crm' | 'finance' | 'ai-chat' | 'login' | 'register';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState('EMPLOYEE');
  const [authError, setAuthError] = useState('');
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    sender: 'user' | 'ai';
    text: string;
    query?: string;
    confidenceScore?: number;
    citations?: any[];
    chunksUsed?: number;
  }>>([
    { sender: 'ai', text: "Hello! I am your AI ERP Assistant. Ask me queries like *'Show today's sales'*, *'Who is absent today?'*, *'Which products are low on stock?'*, or upload a PDF document below to chat with it." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Dashboard states
  const [dashboardStats, setDashboardStats] = useState<any>({
    revenue: 600000.00, profit: 27582.00, expenses: 20200.00, employeesCount: 6, lowStockCount: 1, attendanceToday: 100
  });
  const [dashboardInsights, setDashboardInsights] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([
    { action: "INVOICE PAID", details: "Acme Corp paid INV-2026-0001 ($56,382.80)", time: "1 hour ago" },
    { action: "EMPLOYEE CLOCKED IN", details: "John Doe clocked in at 09:00 AM", time: "2 hours ago" },
    { action: "LOW STOCK ALERT", details: "Ergonomic Task Chair dropped below threshold", time: "4 hours ago" }
  ]);
  
  // Modules data states
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [crmOverview, setCrmOverview] = useState<any>({ leads: [], opportunities: [], deals: [] });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profitLoss, setProfitLoss] = useState<any>({ income: { total: 0 }, expense: { total: 0 }, netProfit: 0 });
  const [balanceSheet, setBalanceSheet] = useState<any>({ assets: { total: 0 }, liabilities: { total: 0 }, equity: { total: 0 } });
  
  // Edit & Input Forms states
  const [newEmployee, setNewEmployee] = useState({ firstName: '', lastName: '', email: '', phone: '', salary: '', departmentId: '', designationId: '', role: 'EMPLOYEE', createAccount: true });
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: '', cost: '', stock: '', minStock: '', categoryId: '', supplierId: '' });
  const [newOrder, setNewOrder] = useState({ customerId: '', productId: '', quantity: '1' });
  const [newLead, setNewLead] = useState({ customerName: '', customerEmail: '', customerPhone: '', company: '', value: '', source: 'Website' });
  const [newTransaction, setNewTransaction] = useState({ type: 'EXPENSE', category: 'Utilities', amount: '', description: '' });
  
  // AI Tools specific states
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeJD, setResumeJD] = useState('Software Engineer');
  const [resumeResult, setResumeResult] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  
  const [interviewJD, setInterviewJD] = useState('Senior Full Stack Developer');
  const [interviewFocus, setInterviewFocus] = useState('React, Express & Security');
  const [interviewResult, setInterviewResult] = useState<any>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  
  const [emailType, setEmailType] = useState('Leave Approval');
  const [emailDetails, setEmailDetails] = useState('Charlie Brown, Sick leave for 2 days, approved by Sarah Connor');
  const [emailResult, setEmailResult] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  
  const [ragFile, setRagFile] = useState<File | null>(null);
  const [ragDocName, setRagDocName] = useState('');
  const [ragCategoryUpload, setRagCategoryUpload] = useState('HANDBOOK');
  const [ragCategory, setRagCategory] = useState('ALL');
  const [ragDocuments, setRagDocuments] = useState<any[]>([]);
  const [ragStats, setRagStats] = useState<{ totalDocuments: number; totalChunks: number; engine: string }>({
    totalDocuments: 0,
    totalChunks: 0,
    engine: 'Node.js Local Vector + Python RAG Proxy'
  });
  const [ragLoading, setRagLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeCitationModal, setActiveCitationModal] = useState<any | null>(null);

  // Bootstrapping session & global listener
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchSessionUser();
      fetchRagDocuments();
    }
    
    const handleLogoutEvent = () => {
      setIsAuthenticated(false);
      setUser(null);
      setCurrentView('login');
    };
    
    window.addEventListener('auth-logout', handleLogoutEvent);
    
    // Keyboard shortcuts: Ctrl+K/Cmd+K for search, Esc to close
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Theme synchronization
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Scroll chat assistant
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, aiLoading]);

  // --- API Functions ---
  const fetchSessionUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        loadAllModuleData();
      }
    } catch (e) {
      setIsAuthenticated(false);
      setUser(null);
      setCurrentView('login');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await api.post('/auth/login', { email: authEmail, password: authPassword });
      if (res.data.success) {
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        setUser(res.data.user);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        loadAllModuleData();
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Login failed. Verify email and password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await api.post('/auth/register', { 
        email: authEmail, 
        password: authPassword, 
        name: authName, 
        role: authRole 
      });
      if (res.data.success) {
        if (res.data.accessToken) {
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          setUser(res.data.user);
          setIsAuthenticated(true);
          setCurrentView('dashboard');
          loadAllModuleData();
        } else {
          // Automatic login fallback
          const loginRes = await api.post('/auth/login', { email: authEmail, password: authPassword });
          if (loginRes.data.success) {
            localStorage.setItem('accessToken', loginRes.data.accessToken);
            localStorage.setItem('refreshToken', loginRes.data.refreshToken);
            setUser(loginRes.data.user);
            setIsAuthenticated(true);
            setCurrentView('dashboard');
            loadAllModuleData();
          }
        }
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Registration failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView('login');
  };

  const loadAllModuleData = async () => {
    try {
      // 1. Core data
      const empRes = await api.get('/employees');
      setEmployees(empRes.data.employees);

      const deptRes = await api.get('/employees/departments');
      setDepartments(deptRes.data.departments);

      const desigRes = await api.get('/employees/designations');
      setDesignations(desigRes.data.designations);
      
      // Select default department/designation for new hire form
      if (deptRes.data.departments?.length > 0 && desigRes.data.designations?.length > 0) {
        setNewEmployee(prev => ({
          ...prev,
          departmentId: deptRes.data.departments[0].id,
          designationId: desigRes.data.designations[0].id
        }));
      }

      // 2. Attendance today
      const attRes = await api.get('/attendance/today-status');
      setAttendanceToday(attRes.data);

      const leavesRes = await api.get('/employees/leaves');
      setLeaveRequests(leavesRes.data.leaves);

      // 3. Payroll
      const payRes = await api.get('/payroll/history');
      setPayrollHistory(payRes.data.history);

      // 4. Inventory
      const prodRes = await api.get('/inventory/products');
      setProducts(prodRes.data.products);

      const supRes = await api.get('/inventory/suppliers');
      setSuppliers(supRes.data.suppliers);
      if (prodRes.data.products?.length > 0 && supRes.data.suppliers?.length > 0) {
        setNewProduct(prev => ({
          ...prev,
          categoryId: prodRes.data.products[0].categoryId,
          supplierId: supRes.data.suppliers[0].id
        }));
        setNewOrder(prev => ({
          ...prev,
          productId: prodRes.data.products[0].id
        }));
      }

      // 5. Sales & CRM
      const ordersRes = await api.get('/sales/orders');
      setOrders(ordersRes.data.orders);

      const invRes = await api.get('/sales/invoices');
      setInvoices(invRes.data.invoices);

      const crmRes = await api.get('/crm/overview');
      setCrmOverview(crmRes.data);

      // 6. Finance
      const txRes = await api.get('/finance/transactions');
      setTransactions(txRes.data.transactions);

      const plRes = await api.get('/finance/profit-loss');
      setProfitLoss(plRes.data.statement);

      const bsRes = await api.get('/finance/balance-sheet');
      setBalanceSheet(bsRes.data.balanceSheet);

      // Update dashboard stats
      setDashboardStats({
        revenue: plRes.data.statement?.income?.total || 47782.00,
        profit: plRes.data.statement?.netProfit || 27582.00,
        expenses: plRes.data.statement?.expense?.total || 20200.00,
        employeesCount: empRes.data.employees?.length || 6,
        lowStockCount: prodRes.data.products?.filter((p: any) => p.stock < p.minStock).length || 0,
        attendanceToday: Math.round(((empRes.data.employees?.length - leavesRes.data.leaves?.filter((l: any) => l.status === 'APPROVED').length) / empRes.data.employees?.length) * 100) || 100
      });

      // 7. AI insights
      const insightsRes = await api.get('/ai/insights');
      setDashboardInsights(insightsRes.data.insights || []);

    } catch (e) {
      console.error('Failed to load ERP module datasets:', e);
    }
  };

  // --- Clock In/Out handlers ---
  const handleClockIn = async () => {
    try {
      const res = await api.post('/attendance/clock-in');
      if (res.data.success) {
        alert('Clocked in successfully!');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Clock in failed');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await api.post('/attendance/clock-out');
      if (res.data.success) {
        alert('Clocked out successfully!');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Clock out failed');
    }
  };

  // --- Leave Request handlers ---
  const handleLeaveRequest = async (e: React.FormEvent, type: string, start: string, end: string, reason: string) => {
    e.preventDefault();
    try {
      const res = await api.post('/employees/leaves', { leaveType: type, startDate: start, endDate: end, reason });
      if (res.data.success) {
        alert('Leave request submitted!');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleApproveLeave = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await api.patch(`/employees/leaves/${id}`, { status });
      if (res.data.success) {
        alert(`Leave request ${status.toLowerCase()}`);
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Action failed');
    }
  };

  // --- Employee CRUD handlers ---
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/employees', newEmployee);
      if (res.data.success) {
        alert('Employee created successfully!');
        setNewEmployee({ firstName: '', lastName: '', email: '', phone: '', salary: '', departmentId: departments[0].id, designationId: designations[0].id, role: 'EMPLOYEE', createAccount: true });
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create employee');
    }
  };

  const handleTerminateEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this employee profile?')) return;
    try {
      const res = await api.delete(`/employees/${id}`);
      if (res.data.success) {
        alert('Employee status set to Terminated.');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Action failed');
    }
  };

  // --- Inventory CRUD handlers ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/products', newProduct);
      if (res.data.success) {
        alert('Product added successfully!');
        setNewProduct({ name: '', sku: '', price: '', cost: '', stock: '', minStock: '', categoryId: products[0].categoryId, supplierId: suppliers[0].id });
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add product');
    }
  };

  // --- Order generation & billing invoice payment handlers ---
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create Customer profile if new
      let customerId = newOrder.customerId;
      if (!customerId) {
        const custRes = await api.post('/sales/customers', { name: 'Direct Retail Customer', company: 'Self' });
        customerId = custRes.data.customer.id;
      }
      const res = await api.post('/sales/orders', {
        customerId,
        items: [{ productId: newOrder.productId, quantity: parseInt(newOrder.quantity) }]
      });
      if (res.data.success) {
        alert('Sales order created and Invoice generated!');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to generate order');
    }
  };

  const handlePayInvoice = async (id: string) => {
    try {
      const res = await api.post(`/sales/invoices/${id}/pay`);
      if (res.data.success) {
        alert('Invoice settled, order dispatched, ledger updated.');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Payment failed');
    }
  };

  // --- CRM Lead Creation ---
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const custRes = await api.post('/sales/customers', { 
        name: newLead.customerName, 
        email: newLead.customerEmail, 
        phone: newLead.customerPhone, 
        company: newLead.company,
        status: 'Lead'
      });
      const res = await api.post('/crm/leads', {
        customerId: custRes.data.customer.id,
        value: newLead.value,
        source: newLead.source
      });
      if (res.data.success) {
        alert('New lead generated in pipeline!');
        setNewLead({ customerName: '', customerEmail: '', customerPhone: '', company: '', value: '', source: 'Website' });
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add lead');
    }
  };

  const handleQualifyLead = async (id: string) => {
    try {
      const res = await api.patch(`/crm/leads/${id}/status`, { status: 'QUALIFIED' });
      if (res.data.success) {
        alert('Lead promoted to Opportunity pipeline!');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to qualify lead');
    }
  };

  const handleCloseWonOpportunity = async (id: string) => {
    try {
      const res = await api.patch(`/crm/opportunities/${id}/stage`, { stage: 'Closed Won' });
      if (res.data.success) {
        alert('Deal marked Closed Won! Customer profile activated.');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Action failed');
    }
  };

  // --- Finance Ledger Transaction ---
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/transactions', newTransaction);
      if (res.data.success) {
        alert('Transaction ledger logged.');
        setNewTransaction({ type: 'EXPENSE', category: 'Utilities', amount: '', description: '' });
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Transaction logging failed');
    }
  };

  // --- Payroll Generation ---
  const handleGeneratePayrollRun = async (empId: string) => {
    try {
      const now = new Date();
      const res = await api.post('/payroll/generate', {
        employeeId: empId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        allowance: '150',
        bonus: '0',
        deductions: '50'
      });
      if (res.data.success) {
        alert('Monthly payroll processed!');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handleDisbursePayroll = async (id: string) => {
    try {
      const res = await api.post(`/payroll/pay/${id}`);
      if (res.data.success) {
        alert('Payroll disbursed. Notification sent to employee.');
        loadAllModuleData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Disbursement failed');
    }
  };

  // --- AI Operations & RAG Management ---
  
  const fetchRagDocuments = async () => {
    try {
      const res = await api.get('/ai/documents');
      if (res.data.success) {
        setRagDocuments(res.data.documents || []);
        setRagStats({
          totalDocuments: res.data.totalDocuments || 0,
          totalChunks: res.data.totalChunks || 0,
          engine: res.data.engine || 'Node.js Local Vector + Python RAG Proxy'
        });
      }
    } catch (e) {
      console.error('Failed to fetch RAG vector store documents:', e);
    }
  };

  const handleDeleteRagDocument = async (filename: string) => {
    if (!confirm(`Are you sure you want to remove "${filename}" from the RAG knowledge base?`)) return;
    try {
      const res = await api.delete(`/ai/documents/${encodeURIComponent(filename)}`);
      if (res.data.success) {
        alert(res.data.message || `Document "${filename}" removed from vector store.`);
        fetchRagDocuments();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to purge document');
    }
  };

  const handlePurgeAllRagDocuments = async () => {
    if (!confirm('Are you sure you want to reset and purge all previous custom documents from RAG memory?')) return;
    try {
      const res = await api.delete('/ai/documents/purge-all');
      if (res.data.success) {
        alert(res.data.message || 'Vector store reset clean.');
        fetchRagDocuments();
      }
    } catch (e: any) {
      alert('Failed to reset vector store');
    }
  };

  const handleCopyAnswer = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRunSamplePrompt = (promptText: string) => {
    setAiPrompt(promptText);
    executeAiPrompt(promptText);
  };

  const executeAiPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: promptText }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const res = await api.post('/ai/assistant', { 
        prompt: promptText
      });

      setChatHistory(prev => [...prev, { 
        sender: 'ai', 
        text: res.data.answer || 'No response generated.',
        query: res.data.query,
        confidenceScore: res.data.confidenceScore,
        citations: res.data.citations,
        chunksUsed: res.data.chunksUsed
      }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: "Error connecting to AI orchestration gateway." }]);
    } finally {
      setAiLoading(false);
    }
  };

  // 1. NLP AI Assistant Chat Prompt
  const handleSendAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    executeAiPrompt(aiPrompt);
  };

  // 2. Resume Screen Upload
  const handleResumeScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) return;

    setResumeLoading(true);
    setResumeResult(null);

    const formData = new FormData();
    formData.append('file', resumeFile);
    formData.append('jobDescription', resumeJD);

    try {
      const res = await api.post('/ai/resume-screener', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResumeResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Resume screening failed.');
    } finally {
      setResumeLoading(false);
    }
  };

  // 3. Interview Generator
  const handleInterviewGen = async (e: React.FormEvent) => {
    e.preventDefault();
    setInterviewLoading(true);
    setInterviewResult(null);
    try {
      const res = await api.post('/ai/interview-gen', { jobTitle: interviewJD, focusArea: interviewFocus });
      setInterviewResult(res.data.questions);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate interview templates');
    } finally {
      setInterviewLoading(false);
    }
  };

  // 4. Email Generator
  const handleEmailGen = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailResult(null);
    try {
      const res = await api.post('/ai/email-generator', { type: emailType, details: emailDetails });
      setEmailResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate email');
    } finally {
      setEmailLoading(false);
    }
  };

  // 5. Document RAG Upload
  const handleRagUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragFile) return;

    setRagLoading(true);
    const formData = new FormData();
    formData.append('file', ragFile);
    formData.append('category', ragCategoryUpload);

    try {
      const res = await api.post('/ai/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert(res.data?.message || `Document "${ragFile.name}" processed and indexed!`);
      setRagFile(null);
      fetchRagDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Vector indexing failed.');
    } finally {
      setRagLoading(false);
    }
  };

  // --- Views Router rendering ---
  if (currentView === 'login' || currentView === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center p-6 relative overflow-hidden" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80')" }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>
        
        <div className="w-full max-w-md glass rounded-3xl p-8 z-10 animate-fade-in relative border border-white/10 shadow-2xl">
          <div className="absolute top-4 right-4 flex space-x-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-white/10 text-white transition-all">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          
          <div className="flex items-center space-x-3 mb-8 justify-center">
            <div className="bg-primary/20 p-2.5 rounded-2xl border border-primary/40 text-primary">
              <Sparkles className="w-7 h-7 pulse-green" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Naziran ERP</h1>
          </div>

          <h2 className="text-xl font-medium text-white/90 text-center mb-6">
            {currentView === 'login' ? 'Welcome Back Officer' : 'Create Enterprise Account'}
          </h2>

          {authError && (
            <div className="mb-4 p-3.5 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-200 text-sm text-center">
              {authError}
            </div>
          )}

          <form onSubmit={currentView === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {currentView === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 text-sm"
                  placeholder="Anish Naziran"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 ml-1">Corporate Email</label>
              <input 
                type="email" 
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 text-sm"
                placeholder="anish@naziran.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none p-1"
                  title={showPassword ? "Hide Password" : "Show Password"}
                  aria-label={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {currentView === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5 ml-1">Assigned Department Role</label>
                <select 
                  value={authRole}
                  onChange={e => setAuthRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-primary/50 text-sm"
                >
                  <option value="SUPER_ADMIN">Super Admin (Executive)</option>
                  <option value="ADMIN">Admin (HQ)</option>
                  <option value="HR">Human Resources</option>
                  <option value="MANAGER">Department Manager</option>
                  <option value="FINANCE">Finance & Accountant</option>
                  <option value="SALES">Sales Representative</option>
                  <option value="EMPLOYEE">Standard Employee</option>
                </select>
              </div>
            )}

            <button 
              type="submit"
              className="w-full mt-2 py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-semibold transition-all shadow-lg hover:shadow-primary/30 flex items-center justify-center space-x-2 text-sm"
            >
              <span>{currentView === 'login' ? 'Authenticate' : 'Request Registry'}</span>
            </button>
          </form>

          {currentView === 'login' && (
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs font-medium text-white/50 mb-2.5">Quick Demo Accounts (1-Click Login)</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: 'Super Admin', email: 'superadmin@naziran.com' },
                  { label: 'HR Manager', email: 'hr@naziran.com' },
                  { label: 'Finance', email: 'finance@naziran.com' },
                  { label: 'Employee', email: 'employee@naziran.com' }
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={async () => {
                      setAuthEmail(demo.email);
                      setAuthPassword('Password123');
                      setAuthError('');
                      try {
                        const res = await api.post('/auth/login', { email: demo.email, password: 'Password123' });
                        if (res.data.success) {
                          localStorage.setItem('accessToken', res.data.accessToken);
                          localStorage.setItem('refreshToken', res.data.refreshToken);
                          setUser(res.data.user);
                          setIsAuthenticated(true);
                          setCurrentView('dashboard');
                          loadAllModuleData();
                        }
                      } catch (err: any) {
                        setAuthError(err.response?.data?.message || 'Quick login failed.');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-primary/30 text-white/80 hover:text-white text-xs border border-white/10 transition-all font-medium"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setAuthError('');
                setCurrentView(currentView === 'login' ? 'register' : 'login');
              }}
              className="text-white/60 hover:text-white text-xs transition-all tracking-wide underline decoration-primary/50 underline-offset-4"
            >
              {currentView === 'login' ? "Register a new corporate workspace profile" : "Already registered? Login here"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950/20 relative">
      
      {/* --- Collapsible Sidebar --- */}
      <aside className={`glass border-r h-screen sticky top-0 transition-all duration-300 z-30 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-5 flex items-center justify-between border-b border-glass">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
            </div>
            {sidebarOpen && <span className="font-bold text-lg tracking-tight font-sans">Naziran ERP</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-lg hover:bg-slate-500/10 hidden md:block">
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'employees', label: 'HR Workspace', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'] },
            { id: 'attendance', label: 'Attendance', icon: CalendarClock },
            { id: 'inventory', label: 'Inventory', icon: Box },
            { id: 'sales', label: 'Sales & Invoices', icon: TrendingUp },
            { id: 'crm', label: 'CRM pipeline', icon: Briefcase },
            { id: 'finance', label: 'Ledger Finance', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE'] },
            { id: 'ai-chat', label: 'AI Suite (RAG)', icon: Sparkles }
          ].map(item => {
            // Role gates
            if (item.roles && user && !item.roles.includes(user.role)) return null;
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`w-full flex items-center space-x-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 text-sm ${isActive ? 'bg-primary/20 text-primary border-l-4 border-primary font-medium' : 'text-text-muted hover:bg-slate-500/5 hover:text-text-main'}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User context footer */}
        <div className="p-4 border-t border-glass flex items-center space-x-3 overflow-hidden">
          <div className="bg-primary/10 w-9 h-9 rounded-xl flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <h4 className="text-xs font-semibold truncate leading-none mb-1">{user?.name}</h4>
              <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full font-bold uppercase">{user?.role}</span>
            </div>
          )}
          <button onClick={handleLogout} className="p-1 rounded hover:bg-red-500/10 text-red-500 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      </aside>

      {/* --- Main Contents Shell --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="glass h-16 px-6 border-b border-glass sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-500/10">
              <Menu size={20} />
            </button>
            
            {/* Global Search trigger bar */}
            <div onClick={() => setSearchOpen(true)} className="hidden sm:flex items-center space-x-2.5 bg-slate-500/5 hover:bg-slate-500/10 px-3.5 py-2 rounded-xl text-text-muted text-xs cursor-pointer w-64 border border-transparent hover:border-glass transition-all">
              <Search size={14} />
              <span>Search everywhere...</span>
              <span className="ml-auto text-[10px] bg-slate-500/20 px-1.5 py-0.5 rounded">Ctrl+K</span>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl hover:bg-slate-500/10 text-text-muted hover:text-text-main transition-all">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications button */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 rounded-xl hover:bg-slate-500/10 text-text-muted hover:text-text-main relative transition-all">
                <Bell size={18} />
                {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass rounded-2xl border border-glass shadow-2xl p-4 z-40 animate-fade-in text-sm">
                  <h3 className="font-bold border-b border-glass pb-2 mb-2 flex items-center justify-between">
                    <span>Notifications</span>
                    <span className="text-xs text-primary cursor-pointer hover:underline" onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}>Mark all read</span>
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-text-muted text-xs py-4 text-center">No alerts found</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-2 rounded-lg text-xs ${n.read ? 'opacity-70' : 'bg-primary/5 border border-primary/10'}`}>
                          <h4 className="font-semibold text-text-main">{n.title}</h4>
                          <p className="text-text-muted mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View content panels */}
        <main className="flex-1 p-6 overflow-y-auto animate-slide-up">
          
          {/* --- VIEW: Dashboard --- */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-1">HQ Command Dashboard</h1>
                  <p className="text-text-muted text-sm">Executive summary insights for {user?.name}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2 flex items-center space-x-2 text-primary font-bold text-xs uppercase">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 pulse-green"></span>
                    <span>Database Sync Online</span>
                  </div>
                </div>
              </div>

              {/* Metrics cards grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "Monthly Revenue", value: `$${dashboardStats.revenue.toLocaleString()}`, change: "+12.4%", trend: "up", color: "text-green-500", desc: "GST sales aggregates" },
                  { title: "Monthly Expense", value: `$${dashboardStats.expenses.toLocaleString()}`, change: "-4.2%", trend: "down", color: "text-red-500", desc: "Restocks & Payroll liabilities" },
                  { title: "Company Net Profit", value: `$${dashboardStats.profit.toLocaleString()}`, change: "+18.2%", trend: "up", color: "text-primary", desc: "Cash flow margin surplus" },
                  { title: "Employees Attendance", value: `${dashboardStats.attendanceToday}%`, change: "Punctual", trend: "up", color: "text-blue-500", desc: "5 Active clock-ins" }
                ].map((stat, i) => (
                  <div key={i} className="glass rounded-2xl p-5 border border-glass glass-hover">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.title}</span>
                    <h3 className="text-2xl font-bold mt-1 mb-2 leading-none font-mono">{stat.value}</h3>
                    <div className="flex items-center text-xs">
                      <span className={`font-bold mr-1.5 ${stat.color}`}>{stat.change}</span>
                      <span className="text-text-muted truncate">{stat.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Insights and graph section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Area graph block */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2">
                  <h3 className="font-bold text-base mb-4 flex items-center justify-between">
                    <span>Revenue Trend & Predictions</span>
                    <span className="text-xs font-medium text-text-muted">6 months rolling forecast</span>
                  </h3>
                  
                  {/* Custom SVG Area Line Chart */}
                  <div className="h-60 w-full relative mt-4">
                    <svg className="w-full h-full" viewBox="0 0 600 200">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      
                      {/* Gradient fill */}
                      <path d="M 0 200 L 0 160 L 100 140 L 200 120 L 300 90 L 400 80 L 500 50 L 600 30 L 600 200 Z" fill="url(#chartGrad)" />
                      
                      {/* Trend line */}
                      <path d="M 0 160 L 100 140 L 200 120 L 300 90 L 400 80 L 500 50 L 600 30" fill="none" stroke="#8b5cf6" strokeWidth="3" />
                      
                      {/* Forecast prediction line dots (dashed) */}
                      <path d="M 400 80 L 500 50 L 600 30" fill="none" stroke="#d946ef" strokeWidth="2" strokeDasharray="5,5" />
                      
                      {/* Grid dots */}
                      <circle cx="0" cy="160" r="4" fill="#8b5cf6" />
                      <circle cx="100" cy="140" r="4" fill="#8b5cf6" />
                      <circle cx="200" cy="120" r="4" fill="#8b5cf6" />
                      <circle cx="300" cy="90" r="4" fill="#8b5cf6" />
                      <circle cx="400" cy="80" r="4" fill="#8b5cf6" />
                      <circle cx="500" cy="50" r="4" fill="#d946ef" />
                      <circle cx="600" cy="30" r="4" fill="#d946ef" />
                    </svg>
                    
                    {/* Chart X Labels */}
                    <div className="flex justify-between text-[10px] text-text-muted px-2 mt-2 font-mono">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May (Forecast)</span>
                      <span>Jun (Forecast)</span>
                    </div>
                  </div>
                </div>

                {/* AI generated Insights */}
                <div className="glass rounded-3xl p-5 border border-glass flex flex-col">
                  <h3 className="font-bold text-base mb-4 flex items-center justify-between">
                    <span>AI Operations Insights</span>
                    <Sparkles className="w-4 h-4 text-primary animate-bounce" />
                  </h3>
                  
                  <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                    {dashboardInsights.length === 0 ? (
                      <p className="text-text-muted text-xs py-10 text-center">Crunching database numbers...</p>
                    ) : (
                      dashboardInsights.map((ins, i) => (
                        <div key={i} className="p-3 bg-slate-500/5 rounded-xl border border-glass text-xs space-y-1">
                          <span className={`font-bold capitalize uppercase text-[10px] ${
                            ins.type === 'success' ? 'text-green-500' :
                            ins.type === 'warning' ? 'text-amber-500' :
                            ins.type === 'danger' ? 'text-red-500' : 'text-primary'
                          }`}>{ins.title}</span>
                          <p className="text-text-muted mt-0.5 leading-relaxed">{ins.detail}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Tasks and activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Activities */}
                <div className="glass rounded-3xl p-5 border border-glass">
                  <h3 className="font-bold text-base mb-4">Live Activities Audit Log</h3>
                  <div className="space-y-4">
                    {recentActivities.map((act, i) => (
                      <div key={i} className="flex items-center text-xs py-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mr-3 flex-shrink-0"></div>
                        <div className="flex-1">
                          <span className="font-semibold block uppercase text-[10px] text-text-muted">{act.action}</span>
                          <span className="text-text-main text-xs">{act.details}</span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono ml-4">{act.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dashboard Tasks */}
                <div className="glass rounded-3xl p-5 border border-glass">
                  <h3 className="font-bold text-base mb-4">Operations Tasks Checklist</h3>
                  <div className="space-y-3">
                    {[
                      { title: "Review leave request for Charlie Brown", dept: "HR Dept", priority: "Medium" },
                      { title: "PO RESTOCK order for task chairs", dept: "Procurement", priority: "High" },
                      { title: "Audit utilities expense spike (+8% margin)", dept: "Accounting", priority: "Low" }
                    ].map((task, i) => (
                      <div key={i} className="p-3.5 bg-slate-500/5 rounded-2xl border border-glass flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-text-main block">{task.title}</span>
                          <span className="text-[10px] text-text-muted font-mono">{task.dept}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          task.priority === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        }`}>{task.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* --- VIEW: Employees & HR --- */}
          {currentView === 'employees' && (
            <div className="space-y-6 animate-slide-up">
              <h1 className="text-3xl font-bold tracking-tight">HR Workspace & Recruitment</h1>
              
              {/* Form Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Add new employee card */}
                <div className="glass rounded-3xl p-5 border border-glass h-fit">
                  <h3 className="font-bold text-base mb-4 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Onboard New Hire</span>
                  </h3>
                  
                  <form onSubmit={handleAddEmployee} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">First Name</label>
                      <input 
                        type="text" 
                        value={newEmployee.firstName}
                        onChange={e => setNewEmployee({...newEmployee, firstName: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="John" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Last Name</label>
                      <input 
                        type="text" 
                        value={newEmployee.lastName}
                        onChange={e => setNewEmployee({...newEmployee, lastName: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="Doe" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Email</label>
                      <input 
                        type="email" 
                        value={newEmployee.email}
                        onChange={e => setNewEmployee({...newEmployee, email: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="john@naziran.com" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Phone</label>
                      <input 
                        type="text" 
                        value={newEmployee.phone}
                        onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="+1 555-0100" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Basic Salary ($/mo)</label>
                      <input 
                        type="number" 
                        value={newEmployee.salary}
                        onChange={e => setNewEmployee({...newEmployee, salary: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="65000" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Department</label>
                      <select 
                        value={newEmployee.departmentId}
                        onChange={e => setNewEmployee({...newEmployee, departmentId: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50"
                      >
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Designation</label>
                      <select 
                        value={newEmployee.designationId}
                        onChange={e => setNewEmployee({...newEmployee, designationId: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50"
                      >
                        {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                      </select>
                    </div>
                    
                    <button 
                      type="submit" 
                      className="w-full mt-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow"
                    >
                      Onboard Employee
                    </button>
                  </form>
                </div>

                {/* Employees list */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-base">Active Corporate Employee Registry</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-glass text-text-muted font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5">Name</th>
                          <th className="py-2.5">Department</th>
                          <th className="py-2.5">Designation</th>
                          <th className="py-2.5">Base Salary</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass/50">
                        {employees.map(emp => (
                          <tr key={emp.id} className="hover:bg-slate-500/5 transition-all">
                            <td className="py-3">
                              <span className="font-bold block">{emp.firstName} {emp.lastName}</span>
                              <span className="text-[10px] text-text-muted font-mono">{emp.email}</span>
                            </td>
                            <td className="py-3 text-text-muted">{emp.department?.name}</td>
                            <td className="py-3 text-text-muted">{emp.designation?.title}</td>
                            <td className="py-3 font-mono font-semibold">${emp.salary.toLocaleString()}</td>
                            <td className="py-3 text-right space-x-2">
                              {emp.status === 'Active' ? (
                                <>
                                  <button onClick={() => handleGeneratePayrollRun(emp.id)} className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-all font-semibold uppercase text-[9px]">Run Payroll</button>
                                  <button onClick={() => handleTerminateEmployee(emp.id)} className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-all font-semibold uppercase text-[9px]">Terminate</button>
                                </>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[10px] uppercase font-bold">Terminated</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* RAG Handbook Upload and Resume Screener section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* AI Resume Screener */}
                <div className="glass rounded-3xl p-5 border border-glass space-y-4">
                  <h3 className="font-bold text-base flex items-center space-x-2">
                    <FileUp className="w-4.5 h-4.5 text-primary" />
                    <span>AI Resume Screening Panel</span>
                  </h3>
                  
                  <form onSubmit={handleResumeScreen} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Target Job Description</label>
                      <input 
                        type="text" 
                        value={resumeJD}
                        onChange={e => setResumeJD(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="Software Engineer (React/Node)" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Upload Resume PDF</label>
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={e => setResumeFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={resumeLoading || !resumeFile}
                      className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                    >
                      {resumeLoading ? 'Screening via LLM...' : 'Grade & Screen Candidate'}
                    </button>
                  </form>

                  {resumeResult && (
                    <div className="mt-4 p-4 bg-slate-500/5 rounded-2xl border border-glass text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-text-main">{resumeResult.candidateName}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                          resumeResult.matchPercentage > 80 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>{resumeResult.matchPercentage}% Match</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-text-muted uppercase">Extracted Core Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {resumeResult.extractedDetails?.skills?.map((sk: string, index: number) => (
                            <span key={index} className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px]">{sk}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-text-muted uppercase block">AI HR Scorecard Decision:</span>
                        <span className="font-bold text-text-main">{resumeResult.ranking}</span>
                      </div>
                      <p className="text-text-muted mt-1 leading-relaxed bg-slate-500/5 p-2 rounded-lg">{resumeResult.recommendation}</p>
                    </div>
                  )}
                </div>

                {/* Company Handbook Upload */}
                <div className="glass rounded-3xl p-5 border border-glass space-y-4">
                  <h3 className="font-bold text-base flex items-center space-x-2">
                    <Upload className="w-4.5 h-4.5 text-primary" />
                    <span>Upload Company Handbook (RAG Knowledge Index)</span>
                  </h3>
                  <p className="text-text-muted text-xs leading-relaxed">
                    Upload employee handbooks, compliance policies, or HR benefit charts. Chunks will be indexed into the vector store for RAG semantic search.
                  </p>
                  
                  <form onSubmit={handleRagUpload} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Document Category</label>
                      <input 
                        type="text" 
                        value={ragDocName}
                        onChange={e => setRagDocName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="Corporate HR Handbook Q3" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Upload Handbook PDF</label>
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={e => setRagFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={ragLoading || !ragFile}
                      className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                    >
                      {ragLoading ? 'Generating Embeddings & Indexing...' : 'Index Document Chunks'}
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* --- VIEW: Attendance & Leave --- */}
          {currentView === 'attendance' && (
            <div className="space-y-6 animate-slide-up">
              <h1 className="text-3xl font-bold tracking-tight">Attendance & Leaves desk</h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Punch card */}
                <div className="glass rounded-3xl p-5 border border-glass space-y-4">
                  <h3 className="font-bold text-base">Clock In / Clock Out</h3>
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-500/5 rounded-3xl border border-glass relative">
                    <span className="text-3xl font-bold font-mono text-text-main mb-2">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <span className="text-xs text-text-muted font-medium mb-6">
                      Shift Schedule: 09:00 AM - 06:00 PM
                    </span>

                    <div className="flex space-x-3.5 w-full">
                      <button 
                        onClick={handleClockIn}
                        disabled={attendanceToday?.clockedIn}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs uppercase"
                      >
                        Clock In
                      </button>
                      <button 
                        onClick={handleClockOut}
                        disabled={!attendanceToday?.clockedIn || attendanceToday?.clockedOut}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs uppercase"
                      >
                        Clock Out
                      </button>
                    </div>

                    {attendanceToday?.clockedIn && (
                      <div className="mt-4 text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full font-semibold uppercase">
                        Today Status: Clocked in at {new Date(attendanceToday.record?.clockIn).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  {/* Add leave request form */}
                  <div className="border-t border-glass pt-4">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-text-muted mb-3 ml-1">Submit Leave Application</h3>
                    
                    <form onSubmit={e => handleLeaveRequest(e, 'SICK', (e.target as any).start.value, (e.target as any).end.value, (e.target as any).reason.value)} className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Start Date</label>
                          <input name="start" type="date" required className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">End Date</label>
                          <input name="end" type="date" required className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Reason for leave</label>
                        <input name="reason" type="text" required placeholder="Medical appointment" className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs" />
                      </div>
                      <button type="submit" className="w-full py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all">Submit Application</button>
                    </form>
                  </div>
                </div>

                {/* Leave Requests dashboard */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-base">Corporate Leave Applications Pipeline</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-glass text-text-muted font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5">Employee</th>
                          <th className="py-2.5">Type</th>
                          <th className="py-2.5">Timeline</th>
                          <th className="py-2.5">Reason</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass/50">
                        {leaveRequests.map(leave => (
                          <tr key={leave.id} className="hover:bg-slate-500/5 transition-all">
                            <td className="py-3 font-semibold">{leave.employee?.firstName} {leave.employee?.lastName}</td>
                            <td className="py-3 text-text-muted">{leave.leaveType}</td>
                            <td className="py-3 font-mono text-[10px] text-text-muted">
                              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-text-muted truncate max-w-xs">{leave.reason}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                                leave.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                leave.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}>{leave.status}</span>
                            </td>
                            <td className="py-3 text-right space-x-2">
                              {leave.status === 'PENDING' && user && ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'].includes(user.role) && (
                                <>
                                  <button onClick={() => handleApproveLeave(leave.id, 'APPROVED')} className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check size={16} /></button>
                                  <button onClick={() => handleApproveLeave(leave.id, 'REJECTED')} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><X size={16} /></button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- VIEW: Inventory --- */}
          {currentView === 'inventory' && (
            <div className="space-y-6 animate-slide-up">
              <h1 className="text-3xl font-bold tracking-tight">Corporate Asset & Inventory</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Add new stock item card */}
                <div className="glass rounded-3xl p-5 border border-glass h-fit">
                  <h3 className="font-bold text-base mb-4 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Onboard Product Stock</span>
                  </h3>
                  
                  <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Product Name</label>
                      <input 
                        type="text" 
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="Precision Mouse" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">SKU identifier</label>
                      <input 
                        type="text" 
                        value={newProduct.sku}
                        onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none focus:border-primary/50" 
                        placeholder="MSE-PREC-01" 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Retail Price ($)</label>
                        <input 
                          type="number" 
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs" 
                          placeholder="89.00" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Cost Value ($)</label>
                        <input 
                          type="number" 
                          value={newProduct.cost}
                          onChange={e => setNewProduct({...newProduct, cost: e.target.value})}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs" 
                          placeholder="50.00" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Initial Stock</label>
                        <input 
                          type="number" 
                          value={newProduct.stock}
                          onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs" 
                          placeholder="15" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Min Threshold</label>
                        <input 
                          type="number" 
                          value={newProduct.minStock}
                          onChange={e => setNewProduct({...newProduct, minStock: e.target.value})}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs" 
                          placeholder="5" 
                          required 
                        />
                      </div>
                    </div>
                    
                    <button 
                      type="submit" 
                      className="w-full mt-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow"
                    >
                      Onboard Stock Item
                    </button>
                  </form>
                </div>

                {/* Stock table */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-base">Current Stock ledger & Warnings</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-glass text-text-muted font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5">Product Details</th>
                          <th className="py-2.5">SKU</th>
                          <th className="py-2.5">Retail / Cost</th>
                          <th className="py-2.5">Stock</th>
                          <th className="py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass/50">
                        {products.map(prod => {
                          const isLow = prod.stock < prod.minStock;
                          return (
                            <tr key={prod.id} className="hover:bg-slate-500/5 transition-all">
                              <td className="py-3">
                                <span className="font-bold block">{prod.name}</span>
                                <span className="text-[10px] text-text-muted truncate block max-w-xs">{prod.description || 'No description'}</span>
                              </td>
                              <td className="py-3 text-text-muted font-mono">{prod.sku}</td>
                              <td className="py-3 text-text-muted font-mono">
                                ${prod.price} / <span className="opacity-60">${prod.cost}</span>
                              </td>
                              <td className="py-3 font-mono font-semibold">{prod.stock}</td>
                              <td className="py-3 text-right">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                                  isLow ? 'bg-red-500/10 text-red-500 border-red-500/20 pulse-green' : 'bg-green-500/10 text-green-500 border-green-500/20'
                                }`}>{isLow ? 'Low Stock' : 'In Stock'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- VIEW: Sales & Invoices --- */}
          {currentView === 'sales' && (
            <div className="space-y-6 animate-slide-up">
              <h1 className="text-3xl font-bold tracking-tight">Sales Orders & GST Invoicing</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Generate direct sale order */}
                <div className="glass rounded-3xl p-5 border border-glass h-fit">
                  <h3 className="font-bold text-base mb-4 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Issue Direct Sales Order</span>
                  </h3>
                  
                  <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Product to Buy</label>
                      <select 
                        value={newOrder.productId}
                        onChange={e => setNewOrder({...newOrder, productId: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-glass text-text-main text-xs focus:outline-none"
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Buy Quantity</label>
                      <input 
                        type="number" 
                        value={newOrder.quantity}
                        onChange={e => setNewOrder({...newOrder, quantity: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" 
                        min="1"
                        required 
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full mt-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow"
                    >
                      Process Order & Issue Bill
                    </button>
                  </form>
                </div>

                {/* Invoices list */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-base">Invoices ledger & GST ledger (18%)</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-glass text-text-muted font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5">Invoice Number</th>
                          <th className="py-2.5">Total Amount</th>
                          <th className="py-2.5">Tax Included</th>
                          <th className="py-2.5">Due Date</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass/50">
                        {invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-500/5 transition-all">
                            <td className="py-3">
                              <span className="font-bold block">{inv.invoiceNumber}</span>
                              <span className="text-[10px] text-text-muted font-mono">{inv.order?.customer?.name}</span>
                            </td>
                            <td className="py-3 font-mono font-semibold">${inv.totalAmount.toLocaleString()}</td>
                            <td className="py-3 font-mono text-text-muted">${inv.taxAmount.toLocaleString()}</td>
                            <td className="py-3 text-text-muted">{new Date(inv.dueDate).toLocaleDateString()}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                                inv.status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}>{inv.status}</span>
                            </td>
                            <td className="py-3 text-right">
                              {inv.status === 'UNPAID' && (
                                <button onClick={() => handlePayInvoice(inv.id)} className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded hover:bg-green-500/20 transition-all font-semibold uppercase text-[9px]">Settle Payment</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- VIEW: CRM --- */}
          {currentView === 'crm' && (
            <div className="space-y-6 animate-slide-up">
              <h1 className="text-3xl font-bold tracking-tight">CRM Sales Funnel</h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Generate CRM Pipeline Lead */}
                <div className="glass rounded-3xl p-5 border border-glass h-fit">
                  <h3 className="font-bold text-base mb-4 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Create Lead Opportunity</span>
                  </h3>
                  
                  <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Company / Customer Name</label>
                      <input 
                        type="text" 
                        value={newLead.customerName}
                        onChange={e => setNewLead({...newLead, customerName: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" 
                        placeholder="Tony Stark" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Company Domain</label>
                      <input 
                        type="text" 
                        value={newLead.company}
                        onChange={e => setNewLead({...newLead, company: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" 
                        placeholder="Stark Industries" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Estimated Value ($)</label>
                      <input 
                        type="number" 
                        value={newLead.value}
                        onChange={e => setNewLead({...newLead, value: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" 
                        placeholder="125000" 
                        required 
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full mt-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow"
                    >
                      Onboard Pipeline Lead
                    </button>
                  </form>
                </div>

                {/* Kanban pipeline boards */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-base">Funnels Board (Leads &rarr; Opp &rarr; Won Deals)</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Column 1: Leads */}
                    <div className="bg-slate-500/5 p-3 rounded-2xl border border-glass space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted border-b border-glass pb-1 flex justify-between">
                        <span>Leads ({crmOverview.leads?.length || 0})</span>
                      </h4>
                      <div className="space-y-2">
                        {crmOverview.leads?.map((ld: any) => (
                          <div key={ld.id} className="glass p-3 rounded-xl border border-glass text-[11px] space-y-1.5 animate-blur-in">
                            <span className="font-bold text-text-main block">{ld.customer?.name}</span>
                            <span className="text-primary font-bold font-mono block">${ld.value.toLocaleString()}</span>
                            <button onClick={() => handleQualifyLead(ld.id)} className="w-full py-1 mt-1 bg-primary/15 border border-primary/20 rounded hover:bg-primary/25 text-[9px] uppercase font-bold text-primary transition-all">Promote</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: Opportunities */}
                    <div className="bg-slate-500/5 p-3 rounded-2xl border border-glass space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted border-b border-glass pb-1">
                        <span>Opportunities ({crmOverview.opportunities?.length || 0})</span>
                      </h4>
                      <div className="space-y-2">
                        {crmOverview.opportunities?.map((opp: any) => (
                          <div key={opp.id} className="glass p-3 rounded-xl border border-glass text-[11px] space-y-1.5 animate-blur-in">
                            <span className="font-bold text-text-main block">{opp.title}</span>
                            <span className="text-pink-500 font-bold font-mono block">${opp.value.toLocaleString()}</span>
                            <button onClick={() => handleCloseWonOpportunity(opp.id)} className="w-full py-1 mt-1 bg-green-500/15 border border-green-500/20 rounded hover:bg-green-500/25 text-[9px] uppercase font-bold text-green-500 transition-all">Close Won</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: Won Deals */}
                    <div className="bg-slate-500/5 p-3 rounded-2xl border border-glass space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted border-b border-glass pb-1">
                        <span>Closed Won ({crmOverview.deals?.length || 0})</span>
                      </h4>
                      <div className="space-y-2">
                        {crmOverview.deals?.map((dl: any) => (
                          <div key={dl.id} className="glass p-3 rounded-xl border border-glass text-[11px] space-y-1">
                            <span className="font-bold text-text-main block">{dl.title}</span>
                            <span className="text-green-500 font-bold font-mono block">${dl.value.toLocaleString()}</span>
                            <span className="text-[9px] text-text-muted uppercase font-bold bg-green-500/10 border border-green-500/25 px-1.5 py-0.5 rounded-full inline-block mt-1">Won</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- VIEW: Finance & Ledger --- */}
          {currentView === 'finance' && (
            <div className="space-y-6 animate-slide-up">
              <h1 className="text-3xl font-bold tracking-tight">Ledger Accounting & Statements</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Ledger input card */}
                <div className="glass rounded-3xl p-5 border border-glass h-fit">
                  <h3 className="font-bold text-base mb-4 flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Log Manual Transaction</span>
                  </h3>
                  
                  <form onSubmit={handleAddTransaction} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Transaction Type</label>
                      <select 
                        value={newTransaction.type}
                        onChange={e => setNewTransaction({...newTransaction, type: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-glass text-text-main text-xs focus:outline-none"
                      >
                        <option value="EXPENSE">Expense payout</option>
                        <option value="INCOME">Income receipt</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Ledger Category</label>
                      <select 
                        value={newTransaction.category}
                        onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-glass text-text-main text-xs focus:outline-none"
                      >
                        <option value="Utilities">Utilities & Air conditioning</option>
                        <option value="Rent & Office Space">Office Rent</option>
                        <option value="Inventory Purchase">Inventory restocking</option>
                        <option value="Marketing">Marketing / Ads</option>
                        <option value="Product Sales">Direct Product sales</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Amount ($)</label>
                      <input 
                        type="number" 
                        value={newTransaction.amount}
                        onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" 
                        placeholder="850.00"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Memo / Description</label>
                      <input 
                        type="text" 
                        value={newTransaction.description}
                        onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" 
                        placeholder="July High-speed fiber subscription" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full mt-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow"
                    >
                      Commit Ledger Transaction
                    </button>
                  </form>
                </div>

                {/* Ledger reports list */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2 space-y-6">
                  
                  {/* Ledger entries */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-base">Transactions ledger entries</h3>
                    <div className="overflow-x-auto max-h-60 overflow-y-auto pr-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-glass text-text-muted font-semibold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5">Date</th>
                            <th className="py-2.5">Category Details</th>
                            <th className="py-2.5">Type</th>
                            <th className="py-2.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-glass/50">
                          {transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-500/5 transition-all">
                              <td className="py-3 text-text-muted">{new Date(tx.date).toLocaleDateString()}</td>
                              <td className="py-3">
                                <span className="font-bold block">{tx.category}</span>
                                <span className="text-[10px] text-text-muted block max-w-xs">{tx.description || 'No description'}</span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                                  tx.type === 'INCOME' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>{tx.type}</span>
                              </td>
                              <td className={`py-3 text-right font-mono font-bold ${tx.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                                {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial statements */}
                  <div className="grid grid-cols-2 gap-4 border-t border-glass pt-5">
                    <div className="p-4 bg-slate-500/5 rounded-2xl border border-glass space-y-3">
                      <h4 className="font-bold text-xs uppercase text-text-muted">Profit & Loss Summary</h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span>Revenue:</span><span className="font-mono font-bold text-green-500">${profitLoss?.income?.total?.toLocaleString() || '0'}</span></div>
                        <div className="flex justify-between"><span>Operating Costs:</span><span className="font-mono font-bold text-red-500">${profitLoss?.expense?.total?.toLocaleString() || '0'}</span></div>
                        <div className="flex justify-between border-t border-glass/40 pt-1.5 font-bold">
                          <span>Net Surplus:</span>
                          <span className="font-mono text-primary">${profitLoss?.netProfit?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-500/5 rounded-2xl border border-glass space-y-3">
                      <h4 className="font-bold text-xs uppercase text-text-muted">Balance Sheet summary</h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span>Cash Asset:</span><span className="font-mono font-bold text-green-500">${balanceSheet?.assets?.cash?.toLocaleString() || '0'}</span></div>
                        <div className="flex justify-between"><span>Inventory Assets:</span><span className="font-mono font-bold text-green-500">${balanceSheet?.assets?.inventory?.toLocaleString() || '0'}</span></div>
                        <div className="flex justify-between border-t border-glass/40 pt-1.5 font-bold">
                          <span>Net Assets Valuation:</span>
                          <span className="font-mono text-primary">${balanceSheet?.assets?.total?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* --- VIEW: AI suite & RAG --- */}
          {currentView === 'ai-chat' && (
            <div className="space-y-6 animate-slide-up">
              
              {/* AI Header & Vector Engine Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass rounded-3xl p-6 border border-glass">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-3">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    <span>AI Suite & RAG Orchestration</span>
                  </h1>
                  <p className="text-text-muted text-xs mt-1">
                    Semantic Vector RAG search over corporate handbooks, policy documents, and natural language ERP database queries.
                  </p>
                </div>

                {/* RAG Metrics */}
                <div className="flex items-center space-x-3 text-xs">
                  <div className="px-3.5 py-2 bg-primary/10 border border-primary/30 rounded-2xl text-center">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">Indexed Docs</span>
                    <span className="font-bold font-mono text-primary text-sm">{ragStats.totalDocuments} Files</span>
                  </div>
                  <div className="px-3.5 py-2 bg-slate-500/10 border border-glass rounded-2xl text-center">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">Vector Chunks</span>
                    <span className="font-bold font-mono text-text-main text-sm">{ragStats.totalChunks} Chunks</span>
                  </div>
                  <div className="px-3.5 py-2 bg-green-500/10 border border-green-500/30 rounded-2xl text-center hidden sm:block">
                    <span className="text-[10px] text-green-400 font-bold uppercase block">RAG Engine</span>
                    <span className="font-semibold text-green-500 text-[11px]">Active (Node + Python)</span>
                  </div>
                </div>
              </div>

              {/* Document Indexing Bar */}
              <div className="glass rounded-3xl p-5 border border-glass flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-main">Index Custom Handbook or Document</h3>
                    <p className="text-text-muted text-[11px]">Upload any PDF, TXT, or Word document for instant semantic search in the Chatbot.</p>
                  </div>
                </div>

                <form onSubmit={handleRagUpload} className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
                  <input 
                    type="file" 
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={e => setRagFile(e.target.files?.[0] || null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer" 
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={ragLoading || !ragFile}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow flex items-center space-x-1.5 disabled:opacity-50 text-xs shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{ragLoading ? 'Indexing...' : 'Index File'}</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={handlePurgeAllRagDocuments}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold transition-all text-xs shrink-0 flex items-center space-x-1"
                    title="Reset old vector store documents"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Old Index</span>
                  </button>
                </form>
              </div>

              {/* Gemini / OpenAI API Key Settings Bar */}
              <div className="glass rounded-3xl p-4 border border-glass flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-text-muted">
                  <Key className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold text-text-main">AI LLM Key Configuration:</span>
                  <span className="text-[11px]">Placed in <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-primary">apps/api/.env</code> as <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-green-400">GEMINI_API_KEY=your_key</code></span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-mono text-green-400 bg-green-500/10 px-3 py-1 rounded-xl border border-green-500/20">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Gemini API Key Active</span>
                </div>
              </div>

              {/* Main Chat Interface & Interactive Query Launcher */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* AI Auxiliary Tools (Interview & Email Generator) */}
                <div className="glass rounded-3xl p-5 border border-glass h-fit space-y-5 text-xs">
                  
                  {/* Interview Question Builder */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase text-primary tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Interview Question Generator</span>
                    </h4>
                    
                    <form onSubmit={handleInterviewGen} className="space-y-2.5">
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Target Job Title</label>
                        <input type="text" value={interviewJD} onChange={e => setInterviewJD(e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Focus requirements</label>
                        <input type="text" value={interviewFocus} onChange={e => setInterviewFocus(e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" />
                      </div>
                      <button type="submit" disabled={interviewLoading} className="w-full py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all">
                        {interviewLoading ? 'Generating Questions...' : 'Draft Interview Assessment'}
                      </button>
                    </form>

                    {interviewResult && (
                      <div className="mt-3 p-3 bg-slate-500/5 rounded-2xl border border-glass text-[11px] space-y-2 max-h-48 overflow-y-auto">
                        {interviewResult.map((q: any, index: number) => (
                          <div key={index} className="border-b border-glass/40 pb-2 last:border-b-0">
                            <span className="font-bold text-primary uppercase text-[9px]">{q.type}</span>
                            <p className="text-text-muted mt-0.5 leading-relaxed">{q.question}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Email Generator */}
                  <div className="border-t border-glass pt-4 space-y-3">
                    <h4 className="font-bold text-xs uppercase text-primary tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Corporate Email Writer</span>
                    </h4>
                    
                    <form onSubmit={handleEmailGen} className="space-y-2.5">
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Email Category</label>
                        <select value={emailType} onChange={e => setEmailType(e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-glass text-text-main text-xs">
                          <option value="Leave Approval">Leave application approval</option>
                          <option value="Offer Letter">Offer letter proposal</option>
                          <option value="Salary Notification">Salary disbursement notification</option>
                          <option value="Customer Follow-up">Customer deal follow-up</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-text-muted uppercase mb-1">Draft details context</label>
                        <input type="text" value={emailDetails} onChange={e => setEmailDetails(e.target.value)} className="w-full px-3 py-1.5 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" />
                      </div>
                      <button type="submit" disabled={emailLoading} className="w-full py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all">
                        {emailLoading ? 'Drafting Email...' : 'Write Email template'}
                      </button>
                    </form>

                    {emailResult && (
                      <div className="mt-3 p-3 bg-slate-500/5 rounded-2xl border border-glass text-[11px] space-y-2">
                        <span className="font-bold text-text-main block">{emailResult.subject}</span>
                        <pre className="text-text-muted mt-0.5 leading-relaxed font-sans whitespace-pre-wrap">{emailResult.body}</pre>
                      </div>
                    )}
                  </div>

                </div>

                {/* RAG Chat & Interactive Search Panel */}
                <div className="glass rounded-3xl p-5 border border-glass lg:col-span-2 flex flex-col h-[650px] space-y-3">

                  {/* 1-Click Interactive Sample Prompt Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Interactive Sample Queries:</span>
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                      <button onClick={() => handleRunSamplePrompt("What is the annual leave policy?")} className="px-2.5 py-1 bg-slate-500/10 hover:bg-primary/20 hover:border-primary/30 border border-glass rounded-xl text-text-main shrink-0 transition-all">
                        💡 Annual leave policy?
                      </button>
                      <button onClick={() => handleRunSamplePrompt("What are the corporate expense payout rules?")} className="px-2.5 py-1 bg-slate-500/10 hover:bg-primary/20 hover:border-primary/30 border border-glass rounded-xl text-text-main shrink-0 transition-all">
                        💡 Expense payout rules?
                      </button>
                      <button onClick={() => handleRunSamplePrompt("What are the GST sales invoice standards?")} className="px-2.5 py-1 bg-slate-500/10 hover:bg-primary/20 hover:border-primary/30 border border-glass rounded-xl text-text-main shrink-0 transition-all">
                        💡 GST Sales invoice tax?
                      </button>
                      <button onClick={() => handleRunSamplePrompt("Which products are low on stock?")} className="px-2.5 py-1 bg-slate-500/10 hover:bg-primary/20 hover:border-primary/30 border border-glass rounded-xl text-text-main shrink-0 transition-all">
                        💡 Low stock warnings?
                      </button>
                    </div>
                  </div>
                  
                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs border border-glass/40 rounded-2xl p-4 bg-slate-900/20">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-blur-in`}>
                        <div className={`max-w-xl p-4 rounded-2xl border space-y-2 relative group ${
                          msg.sender === 'user' 
                            ? 'bg-primary text-white border-primary/20 rounded-tr-none' 
                            : 'bg-slate-500/5 text-text-main border-glass rounded-tl-none'
                        }`}>
                          
                          {/* Confidence Score & Copy Button for AI response */}
                          {msg.sender === 'ai' && (
                            <div className="flex items-center justify-between border-b border-glass/30 pb-1.5 text-[9px] mb-1">
                              <span className="font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                                {msg.confidenceScore ? `${msg.confidenceScore}% Vector Match` : 'RAG Answer'}
                              </span>
                              <button 
                                onClick={() => handleCopyAnswer(msg.text, i)}
                                className="text-text-muted hover:text-text-main flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-slate-500/10 transition-all"
                              >
                                {copiedIndex === i ? <Check className="w-3 h-3 text-green-400" /> : <Edit3 className="w-3 h-3" />}
                                <span>{copiedIndex === i ? 'Copied!' : 'Copy Answer'}</span>
                              </button>
                            </div>
                          )}

                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          
                          {/* Citation Source Badges */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-glass/40 text-[9px] space-y-1">
                              <span className="font-bold text-text-muted uppercase block">Citations & Source Documents:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.citations.map((cite: any, cIdx: number) => (
                                  <button 
                                    key={cIdx} 
                                    onClick={() => setActiveCitationModal(cite)}
                                    className="px-2 py-1 bg-primary/10 border border-primary/30 text-primary rounded-lg font-mono font-semibold flex items-center space-x-1 hover:bg-primary/20 transition-all cursor-pointer"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>{cite.filename} ({cite.matchScore || 90}%)</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {msg.query && (
                            <details className="mt-2 pt-2 border-t border-glass/40 text-[9px] font-mono opacity-80 cursor-pointer">
                              <summary className="font-bold hover:underline">Executed SQL Query</summary>
                              <pre className="mt-1 bg-black/30 p-2 rounded whitespace-pre-wrap">{msg.query}</pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {aiLoading && (
                      <div className="flex justify-start animate-pulse">
                        <div className="bg-slate-500/5 text-text-muted border border-glass p-3 rounded-2xl rounded-tl-none">
                          Searching local vector index & generating response...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef}></div>
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendAiPrompt} className="flex space-x-2">
                    <input 
                      type="text" 
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-500/5 border border-glass text-text-main text-xs focus:outline-none" 
                      placeholder="Ask RAG assistant: 'What is the leave policy?' or 'Show expense payout rules'..." 
                    />
                    <button 
                      type="submit" 
                      disabled={aiLoading}
                      className="p-3 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow flex items-center justify-center shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* --- Overlay Global Search (Ctrl+K) --- */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-6 animate-fade-in">
          <div className="w-full max-w-xl glass rounded-3xl border border-glass shadow-2xl p-4 overflow-hidden max-h-[450px] flex flex-col">
            <div className="flex items-center space-x-3.5 border-b border-glass pb-3 mb-4">
              <Search className="text-text-muted" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent border-none text-text-main placeholder-text-muted focus:outline-none text-sm"
                placeholder="Search employees, products, invoices, or customers..." 
              />
              <button onClick={() => setSearchOpen(false)} className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-slate-500/10"><X size={16} /></button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {searchQuery.trim() === '' ? (
                <p className="text-text-muted text-center py-10">Type something to filter ERP index database...</p>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Index matches:</span>
                  {/* Employees matches */}
                  {employees.filter(e => `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                    <div key={e.id} onClick={() => { setSearchOpen(false); setCurrentView('employees'); }} className="p-3 bg-slate-500/5 hover:bg-primary/10 hover:border-primary/20 rounded-xl border border-glass cursor-pointer flex items-center justify-between transition-all">
                      <div>
                        <span className="font-bold text-text-main text-xs">{e.firstName} {e.lastName}</span>
                        <span className="text-[10px] text-text-muted font-mono block">{e.email}</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">Employee</span>
                    </div>
                  ))}
                  {/* Products matches */}
                  {products.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <div key={p.id} onClick={() => { setSearchOpen(false); setCurrentView('inventory'); }} className="p-3 bg-slate-500/5 hover:bg-primary/10 hover:border-primary/20 rounded-xl border border-glass cursor-pointer flex items-center justify-between transition-all">
                      <div>
                        <span className="font-bold text-text-main text-xs">{p.name}</span>
                        <span className="text-[10px] text-text-muted font-mono block">{p.sku}</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold bg-blue-500/10 border border-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">Inventory</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Citation Source Inspector Modal --- */}
      {activeCitationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-lg glass rounded-3xl border border-glass shadow-2xl p-6 space-y-4 relative">
            <div className="flex items-start justify-between border-b border-glass pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">RAG Source Inspection</span>
                <h3 className="text-base font-bold text-text-main flex items-center space-x-2 mt-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>{activeCitationModal.filename}</span>
                </h3>
              </div>
              <button onClick={() => setActiveCitationModal(null)} className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-slate-500/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-slate-500/5 p-2.5 rounded-xl border border-glass">
                <span className="text-text-muted text-[10px] uppercase font-bold">Vector Match Confidence</span>
                <span className="font-bold text-green-400 font-mono">{activeCitationModal.matchScore || 90}% Match</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-text-muted text-[10px] uppercase font-bold block">Extracted Vector Text Chunk Snippet:</span>
                <div className="p-3 bg-black/40 rounded-xl border border-glass font-mono text-[11px] leading-relaxed text-text-main max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {activeCitationModal.snippet}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setActiveCitationModal(null)}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all shadow text-xs"
            >
              Close Source Inspector
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
