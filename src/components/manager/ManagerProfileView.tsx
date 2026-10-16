import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Save, 
  Sliders,
  RotateCcw,
  RefreshCw,
  Lock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Layers,
  Trash2,
  AlertCircle,
  Pencil,
  Phone,
  Briefcase,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DEFAULT_WEIGHTS } from '../../lib/performanceEngine';
import { seedEnterpriseData } from '../../lib/seedDatabase';
import { PerformanceWeightConfig, UserProfile } from '../../types';
import { Modal } from '../common/Modal';

export const ManagerProfileView: React.FC = () => {
  const { userProfile, updateProfileData } = useAuth();
  const { performanceWeights, setPerformanceWeights, allTrainers, deleteTrainer, reseedData, isSeeding } = useData();

  const [activeTab, setActiveTab] = useState<'profile' | 'weights' | 'team'>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || '',
    designation: userProfile?.designation || 'Capability Manager',
    phone: userProfile?.phone || '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Synchronize with userProfile updates
  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || '',
        designation: userProfile.designation || 'Capability Manager',
        phone: userProfile.phone || '',
      });
    }
  }, [userProfile]);

  // Performance Weights State
  const [weights, setWeights] = useState<PerformanceWeightConfig>(performanceWeights);
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsSuccess, setWeightsSuccess] = useState(false);

  // Delete Trainer Modal State
  const [trainerToDelete, setTrainerToDelete] = useState<UserProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingTrainer, setIsDeletingTrainer] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const totalWeight = 
    Number(weights.classDelivery) +
    Number(weights.taskCompletion) +
    Number(weights.projectProgress) +
    Number(weights.additionalContribution);

  const isValidTotal = totalWeight === 100;

  const handleProfileSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.fullName.trim()) return;

    setSavingProfile(true);
    setProfileSuccess(false);
    try {
      await updateProfileData({
        fullName: formData.fullName.trim(),
        designation: formData.designation.trim() || 'Capability Manager',
        phone: formData.phone.trim(),
        location: '', // Managers do not have an office location
      });
      setProfileSuccess(true);
      setIsEditModalOpen(false);
      setIsEditing(false);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err) {
      console.error('Error updating manager profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTotal) return;
    setSavingWeights(true);
    setWeightsSuccess(false);
    try {
      setPerformanceWeights(weights);
      setWeightsSuccess(true);
      setTimeout(() => setWeightsSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating weights:', err);
    } finally {
      setSavingWeights(false);
    }
  };

  const handleResetDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleConfirmDeleteTrainer = async () => {
    if (!trainerToDelete || deleteConfirmText.trim() !== 'YES') return;
    setIsDeletingTrainer(true);
    try {
      const deletedName = trainerToDelete.fullName;
      const deletedEmpId = trainerToDelete.employeeId;
      await deleteTrainer(trainerToDelete.uid);
      setDeleteSuccessMsg(`Trainer "${deletedName}" (${deletedEmpId}) was permanently removed from the database.`);
      setTrainerToDelete(null);
      setDeleteConfirmText('');
      setTimeout(() => setDeleteSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to delete trainer:', err);
    } finally {
      setIsDeletingTrainer(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      {/* Page Header */}
      <div className="border-b border-sky-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Manager Profile & System Settings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your executive credentials, edit your profile details, view direct assigned instructors, and configure scoring weights.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500 transition-all cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
              {userProfile?.department || 'GenAI'} Lead
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Executive Profile Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'team'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Assigned Instructors</span>
            <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[10px] text-sky-800 font-bold">
              {allTrainers.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'weights'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Performance Engine Weights
          </button>
        </div>
      </div>

      {/* Tab 1: Profile View */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Profile Identity Card */}
          <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs">
            <div className="h-32 bg-linear-to-r from-sky-600 via-sky-700 to-blue-800 p-6 flex items-end justify-between">
              <div className="relative -bottom-10 flex h-22 w-22 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md">
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-sky-700 font-bold text-white text-2xl shadow-inner">
                  {userProfile?.fullName ? userProfile.fullName.slice(0, 2).toUpperCase() : 'MG'}
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

            <div className="px-6 pt-14 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {userProfile?.fullName || 'Capability Manager'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {userProfile?.designation || 'Capability Manager'} • Employee ID: <strong className="font-mono text-sky-700 font-bold">{userProfile?.employeeId}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-purple-50 px-3 py-1 text-xs font-bold text-purple-800 border border-purple-200">
                    Department: {userProfile?.department || 'GenAI'}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    Active Manager Account
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-sky-50 pt-4">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Mail className="h-4 w-4 text-sky-500 shrink-0" />
                  <span className="truncate">{userProfile?.companyEmail}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>
                    {userProfile?.phone || (
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-sky-600 hover:underline font-normal"
                      >
                        + Add phone number
                      </button>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Building2 className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>{userProfile?.teamName || `${userProfile?.department || 'GenAI'} Department`}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Users className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>Direct Assigned Team: <strong>{allTrainers.length} Instructors</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Manager Information Section */}
          <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-sky-50 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Executive Manager Information
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
                    ? 'Your executive profile details are locked. Click "Edit Profile Details" to unlock and make changes.' 
                    : 'Modify your profile fields below and click "Save Profile Changes" to update your record.'}
                </p>
              </div>

              <div>
                {!isEditing ? (
                  <button
                    type="button"
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
                          designation: userProfile.designation || 'Capability Manager',
                          phone: userProfile.phone || '',
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

            {!isEditing && (
              <div className="rounded-xl bg-sky-50/70 border border-sky-200/80 p-3 flex items-center justify-between gap-3 text-xs text-sky-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>Details are protected from accidental edits. Click <strong>Edit Profile Details</strong> to make changes.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 underline shrink-0 cursor-pointer"
                >
                  Unlock Now &rarr;
                </button>
              </div>
            )}

            {profileSuccess && (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Profile updated and synchronized successfully!</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
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
                    Executive Title / Designation <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      disabled={!isEditing}
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className={`w-full rounded-xl border pl-9.5 pr-3 py-2.5 text-xs transition-colors ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed select-none' 
                          : 'border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Contact / Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full rounded-xl border pl-9.5 pr-3 py-2.5 text-xs transition-colors ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed select-none' 
                        : 'border-sky-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* Locked Department Information Banner */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3 text-xs text-slate-600">
                <Lock className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">
                    Assigned Domain: {userProfile?.department || 'GenAI'} Department (Organizational Governance)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your assigned domain enforces strict department isolation. You exclusively manage instructors assigned to the <strong>{userProfile?.department || 'GenAI'}</strong> department.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-sky-100">
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
                            designation: userProfile.designation || 'Capability Manager',
                            phone: userProfile.phone || '',
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
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Save className="h-4 w-4" />
                      <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Edit Profile Modal for Manager */}
          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Edit Manager Profile"
            subtitle="Update your executive legal name, title designation, and contact phone number."
            maxWidth="md"
          >
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Executive Title / Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 font-bold text-white hover:bg-sky-500 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* Tab 2: Assigned Trainers Scoping */}
      {activeTab === 'team' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {deleteSuccessMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{deleteSuccessMsg}</span>
            </div>
          )}

          <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-sky-50 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-600" />
                  Direct Reporting Trainers ({allTrainers.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trainers assigned specifically to you in the {userProfile?.department || 'GenAI'} department
                </p>
              </div>
            </div>

            {allTrainers.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200">
                <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No trainers currently assigned</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  When new {userProfile?.department} trainers register and select you as their reporting manager, their live records and scorecards will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allTrainers.map((trainer) => (
                  <div key={trainer.uid} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-bold text-xs shrink-0">
                        {trainer.fullName ? trainer.fullName.slice(0, 2).toUpperCase() : 'TR'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{trainer.fullName}</p>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                            {trainer.employeeId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {trainer.designation} • {trainer.subject || 'Engineering Curriculum'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-[11px] font-semibold text-slate-600">{trainer.companyEmail}</p>
                        <p className="text-[10px] text-slate-400">{trainer.location || 'Campus'}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Assigned
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTrainerToDelete(trainer);
                          setDeleteConfirmText('');
                        }}
                        className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                        title={`Delete / Drop ${trainer.fullName} from database`}
                        aria-label={`Delete ${trainer.fullName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Performance Engine Weights & Sync */}
      {activeTab === 'weights' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {weightsSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Weighted scoring configuration updated and synchronized across all organizational dashboards!</span>
            </div>
          )}

          <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-sky-50 pb-4">
              <div className="flex items-center gap-2.5">
                <Sliders className="h-5 w-5 text-sky-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Weighted Scoring Formula Parameters
                  </h2>
                  <p className="text-xs text-slate-500">
                    Adjust organizational weights for composite trainer score calculation (4 Pillars = 100%)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Standard Defaults</span>
              </button>
            </div>

            <form onSubmit={handleSaveWeights} className="mt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/30">
                  <div className="flex justify-between font-semibold text-slate-700 mb-1.5">
                    <span>1. Work & Class Delivery Weight</span>
                    <span className="text-sky-700 font-bold">{weights.classDelivery}%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={weights.classDelivery}
                    onChange={(e) => setWeights({ ...weights, classDelivery: Number(e.target.value) })}
                    className="w-full rounded-lg border border-sky-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Hours delivered vs target scheduled</p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/30">
                  <div className="flex justify-between font-semibold text-slate-700 mb-1.5">
                    <span>2. Task Completion Weight</span>
                    <span className="text-sky-700 font-bold">{weights.taskCompletion}%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={weights.taskCompletion}
                    onChange={(e) => setWeights({ ...weights, taskCompletion: Number(e.target.value) })}
                    className="w-full rounded-lg border border-sky-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">On-time closure of assigned tasks & tickets</p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/30">
                  <div className="flex justify-between font-semibold text-slate-700 mb-1.5">
                    <span>3. Project Progress Weight</span>
                    <span className="text-sky-700 font-bold">{weights.projectProgress}%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={weights.projectProgress}
                    onChange={(e) => setWeights({ ...weights, projectProgress: Number(e.target.value) })}
                    className="w-full rounded-lg border border-sky-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Strategic milestone deliverables</p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/30">
                  <div className="flex justify-between font-semibold text-slate-700 mb-1.5">
                    <span>4. Peer Enablement & Holistic Work</span>
                    <span className="text-sky-700 font-bold">{weights.additionalContribution}%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={weights.additionalContribution}
                    onChange={(e) => setWeights({ ...weights, additionalContribution: Number(e.target.value) })}
                    className="w-full rounded-lg border border-sky-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Mentoring, emotional guidance & invisible contributions</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 mt-4">
                <div className="flex items-center gap-2">
                  {isValidTotal ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  )}
                  <span className={`text-xs font-bold ${isValidTotal ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Total Weight: {totalWeight}% {isValidTotal ? '(Valid 100% Formula)' : '(Must equal exactly 100%)'}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!isValidTotal || savingWeights}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingWeights ? 'Updating...' : 'Apply Scoring Formula'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Database Reseed & Sync Card */}
          <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cloud Firestore Synchronization
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronize and refresh all organizational data records
                </p>
              </div>

              <button
                type="button"
                onClick={() => reseedData()}
                disabled={isSeeding}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSeeding ? 'animate-spin text-sky-600' : 'text-sky-600'}`} />
                <span>{isSeeding ? 'Synchronizing...' : 'Sync Workspace Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Trainer Confirmation Modal with YES Verification */}
      {trainerToDelete && (
        <Modal
          isOpen={!!trainerToDelete}
          onClose={() => !isDeletingTrainer && setTrainerToDelete(null)}
          title="Delete & Drop Trainer Record"
          subtitle="Permanent Database Removal"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-950 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold text-rose-950 text-sm">
                  Are you sure you want to permanently delete this trainer?
                </p>
                <p className="text-rose-900 leading-relaxed">
                  Trainer: <strong className="text-rose-950">{trainerToDelete.fullName}</strong> ({trainerToDelete.employeeId})
                </p>
                <p className="text-rose-800 text-[11px]">
                  Email: {trainerToDelete.companyEmail} • Designation: {trainerToDelete.designation}
                </p>
                <p className="text-[11px] text-rose-700 pt-1">
                  This action will permanently delete this employee from Cloud Firestore and all organizational manager views (e.g. if the trainer has left the office or dropped from the organization).
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <label className="font-semibold text-slate-800 block text-xs">
                Type <span className="font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-sm">YES</span> in capital letters to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type YES to confirm deletion"
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-mono text-xs font-bold text-slate-900 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:border-rose-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-500">
                The delete button will remain disabled until you type <strong>YES</strong> exactly.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-sky-100">
              <button
                type="button"
                disabled={isDeletingTrainer}
                onClick={() => {
                  setTrainerToDelete(null);
                  setDeleteConfirmText('');
                }}
                className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim() !== 'YES' || isDeletingTrainer}
                onClick={handleConfirmDeleteTrainer}
                className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 shadow-xs shadow-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingTrainer ? 'Deleting Trainer...' : 'Confirm & Delete'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
