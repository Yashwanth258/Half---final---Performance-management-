import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, 
  Sparkles, 
  Clock, 
  Plus, 
  Calendar, 
  Search, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  Award,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { HolisticContributionRecord } from '../../types';
import { calculateHolisticGuidanceMetrics } from '../../lib/performanceEngine';
import { Tooltip } from '../common/Tooltip';

export const PREDEFINED_CATEGORIES = [
  'Emotional & Wellbeing Guidance',
  'Peer Collaboration & Doubt Clearing',
  'Administrative & Distribution Support',
  'Community & Context Collaboration',
  'Lab & Practical Assistance',
  'Trainee Motivation & Career Mentorship',
  'Syllabus Enrichment & Code Reviews',
  'Other',
];

export const HolisticContributionsView: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    userHolisticContributions, 
    addHolisticContribution, 
    updateHolisticContribution, 
    deleteHolisticContribution 
  } = useData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - strictly date, category, custom category, duration, and detailed impact
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    categoryDropdown: PREDEFINED_CATEGORIES[0],
    customCategory: '',
    durationMinutes: 45,
    impactNotes: '',
  });

  // Calculate live holistic metrics
  const metrics = useMemo(() => {
    return calculateHolisticGuidanceMetrics(userHolisticContributions);
  }, [userHolisticContributions]);

  // Unique categories dynamically derived from existing logs + defaults
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>(PREDEFINED_CATEGORIES.filter(c => c !== 'Other'));
    userHolisticContributions.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [userHolisticContributions]);

  // Filtered contributions list
  const filteredContributions = useMemo(() => {
    return userHolisticContributions.filter((item) => {
      const matchesCat = selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter;
      const matchesSearch = 
        !searchQuery ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.impactNotes && item.impactNotes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [userHolisticContributions, selectedCategoryFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      categoryDropdown: PREDEFINED_CATEGORIES[0],
      customCategory: '',
      durationMinutes: 45,
      impactNotes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: HolisticContributionRecord) => {
    setEditingId(item.id);
    const isPredefined = PREDEFINED_CATEGORIES.includes(item.category) && item.category !== 'Other';
    setFormData({
      date: item.date || new Date().toISOString().split('T')[0],
      categoryDropdown: isPredefined ? item.category : 'Other',
      customCategory: isPredefined ? '' : item.category,
      durationMinutes: item.durationMinutes || 45,
      impactNotes: item.impactNotes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = formData.categoryDropdown === 'Other'
      ? (formData.customCategory.trim() || 'Other Contribution')
      : formData.categoryDropdown;

    if (!formData.impactNotes.trim()) {
      addToast({
        id: `err-${Date.now()}`,
        title: 'Details Required',
        message: 'Please provide impact & detail notes for this contribution.',
        type: 'error',
        category: 'system',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await updateHolisticContribution(editingId, {
          date: formData.date,
          category: finalCategory,
          durationMinutes: Number(formData.durationMinutes) || 45,
          impactNotes: formData.impactNotes.trim(),
        });
        addToast({
          id: `upd-${Date.now()}`,
          title: 'Contribution Updated',
          message: 'Your contribution details have been updated.',
          type: 'success',
          category: 'performance',
        });
      } else {
        await addHolisticContribution({
          userId: userProfile?.uid || '',
          employeeId: userProfile?.employeeId || '',
          employeeName: userProfile?.fullName || '',
          managerId: userProfile?.managerId || '',
          managerName: userProfile?.managerName || '',
          date: formData.date,
          category: finalCategory,
          durationMinutes: Number(formData.durationMinutes) || 45,
          impactNotes: formData.impactNotes.trim(),
          acknowledgedByManager: false,
        });
        addToast({
          id: `add-${Date.now()}`,
          title: 'Contribution Logged',
          message: 'Contribution recorded! Visible in your manager portal.',
          type: 'success',
          category: 'performance',
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      addToast({
        id: `err-submit-${Date.now()}`,
        title: 'Submission Failed',
        message: err.message || 'Could not save contribution record.',
        type: 'error',
        category: 'system',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, categoryName: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${categoryName} record?`)) return;
    try {
      await deleteHolisticContribution(id);
      addToast({
        id: `del-${Date.now()}`,
        title: 'Record Removed',
        message: 'The contribution entry has been removed.',
        type: 'info',
        category: 'performance',
      });
    } catch (err: any) {
      addToast({
        id: `del-err-${Date.now()}`,
        title: 'Deletion Failed',
        message: err.message || 'Could not remove contribution.',
        type: 'error',
        category: 'system',
      });
    }
  };

  // Helper color function for dynamic categories
  const getCategoryBadgeClass = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('emotion') || lower.includes('wellbeing') || lower.includes('counsel')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (lower.includes('peer') || lower.includes('doubt') || lower.includes('collaborat')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    if (lower.includes('admin') || lower.includes('distribut') || lower.includes('asset')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (lower.includes('community') || lower.includes('forum') || lower.includes('context')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (lower.includes('lab') || lower.includes('practical')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (lower.includes('motivat') || lower.includes('career')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Peer Enablement & Holistic Work
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Track essential work that frequently goes unnoticed: counseling, peer doubt clearing, administrative tasks, and community support. Select an existing category or enter custom details.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Log Contribution</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Connect % Gauge */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Holistic Connect Index
            </p>
            <Award className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {metrics.connectPercentage}%
            </span>
            <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              {metrics.impactLevel}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-sky-600 h-full transition-all duration-500" 
              style={{ width: `${metrics.connectPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Calculated separately from standard syllabus delivery
          </p>
        </div>

        {/* Total Time Invested */}
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dedicated Hours
            </p>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {metrics.totalHours}
            </span>
            <span className="text-xs text-slate-500 font-medium">Hours Logged</span>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Across {metrics.totalSessions} total contribution records
          </p>
        </div>

        {/* Total Records */}
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Contributions Logged
            </p>
            <Tag className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {metrics.totalSessions}
            </span>
            <span className="text-xs text-slate-500 font-medium">Total Entries</span>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Recorded across {Object.keys(metrics.categoryCounts).length} distinct categories
          </p>
        </div>

        {/* Visibility in Manager Portal */}
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Manager Recognition
            </p>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-700">Visible in 360° Review</span>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Reviewed by {userProfile?.managerName || 'Reporting Manager'}
          </p>
        </div>
      </div>

      {/* Contributions List & Search Toolbar */}
      <div className="rounded-2xl border border-sky-100 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-sky-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Contribution History ({filteredContributions.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Logs of your guidance, peer collaboration, distribution, and community support
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter Dropdown */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {allAvailableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({metrics.categoryCounts[cat] || 0})
                </option>
              ))}
            </select>

            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filteredContributions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-3">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Contributions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {selectedCategoryFilter !== 'ALL' 
                ? 'No records match the selected category filter.' 
                : 'Log your peer doubt clearing, counseling, asset distribution, or other contributions.'}
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Log Contribution</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredContributions.map((item) => {
              const badgeClass = getCategoryBadgeClass(item.category);

              return (
                <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}>
                          {item.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {item.date}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Clock className="h-3 w-3" />
                          {item.durationMinutes} mins
                        </span>
                        {item.acknowledgedByManager && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Acknowledged by Manager
                          </span>
                        )}
                      </div>

                      {/* Impact and Detailed Notes */}
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {item.impactNotes}
                      </p>

                      {item.managerFeedbackNotes && (
                        <div className="mt-2 rounded-xl bg-emerald-50/90 border border-emerald-100 p-2.5 text-xs text-emerald-800">
                          <span className="font-bold">Manager Feedback:</span> {item.managerFeedbackNotes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                      <Tooltip content="Edit record" placement="left">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete record" placement="left">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.category)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Adding / Editing Contribution */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Contribution' : 'Log Contribution'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record your category, duration, and detailed impact
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contribution Category *
                </label>
                <select
                  value={formData.categoryDropdown}
                  onChange={(e) => setFormData({ ...formData, categoryDropdown: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  {PREDEFINED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* If "Other", display custom category text input */}
              {formData.categoryDropdown === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hackathon Mentorship, Exam Preparation Session"
                    value={formData.customCategory}
                    onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duration (Minutes) *
                  </label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (1 hr)</option>
                    <option value={90}>90 Minutes (1.5 hrs)</option>
                    <option value={120}>120 Minutes (2 hrs)</option>
                    <option value={180}>180 Minutes (3 hrs)</option>
                  </select>
                </div>
              </div>

              {/* Impact & Detail Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Impact & Detail Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the assistance or support provided, what problem was solved, and the impact achieved..."
                  value={formData.impactNotes}
                  onChange={(e) => setFormData({ ...formData, impactNotes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Contribution' : 'Save Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
