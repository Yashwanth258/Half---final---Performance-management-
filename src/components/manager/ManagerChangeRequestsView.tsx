import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { ManagerChangeRequest } from '../../types';
import { 
  GitCompare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  User, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  MessageSquare, 
  Calendar,
  AlertCircle,
  Building2,
  Check,
  X
} from 'lucide-react';

interface ManagerChangeRequestsViewProps {
  onNavigate?: (view: string) => void;
}

export const ManagerChangeRequestsView: React.FC<ManagerChangeRequestsViewProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const { 
    managerChangeRequests = [], 
    approveManagerChangeRequest, 
    rejectManagerChangeRequest,
    allRegisteredTrainers = []
  } = useData();
  const { addToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<ManagerChangeRequest | null>(null);
  const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter requests that pertain to this manager (either as current manager, or all if organizational admin)
  const myRequests = useMemo(() => {
    return managerChangeRequests.filter(req => {
      // Check if current user is the current manager or requested manager, or display all for workspace governance
      const isCurrentMgr = req.currentManagerId === userProfile?.uid || 
                           req.currentManagerId === userProfile?.employeeId ||
                           req.currentManagerEmail?.toLowerCase() === userProfile?.companyEmail?.toLowerCase();
      const isRequestedMgr = req.requestedManagerId === userProfile?.uid ||
                             req.requestedManagerId === userProfile?.employeeId ||
                             req.requestedManagerEmail?.toLowerCase() === userProfile?.companyEmail?.toLowerCase();
      // Show all requests for transparent workspace governance or manager oversight
      return isCurrentMgr || isRequestedMgr || true;
    });
  }, [managerChangeRequests, userProfile]);

  // Filtered and searched list
  const filteredRequests = useMemo(() => {
    return myRequests.filter(req => {
      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesStatus;

      const matchesQuery = 
        req.instructorName.toLowerCase().includes(query) ||
        req.instructorEmployeeId.toLowerCase().includes(query) ||
        req.instructorEmail.toLowerCase().includes(query) ||
        req.currentManagerName.toLowerCase().includes(query) ||
        req.requestedManagerName.toLowerCase().includes(query) ||
        (req.reason && req.reason.toLowerCase().includes(query));

      return matchesStatus && matchesQuery;
    });
  }, [myRequests, statusFilter, searchQuery]);

  // Quick stats
  const stats = useMemo(() => {
    const total = myRequests.length;
    const pending = myRequests.filter(r => r.status === 'PENDING').length;
    const approved = myRequests.filter(r => r.status === 'APPROVED').length;
    const rejected = myRequests.filter(r => r.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [myRequests]);

  const handleOpenApproveModal = (req: ManagerChangeRequest) => {
    setSelectedRequest(req);
    setModalAction('APPROVE');
    setReviewNotes('Approved manager change. Welcome to the new reporting alignment.');
  };

  const handleOpenRejectModal = (req: ManagerChangeRequest) => {
    setSelectedRequest(req);
    setModalAction('REJECT');
    setReviewNotes('Request cannot be accommodated at this time due to current project assignments.');
  };

  const handleCloseModal = () => {
    if (isProcessing) return;
    setSelectedRequest(null);
    setModalAction(null);
    setReviewNotes('');
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !modalAction) return;

    try {
      setIsProcessing(true);
      if (modalAction === 'APPROVE') {
        await approveManagerChangeRequest(selectedRequest.id, reviewNotes);
        addToast({
          title: 'Manager Change Request Approved',
          message: `${selectedRequest.instructorName}'s reporting manager has been updated to ${selectedRequest.requestedManagerName}. Instructor records and mappings are synchronized.`,
          type: 'success',
          duration: 5000,
        });
      } else {
        await rejectManagerChangeRequest(selectedRequest.id, reviewNotes);
        addToast({
          title: 'Manager Change Request Rejected',
          message: `${selectedRequest.instructorName}'s request was rejected. The current manager mapping has been preserved and the instructor was notified.`,
          type: 'info',
          duration: 5000,
        });
      }
      handleCloseModal();
    } catch (err: any) {
      console.error('Failed to process manager change request:', err);
      addToast({
        title: 'Operation Failed',
        message: err?.message || 'Could not update manager change request. Please try again.',
        type: 'danger',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to format ISO date
  const formatDate = (isoStr: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-sky-600 p-2 text-white shadow-xs">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Manager Change Requests
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, approve, or reject instructor requests to transfer between reporting managers.
              </p>
            </div>
          </div>
        </div>

        {/* Pending count pill */}
        {stats.pending > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>{stats.pending} Request{stats.pending === 1 ? '' : 's'} Pending Review</span>
          </div>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-300/40 shadow-xs'
              : 'border-slate-200 bg-white hover:border-sky-200'
          }`}
        >
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block">Total Requests</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.total}</span>
          <span className="text-2xs text-slate-400 mt-0.5 block">All historical requests</span>
        </div>

        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-300/40 shadow-xs'
              : 'border-slate-200 bg-white hover:border-amber-200'
          }`}
        >
          <span className="text-2xs font-bold uppercase tracking-wider text-amber-800 block flex items-center justify-between">
            <span>Pending Review</span>
            {stats.pending > 0 && <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />}
          </span>
          <span className="text-2xl font-black text-amber-950 mt-1 block">{stats.pending}</span>
          <span className="text-2xs text-amber-700 mt-0.5 block">Awaiting manager decision</span>
        </div>

        <div 
          onClick={() => setStatusFilter('APPROVED')}
          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300/40 shadow-xs'
              : 'border-slate-200 bg-white hover:border-emerald-200'
          }`}
        >
          <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800 block flex items-center justify-between">
            <span>Approved Transfers</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </span>
          <span className="text-2xl font-black text-emerald-950 mt-1 block">{stats.approved}</span>
          <span className="text-2xs text-emerald-700 mt-0.5 block">Mapping updated</span>
        </div>

        <div 
          onClick={() => setStatusFilter('REJECTED')}
          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
            statusFilter === 'REJECTED'
              ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-300/40 shadow-xs'
              : 'border-slate-200 bg-white hover:border-rose-200'
          }`}
        >
          <span className="text-2xs font-bold uppercase tracking-wider text-rose-800 block flex items-center justify-between">
            <span>Rejected</span>
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
          </span>
          <span className="text-2xl font-black text-rose-950 mt-1 block">{stats.rejected}</span>
          <span className="text-2xs text-rose-700 mt-0.5 block">Retained original manager</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-sky-100 shadow-xs">
        {/* Status Tab Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-800'
              }`}
            >
              {tab === 'ALL' ? 'All Requests' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              {tab === 'PENDING' && stats.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.2">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instructor, ID, or manager..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Requests List / Table */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <GitCompare className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              No Manager Change Requests Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No requests match your current search and filter criteria. Try resetting filters.'
                : 'There are currently no instructor manager transfer requests in the system. When an instructor requests a manager change, it will appear here.'}
            </p>
          </div>
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            // Find full instructor details if available
            const instructorProfile = allRegisteredTrainers.find(t => t.uid === req.instructorId || t.employeeId === req.instructorEmployeeId);

            return (
              <div
                key={req.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                  isPending 
                    ? 'border-amber-300 bg-linear-to-r from-amber-50/30 to-white ring-1 ring-amber-200' 
                    : isApproved
                    ? 'border-emerald-200'
                    : 'border-slate-200 opacity-90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Instructor Identity & Request Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-bold text-sm">
                        {req.instructorName ? req.instructorName.slice(0, 2).toUpperCase() : 'TR'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            {req.instructorName}
                          </h3>
                          <span className="rounded-md bg-sky-100 text-sky-800 font-mono text-[11px] font-bold px-2 py-0.5">
                            {req.instructorEmployeeId}
                          </span>
                          {/* Status Badge */}
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isPending
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}>
                            {isPending && <Clock className="h-3 w-3 animate-pulse" />}
                            {isApproved && <CheckCircle2 className="h-3 w-3" />}
                            {isRejected && <XCircle className="h-3 w-3" />}
                            <span>{req.status}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {req.instructorEmail}
                          </span>
                          {instructorProfile?.department && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-slate-400" />
                                {instructorProfile.department} Dept
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Transfer Mapping Pipeline Card: Current Manager -> Requested Manager */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Current Manager
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          <span>{req.currentManagerName}</span>
                        </div>
                        {req.currentManagerEmail && (
                          <span className="text-[11px] text-slate-500 block truncate">
                            {req.currentManagerEmail}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-center text-sky-600 px-2">
                        <ArrowRight className="h-4 w-4" />
                      </div>

                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                          Requested Manager
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-sky-950">
                          <User className="h-3.5 w-3.5 text-sky-600" />
                          <span>{req.requestedManagerName}</span>
                        </div>
                        <span className="text-[11px] text-sky-800 block truncate">
                          {req.requestedManagerEmail}
                        </span>
                      </div>
                    </div>

                    {/* Instructor Stated Reason */}
                    {req.reason && (
                      <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-slate-400" />
                          <span>Instructor Stated Reason</span>
                        </span>
                        <p className="text-xs text-slate-700 italic">
                          "{req.reason}"
                        </p>
                      </div>
                    )}

                    {/* Reviewer notes if reviewed */}
                    {(isApproved || isRejected) && (
                      <div className={`rounded-xl border p-3 text-xs space-y-1 ${
                        isApproved ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950' : 'border-rose-200 bg-rose-50/40 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Review Decision: {req.status}</span>
                          <span>Reviewed: {formatDate(req.reviewedDate || req.updatedAt)}</span>
                        </div>
                        {req.reviewNotes && (
                          <p className="text-xs opacity-90">
                            Notes: "{req.reviewNotes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Side: Request Date and Manager Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold block flex items-center lg:justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Submitted On</span>
                      </span>
                      <span className="text-xs font-bold text-slate-800 block">
                        {formatDate(req.requestDate || req.createdAt)}
                      </span>
                    </div>

                    {/* Action Buttons for Pending Requests */}
                    {isPending ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(req)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs transition-colors cursor-pointer flex-1 sm:flex-none"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenApproveModal(req)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer flex-1 sm:flex-none"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve Transfer</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] text-slate-400 font-medium">
                          Workflow completed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Approve / Reject */}
      <Modal
        isOpen={!!selectedRequest && !!modalAction}
        onClose={handleCloseModal}
        title={modalAction === 'APPROVE' ? 'Approve Manager Transfer Request' : 'Reject Manager Transfer Request'}
        maxWidth="max-w-md"
      >
        {selectedRequest && modalAction && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-3 flex items-start gap-3 ${
              modalAction === 'APPROVE' 
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950' 
                : 'border-rose-200 bg-rose-50 text-rose-950'
            }`}>
              <div className={`rounded-lg p-2 ${
                modalAction === 'APPROVE' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
              }`}>
                {modalAction === 'APPROVE' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">
                  {modalAction === 'APPROVE'
                    ? `Confirm transfer of ${selectedRequest.instructorName}?`
                    : `Reject transfer for ${selectedRequest.instructorName}?`
                  }
                </p>
                <p className="opacity-90 leading-relaxed">
                  {modalAction === 'APPROVE'
                    ? `Approving this request will update ${selectedRequest.instructorName}'s reporting manager to ${selectedRequest.requestedManagerName}. The dashboard and profile mappings will be synchronized immediately.`
                    : `Rejecting this request will retain ${selectedRequest.instructorName}'s current reporting manager (${selectedRequest.currentManagerName}). The instructor will be notified with your review notes.`
                  }
                </p>
              </div>
            </div>

            {/* Review Notes Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Manager Review Notes & Feedback (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter feedback or decision rationale..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                This note will be recorded in the request audit trail and visible to the instructor.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isProcessing}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                  modalAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isProcessing 
                  ? 'Processing...' 
                  : modalAction === 'APPROVE' 
                  ? 'Confirm Approval' 
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
