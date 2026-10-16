import React, { useState } from 'react';
import { 
  CheckSquare, 
  ListTodo, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3,
  Calendar,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TaskItem, TaskPriority, TaskStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { KpiCard } from '../common/KpiCard';

export const TaskManagementView: React.FC = () => {
  const { userProfile } = useAuth();
  const { tasks = [], updateTaskProgress } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Progress edit modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [modalProgress, setModalProgress] = useState(0);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('Not Started');
  const [modalRemarks, setModalRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const myTasks = userProfile ? (tasks || []).filter(t => t.assignedTo === userProfile.uid) : [];

  // Metrics computation
  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = myTasks.filter(t => t.status === 'Not Started' || t.status === 'In Progress').length;
  const delayedTasks = myTasks.filter(t => t.status === 'Delayed' || (t.status !== 'Completed' && t.dueDate < todayStr)).length;
  const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredTasks = myTasks.filter(t => {
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        t.taskName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleOpenEdit = (task: TaskItem) => {
    setSelectedTask(task);
    setModalProgress(task.completionPercentage || 0);
    setModalStatus(task.status);
    setModalRemarks(task.remarks || '');
  };

  const handleSaveProgress = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      await updateTaskProgress(selectedTask.id, modalProgress, modalStatus, modalRemarks);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-sky-100 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Task Management & Assignments
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor assigned curriculum development, lab reviews, and track completion progress
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Tasks"
          value={totalTasks}
          subtitle="Assigned this period"
          icon={ListTodo}
        />
        <KpiCard
          title="Completed Tasks"
          value={completedTasks}
          subtitle={`${taskCompletionPercentage}% completion rate`}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title="Pending Tasks"
          value={pendingTasks}
          subtitle="In active progression"
          icon={Clock}
          variant="primary"
        />
        <KpiCard
          title="Delayed Tasks"
          value={delayedTasks}
          subtitle={delayedTasks > 0 ? 'Requires immediate focus' : 'On schedule'}
          icon={AlertTriangle}
          variant={delayedTasks > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title="Overall Progress"
          value={`${taskCompletionPercentage}%`}
          progress={{ current: completedTasks, max: Math.max(1, totalTasks), color: 'bg-emerald-500' }}
          icon={CheckSquare}
          variant="success"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-sky-600/70" />
          <input
            type="text"
            placeholder="Search tasks by name, category, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
        >
          <option value="ALL">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
        >
          <option value="ALL">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Blocked">Blocked</option>
          <option value="Delayed">Delayed</option>
        </select>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-sky-100 bg-white p-12 text-center shadow-xs">
            <ListTodo className="mx-auto h-10 w-10 text-sky-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No tasks found
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              No tasks matched your active search or filters.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.status !== 'Completed' && task.dueDate < todayStr;
            return (
              <div
                key={task.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                  isOverdue
                    ? 'border-rose-300 ring-2 ring-rose-200'
                    : 'border-sky-100 hover:border-sky-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <StatusBadge type="taskPriority" value={task.priority} size="sm" />
                    <StatusBadge type="taskStatus" value={task.status} size="sm" />
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900">
                    {task.taskName}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>

                  {task.category && (
                    <span className="mt-2.5 inline-block rounded-md bg-sky-50 border border-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                      {task.category}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-sky-50 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-sky-500" />
                      Due: <strong className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>{task.dueDate}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <UserCheck className="h-3.5 w-3.5 text-sky-500" />
                      By: {task.assignedByName}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-sky-600 font-bold">{task.completionPercentage}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-sky-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.completionPercentage >= 100
                            ? 'bg-emerald-500'
                            : task.completionPercentage >= 50
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${task.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {task.remarks && (
                    <p className="text-[11px] text-slate-500 italic bg-sky-50/50 p-2 rounded-lg border border-sky-100/60">
                      "{task.remarks}"
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(task)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/60 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Update Task Progress</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Edit Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Update Task Progress"
          subtitle={selectedTask.taskName}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Task Status *
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Completion Percentage</span>
                <span className="text-sky-600 font-bold text-sm">{modalProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={modalProgress}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setModalProgress(val);
                  if (val === 100) setModalStatus('Completed');
                  else if (val > 0 && modalStatus === 'Not Started') setModalStatus('In Progress');
                }}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Remarks / Progress Update Notes
              </label>
              <textarea
                rows={3}
                placeholder="Detail current accomplishments, test results, or reasons for any delay..."
                value={modalRemarks}
                onChange={(e) => setModalRemarks(e.target.value)}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProgress}
                className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Save & Sync Task'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
