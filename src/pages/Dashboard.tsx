import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, TrendingUp, CheckCircle, XCircle, Users, 
  Trash2, Eye, UserPlus, Mail, Phone, Building2, Lock, User, Printer, Calendar, ShieldCheck,
  FileSpreadsheet, Download
} from 'lucide-react';
import { downloadComplaintExcel, downloadComplaintPDF } from '../utils/complaintExport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  subscribeToAllComplaints, 
  subscribeToComplaintStats, 
  Complaint,
  ComplaintStats,
  deleteComplaint,
  updateComplaintStatus,
  assignComplaint,
  addNote,
  ComplaintNote
} from '../services/complaint.service';
import { 
  createModeratorAccount, 
  getAllModerators, 
  getActiveModerators,
  subscribeToActiveModerators,
  toggleModeratorStatus,
  Moderator 
} from '../services/moderator.service';
import { useAuth } from '../contexts/AuthContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import UserManagement from '../components/UserManagement';
import SuperAdminLicenseModal from '../components/SuperAdminLicenseModal';
import CreateAdminModal from '../components/CreateAdminModal';
import { useRateLimit } from '../hooks/useRateLimit';

const getQtrNoFromDesc = (desc?: string): string => {
  if (!desc) return '';
  const match = desc.match(/Qtr No\.:\s*([^|\n]+)/i);
  return match ? match[1].trim() : '';
};

const getSpecifiedLocFromDesc = (desc?: string): string => {
  if (!desc) return '';
  const match = desc.match(/Specified Location:\s*([^|\n]+)/i);
  return match ? match[1].trim() : '';
};

const Dashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats>({
    total: 0,
    pending: 0,
    assigned: 0,
    active: 0,
    resolved: 0,
    rejected: 0
  });
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showModeratorForm, setShowModeratorForm] = useState(false);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningComplaint, setAssigningComplaint] = useState<Complaint | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const { currentUser, userRole, isSuperAdmin, isChiefAdmin, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'complaints' | 'users'>('complaints');
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creatingModerator, setCreatingModerator] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all',
    assigned: 'all',
    search: ''
  });

  // Date range filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Rate limiting for notes (10 second cooldown)
  const {
    isCooldown: isNoteCooldown,
    remainingSeconds: noteCooldownSeconds,
    canSubmit: canSubmitNote,
    startCooldown: startNoteCooldown
  } = useRateLimit({ cooldownSeconds: 10 });
  
  const [moderatorForm, setModeratorForm] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    let unsubscribeComplaints: (() => void) | null = null;
    let unsubscribeStats: (() => void) | null = null;
    let unsubscribeModerators: (() => void) | null = null;
    let mounted = true;

    const loadData = async () => {
      try {
        setDashboardLoading(true);
        
        // Subscribe to real-time complaints
        unsubscribeComplaints = subscribeToAllComplaints((data) => {
          if (mounted) {
            setComplaints(data);
          }
        });

        // Subscribe to real-time stats
        unsubscribeStats = subscribeToComplaintStats((data) => {
          if (mounted) {
            setStats(data);
          }
        });

        // Subscribe to real-time active moderators
        if (isAdmin || userRole === 'admin' || userRole === 'chief_admin') {
          unsubscribeModerators = subscribeToActiveModerators((data) => {
            if (mounted) {
              setModerators(data);
            }
          });
        }
        
        if (mounted) {
          setDashboardLoading(false);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (mounted) {
          setDashboardLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      mounted = false;
      if (unsubscribeComplaints) unsubscribeComplaints();
      if (unsubscribeStats) unsubscribeStats();
      if (unsubscribeModerators) unsubscribeModerators();
    };
  }, [userRole]);

  const loadModerators = async () => {
    try {
      // Only admins and chief admins can load moderators
      if (!isAdmin && userRole !== 'admin' && userRole !== 'chief_admin') {
        console.warn('loadModerators: User is not admin, skipping');
        return;
      }

      const mods = await getActiveModerators();
      setModerators(mods);
    } catch (error: any) {
      console.error('Error loading active moderators:', error);
      // Show user-friendly error message
      if (error.message?.includes('Unauthorized')) {
        alert('Access denied: Admin privileges required');
      }
    }
  };

  const handleCreateModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Only admins and chief admins can create moderators
      if (!isAdmin && userRole !== 'admin' && userRole !== 'chief_admin') {
        alert('Access denied: Admin privileges required');
        return;
      }

      setCreatingModerator(true);
      await createModeratorAccount(
        moderatorForm.name,
        moderatorForm.businessName,
        moderatorForm.email,
        moderatorForm.phone,
        moderatorForm.password
      );
      
      alert('Moderator created successfully!');
      setModeratorForm({ name: '', businessName: '', email: '', phone: '', password: '' });
      setShowModeratorForm(false);
      loadModerators();
    } catch (error: any) {
      console.error('Error creating moderator:', error);
      if (error.message?.includes('Unauthorized')) {
        alert('Access denied: Admin privileges required');
      } else {
        alert(error.message || 'Failed to create moderator');
      }
    } finally {
      setCreatingModerator(false);
    }
  };

  const handleDeactivateModerator = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this moderator? They will be signed out and immediately removed from active Moderator Management until reactivated in User Management.')) {
      try {
        if (!isAdmin && userRole !== 'admin' && userRole !== 'chief_admin') {
          alert('Access denied: Admin privileges required');
          return;
        }

        await toggleModeratorStatus(id, false);
        alert('Moderator deactivated successfully');
        loadModerators();
      } catch (error: any) {
        console.error('Error deactivating moderator:', error);
        alert('Failed to deactivate moderator');
      }
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        await deleteComplaint(id);
      } catch (error) {
        alert('Failed to delete complaint');
      }
    }
  };

  // Filter complaints based on active filters
  // Helper: parse Firestore timestamp or date string to JS Date
  const parseComplaintDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal.toDate) return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

  const filteredComplaints = complaints.filter((c) => {
    const matchSearch = c.title?.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus = filters.status === 'all' || c.status?.toLowerCase() === filters.status;
    const matchCategory = filters.category === 'all' || c.category === filters.category;
    const matchPriority = filters.priority === 'all' || c.priority?.toLowerCase() === filters.priority;
    const matchAssigned = 
      filters.assigned === 'all' || 
      (filters.assigned === 'assigned' && c.assignedTo) || 
      (filters.assigned === 'unassigned' && !c.assignedTo);

    return matchSearch && matchStatus && matchCategory && matchPriority && matchAssigned;
  });

  // Date-filtered complaints for printing
  const getDateFilteredComplaints = () => {
    return filteredComplaints.filter((c) => {
      const created = parseComplaintDate(c.createdAt);
      if (!created) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (created > to) return false;
      }
      return true;
    });
  };

  // Get complainant name with fallback
  const getComplainantName = (c: Complaint) => {
    return (c as any).name || (c as any).complainantName || (c as any).createdBy || 'N/A';
  };

  // Print styles shared between print functions
  const getPrintStyles = () => `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px; }
      h1 { font-size: 24px; margin-bottom: 4px; color: #60a5fa; }
      .subtitle { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #1e293b; color: #94a3b8; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155; }
      td { padding: 10px 14px; border-bottom: 1px solid #1e293b; font-size: 13px; color: #cbd5e1; }
      tr:nth-child(even) { background: rgba(255,255,255,0.02); }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
      .badge-pending { background: rgba(249,115,22,0.2); color: #fb923c; }
      .badge-active { background: rgba(139,92,246,0.2); color: #a78bfa; }
      .badge-resolved { background: rgba(16,185,129,0.2); color: #34d399; }
      .badge-rejected { background: rgba(239,68,68,0.2); color: #f87171; }
      .badge-low { background: rgba(16,185,129,0.2); color: #34d399; }
      .badge-medium { background: rgba(234,179,8,0.2); color: #facc15; }
      .badge-high { background: rgba(239,68,68,0.2); color: #f87171; }
      .detail-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-top: 16px; }
      .detail-row { display: flex; gap: 24px; margin-bottom: 12px; }
      .detail-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .detail-value { color: #e2e8f0; font-size: 14px; }
      .mono { font-family: 'Courier New', monospace; }
      @media print {
        body { background: white; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        th { background: #f1f5f9 !important; color: #475569 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        td { color: #334155 !important; border-bottom-color: #e2e8f0 !important; }
        .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h1 { color: #1e40af !important; }
        .detail-card { background: #f8fafc !important; border-color: #e2e8f0 !important; }
        .detail-label { color: #64748b !important; }
        .detail-value { color: #1e293b !important; }
      }
    </style>
  `;

  // Format date for display in print
  const formatDateForPrint = (dateVal: any): string => {
    const d = parseComplaintDate(dateVal);
    if (!d) return 'N/A';
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  // Print complaints by date range
  const handlePrintByDate = () => {
    const toPrint = getDateFilteredComplaints();
    if (toPrint.length === 0) {
      alert('No complaints found in the selected date range.');
      return;
    }
    const rangeLabel = `${dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN') : 'Start'} — ${dateTo ? new Date(dateTo).toLocaleDateString('en-IN') : 'Now'}`;
    const rows = toPrint.map(c => `
      <tr>
        <td class="mono">${c.ticketId || 'N/A'}</td>
        <td>${getComplainantName(c)}</td>
        <td>${c.title || ''}</td>
        <td>${c.category || ''}</td>
        <td><span class="badge badge-${c.status}">${c.status?.toUpperCase()}</span></td>
        <td><span class="badge badge-${c.priority}">${c.priority?.toUpperCase()}</span></td>
        <td>${c.assignedToName || 'Unassigned'}</td>
        <td>${formatDateForPrint(c.createdAt)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html><html><head><title>Complaints Report</title>${getPrintStyles()}</head>
      <body>
        <h1>Complaints Report</h1>
        <p class="subtitle">Date Range: ${rangeLabel} &nbsp;|&nbsp; Total: ${toPrint.length} complaint(s)</p>
        <table>
          <thead><tr>
            <th>Ticket ID</th><th>Name</th><th>Title</th><th>Category</th><th>Status</th><th>Priority</th><th>Assigned To</th><th>Date</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  // Print a single complaint
  const handlePrintSingle = (c: Complaint) => {
    const html = `
      <!DOCTYPE html><html><head><title>Complaint - ${c.ticketId || c.id}</title>${getPrintStyles()}</head>
      <body>
        <h1>Complaint Details</h1>
        <p class="subtitle">Ticket ID: ${c.ticketId || 'N/A'}</p>
        <div class="detail-card">
          <div class="detail-row">
            <div style="flex:1"><div class="detail-label">Ticket ID</div><div class="detail-value mono">${c.ticketId || 'N/A'}</div></div>
            <div style="flex:1"><div class="detail-label">Status</div><div class="detail-value"><span class="badge badge-${c.status}">${c.status?.toUpperCase()}</span></div></div>
            <div style="flex:1"><div class="detail-label">Priority</div><div class="detail-value"><span class="badge badge-${c.priority}">${c.priority?.toUpperCase()}</span></div></div>
          </div>
          <div class="detail-row">
            <div style="flex:1"><div class="detail-label">Name</div><div class="detail-value">${getComplainantName(c)}</div></div>
            <div style="flex:1"><div class="detail-label">Email</div><div class="detail-value">${c.email || 'N/A'}</div></div>
            <div style="flex:1"><div class="detail-label">Phone</div><div class="detail-value">${c.phone || 'N/A'}</div></div>
          </div>
          <div class="detail-row">
            <div style="flex:1"><div class="detail-label">Employee ID</div><div class="detail-value">${c.employeeId || 'N/A'}</div></div>
            <div style="flex:1"><div class="detail-label">Department</div><div class="detail-value">${c.department || 'N/A'}</div></div>
            <div style="flex:1"><div class="detail-label">Designation</div><div class="detail-value">${c.designation || 'N/A'}</div></div>
          </div>
          <div class="detail-row">
            <div style="flex:1"><div class="detail-label">Category</div><div class="detail-value">${c.category || 'N/A'}</div></div>
            <div style="flex:1"><div class="detail-label">Assigned To</div><div class="detail-value">${c.assignedToName || 'Unassigned'}</div></div>
          </div>
          <div style="margin-top: 16px">
            <div class="detail-label">Title</div>
            <div class="detail-value" style="font-weight:600; font-size:16px; margin-top:4px">${c.title || ''}</div>
          </div>
          <div style="margin-top: 16px">
            <div class="detail-label">Description</div>
            <div class="detail-value" style="margin-top:4px; line-height:1.6">${c.description || ''}</div>
          </div>
          <div class="detail-row" style="margin-top: 16px">
            <div style="flex:1"><div class="detail-label">Filed On</div><div class="detail-value">${formatDateForPrint(c.createdAt)}</div></div>
            <div style="flex:1"><div class="detail-label">Last Updated</div><div class="detail-value">${formatDateForPrint(c.updatedAt)}</div></div>
          </div>
        </div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleStatusChange = async (id: string, status: Complaint['status']) => {
    try {
      await updateComplaintStatus(id, status);
    } catch (error) {
      alert('Failed to update status');
    }
  };

  // SAIL KIOM local mode: notifications are disabled.
  // When a real SAIL KIOM backend is connected, implement real notifications here.
  const sendAssignmentNotifications = async (
    _complaint: Complaint,
    _moderator: Moderator
  ) => {
    // No-op in local mode
  };

  const handleAssignComplaint = async (moderator: Moderator) => {
    if (!assigningComplaint) return;

    try {
      await assignComplaint(
        assigningComplaint.id!,
        moderator.email,
        moderator.id!, // UID
        moderator.name
      );
      const assigned = assigningComplaint;
      setShowAssignModal(false);
      setAssigningComplaint(null);

      await sendAssignmentNotifications(assigned, moderator);
    } catch (error) {
      alert('Failed to assign complaint');
    }
  };

  const handleSaveAdminNote = async () => {
    if (!selectedComplaint || !currentUser || !canSubmitNote) return;
    
    if (!adminNote.trim()) {
      alert('Please enter a note');
      return;
    }
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      await addNote(
        selectedComplaint.id!,
        'adminToModerator',
        adminNote,
        currentUser.email || '',
        currentUser.displayName || 'Admin'
      );
      
      alert('Note saved successfully');
      setAdminNote('');
      startNoteCooldown(); // Start cooldown
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please wait a moment before trying again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'from-orange-500 to-yellow-500' },
    { label: 'Assigned', value: stats.assigned, icon: Users, color: 'from-blue-500 to-indigo-500' },
    { label: 'Active', value: stats.active, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'from-red-500 to-rose-500' }
  ];

  const chartData = [
    { name: 'Pending', value: stats.pending },
    { name: 'Assigned', value: stats.assigned },
    { name: 'Active', value: stats.active },
    { name: 'Resolved', value: stats.resolved },
    { name: 'Rejected', value: stats.rejected }
  ];

  // Filter out zero values to prevent label overlapping
  const filteredChartData = chartData.filter(item => item.value > 0);

  const renderCustomLabel = ({ percent, name }: any) => {
    if (percent === 0) return null;
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  const STATUS_COLORS_MAP: Record<string, string> = {
    'Pending': '#3b82f6',
    'Assigned': '#f59e0b',
    'Active': '#8b5cf6',
    'Resolved': '#10b981',
    'Rejected': '#ef4444'
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-orange-500/20 text-orange-400 border-orange-500', label: 'Pending' },
      assigned: { color: 'bg-blue-500/20 text-blue-400 border-blue-500', label: 'Assigned' },
      active: { color: 'bg-purple-500/20 text-purple-400 border-purple-500', label: 'Active' },
      resolved: { color: 'bg-green-500/20 text-green-400 border-green-500', label: 'Resolved' },
      rejected: { color: 'bg-red-500/20 text-red-400 border-red-500', label: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: 'bg-green-500/20 text-green-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-red-500/20 text-red-400'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[priority] || badges.medium}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  // Show skeleton while loading
  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-2 font-headline">
            {isChiefAdmin ? 'Chief Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF]">
            Manage electrical complaints, assign technicians, and monitor maintenance analytics
          </p>
          
          {/* Tab Navigation & Discreet Super Admin Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('complaints')}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === 'complaints'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] text-[#374151] dark:text-[#D1D5DB] hover:bg-slate-50 dark:hover:bg-[#20252E]'
                }`}
              >
                Electrical Complaints
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === 'users'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] text-[#374151] dark:text-[#D1D5DB] hover:bg-slate-50 dark:hover:bg-[#20252E]'
                }`}
              >
                Staff Management
              </button>
            </div>

            {/* Chief Admin & Super Admin Action Controls */}
            {(isChiefAdmin || isSuperAdmin) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateAdminModal(true)}
                  title="Create Admin, Chief Admin, or Moderator Account"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Create Account</span>
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={() => setShowSuperAdminModal(true)}
                    title="Super Admin Security & License Management"
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>System Security &amp; License</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* User Management Tab */}
        {activeTab === 'users' && <UserManagement />}

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow cursor-default"
                  >
                    <div className="w-10 h-10 mb-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-[#F9FAFB] mb-0.5 tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF]">{stat.label}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl shadow-xs p-6">
                <h3 className="text-lg font-bold mb-4 text-[#111827] dark:text-[#F9FAFB]">Complaint Status Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 600 }}
                      itemStyle={{ color: '#111827' }}
                    />
                    <Bar dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS_MAP[entry.name] || '#2563EB'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl shadow-xs p-6">
                <h3 className="text-lg font-bold mb-4 text-[#111827] dark:text-[#F9FAFB]">Status Overview Ratio</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={filteredChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={80}
                      fill="#2563EB"
                      dataKey="value"
                      nameKey="name"
                      minAngle={10}
                    >
                      {filteredChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS_MAP[entry.name] || '#2563EB'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: '#111827', fontWeight: 600 }}
                      itemStyle={{ color: '#111827' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Moderator Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#181B21] p-6 mb-8 rounded-2xl border border-[#E5E7EB] dark:border-[#2B313B] shadow-xs"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#2563EB]" />
                  Moderator Management
                </h3>
                <button
                  onClick={() => setShowModeratorForm(!showModeratorForm)}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Moderator
                </button>
              </div>

              {/* Create Moderator Form */}
              <AnimatePresence>
                {showModeratorForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCreateModerator}
                    className="mb-6 p-6 bg-slate-50 dark:bg-[#12151B] border border-blue-200 dark:border-blue-900/50 rounded-2xl shadow-xs"
                  >
                    <h4 className="text-base font-bold mb-4 text-[#2563EB]">Create New Moderator / Technician Account</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">Name *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                          <input
                            type="text"
                            value={moderatorForm.name}
                            onChange={(e) => setModeratorForm({ ...moderatorForm, name: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            placeholder="Full name"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">Business Name *</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                          <input
                            type="text"
                            value={moderatorForm.businessName}
                            onChange={(e) => setModeratorForm({ ...moderatorForm, businessName: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            placeholder="e.g. Electrical Maintenance"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">Email *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                          <input
                            type="email"
                            value={moderatorForm.email}
                            onChange={(e) => setModeratorForm({ ...moderatorForm, email: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            placeholder="email@sail.in"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">Phone *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                          <input
                            type="tel"
                            value={moderatorForm.phone}
                            onChange={(e) => setModeratorForm({ ...moderatorForm, phone: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            placeholder="Phone number"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                          <input
                            type="password"
                            value={moderatorForm.password}
                            onChange={(e) => setModeratorForm({ ...moderatorForm, password: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            placeholder="Min 6 characters"
                            minLength={6}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        type="submit"
                        disabled={creatingModerator}
                        className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
                      >
                        {creatingModerator ? 'Creating...' : 'Create Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModeratorForm(false)}
                        className="px-5 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] bg-white dark:bg-[#181B21] text-[#374151] dark:text-[#D1D5DB] font-semibold text-xs hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Moderators List */}
              {moderators.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/50 dark:bg-[#12151B] border border-dashed border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                  <Users className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">No active moderators</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                    Active technicians and moderators will appear here. Inactive moderators can be managed and reactivated in User Management.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moderators.map((mod) => (
                    <div key={mod.id} className="p-4 bg-slate-50/70 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl hover:border-blue-400 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-[#111827] dark:text-[#F9FAFB]">
                            {mod.name}
                          </h4>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{mod.businessName}</p>
                        </div>
                        <button
                          onClick={() => handleDeactivateModerator(mod.id!)}
                          className="text-amber-600 hover:text-amber-700 text-xs font-semibold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50 transition-colors"
                          title="Deactivate Moderator"
                        >
                          Deactivate
                        </button>
                      </div>
                      <div className="space-y-1 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                        <p className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {mod.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          {mod.phone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Complaints Table */}
            <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] p-6 rounded-2xl shadow-xs">
              <h3 className="text-xl font-bold mb-5 text-[#111827] dark:text-[#F9FAFB]">All Complaints</h3>
                          
              {/* Filter UI */}
              <div className="flex flex-wrap gap-3 mb-5">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search complaints..."
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              
                {/* Status */}
                <select
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              
                {/* Category */}
                <select
                  value={filters.category}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="all">All Categories</option>
                  <option value="Electrical Complaint">Electrical Complaint</option>
                  <option value="Power Supply / Wiring">Power Supply / Wiring</option>
                  <option value="Lighting / Fan / Appliance">Lighting / Fan / Appliance</option>
                  <option value="Others">Others</option>
                </select>
              
                {/* Priority */}
                <select
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              
                {/* Assigned Filter */}
                <select
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  onChange={(e) => setFilters(prev => ({ ...prev, assigned: e.target.value }))}
                >
                  <option value="all">All Assignments</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              
                {/* Clear Button */}
                <button
                  onClick={() => {
                    setFilters({
                      status: 'all',
                      category: 'all',
                      priority: 'all',
                      assigned: 'all',
                      search: ''
                    });
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[#4B5563] dark:text-[#D1D5DB] rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>

              {/* Date Range Filters */}
              <div className="flex flex-wrap gap-3 mb-5 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] border border-[#D1D5DB] dark:border-[#374151] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <button
                  onClick={handlePrintByDate}
                  disabled={!dateFrom && !dateTo}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    dateFrom || dateTo
                      ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Print complaints within selected date range"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Range
                </button>
              </div>

              <div className="overflow-x-auto border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#111318] border-b border-[#E5E7EB] dark:border-[#2B313B]">
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Ticket ID</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Name</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Title</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Category</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Priority</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Assigned To</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#2B313B]">
                    {filteredComplaints.map((complaint) => {
                      const assignedMod = moderators.find(m => m.id === complaint.assignedToUID);
                      const isAssignedDeactivated = assignedMod ? assignedMod.isActive === false : false;
                      
                      return (
                      <tr key={complaint.id} className="hover:bg-slate-50/80 dark:hover:bg-[#181B21]/80 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono font-bold text-[#2563EB] dark:text-blue-400">
                          {complaint.ticketId}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-[#111827] dark:text-[#F9FAFB]">
                          {getComplainantName(complaint)}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-[#111827] dark:text-[#F9FAFB] max-w-xs truncate">{complaint.title}</td>
                        <td className="py-3 px-4 text-xs text-[#4B5563] dark:text-[#9CA3AF]">{complaint.category}</td>
                        <td className="py-3 px-4 text-xs">{getStatusBadge(complaint.status)}</td>
                        <td className="py-3 px-4 text-xs">{getPriorityBadge(complaint.priority)}</td>
                        <td className="py-3 px-4 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                          {complaint.assignedToName || 'Unassigned'}
                          {isAssignedDeactivated && (
                            <span className="ml-1.5 text-[10px] text-rose-500 font-semibold">(Deactivated)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="flex gap-1.5 items-center">
                            <button
                              onClick={() => setSelectedComplaint(complaint)}
                              className="p-1 rounded text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => downloadComplaintExcel(complaint)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Download Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => downloadComplaintPDF(complaint)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Download PDF (.pdf)"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintSingle(complaint)}
                              className="p-1 rounded text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                              title="Print Complaint"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteComplaint(complaint.id!)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Complaint Detail Modal */}
            <AnimatePresence>
              {selectedComplaint && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                  onClick={() => setSelectedComplaint(null)}
                >
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#2B313B] mb-5">
                      <h3 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">Electrical Complaint Details</h3>
                      <button
                        onClick={() => setSelectedComplaint(null)}
                        className="p-1 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Ticket ID */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Ticket ID</p>
                          <p className="text-lg font-mono font-extrabold text-[#2563EB] dark:text-blue-400">
                            {selectedComplaint.ticketId}
                          </p>
                        </div>
                        <div>
                          {getStatusBadge(selectedComplaint.status)}
                        </div>
                      </div>

                      {/* Download Complaint Bar */}
                      <div className="flex items-center justify-between flex-wrap gap-2.5 p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                        <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                          Download Record:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadComplaintExcel(selectedComplaint)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                            title="Download Excel Workbook"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Download Excel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadComplaintPDF(selectedComplaint)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                            title="Download PDF Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-3.5 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                        <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-1">Issue Title</h4>
                        <p className="text-[#111827] dark:text-[#F9FAFB] font-semibold text-sm">{selectedComplaint.title}</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Complainant Name</h4>
                          <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.name}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Email Address</h4>
                          <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.email}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Phone Number</h4>
                          <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.phone}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Employee / Quarter ID</h4>
                          <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.employeeId}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Department / Area</h4>
                          <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.department}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Designation</h4>
                          <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.designation}</p>
                        </div>

                        {/* Location Details */}
                        {(selectedComplaint.locationType || selectedComplaint.complaintLocation || selectedComplaint.siteLocation) && (
                          <>
                            <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                              <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Location Type</h4>
                              <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                                {selectedComplaint.locationType || (selectedComplaint.complaintLocation ? 'Plant' : 'Township')}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                              <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">
                                {(selectedComplaint.locationType === 'Plant' || selectedComplaint.complaintLocation) ? 'Plant Location' : 'Township Location'}
                              </h4>
                              <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                                {selectedComplaint.townshipLocation || selectedComplaint.selectedLocation || selectedComplaint.complaintLocation || selectedComplaint.siteLocation || 'N/A'}
                              </p>
                            </div>
                            {(selectedComplaint.specifiedLocation || selectedComplaint.plantLocationDetails || getSpecifiedLocFromDesc(selectedComplaint.description)) && (
                              <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl md:col-span-2">
                                <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Specified Location</h4>
                                <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                                  {selectedComplaint.specifiedLocation || selectedComplaint.plantLocationDetails || getSpecifiedLocFromDesc(selectedComplaint.description)}
                                </p>
                              </div>
                            )}
                            {(selectedComplaint.locationType === 'Township' || (!selectedComplaint.locationType && selectedComplaint.siteLocation)) && (selectedComplaint.qtrNo || getQtrNoFromDesc(selectedComplaint.description)) && (
                              <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                                <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Qtr No.</h4>
                                <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                                  {selectedComplaint.qtrNo || getQtrNoFromDesc(selectedComplaint.description)}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                        <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-1">Description</h4>
                        <p className="text-[#374151] dark:text-[#D1D5DB] text-sm leading-relaxed whitespace-pre-wrap">{selectedComplaint.description}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Filed On</h4>
                          <p className="text-[#4B5563] dark:text-[#9CA3AF] text-xs font-medium">
                            {selectedComplaint.createdAt ? (
                              selectedComplaint.createdAt?.toDate 
                                ? new Date(selectedComplaint.createdAt.toDate()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) 
                                : new Date(selectedComplaint.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                            ) : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Last Updated</h4>
                          <p className="text-[#4B5563] dark:text-[#9CA3AF] text-xs font-medium">
                            {selectedComplaint.updatedAt ? (
                              selectedComplaint.updatedAt?.toDate 
                                ? new Date(selectedComplaint.updatedAt.toDate()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) 
                                : new Date(selectedComplaint.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                            ) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {selectedComplaint.imageUrl && (
                        <div className="p-3.5 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                          <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-2">Attached Photo</h4>
                          <img 
                            src={selectedComplaint.imageUrl} 
                            alt="Complaint" 
                            className="max-h-64 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B]"
                          />
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {/* ASSIGNMENT SECTION */}
                        <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] bg-slate-50/70 dark:bg-[#12151B]">
                          <h4 className="text-xs text-[#374151] dark:text-[#D1D5DB] mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-[#2563EB]" />
                            Assign Technician / Moderator
                          </h4>
                          <select
                            value={selectedComplaint.assignedToUID || ''}
                            onChange={async (e) => {
                              const modId = e.target.value;
                              if (!modId) return;
                              const mod = moderators.find(m => m.id === modId);
                              if (mod) {
                                try {
                                  await assignComplaint(selectedComplaint.id!, mod.email, mod.id!, mod.name);
                                  await sendAssignmentNotifications(selectedComplaint, mod);
                                  setSelectedComplaint({
                                    ...selectedComplaint,
                                    assignedTo: mod.email,
                                    assignedToUID: mod.id!,
                                    assignedToName: mod.name,
                                    status: 'assigned'
                                  });
                                } catch (error) {
                                  alert('Failed to assign complaint');
                                }
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                          >
                            <option value="">-- Select Technician --</option>
                            {moderators.filter(m => m.isActive !== false).map(mod => (
                              <option key={mod.id} value={mod.id}>{mod.name} ({mod.businessName})</option>
                            ))}
                          </select>
                        </div>

                        {/* STATUS SECTION */}
                        <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] bg-slate-50/70 dark:bg-[#12151B]">
                          <h4 className="text-xs text-[#374151] dark:text-[#D1D5DB] mb-2 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-[#2563EB]" />
                            Update Status
                          </h4>
                          <select
                            value={selectedComplaint.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as any;
                              handleStatusChange(selectedComplaint.id!, newStatus);
                              setSelectedComplaint({
                                ...selectedComplaint,
                                status: newStatus
                              });
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                          >
                            <option value="pending">Pending</option>
                            <option value="assigned">Assigned</option>
                            <option value="active">Active</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>

                      {/* Admin Notes Section */}
                      <div className="border-t border-[#E5E7EB] dark:border-[#2B313B] pt-4 mt-4">
                        <h4 className="text-base font-bold mb-3 text-[#111827] dark:text-[#F9FAFB]">Investigation / Work Notes</h4>
                        
                        {/* Add New Note */}
                        <div className="mb-4">
                          <label className="block text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">
                            Add Note to Assigned Technician
                          </label>
                          <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="w-full p-3 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                            rows={3}
                            placeholder="Leave instructions or notes for the technician..."
                            disabled={!canSubmitNote || isSubmitting}
                          />
                          <button
                            onClick={handleSaveAdminNote}
                            disabled={!canSubmitNote || !adminNote.trim() || isSubmitting}
                            className="px-4 py-2 mt-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? 'Submitting...' : isNoteCooldown ? `Please wait ${noteCooldownSeconds}s` : 'Post Note'}
                          </button>
                        </div>

                        {/* Admin to Moderator Notes */}
                        {selectedComplaint.notes?.adminToModerator && selectedComplaint.notes.adminToModerator.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-semibold text-[#2563EB] mb-2">Admin Instructions</h5>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {selectedComplaint.notes.adminToModerator.map((note: ComplaintNote) => (
                                <div key={note.id} className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                                  <p className="text-xs text-[#111827] dark:text-[#F9FAFB]">{note.content}</p>
                                  <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                                    {note.authorName} • {note.createdAt ? (typeof note.createdAt === 'string' ? new Date(note.createdAt).toLocaleString() : note.createdAt.toDate ? new Date(note.createdAt.toDate()).toLocaleString() : '') : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Moderator to Admin Notes */}
                        {selectedComplaint.notes?.moderatorToAdmin && selectedComplaint.notes.moderatorToAdmin.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">Technician Updates</h5>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {selectedComplaint.notes.moderatorToAdmin.map((note: ComplaintNote) => (
                                <div key={note.id} className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                                  <p className="text-xs text-[#111827] dark:text-[#F9FAFB]">{note.content}</p>
                                  <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                                    {note.authorName} • {note.createdAt ? (typeof note.createdAt === 'string' ? new Date(note.createdAt).toLocaleString() : note.createdAt.toDate ? new Date(note.createdAt.toDate()).toLocaleString() : '') : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3">
                        <button
                          onClick={() => setSelectedComplaint(null)}
                          className="w-full py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] bg-slate-50 dark:bg-[#181B21] text-[#374151] dark:text-[#D1D5DB] font-semibold text-xs hover:bg-slate-100"
                        >
                          Close Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Assign Modal */}
            <AnimatePresence>
              {showAssignModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                  onClick={() => setShowAssignModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] p-6 max-w-md w-full rounded-2xl shadow-xl text-[#111827] dark:text-[#F9FAFB]"
                  >
                    <h3 className="text-lg font-bold mb-4">Assign Complaint to Technician</h3>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {moderators.filter(m => m.isActive !== false).map((mod) => (
                        <button
                          key={mod.id}
                          onClick={() => handleAssignComplaint(mod)}
                          className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] bg-slate-50 dark:bg-[#12151B] hover:border-blue-400 text-left transition-colors"
                        >
                          <p className="font-bold text-sm text-[#111827] dark:text-[#F9FAFB]">{mod.name}</p>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{mod.email}</p>
                          <p className="text-xs text-[#2563EB] mt-0.5">{mod.businessName}</p>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="w-full mt-4 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#2B313B] bg-white dark:bg-[#181B21] text-[#374151] dark:text-[#D1D5DB] font-semibold text-xs hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Chief Admin & Super Admin Direct Account Creation Modal */}
      <CreateAdminModal
        isOpen={showCreateAdminModal}
        onClose={() => setShowCreateAdminModal(false)}
        onSuccess={() => {
          setShowCreateAdminModal(false);
        }}
      />

      {/* Discreet Super Admin License & Security Controls Modal */}
      <SuperAdminLicenseModal
        isOpen={showSuperAdminModal}
        onClose={() => setShowSuperAdminModal(false)}
      />
    </div>
  );
};

export default Dashboard;
