import React, { useState } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  Users, 
  Globe, 
  Search, 
  Filter, 
  CheckCircle, 
  Edit, 
  Trash2,
  CalendarCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ClassItem, ClassStatus, DeliveryMode } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';

export const ClassTrackingView: React.FC = () => {
  const { userProfile } = useAuth();
  const { classes = [], addClass, updateClass, deleteClass } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  const todayStr = new Date().toISOString().split('T')[0];

  const initialFormState = {
    className: '',
    batch: '',
    subject: '',
    topic: '',
    date: todayStr,
    startTime: '09:00',
    endTime: '11:00',
    numberOfStudents: 25,
    deliveryMode: 'Online' as DeliveryMode,
    status: 'Scheduled' as ClassStatus,
    roomOrMeetingLink: '',
    remarks: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);

  // Auto calculate duration in minutes
  const calculateDuration = (start: string, end: string) => {
    try {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      const diff = (endH * 60 + endM) - (startH * 60 + startM);
      return diff > 0 ? diff : 60;
    } catch {
      return 60;
    }
  };

  const currentDuration = calculateDuration(formData.startTime, formData.endTime);

  // Trainer only sees their own classes
  const myClasses = userProfile ? (classes || []).filter(c => c.userId === userProfile.uid) : [];

  const filteredClasses = myClasses.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (modeFilter !== 'ALL' && c.deliveryMode !== modeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        c.className.toLowerCase().includes(q) ||
        c.batch.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingClassId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClassId(cls.id);
    setFormData({
      className: cls.className,
      batch: cls.batch,
      subject: cls.subject,
      topic: cls.topic,
      date: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime,
      numberOfStudents: cls.numberOfStudents,
      deliveryMode: cls.deliveryMode,
      status: cls.status,
      roomOrMeetingLink: cls.roomOrMeetingLink || '',
      remarks: cls.remarks || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    const userRegDateStr = userProfile?.createdAt ? userProfile.createdAt.split('T')[0] : '';
    if (userRegDateStr && formData.date < userRegDateStr) {
      alert(`Classes can only be logged from your account registration date (${userRegDateStr}) onwards.`);
      return;
    }

    setSaving(true);
    try {
      const durationMins = calculateDuration(formData.startTime, formData.endTime);
      if (editingClassId) {
        await updateClass(editingClassId, {
          ...formData,
          durationMinutes: durationMins,
        });
      } else {
        await addClass({
          userId: userProfile.uid,
          trainerName: userProfile.fullName,
          trainerEmployeeId: userProfile.employeeId,
          teamId: userProfile.teamId,
          managerId: userProfile.managerId,
          ...formData,
          durationMinutes: durationMins,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Class Management & Delivery Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log completed lectures, track live batches, student headcounts, and teaching hours
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Record / Schedule Class</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-sky-600/70" />
          <input
            type="text"
            placeholder="Search classes by name, batch, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
        >
          <option value="ALL">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Rescheduled">Rescheduled</option>
        </select>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
        >
          <option value="ALL">All Modes</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>

      {/* Classes Table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-sky-100 bg-sky-50/80 font-bold text-sky-950">
              <tr>
                <th className="px-4 py-3.5">Class & Topic</th>
                <th className="px-4 py-3.5">Batch & Subject</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Duration</th>
                <th className="px-4 py-3.5">Students</th>
                <th className="px-4 py-3.5">Mode</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No classes found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{cls.className}</div>
                      <div className="text-[11px] text-slate-500">{cls.topic}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{cls.batch}</div>
                      <div className="text-[11px] text-slate-500">{cls.subject}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-medium">{cls.date}</div>
                      <div className="text-[11px] text-slate-500">{cls.startTime} - {cls.endTime}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">
                      {cls.durationMinutes} min ({(cls.durationMinutes / 60).toFixed(1)}h)
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Users className="h-3.5 w-3.5 text-sky-500" />
                        {cls.numberOfStudents}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-sky-50 border border-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                        {cls.deliveryMode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge type="classStatus" value={cls.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {cls.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => updateClass(cls.id, { status: 'Completed' })}
                            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Mark as Completed"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cls)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                          title="Edit Class"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete class record "${cls.className}"?`)) {
                              deleteClass(cls.id);
                            }
                          }}
                          className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClassId ? 'Edit Class Entry' : 'Record / Schedule Class'}
        subtitle="Manage classroom delivery sessions, batch schedules, and delivery modalities"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Class / Course Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cloud & GenAI Foundations"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Batch Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AI-2026-B"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Generative AI Systems"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Topic / Lecture Module *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Multi-modal prompting & Tool calling"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                min={userProfile?.createdAt ? userProfile.createdAt.split('T')[0] : undefined}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                End Time *
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-sky-900 text-xs">
            ⚡ Automatically computed duration: <strong>{currentDuration} minutes ({(currentDuration / 60).toFixed(1)} hours)</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Number of Students *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.numberOfStudents}
                onChange={(e) => setFormData({ ...formData, numberOfStudents: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Delivery Mode *
              </label>
              <select
                value={formData.deliveryMode}
                onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value as DeliveryMode })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Class Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ClassStatus })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Room or Meeting URL
            </label>
            <input
              type="text"
              placeholder="e.g. https://meet.google.com/xyz-abc or Lab 204"
              value={formData.roomOrMeetingLink}
              onChange={(e) => setFormData({ ...formData, roomOrMeetingLink: e.target.value })}
              className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Remarks
            </label>
            <input
              type="text"
              placeholder="Session notes or student attendance notes"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingClassId ? 'Update Class' : 'Save Class Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
