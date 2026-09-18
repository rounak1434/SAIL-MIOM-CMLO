import { useState, useEffect, Component, ErrorInfo, ReactNode, FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Complaint, getComplaintByTicketId } from '../services/complaint.service';
import { Search, FileText, Clock, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TrackComplaint ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
          <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-2">Something went wrong</h2>
            <p className="text-[#4B5563] dark:text-[#9CA3AF] mb-6 text-sm">
              We encountered an unexpected error while rendering this page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold flex items-center justify-center gap-2 mx-auto transition-colors text-sm shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const getQtrNoFromDesc = (desc?: string): string => {
  if (!desc) return '';
  const match = desc.match(/Qtr No\.:\s*([^|\n]+)/i);
  return match ? match[1].trim() : '';
};

const TrackComplaintContent = () => {
  const location = useLocation();
  const [complaintId, setComplaintId] = useState('');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticketParam = params.get('ticket');
    if (ticketParam) {
      setComplaintId(ticketParam);
      performSearch(ticketParam);
    } else {
      setComplaintId('');
      setComplaint(null);
      setError('');
      setLoading(false);
    }
  }, [location.search, location.pathname]);

  const performSearch = async (searchId: string) => {
    setError('');
    setComplaint(null);
    
    const trimmed = searchId.trim();
    if (!trimmed) {
      setError('Please enter a Ticket ID');
      return;
    }
    
    setLoading(true);
    
    try {
      const searchInput = trimmed.toUpperCase();
      const result = await getComplaintByTicketId(searchInput);
      
      if (result) {
        setComplaint(result);
      } else {
        setError('Complaint not found. Please verify the Ticket ID.');
      }
    } catch (err: any) {
      console.error("TrackComplaint: Search error:", err);
      setError('Failed to fetch complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: FormEvent) => {
    e?.preventDefault();
    performSearch(complaintId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500'
        };
      case 'active':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-300',
          dot: 'bg-purple-500'
        };
      case 'assigned':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-[#2563EB] dark:text-blue-300',
          dot: 'bg-[#2563EB]'
        };
      case 'rejected':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500'
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: Clock,
      assigned: FileText,
      active: Zap,
      resolved: CheckCircle,
      rejected: AlertCircle
    };
    return icons[status] || Clock;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-[#2563EB] dark:text-blue-400 mb-3 border border-blue-100 dark:border-blue-900/50">
            <Search className="w-3.5 h-3.5" />
            <span>Complaint Tracking Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight mb-3 font-headline">
            Track Electrical Complaint
          </h1>
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF] max-w-lg mx-auto">
            Enter your unique Ticket ID below to monitor real-time inspection, technician assignment, and resolution progress.
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSearch}
          className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-5 sm:p-7 shadow-xs mb-8"
        >
          <label className="block text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-2">
            Ticket ID
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                placeholder="Enter Ticket ID (e.g. MIOM-EL-2026-0001 or MIOM-0001)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D1D5DB] dark:border-[#374151] bg-white dark:bg-[#111318] text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold text-sm transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Status</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ERROR State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 flex items-start gap-3.5"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200 text-sm">Complaint Not Found</h3>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}

        {/* EMPTY State */}
        {!complaint && !loading && !error && (
          <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-12 text-center shadow-xs">
            <Search className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">No Complaint Selected</h3>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] max-w-sm mx-auto">
              Please enter your Ticket ID above and click Track Status to inspect details.
            </p>
          </div>
        )}

        {/* Complaint Details */}
        {complaint && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status Card */}
            <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-6 border-b border-[#E5E7EB] dark:border-[#2B313B]">
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Current Ticket Status
                  </p>
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const badge = getStatusBadge(complaint.status || 'pending');
                      return (
                        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-bold capitalize ${badge.bg}`}>
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          <span>{complaint.status || 'pending'}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Ticket ID
                  </p>
                  <span className="font-mono text-xl font-extrabold text-[#111827] dark:text-[#F9FAFB]">
                    {complaint.ticketId}
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['pending', 'assigned', 'active', 'resolved'].map((stepStatus) => {
                  const complaintStatus = complaint.status || 'pending';
                  const isCurrent = stepStatus === complaintStatus;
                  const isPast =
                    (complaintStatus === 'assigned' && stepStatus === 'pending') ||
                    (complaintStatus === 'active' && (stepStatus === 'pending' || stepStatus === 'assigned')) ||
                    (complaintStatus === 'resolved' && stepStatus !== 'resolved');

                  const Icon = getStatusIcon(stepStatus);

                  return (
                    <div
                      key={stepStatus}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-[#2563EB]'
                          : isPast
                          ? 'bg-slate-50 dark:bg-[#13161C] border-[#E5E7EB] dark:border-[#2B313B]'
                          : 'bg-white dark:bg-[#181B21] border-[#E5E7EB] dark:border-[#2B313B] opacity-50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isCurrent
                            ? 'bg-[#2563EB] text-white'
                            : isPast
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold capitalize truncate ${
                          isCurrent
                            ? 'text-[#2563EB] dark:text-blue-400'
                            : isPast
                            ? 'text-[#111827] dark:text-[#F9FAFB]'
                            : 'text-[#6B7280] dark:text-[#9CA3AF]'
                        }`}>
                          {stepStatus}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {complaint.status === 'rejected' && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>This complaint was rejected. Please contact the electrical department helpdesk for clarification.</span>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="bg-white dark:bg-[#181B21] border border-[#E5E7EB] dark:border-[#2B313B] rounded-2xl p-6 sm:p-8 shadow-xs">
              <h3 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                Complaint Information
              </h3>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Title / Subject
                  </h4>
                  <p className="text-[#111827] dark:text-[#F9FAFB] font-semibold text-sm">
                    {complaint.title || 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Category
                  </h4>
                  <p className="text-[#111827] dark:text-[#F9FAFB] font-semibold text-sm">
                    {complaint.category || 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Complainant Name
                  </h4>
                  <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                    {complaint.name || 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Department / Quarter Area
                  </h4>
                  <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                    {complaint.department || 'N/A'}
                  </p>
                </div>

                {/* Location Information */}
                {(complaint.locationType || complaint.complaintLocation || complaint.siteLocation) && (
                  <>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                        Location Type
                      </h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                        {complaint.locationType || (complaint.complaintLocation ? 'Plant' : 'Township')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                      <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                        {(complaint.locationType === 'Plant' || complaint.complaintLocation) ? 'Plant Location' : 'Township Location'}
                      </h4>
                      <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                        {complaint.townshipLocation || complaint.selectedLocation || complaint.complaintLocation || complaint.siteLocation || 'N/A'}
                      </p>
                    </div>

                    {(complaint.locationType === 'Plant' || (!complaint.locationType && complaint.complaintLocation)) && (complaint.specifiedLocation || complaint.plantLocationDetails) && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] md:col-span-2">
                        <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                          Specified Location
                        </h4>
                        <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                          {complaint.specifiedLocation || complaint.plantLocationDetails}
                        </p>
                      </div>
                    )}

                    {(complaint.locationType === 'Township' || (!complaint.locationType && complaint.siteLocation)) && (complaint.qtrNo || getQtrNoFromDesc(complaint.description)) && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                        <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                          Qtr No.
                        </h4>
                        <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                          {complaint.qtrNo || getQtrNoFromDesc(complaint.description)}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Priority Level
                  </h4>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
                      complaint.priority === 'high'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : complaint.priority === 'medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    }`}
                  >
                    {complaint.priority || 'MEDIUM'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Assigned Technician / Supervisor
                  </h4>
                  <p className="text-[#111827] dark:text-[#F9FAFB] text-sm font-medium">
                    {complaint.assignedToName || 'Awaiting assignment'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B] md:col-span-2">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Detailed Description
                  </h4>
                  <p className="text-[#374151] dark:text-[#D1D5DB] text-sm leading-relaxed whitespace-pre-wrap">
                    {complaint.description || 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Filed Date
                  </h4>
                  <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm">
                    {complaint.createdAt ? (
                      complaint.createdAt?.toDate
                        ? new Date(complaint.createdAt.toDate()).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : new Date(complaint.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                    ) : 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                  <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-1">
                    Last Updated
                  </h4>
                  <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm">
                    {complaint.updatedAt ? (
                      complaint.updatedAt?.toDate
                        ? new Date(complaint.updatedAt.toDate()).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : new Date(complaint.updatedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                    ) : 'N/A'}
                  </p>
                </div>

                {complaint.imageUrl && (
                  <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#2B313B]">
                    <h4 className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider mb-2">
                      Attached Photograph
                    </h4>
                    <img
                      src={complaint.imageUrl}
                      alt="Complaint attachment"
                      className="max-h-80 rounded-lg border border-[#E5E7EB] dark:border-[#2B313B]"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export const TrackComplaint = () => {
  return (
    <ErrorBoundary>
      <TrackComplaintContent />
    </ErrorBoundary>
  );
};

export default TrackComplaint;
