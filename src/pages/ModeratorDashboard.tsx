import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, TrendingUp, CheckCircle, Eye, MessageSquare, Zap, FileSpreadsheet, Download } from 'lucide-react';
import { downloadComplaintExcel, downloadComplaintPDF } from '../utils/complaintExport';
import { 
  subscribeToModeratorComplaints, 
  Complaint,
  updateComplaintStatus,
  addNote,
  ComplaintNote
} from '../services/complaint.service';
import { useAuth } from '../contexts/AuthContext';
import { useRateLimit } from '../hooks/useRateLimit';

const getQtrNoFromDesc = (desc?: string): string => {
  if (!desc) return '';
  const match = desc.match(/Qtr No\.:\s*([^|\n]+)/i);
  return match ? match[1].trim() : '';
};

const ModeratorDashboard = () => {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [moderatorNote, setModeratorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Rate limiting for notes (10 second cooldown)
  const {
    isCooldown: isNoteCooldown,
    remainingSeconds: noteCooldownSeconds,
    canSubmit: canSubmitNote,
    startCooldown: startNoteCooldown
  } = useRateLimit({ cooldownSeconds: 10 });

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToModeratorComplaints(currentUser.uid, (data) => {
      setComplaints(data);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const stats = {
    total: complaints.length,
    active: complaints.filter(c => c.status === 'active').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    pending: complaints.filter(c => c.status === 'pending' || c.status === 'assigned').length
  };

  const handleStatusChange = async (id: string, status: Complaint['status']) => {
    try {
      await updateComplaintStatus(id, status);
      setSelectedComplaint((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
      alert('Status updated successfully');
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleSaveNote = async () => {
    if (!selectedComplaint || !currentUser || !canSubmitNote) return;
    
    if (!moderatorNote.trim()) {
      alert('Please enter a note');
      return;
    }
    
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      await addNote(
        selectedComplaint.id!,
        'moderatorToAdmin',
        moderatorNote,
        currentUser.email || '',
        currentUser.displayName || 'Technician'
      );
      
      alert('Note saved successfully');
      setModeratorNote('');
      startNoteCooldown();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please wait a moment before trying again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', label: 'Pending' },
      assigned: { color: 'bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', label: 'Assigned' },
      active: { color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800', label: 'Active' },
      resolved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', label: 'Resolved' },
      rejected: { color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', label: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
      medium: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
      high: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
    };
    
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${badges[priority] || badges.medium}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const statCards = [
    { label: 'Assigned Tickets', value: stats.total, icon: FileText, color: 'text-[#2563EB]', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Pending Action', value: stats.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { label: 'In Progress', value: stats.active, icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' }
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-[#2563EB] dark:text-blue-400 mb-2 border border-blue-100 dark:border-blue-900/50">
            <Zap className="w-3.5 h-3.5" />
            <span>Technician Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-2 font-headline">
            Moderator / Technician Dashboard
          </h1>
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF]">
            Review, attend to, and update status for your assigned electrical breakdown complaints
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] p-5 rounded-2xl shadow-xs"
              >
                <div className={`w-10 h-10 mb-3 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
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

        {/* Complaints List */}
        <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] p-6 rounded-2xl shadow-xs">
          <h3 className="text-xl font-bold mb-5 text-[#111827] dark:text-[#F9FAFB]">Your Assigned Complaints</h3>
          
          {complaints.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm">No complaints currently assigned to you</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#111318] border-b border-[#E5E7EB] dark:border-[#2B313B]">
                    <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Ticket ID</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Title</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Category</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Priority</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#2B313B]">
                  {complaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-slate-50/80 dark:hover:bg-[#181B21]/80 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono font-bold text-[#2563EB] dark:text-blue-400">
                        {complaint.ticketId}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] max-w-xs truncate">{complaint.title}</td>
                      <td className="py-3 px-4 text-xs text-[#4B5563] dark:text-[#9CA3AF]">{complaint.category}</td>
                      <td className="py-3 px-4 text-xs">{getStatusBadge(complaint.status)}</td>
                      <td className="py-3 px-4 text-xs">{getPriorityBadge(complaint.priority)}</td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setModeratorNote('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                            title="View & Update"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => downloadComplaintExcel(complaint)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-[#E5E7EB] dark:border-[#2B313B]"
                            title="Download Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => downloadComplaintPDF(complaint)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#E5E7EB] dark:border-[#2B313B]"
                            title="Download PDF (.pdf)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  <h3 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">Electrical Complaint Review</h3>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="p-1 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-slate-100"
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
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Complainant</h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Email</h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.email}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Phone</h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.phone}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Employee ID</h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.employeeId}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Quarter / Location</h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{selectedComplaint.department}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Priority</h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">{getPriorityBadge(selectedComplaint.priority)}</p>
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
                        {(selectedComplaint.locationType === 'Plant' || (!selectedComplaint.locationType && selectedComplaint.complaintLocation)) && (selectedComplaint.specifiedLocation || selectedComplaint.plantLocationDetails) && (
                          <div className="p-3 bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl md:col-span-2">
                            <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase mb-0.5">Specified Location</h4>
                            <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                              {selectedComplaint.specifiedLocation || selectedComplaint.plantLocationDetails}
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

                  {/* Status Update */}
                  <div className="p-4 bg-slate-50/70 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] rounded-xl">
                    <h4 className="text-xs font-bold text-[#374151] dark:text-[#D1D5DB] mb-2 uppercase">Update Ticket Progress</h4>
                    <select
                      value={selectedComplaint.status}
                      onChange={(e) => handleStatusChange(selectedComplaint.id!, e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#181B21] text-[#111827] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      <option value="assigned">Assigned</option>
                      <option value="active">Active / In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Notes Section for Moderator */}
                  <div className="border-t border-[#E5E7EB] dark:border-[#2B313B] pt-4 mt-4">
                    <h4 className="text-base font-bold mb-3 text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#2563EB]" />
                      Communication &amp; Field Notes
                    </h4>
                    
                    {/* Admin to Moderator Notes */}
                    {selectedComplaint.notes?.adminToModerator && selectedComplaint.notes.adminToModerator.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs font-semibold text-[#2563EB] mb-2">Instructions from Admin</h5>
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

                    {/* Add Note to Admin */}
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">
                        Post Technician Resolution Note (visible to Admin)
                      </label>
                      <textarea
                        value={moderatorNote}
                        onChange={(e) => setModeratorNote(e.target.value)}
                        className="w-full p-3 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        rows={3}
                        placeholder="Detail materials used, repairs completed, or additional work required..."
                        disabled={!canSubmitNote || isSubmitting}
                      />
                      <button
                        onClick={handleSaveNote}
                        disabled={!canSubmitNote || !moderatorNote.trim() || isSubmitting}
                        className="px-4 py-2 mt-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : isNoteCooldown ? `Please wait ${noteCooldownSeconds}s` : 'Post Field Note'}
                      </button>
                    </div>

                    {/* Moderator to Admin Notes */}
                    {selectedComplaint.notes?.moderatorToAdmin && selectedComplaint.notes.moderatorToAdmin.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">Your Previous Notes</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedComplaint.notes.moderatorToAdmin.map((note: ComplaintNote) => (
                            <div key={note.id} className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                              <p className="text-xs text-[#111827] dark:text-[#F9FAFB]">{note.content}</p>
                              <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                                {note.createdAt ? (typeof note.createdAt === 'string' ? new Date(note.createdAt).toLocaleString() : note.createdAt.toDate ? new Date(note.createdAt.toDate()).toLocaleString() : '') : ''}
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
      </div>
    </div>
  );
};

export default ModeratorDashboard;
