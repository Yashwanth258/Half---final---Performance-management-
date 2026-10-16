import React, { useState } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  Trash2,
  CalendarCheck,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ClassItem, ClassStatus, DeliveryMode } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { KpiCard } from '../common/KpiCard';

export const ClassMonitoringView: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    classes = [], 
    allTrainers = [], 
    addClass, 
    deleteClass 
  } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  const todayStr = new Date().toISOString().split('T')[0];

  const initialForm = {
    assignedTrainerId: (allTrainers || [])[0]?.uid || '',
    className: '',
    subject: '',
    topic: '',
    date: todayStr,
    startTime: '09:00',
    endTime: '11:00',
    deliveryMode: 'Online' as DeliveryMode,
    status: 'Scheduled' as ClassStatus,
    roomOrMeetingLink: '',
    remarks: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  // Metrics
  const totalClasses = (classes || []).length;
  const completedClasses = (classes || []).filter(c => c.status === 'Completed').length;
  const ongoingScheduled = (classes || []).filter(c => c.status === 'Scheduled' || c.status === 'Ongoing').length;
  const totalHoursDelivered = Math.round(
    (classes || []).filter(c => c.status === 'Completed').reduce((sum, c) => sum + (c.durationMinutes || 0), 0) / 60
  );

  const filteredClasses = (classes || []).filter(c => {
    if (trainerFilter !== 'ALL' && c.userId !== trainerFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (modeFilter !== 'ALL' && c.deliveryMode !== modeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        (c.className && c.className.toLowerCase().includes(q)) ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.topic && c.topic.toLowerCase().includes(q)) ||
        (c.employeeName && c.employeeName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

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

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    try {
      const trainer = allTrainers.find(t => t.uid === formData.assignedTrainerId);
      const duration = calculateDuration(formData.startTime, formData.endTime);

      await addClass({
        userId: formData.assignedTrainerId,
        employeeId: trainer?.employeeId || 'EMP-TR',
        employeeName: trainer?.fullName || 'Assigned Trainer',
        teamId: trainer?.teamId,
        managerId: userProfile.uid,
        className: formData.className,
        batch: '',
        subject: formData.subject,
        topic: formData.topic,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        durationMinutes: duration,
        numberOfStudents: 0,
        deliveryMode: formData.deliveryMode,
        status: formData.status,
        roomOrMeetingLink: formData.roomOrMeetingLink,
        remarks: formData.remarks,
      });
      setIsModalOpen(false);
      setFormData(initialForm);
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
            Organization-Wide Class Monitoring
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Real-time curriculum delivery oversight, session schedule logs, and classroom modality tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Class for Trainer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Scheduled Classes"
          value={totalClasses}
          subtitle={`${completedClasses} completed sessions`}
          icon={CalendarDays}
        />
        <KpiCard
          title="Total Hours Delivered"
          value={`${totalHoursDelivered} hrs`}
          subtitle="Verified training time"
          icon={Clock}
          variant="primary"
        />
        <KpiCard
          title="Active Sessions"
          value={ongoingScheduled}
          subtitle="In pipeline this cycle"
          icon={CalendarCheck}
          variant="success"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-100 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by class name, trainer, topic, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>

        <select
          value={trainerFilter}
          onChange={(e) => setTrainerFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-2xs"
        >
          <option value="ALL">All Instructors</option>
          {allTrainers.map(t => (
            <option key={t.uid} value={t.uid}>{t.fullName}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-2xs"
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-2xs"
        >
          <option value="ALL">All Delivery Modes</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>

      {/* Classes Table */}
      <div className="overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-sky-100 bg-sky-50/60 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Class & Topic</th>
                <th className="px-4 py-3">Instructor / Trainer</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-500">
                    No classes match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredClasses.map(cls => (
                  <tr key={cls.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{cls.className}</div>
                      <div className="text-[11px] text-slate-500">{cls.topic}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{cls.employeeName}</div>
                      <div className="text-[11px] text-slate-500">{cls.employeeId}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{cls.subject}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 font-medium">{cls.date}</div>
                      <div className="text-[11px] text-slate-500">{cls.startTime} - {cls.endTime}</div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      {cls.durationMinutes} min
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 border border-sky-200">
                        {cls.deliveryMode}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge type="classStatus" value={cls.status} size="sm" />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete class "${cls.className}"?`)) {
                            deleteClass(cls.id);
                          }
                        }}
                        className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        title="Delete class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Class for Trainer"
        subtitle="Create scheduled lecture sessions, specify delivery mode, and assign instructor"
      >
        <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Select Instructor / Trainer *
            </label>
            <select
              value={formData.assignedTrainerId}
              onChange={(e) => setFormData({ ...formData, assignedTrainerId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {allTrainers.map(t => (
                <option key={t.uid} value={t.uid}>
                  {t.fullName} ({t.employeeId} - {t.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Class / Course Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. LLM Fine-Tuning & Quantization"
              value={formData.className}
              onChange={(e) => setFormData({ ...formData, className: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Generative AI"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Topic *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. LoRA & QLoRA Fine-tuning"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Delivery Mode
              </label>
              <select
                value={formData.deliveryMode}
                onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value as DeliveryMode })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Session Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ClassStatus })}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Room or Meeting Link (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. https://meet.google.com/xyz or Room 402"
              value={formData.roomOrMeetingLink}
              onChange={(e) => setFormData({ ...formData, roomOrMeetingLink: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Remarks & Agenda (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add any specific guidelines, notes or prerequisites for the trainer..."
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-xs"
            >
              {saving ? 'Scheduling...' : 'Schedule Class'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
