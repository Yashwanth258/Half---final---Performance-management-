import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  ListTodo, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Calendar,
  Trash2,
  Edit3,
  Tag,
  Check,
  Flame,
  Info,
  Sparkles,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TaskItem, TaskPriority, TaskStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';

export const TaskManagerView: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    tasks = [], 
    allTrainers = [], 
    createTask, 
    updateTaskProgress, 
    deleteTask 
  } = useData();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const todayStr = new Date().toISOString().split('T')[0];

  const initialForm = {
    taskName: '',
    description: '',
    assignedTo: (allTrainers || [])[0]?.uid || '',
    priority: 'Medium' as TaskPriority,
    category: 'Curriculum Development',
    assignedDate: todayStr,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    remarks: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  // Edit Task State for Manager Review
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<TaskStatus>('Not Started');
  const [editRemarks, setEditRemarks] = useState('');

  // Overall Task KPIs
  const totalTasks = (tasks || []).length;
  const completedTasks = (tasks || []).filter(t => t.status === 'Completed' || (t.completionPercentage || 0) >= 100).length;
  const inProgressTasks = (tasks || []).filter(t => t.status === 'In Progress').length;
  const pendingTasks = (tasks || []).filter(t => t.status === 'Not Started' || t.status === 'In Progress').length;
  const delayedTasks = (tasks || []).filter(t => t.status === 'Delayed' || (t.status !== 'Completed' && t.dueDate < todayStr)).length;
  const highPriorityTasks = (tasks || []).filter(t => (t.priority === 'High' || t.priority === 'Urgent') && t.status !== 'Completed').length;

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      if (trainerFilter !== 'ALL' && t.assignedTo !== trainerFilter && t.assignedToName !== trainerFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          (t.taskName && t.taskName.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.assignedToName && t.assignedToName.toLowerCase().includes(q)) ||
          (t.assignedToEmployeeId && t.assignedToEmployeeId.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.remarks && t.remarks.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [tasks, trainerFilter, priorityFilter, statusFilter, categoryFilter, searchQuery]);

  // Selected trainer details in create modal
  const selectedAssignee = useMemo(() => {
    return allTrainers.find(t => t.uid === formData.assignedTo) || allTrainers[0];
  }, [allTrainers, formData.assignedTo]);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    try {
      const assignee = allTrainers.find(t => t.uid === formData.assignedTo) || allTrainers[0];
      await createTask({
        taskName: formData.taskName,
        description: formData.description,
        assignedTo: formData.assignedTo || assignee?.uid || '',
        assignedToName: assignee?.fullName || 'Assigned Trainer',
        assignedToEmployeeId: assignee?.employeeId || 'EMP-TR',
        assignedBy: userProfile.uid,
        assignedByName: userProfile.fullName,
        priority: formData.priority,
        category: formData.category,
        assignedDate: formData.assignedDate,
        dueDate: formData.dueDate,
        status: 'Not Started',
        completionPercentage: 0,
        remarks: formData.remarks,
      });
      setIsCreateModalOpen(false);
      setFormData(initialForm);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Task Modal
  const handleOpenEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setEditProgress(task.completionPercentage || 0);
    setEditStatus(task.status);
    setEditRemarks(task.remarks || '');
  };

  // Save Task Progress
  const handleSaveEditProgress = async () => {
    if (!editingTask) return;
    setSaving(true);
    try {
      await updateTaskProgress(editingTask.id, editProgress, editStatus, editRemarks);
      setEditingTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const priorityBadgeConfig = {
    Low: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    Medium: { bg: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
    High: { bg: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
    Urgent: { bg: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 border border-sky-200/80 mb-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-sky-600" />
            Pillar 2: Team Task Assignment & Delivery Governance
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Team Task Management & Work Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign deliverables, set priorities, track real-time trainer execution, and evaluate milestone throughput
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({
              ...initialForm,
              assignedTo: (allTrainers || [])[0]?.uid || '',
            });
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-500 shadow-sky-600/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Total Tasks</span>
            <ListTodo className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalTasks}</p>
          <span className="text-2xs text-slate-400">Assigned across team</span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{completedTasks}</p>
          <span className="text-2xs text-emerald-600">
            {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completion rate
          </span>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-sky-800">In Progress</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-sky-950">{inProgressTasks}</p>
          <span className="text-2xs text-sky-600">Actively being worked on</span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-amber-800">High / Urgent</span>
            <Flame className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">{highPriorityTasks}</p>
          <span className="text-2xs text-amber-600">Priority deliverables</span>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-rose-700">Delayed / Overdue</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-rose-900">{delayedTasks}</p>
          <span className="text-2xs text-rose-600">
            {delayedTasks > 0 ? 'Requires attention' : 'All on schedule'}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title, description, trainer name, employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden"
          />
        </div>

        {/* Trainer Assignee Dropdown */}
        <select
          value={trainerFilter}
          onChange={(e) => setTrainerFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
        >
          <option value="ALL">All Lead Trainers</option>
          {allTrainers.map(t => (
            <option key={t.uid} value={t.uid}>
              {t.fullName} ({t.employeeId})
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
        >
          <option value="ALL">All Priorities</option>
          <option value="Urgent">Urgent Priority</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
        >
          <option value="ALL">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Blocked">Blocked</option>
          <option value="Delayed">Delayed</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
        >
          <option value="ALL">All Categories</option>
          <option value="Curriculum Development">Curriculum Development</option>
          <option value="Lab Infrastructure">Lab Infrastructure</option>
          <option value="Student Mentorship">Student Mentorship</option>
          <option value="Assessment Review">Assessment Review</option>
          <option value="QA Improvement">QA Improvement</option>
          <option value="Code Review & Grading">Code Review & Grading</option>
        </select>
      </div>

      {/* Tasks Table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-sky-100 bg-sky-50/80 font-bold text-sky-950">
              <tr>
                <th className="px-4 py-3.5">Task & Deliverables</th>
                <th className="px-4 py-3.5">Lead Trainer</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5">Execution Progress</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <ListTodo className="mx-auto h-8 w-8 text-sky-300 mb-2" />
                    <p className="font-bold text-slate-800">No tasks found matching your filter criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Assign a new task using the button above or adjust your search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const isOverdue = task.status !== 'Completed' && task.dueDate < todayStr;
                  const isDone = task.status === 'Completed' || (task.completionPercentage || 0) >= 100;

                  return (
                    <tr key={task.id} className="hover:bg-sky-50/40 transition-colors">
                      {/* Task details */}
                      <td className="px-4 py-4 max-w-xs sm:max-w-md">
                        <div className="font-bold text-slate-900 text-xs">{task.taskName}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {task.category && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 border border-sky-200">
                              <Tag className="h-2.5 w-2.5 text-sky-600" />
                              {task.category}
                            </span>
                          )}
                          {task.remarks && (
                            <span className="text-[10px] text-slate-400 italic line-clamp-1">
                              Note: "{task.remarks}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
                            {(task.assignedToName || 'TR').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{task.assignedToName}</div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {task.assignedToEmployeeId || 'EMP-TR'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${priorityBadgeConfig[task.priority]?.bg || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityBadgeConfig[task.priority]?.dot || 'bg-slate-400'}`} />
                          {task.priority}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-4">
                        <div className={`text-xs ${isOverdue ? 'font-bold text-rose-600' : 'text-slate-700 font-medium'}`}>
                          {task.dueDate}
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 mt-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-4">
                        <div className="w-32">
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-500">Progress</span>
                            <span className={isDone ? 'text-emerald-600' : 'text-sky-700'}>
                              {task.completionPercentage}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-sky-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-emerald-500' : 'bg-sky-600'}`}
                              style={{ width: `${task.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge type="taskStatus" value={task.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(task)}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                            title="Update Status / Progress"
                          >
                            <Edit3 className="h-3 w-3 text-sky-600" />
                            <span>Update</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete task "${task.taskName}"?`)) {
                                deleteTask(task.id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ASSIGN NEW TASK MODAL - CLEAN, NEAT, LIGHT SKY/SLATE STYLING */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Assign New Task to Trainer"
          subtitle="Create task deliverables, assign to an employee, and define priority & target deadlines"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
            {/* Task Title */}
            <div>
              <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                Task Title & Objective *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Build Interactive LLM Function Calling Lab & Solution Notebooks"
                value={formData.taskName}
                onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
            </div>

            {/* Assign To Employee Dropdown */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3.5 space-y-2">
              <label className="font-bold text-sky-950 flex items-center gap-1.5 text-xs">
                <User className="h-3.5 w-3.5 text-sky-600" />
                <span>Assign To Employee (Lead Trainer) *</span>
              </label>
              
              <select
                required
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden"
              >
                {allTrainers.map(t => (
                  <option key={t.uid} value={t.uid}>
                    {t.fullName} — {t.employeeId} ({t.subject})
                  </option>
                ))}
              </select>

              {/* Selected Trainer Preview Pill */}
              {selectedAssignee && (
                <div className="flex items-center gap-2.5 pt-1 text-[11px] text-slate-600">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white font-bold text-[10px]">
                    {selectedAssignee.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <span>
                    Selected: <strong className="text-slate-900">{selectedAssignee.fullName}</strong> • Employee ID: <strong className="text-sky-800">{selectedAssignee.employeeId}</strong> • Dept: <strong className="text-slate-700">{selectedAssignee.subject}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Priority Selection: Dropdown + Interactive Quick-Select Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-800 text-xs">
                  Task Priority *
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  Current: <strong className="text-sky-700">{formData.priority}</strong>
                </span>
              </div>

              {/* Quick Select Priority Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { value: 'Low', label: 'Low', color: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100', active: 'border-emerald-600 bg-emerald-100 text-emerald-950 font-bold ring-2 ring-emerald-500/30' },
                  { value: 'Medium', label: 'Medium', color: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100', active: 'border-sky-600 bg-sky-100 text-sky-950 font-bold ring-2 ring-sky-500/30' },
                  { value: 'High', label: 'High', color: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100', active: 'border-amber-600 bg-amber-100 text-amber-950 font-bold ring-2 ring-amber-500/30' },
                  { value: 'Urgent', label: 'Urgent', color: 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100', active: 'border-rose-600 bg-rose-100 text-rose-950 font-bold ring-2 ring-rose-500/30' },
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value as TaskPriority })}
                    className={`rounded-xl border p-2 text-center text-xs transition-all ${
                      formData.priority === p.value ? p.active : p.color
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Priority Standard Dropdown fallback */}
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2 text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Low">Low Priority (Standard maintenance / routine work)</option>
                <option value="Medium">Medium Priority (Standard curriculum & deliverables)</option>
                <option value="High">High Priority (Time-sensitive course milestones)</option>
                <option value="Urgent">Urgent Priority (Critical blockers / immediate deliverable)</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                Task Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Curriculum Development">Curriculum Development & Slide Deck Prep</option>
                <option value="Lab Infrastructure">Lab Infrastructure & Cloud Hands-on Exercises</option>
                <option value="Student Mentorship">Student Mentorship & Doubt Clarification</option>
                <option value="Assessment Review">Assessment Review & Question Bank Creation</option>
                <option value="QA Improvement">QA Improvement & Batch Feedback Analysis</option>
                <option value="Code Review & Grading">Code Review & Student Project Grading</option>
              </select>
            </div>

            {/* Task Description & Scope */}
            <div>
              <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                Deliverable Scope & Task Description *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Outline specific objectives, evaluation criteria, and key artifacts required..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden"
              />
            </div>

            {/* Dates: Assigned Date & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                  Assigned Date
                </label>
                <input
                  type="date"
                  value={formData.assignedDate}
                  onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                  Target Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Manager Remarks & Guidance */}
            <div>
              <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                Manager Remarks & Guidance Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Please coordinate with the QA team once the sandbox environment is ready"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{saving ? 'Assigning Task...' : 'Assign Task to Trainer'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* EDIT / UPDATE TASK PROGRESS MODAL */}
      {/* ========================================================================= */}
      {editingTask && (
        <Modal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          title="Update Task Status & Progress"
          subtitle={`Review or modify execution details for: ${editingTask.taskName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-sky-50/50 p-3 border border-sky-100 space-y-1">
              <div className="font-bold text-slate-900 text-xs">{editingTask.taskName}</div>
              <p className="text-[11px] text-slate-600">{editingTask.description}</p>
              <div className="text-[11px] text-slate-500 pt-1">
                Assignee: <strong>{editingTask.assignedToName}</strong> • Due: <strong>{editingTask.dueDate}</strong>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs">
                Completion Progress ({editProgress}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={editProgress}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setEditProgress(val);
                  if (val === 100) setEditStatus('Completed');
                  else if (val > 0 && editStatus === 'Not Started') setEditStatus('In Progress');
                }}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0% (Not Started)</span>
                <span>50% (In Progress)</span>
                <span>100% (Completed)</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs">
                Execution Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
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
              <label className="font-bold text-slate-800 block mb-1 text-xs">
                Update Remarks / Notes
              </label>
              <textarea
                rows={3}
                placeholder="Enter feedback or progress status notes..."
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEditProgress}
                className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
