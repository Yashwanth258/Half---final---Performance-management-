import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Mail, 
  MapPin, 
  BookOpen, 
  ShieldCheck, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Pencil,
  Briefcase,
  X,
  Sparkles,
  Layers,
  Clock,
  GitCompare,
  Lock,
  ArrowRight,
  Send,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { EnterpriseDepartment } from '../../types';

export const TrainerProfileView: React.FC = () => {
  const { userProfile, updateProfileData } = useAuth();
  const { allManagers = [], managerChangeRequests = [], submitManagerChangeRequest } = useData();
  const { addToast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);

  // Profile Form state (Phone field permanently removed as per requirements)
  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || '',
    designation: userProfile?.designation || '',
    location: userProfile?.location || '',
    subject: userProfile?.subject || '',
    department: (userProfile?.department || 'GenAI') as EnterpriseDepartment,
  });

  // Manager Change Request state
  const [requestedManagerId, setRequestedManagerId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [changeRequestError, setChangeRequestError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state whenever userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || '',
        designation: userProfile.designation || '',
        location: userProfile.location || '',
        subject: userProfile.subject || '',
        department: (userProfile.department || 'GenAI') as EnterpriseDepartment,
      });
    }
  }, [userProfile]);

  // Find requests for this instructor
  const myRequests = (managerChangeRequests || []).filter(
    r => r.instructorId === userProfile?.uid || (userProfile?.employeeId && r.instructorEmployeeId === userProfile.employeeId)
  );
  const latestPendingRequest = myRequests.find(r => r.status === 'PENDING');
  const latestReviewedRequest = myRequests.find(r => r.status !== 'PENDING');

  // Available candidate managers (excluding currently mapped manager)
  const availableTargetManagers = (allManagers || []).filter(m => {
    if (userProfile?.managerId && m.uid === userProfile.managerId) return false;
    if (userProfile?.managerEmail && m.companyEmail.toLowerCase() === userProfile.managerEmail.toLowerCase()) return false;
    if (userProfile?.managerName && m.fullName.toLowerCase() === userProfile.managerName.toLowerCase()) return false;
    return true;
  });

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!formData.fullName.trim()) {
      setErrorMessage('Full name cannot be empty.');
      return;
    }
    if (!formData.designation.trim()) {
      setErrorMessage('Job designation cannot be empty.');
      return;
    }

    setSaving(true);
    setSavedSuccess(false);
    try {
      // Basic profile details update - manager cannot be modified directly through this interface
      await updateProfileData({
        fullName: formData.fullName.trim(),
        designation: formData.designation.trim(),
        location: formData.location.trim(),
        subject: formData.subject.trim(),
        department: formData.department,
        teamName: `${formData.department} Department`,
      });
      setSavedSuccess(true);
      setIsEditModalOpen(false);
      setIsEditing(false);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to update instructor profile:', err);
      setErrorMessage(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChangeRequestModal = () => {
    setChangeRequestError(null);
    setChangeReason('');
    if (availableTargetManagers.length > 0) {
      setRequestedManagerId(availableTargetManagers[0].uid);
    } else {
      setRequestedManagerId('');
    }
    setIsChangeRequestModalOpen(true);
  };

  const handleSubmitManagerChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeRequestError(null);

    if (!userProfile) return;

    if (!requestedManagerId) {
      setChangeRequestError('Please select a manager to transfer to.');
      return;
    }

    if (!changeReason.trim() || changeReason.trim().length < 10) {
      setChangeRequestError('Please provide a detailed reason for the manager change request (at least 10 characters).');
      return;
    }

    const targetManager = availableTargetManagers.find(m => m.uid === requestedManagerId);
    if (!targetManager) {
      setChangeRequestError('Selected manager is not recognized.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await submitManagerChangeRequest({
        instructorId: userProfile.uid,
        instructorName: userProfile.fullName,
        instructorEmail: userProfile.companyEmail,
        instructorEmployeeId: userProfile.employeeId,
        currentManagerId: userProfile.managerId || 'mgr-enterprise-01',
        currentManagerName: userProfile.managerName || 'Sarah Jenkins',
        currentManagerEmail: userProfile.managerEmail || 'manager@enterprise.com',
        requestedManagerId: targetManager.uid,
        requestedManagerName: targetManager.fullName,
        requestedManagerEmail: targetManager.companyEmail,
        reason: changeReason.trim(),
      });

      addToast({
        title: 'Manager Change Request Submitted',
        message: `Your request to transfer to manager ${targetManager.fullName} was submitted. It has been routed to your current manager for review.`,
        type: 'success',
        duration: 5000,
      });

      setIsChangeRequestModalOpen(false);
    } catch (err: any) {
      console.error('Failed to submit manager change request:', err);
      setChangeRequestError(err?.message || 'Failed to submit manager change request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const subjectPills = [
    'Software Development',
    'Frontend Web Engineering',
    'Backend & Distributed Systems',
    'Generative AI & LLMs',
    'Full Stack Python / React',
    'Data Structures & Algorithms',
  ];

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-sky-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Instructor Profile & Settings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              View and edit your personal credentials, office campus location, department, and subject specialization.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenChangeRequestModal}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 py-2.5 text-xs font-bold text-sky-800 shadow-xs hover:bg-sky-50 transition-all cursor-pointer"
            >
              <GitCompare className="h-4 w-4 text-sky-600" />
              <span>Change Manager</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-500 hover:shadow-md transition-all cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit Profile Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Manager Change Request Status Banner */}
      {latestPendingRequest && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0 border border-amber-300">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                  Manager Change Request Pending Review
                </span>
                <span className="rounded-full bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 border border-amber-300">
                  Status: PENDING
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1">
                You requested a transfer to <strong className="font-bold">{latestPendingRequest.requestedManagerName}</strong> on{' '}
                {new Date(latestPendingRequest.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                This request is awaiting review by your currently assigned manager ({latestPendingRequest.currentManagerName}).
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 italic">
                Reason: "{latestPendingRequest.reason}"
              </p>
            </div>
          </div>
          <span className="text-2xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0">
            Awaiting Approval
          </span>
        </div>
      )}

      {/* Recently Reviewed Manager Change Request Notification */}
      {!latestPendingRequest && latestReviewedRequest && (
        <div className={`rounded-2xl border p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          latestReviewedRequest.status === 'APPROVED' 
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950' 
            : 'border-rose-200 bg-rose-50/80 text-rose-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2 shrink-0 ${
              latestReviewedRequest.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {latestReviewedRequest.status === 'APPROVED' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Manager Change Request {latestReviewedRequest.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  latestReviewedRequest.status === 'APPROVED' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}>
                  {latestReviewedRequest.status}
                </span>
              </div>
              <p className="text-xs mt-1">
                {latestReviewedRequest.status === 'APPROVED'
                  ? `Your request to transfer to ${latestReviewedRequest.requestedManagerName} was approved. Your profile mapping has been updated.`
                  : `Your request to transfer to ${latestReviewedRequest.requestedManagerName} was rejected by ${latestReviewedRequest.currentManagerName}. Your existing manager mapping has been retained.`
                }
              </p>
              {latestReviewedRequest.reviewNotes && (
                <p className="text-[11px] opacity-80 mt-0.5 italic">
                  Manager Feedback: "{latestReviewedRequest.reviewNotes}"
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenChangeRequestModal}
            className="text-xs font-bold underline shrink-0 cursor-pointer hover:opacity-80"
          >
            Submit New Request &rarr;
          </button>
        </div>
      )}

      {/* Success Notification */}
      {savedSuccess && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Profile details saved and updated successfully across Firestore!</span>
          </div>
          <span className="text-[11px] font-normal text-emerald-700">Live sync active</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs">
        {/* Banner */}
        <div className="h-32 bg-linear-to-r from-sky-500 via-sky-600 to-blue-600 p-6 flex items-end justify-between">
          <div className="relative -bottom-10 flex h-22 w-22 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-linear-to-br from-sky-600 to-blue-700 font-bold text-white text-2xl shadow-inner">
              {userProfile?.fullName ? userProfile.fullName.slice(0, 2).toUpperCase() : 'IN'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="mb-1 inline-flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 border border-white/20 transition-all cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        <div className="px-6 pt-14 pb-6 space-y-6">
          {/* Identity details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-50">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">
                  {userProfile?.fullName || 'Instructor'}
                </h2>
                <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  Active Instructor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>{userProfile?.designation || 'Technical Instructor'}</span>
                <span>•</span>
                <span>Employee ID: <strong className="font-mono text-sky-700 font-bold">{userProfile?.employeeId}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-800 border border-purple-200">
                Department: {userProfile?.department || 'GenAI'}
              </span>
              <span className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-200">
                Subject: {userProfile?.subject || 'Software Engineering'}
              </span>
            </div>
          </div>

          {/* Grid of Profile Metadata (Phone field completely removed) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold">
                <Mail className="h-3.5 w-3.5 text-sky-600" />
                <span>Work Email</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">
                {userProfile?.companyEmail || 'Not provided'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold">
                <MapPin className="h-3.5 w-3.5 text-sky-600" />
                <span>Office Location / Campus</span>
              </div>
              <p className="font-semibold text-slate-800">
                {userProfile?.location || (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-sky-600 hover:underline font-normal text-xs"
                  >
                    + Set office location
                  </button>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold">
                <Building2 className="h-3.5 w-3.5 text-sky-600" />
                <span>Assigned Department</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">
                {userProfile?.department || 'GenAI'} Department
              </p>
            </div>

            {/* Reporting Manager (Locked & Guarded) */}
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-3.5 space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-800 text-[11px] font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                  <span>Reporting Manager (Locked)</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md border border-sky-200">
                  <Lock className="h-2.5 w-2.5" />
                  Governance Protected
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {userProfile?.managerName || 'Sarah Jenkins'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {userProfile?.managerEmail || 'manager@enterprise.com'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenChangeRequestModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                >
                  <GitCompare className="h-3 w-3" />
                  <span>Request Change</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold">
                <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                <span>Primary Subject</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">
                {userProfile?.subject || 'Software Engineering'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details & Settings Section */}
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-sky-50 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Instructor Profile Information
              </h3>
              {!isEditing ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                  Read-Only Mode
                </span>
              ) : (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 animate-pulse">
                  Editing Mode Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {!isEditing 
                ? 'Your basic profile details can be edited after registration. Manager mapping is governance-protected.' 
                : 'Modify your basic profile fields below. Direct manager edits are restricted; use Manager Change Request instead.'}
            </p>
          </div>
          
          <div>
            {!isEditing ? (
              <button
                type="button"
                id="trainer-enable-edit-btn"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-500 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Profile Details</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (userProfile) {
                    setFormData({
                      fullName: userProfile.fullName || '',
                      designation: userProfile.designation || '',
                      location: userProfile.location || '',
                      subject: userProfile.subject || '',
                      department: (userProfile.department || 'GenAI') as EnterpriseDepartment,
                    });
                  }
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel Editing</span>
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className={`w-full rounded-xl border pl-9.5 pr-3 py-2.5 text-xs transition-colors ${
                    !isEditing 
                      ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed select-none' 
                      : 'border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Job Designation / Title <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Technical Instructor"
                  className={`w-full rounded-xl border pl-9.5 pr-3 py-2.5 text-xs transition-colors ${
                    !isEditing 
                      ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed select-none' 
                      : 'border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Office Location / Campus
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Hyderabad, Bengaluru, Remote"
                  className={`w-full rounded-xl border pl-9.5 pr-3 py-2.5 text-xs transition-colors ${
                    !isEditing 
                      ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed select-none' 
                      : 'border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Department
              </label>
              <select
                disabled={!isEditing}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value as EnterpriseDepartment })}
                className={`w-full rounded-xl border p-2.5 text-xs transition-colors ${
                  !isEditing 
                    ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed' 
                    : 'border-sky-300 bg-white text-slate-900 focus:border-sky-500'
                }`}
              >
                <option value="Frontend">Frontend Department</option>
                <option value="Backend">Backend Department</option>
                <option value="GenAI">GenAI Department</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Primary Subject Specialization
            </label>
            <div className="relative mb-2">
              <BookOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                disabled={!isEditing}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Generative AI & LLMs"
                className={`w-full rounded-xl border pl-9.5 pr-3 py-2.5 text-xs transition-colors ${
                  !isEditing 
                    ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed select-none' 
                    : 'border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                }`}
              />
            </div>
            {/* Quick Suggestions (enabled in edit mode) */}
            {isEditing && (
              <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
                <span className="text-[10px] text-slate-500 mr-1">Suggestions:</span>
                {subjectPills.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setFormData({ ...formData, subject: subj })}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                      formData.subject === subj
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reporting Manager Section - Governance Protected (Cannot edit directly) */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-700" />
                <span className="font-bold text-slate-900">Reporting Manager Mapping</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md border border-sky-300">
                <Lock className="h-3 w-3" />
                Direct Edit Disabled
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Once an instructor is mapped to a manager, direct modification is prevented to ensure audit consistency. 
              To change your reporting manager, please submit a formal <strong>Manager Change Request</strong> below.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-sky-100">
              <div>
                <p className="font-bold text-slate-900 text-xs">
                  {userProfile?.managerName || 'Sarah Jenkins'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {userProfile?.managerEmail || 'manager@enterprise.com'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenChangeRequestModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>Submit Manager Change Request</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 font-bold text-white hover:bg-sky-500 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit Profile Details</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (userProfile) {
                      setFormData({
                        fullName: userProfile.fullName || '',
                        designation: userProfile.designation || '',
                        location: userProfile.location || '',
                        subject: userProfile.subject || '',
                        department: (userProfile.department || 'GenAI') as EnterpriseDepartment,
                      });
                    }
                    setIsEditing(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 font-bold text-white hover:bg-sky-500 shadow-sm hover:shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Edit Profile Modal Dialog */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Details"
        subtitle="Modify your instructor credentials, campus, and subject specialization."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Full Legal Name"
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Job Designation / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Technical Instructor"
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Office Location / Campus
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Hyderabad, Remote"
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value as EnterpriseDepartment })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Frontend">Frontend Department</option>
                <option value="Backend">Backend Department</option>
                <option value="GenAI">GenAI Department</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Primary Subject Specialization
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g. Full Stack Python / React"
              className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Locked Manager Notice in Modal */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-sky-900">
              <Lock className="h-3.5 w-3.5 text-sky-600" />
              <span>Reporting Manager Mapping is Locked</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Currently assigned to <strong>{userProfile?.managerName || 'Sarah Jenkins'}</strong> ({userProfile?.managerEmail || 'manager@enterprise.com'}).
              To transfer to a different manager, submit a <strong>Manager Change Request</strong> from your dashboard or profile screen.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 font-bold text-white hover:bg-sky-500 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Manager Change Request Modal Dialog */}
      <Modal
        isOpen={isChangeRequestModalOpen}
        onClose={() => setIsChangeRequestModalOpen(false)}
        title="Submit Manager Change Request"
        subtitle="Request to change your currently assigned reporting manager."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitManagerChangeRequest} className="p-6 space-y-4 text-xs">
          {changeRequestError && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{changeRequestError}</span>
            </div>
          )}

          {latestPendingRequest ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Pending Request Already Submitted</span>
              </div>
              <p className="text-xs text-amber-800">
                You currently have an active request pending review by <strong>{latestPendingRequest.currentManagerName}</strong> to transfer to <strong>{latestPendingRequest.requestedManagerName}</strong>.
              </p>
              <p className="text-[11px] text-amber-700">
                Submitted on: {new Date(latestPendingRequest.requestDate).toLocaleString()}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangeRequestModalOpen(false)}
                  className="w-full rounded-xl bg-amber-600 text-white font-bold py-2 text-xs hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Current Manager Info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Current Assigned Manager
                </span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {userProfile?.managerName || 'Sarah Jenkins'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {userProfile?.managerEmail || 'sarah.jenkins@enterprise.com'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Your change request will be routed to this manager for formal approval.
                </p>
              </div>

              {/* Requested Manager Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Requested Manager <span className="text-rose-500">*</span>
                </label>
                {availableTargetManagers.length > 0 ? (
                  <select
                    required
                    value={requestedManagerId}
                    onChange={(e) => setRequestedManagerId(e.target.value)}
                    className="w-full rounded-xl border border-sky-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  >
                    {availableTargetManagers.map((mgr) => (
                      <option key={mgr.uid} value={mgr.uid}>
                        {mgr.fullName} • {mgr.companyEmail} ({mgr.department || 'Management'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl bg-slate-100 p-2.5 text-slate-500 text-xs">
                    No alternative managers are currently registered in the database.
                  </div>
                )}
              </div>

              {/* Justification Reason */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Manager Change Request <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Provide details on project alignment, shift schedule changes, or departmental reallocation..."
                  className="w-full rounded-xl border border-sky-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <span className="text-[10px] text-slate-400">
                  Minimum 10 characters explaining the justification.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangeRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || availableTargetManagers.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 font-bold text-white hover:bg-sky-500 shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submittingRequest ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
