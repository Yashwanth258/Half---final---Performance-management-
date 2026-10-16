import React, { useState, useMemo } from 'react';
import { 
  FolderGit2, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  ExternalLink,
  Edit3,
  UserCheck,
  FileCode2,
  Sparkles,
  GitBranch,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ProjectItem, ProjectMilestone, ProjectStage, ProjectStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { PROJECT_STAGES } from '../trainer/ProjectTrackingView';

export const ProjectManagerView: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    projects = [], 
    allTrainers = [], 
    createProject, 
    deleteProject,
    updateProject,
    updateProjectMilestone 
  } = useData();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [trainerFilter, setTrainerFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'SELF_ASSIGNED' | 'OPEN_POOL'

  // Manager Edit Project Modal
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [projectEditForm, setProjectEditForm] = useState({
    projectName: '',
    projectDescription: '',
    assignedTo: '',
    currentStage: 'Planning' as ProjectStage,
    currentStatus: 'On Track' as ProjectStatus,
    deliverables: '',
    repositoryUrl: '',
    remarks: '',
    expectedCompletionDate: '',
  });

  // Manager Edit Milestone Modal
  const [editingMilestone, setEditingMilestone] = useState<{
    project: ProjectItem;
    milestone: any;
  } | null>(null);
  const [milestoneProgress, setMilestoneProgress] = useState(0);
  const [milestoneStatus, setMilestoneStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('Not Started');

  // Dedicated Delete Confirmation Modal State
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const initialCreateForm = {
    projectName: '',
    projectDescription: '',
    assignmentMode: 'specific', // 'specific' | 'open'
    assignedTo: (allTrainers || [])[0]?.uid || '',
    startDate: todayStr,
    expectedCompletionDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    currentStage: 'Architecture & Prototyping' as ProjectStage,
    deliverables: '',
    repositoryUrl: '',
    remarks: '',
  };

  const [createFormData, setCreateFormData] = useState(initialCreateForm);
  const [saving, setSaving] = useState(false);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return (projects || []).filter(p => {
      // Status Filter
      if (statusFilter !== 'ALL' && p.currentStatus !== statusFilter) return false;
      
      // Stage Filter
      if (stageFilter !== 'ALL' && p.currentStage !== stageFilter) return false;
      
      // Trainer Filter
      if (trainerFilter !== 'ALL') {
        if (trainerFilter === 'OPEN') {
          if (p.assignedTo && !p.isOpenForSelfAssignment) return false;
        } else {
          if (p.assignedTo !== trainerFilter && p.assignedToName !== trainerFilter) return false;
        }
      }

      // Mode Filter
      if (modeFilter === 'SELF_ASSIGNED' && !p.isSelfAssigned) return false;
      if (modeFilter === 'OPEN_POOL' && !(!p.assignedTo || p.isOpenForSelfAssignment)) return false;
      if (modeFilter === 'ASSIGNED' && (p.isSelfAssigned || !p.assignedTo || p.isOpenForSelfAssignment)) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          (p.projectName && p.projectName.toLowerCase().includes(q)) ||
          (p.projectDescription && p.projectDescription.toLowerCase().includes(q)) ||
          (p.assignedToName && p.assignedToName.toLowerCase().includes(q)) ||
          (p.assignedToEmployeeId && p.assignedToEmployeeId.toLowerCase().includes(q)) ||
          (p.currentStage && p.currentStage.toLowerCase().includes(q)) ||
          (p.deliverables && p.deliverables.toLowerCase().includes(q)) ||
          (p.remarks && p.remarks.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [projects, statusFilter, stageFilter, trainerFilter, modeFilter, searchQuery]);

  // Executive KPI Summary Counts
  const totalProjectsCount = (projects || []).length;
  const completedProjectsCount = (projects || []).filter(p => p.currentStatus === 'Completed' || p.overallCompletionPercentage >= 100).length;
  const activeDevProjectsCount = (projects || []).filter(p => 
    p.currentStage === 'Architecture & Prototyping' || 
    p.currentStage === 'Development' || 
    p.currentStage === 'Design' ||
    p.currentStage === 'Testing'
  ).length;
  const selfAssignedCount = (projects || []).filter(p => p.isSelfAssigned).length;
  const openPoolCount = (projects || []).filter(p => !p.assignedTo || p.isOpenForSelfAssignment).length;

  // Handle Project Creation by Manager
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    try {
      const isOpen = createFormData.assignmentMode === 'open';
      const assignee = isOpen ? null : allTrainers.find(t => t.uid === createFormData.assignedTo);

      const defaultMilestones: ProjectMilestone[] = PROJECT_STAGES.map((st, idx) => ({
        id: `ms_${Date.now()}_${idx}`,
        projectId: '',
        title: `${st} Deliverable`,
        stage: st,
        status: idx === 0 ? 'In Progress' : 'Not Started',
        progress: idx === 0 ? 30 : 0,
        order: idx + 1,
      }));

      await createProject({
        projectName: createFormData.projectName,
        projectDescription: createFormData.projectDescription,
        assignedTo: isOpen ? '' : (assignee?.uid || ''),
        assignedToName: isOpen ? 'Open for Self-Assignment' : (assignee?.fullName || 'Assigned Trainer'),
        assignedToEmployeeId: isOpen ? 'OPEN-POOL' : (assignee?.employeeId || 'EMP-TR'),
        managerId: userProfile.uid,
        managerName: userProfile.fullName,
        teamId: assignee?.teamId || 'team-genai',
        startDate: createFormData.startDate,
        expectedCompletionDate: createFormData.expectedCompletionDate,
        currentStage: createFormData.currentStage || 'Architecture & Prototyping',
        currentStatus: 'On Track',
        overallCompletionPercentage: 10,
        deliverables: createFormData.deliverables,
        repositoryUrl: createFormData.repositoryUrl,
        remarks: createFormData.remarks,
        isOpenForSelfAssignment: isOpen,
        isSelfAssigned: false,
        milestones: defaultMilestones,
      });

      setIsCreateModalOpen(false);
      setCreateFormData(initialCreateForm);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal for Manager
  const handleOpenEditProject = (project: ProjectItem) => {
    setEditingProject(project);
    setProjectEditForm({
      projectName: project.projectName || '',
      projectDescription: project.projectDescription || '',
      assignedTo: project.assignedTo || '',
      currentStage: project.currentStage || 'Planning',
      currentStatus: project.currentStatus || 'On Track',
      deliverables: project.deliverables || '',
      repositoryUrl: project.repositoryUrl || '',
      remarks: project.remarks || '',
      expectedCompletionDate: project.expectedCompletionDate || '',
    });
  };

  // Save Project Changes
  const handleSaveProjectEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSaving(true);
    try {
      const assignee = allTrainers.find(t => t.uid === projectEditForm.assignedTo);
      const isNowOpen = !projectEditForm.assignedTo || projectEditForm.assignedTo === 'OPEN';

      await updateProject(editingProject.id, {
        projectName: projectEditForm.projectName,
        projectDescription: projectEditForm.projectDescription,
        assignedTo: isNowOpen ? '' : (assignee?.uid || editingProject.assignedTo),
        assignedToName: isNowOpen ? 'Open for Self-Assignment' : (assignee?.fullName || editingProject.assignedToName),
        assignedToEmployeeId: isNowOpen ? 'OPEN-POOL' : (assignee?.employeeId || editingProject.assignedToEmployeeId),
        isOpenForSelfAssignment: isNowOpen,
        currentStage: projectEditForm.currentStage,
        currentStatus: projectEditForm.currentStatus,
        deliverables: projectEditForm.deliverables,
        repositoryUrl: projectEditForm.repositoryUrl,
        remarks: projectEditForm.remarks,
        expectedCompletionDate: projectEditForm.expectedCompletionDate,
      });
      setEditingProject(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Open Milestone Edit for Manager
  const handleOpenMilestoneEdit = (project: ProjectItem, milestone: any) => {
    setEditingMilestone({ project, milestone });
    setMilestoneProgress(milestone.progress || 0);
    setMilestoneStatus(milestone.status || 'Not Started');
  };

  // Save Milestone Changes
  const handleSaveMilestoneEdit = async () => {
    if (!editingMilestone) return;
    setSaving(true);
    try {
      await updateProjectMilestone(
        editingMilestone.project.id,
        editingMilestone.milestone.id,
        milestoneProgress,
        milestoneStatus
      );
      setEditingMilestone(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Perform Project Deletion
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatLastUpdated = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins} mins ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr.split('T')[0];
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 border border-sky-200/80 mb-1.5">
            <FolderGit2 className="h-3.5 w-3.5 text-sky-600" />
            Manager Portfolio Governance & Trainer Progress Sync
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Project Portfolio & 9-Stage Milestone Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time reflection of trainer-entered milestone stages, code deliverables, repository artifacts, and progress updates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-500 shadow-sky-600/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Publish / Assign New Project</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Total Projects</span>
            <FolderGit2 className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalProjectsCount}</p>
          <span className="text-2xs text-slate-400">All portfolio initiatives</span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-purple-700">Active Development</span>
            <GitBranch className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple-900">{activeDevProjectsCount}</p>
          <span className="text-2xs text-purple-600">Stages 04-07 in progress</span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{completedProjectsCount}</p>
          <span className="text-2xs text-emerald-600">100% stage signoff</span>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-indigo-700">Trainer Self-Assigned</span>
            <UserCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-900">{selfAssignedCount}</p>
          <span className="text-2xs text-indigo-600">Trainer-led innovation</span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-amber-800">Open Pool</span>
            <Layers className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">{openPoolCount}</p>
          <span className="text-2xs text-amber-600">Available for self-assignment</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, trainer name, employee ID, stage, or deliverables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-9 pr-3 py-2 text-xs focus:bg-white focus:border-sky-500 focus:outline-hidden"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
        >
          <option value="ALL">All Health Statuses</option>
          <option value="On Track">On Track</option>
          <option value="At Risk">At Risk</option>
          <option value="Delayed">Delayed</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Stage Filter */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
        >
          <option value="ALL">All 9 Stages</option>
          {PROJECT_STAGES.map((st, idx) => (
            <option key={st} value={st}>0{idx + 1}. {st}</option>
          ))}
        </select>

        {/* Trainer Assignee Filter */}
        <select
          value={trainerFilter}
          onChange={(e) => setTrainerFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
        >
          <option value="ALL">All Lead Trainers</option>
          <option value="OPEN">Open Pool (Unassigned)</option>
          {allTrainers.map(t => (
            <option key={t.uid} value={t.uid}>{t.fullName} ({t.employeeId})</option>
          ))}
        </select>

        {/* Mode Filter */}
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/40 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
        >
          <option value="ALL">All Assignment Modes</option>
          <option value="ASSIGNED">Direct Manager Assigned</option>
          <option value="SELF_ASSIGNED">Trainer Self-Assigned</option>
          <option value="OPEN_POOL">Open for Self-Assignment</option>
        </select>
      </div>

      {/* Projects List */}
      <div className="space-y-5">
        {filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-sky-100 bg-white p-12 text-center shadow-xs">
            <FolderGit2 className="mx-auto h-10 w-10 text-sky-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No projects found matching the filter criteria
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Try adjusting your search query, stage filter, or status filter, or publish a new project above.
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const milestones = project.milestones || [];
            const isOpenPool = !project.assignedTo || project.isOpenForSelfAssignment;

            return (
              <div
                key={project.id}
                className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs hover:border-sky-300/80 transition-all"
              >
                {/* Project Main Card Content */}
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="space-y-2.5 flex-1">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-base font-bold text-slate-900">
                          {project.projectName}
                        </h2>
                        
                        <StatusBadge type="projectStatus" value={project.currentStatus} size="sm" />
                        
                        {/* Live Active Stage Display */}
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 border border-sky-200">
                          <Layers className="h-3.5 w-3.5 text-sky-600" />
                          Active Stage: {project.currentStage}
                        </span>

                        {project.isSelfAssigned && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                            <UserCheck className="h-3 w-3" />
                            Self-Assigned by Trainer
                          </span>
                        )}

                        {isOpenPool && (
                          <span className="rounded-lg bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                            Open for Self-Assignment
                          </span>
                        )}

                        {/* Last Updated Timestamp from Trainer */}
                        <span className="text-[11px] font-medium text-slate-400 ml-auto flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Trainer updated: <strong>{formatLastUpdated(project.updatedAt)}</strong>
                        </span>
                      </div>

                      {/* Project Scope / Description */}
                      <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
                        {project.projectDescription}
                      </p>

                      {/* Assignee & Dates Details Strip */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-800">
                            {(project.assignedToName || 'OP').slice(0, 2).toUpperCase()}
                          </div>
                          <span>Lead: <strong>{project.assignedToName}</strong> {project.assignedToEmployeeId ? `(${project.assignedToEmployeeId})` : ''}</span>
                        </div>

                        <span className="text-slate-400">•</span>
                        <span>📅 Start: <strong>{project.startDate}</strong></span>
                        <span className="text-slate-400">•</span>
                        <span>🎯 Target: <strong>{project.expectedCompletionDate}</strong></span>
                      </div>

                      {/* Deliverables & Repository Links */}
                      {(project.deliverables || project.repositoryUrl) && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                          {project.deliverables && (
                            <div className="rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200 text-slate-700 flex items-center gap-1.5">
                              <FileCode2 className="h-3.5 w-3.5 text-slate-500" />
                              <span>Deliverables: <strong className="text-slate-900">{project.deliverables}</strong></span>
                            </div>
                          )}

                          {project.repositoryUrl && (
                            <a
                              href={project.repositoryUrl.startsWith('http') ? project.repositoryUrl : `https://${project.repositoryUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors"
                            >
                              <GitBranch className="h-3.5 w-3.5 text-sky-600" />
                              <span>View Code Repository</span>
                              <ExternalLink className="h-3 w-3 text-sky-600" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Trainer Remarks & Implementation Notes */}
                      {project.remarks && (
                        <div className="mt-2 rounded-xl bg-purple-50/50 border border-purple-100 p-3 text-xs text-purple-950">
                          <div className="flex items-center gap-1.5 font-bold text-purple-800 mb-0.5 text-[11px]">
                            <Info className="h-3.5 w-3.5 text-purple-600" />
                            Trainer Implementation Remarks & Status Notes:
                          </div>
                          <p className="text-slate-700 italic leading-relaxed pl-5">
                            "{project.remarks}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Hand Metric Block & Manager Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 min-w-[200px]">
                      <div className="text-right w-full">
                        <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Overall Milestone Progress</span>
                        <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                          <span className="text-2xl font-extrabold text-sky-600">
                            {project.overallCompletionPercentage}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-sky-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-600 transition-all duration-500"
                            style={{ width: `${project.overallCompletionPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Manager Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProject(project)}
                          className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-50 shadow-2xs transition-colors"
                          title="Review or Edit Project Details"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-sky-600" />
                          <span>Review & Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                          title={isExpanded ? 'Hide 9 Stages' : 'View 9 Stages Breakdown'}
                        >
                          <span>{isExpanded ? 'Hide' : '9 Stages'}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setProjectToDelete(project)}
                          className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="Delete Project"
                          aria-label={`Delete ${project.projectName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 9-Stage Milestone Governance Stepper */}
                  <div className="mt-6 pt-5 border-t border-sky-50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-950">
                        {project.projectName} • 9-Stage Governance Pipeline
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Current Development Stage: <strong className="text-sky-700">{project.currentStage}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                      {PROJECT_STAGES.map((stageName, idx) => {
                        const m = milestones.find(item => item.stage === stageName || (item as any).stageName === stageName);
                        const isDone = m?.status === 'Completed' || (m?.progress || 0) === 100;
                        const isCurrent = m?.status === 'In Progress' || project.currentStage === stageName;

                        return (
                          <div
                            key={stageName}
                            className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
                              isDone
                                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                                : isCurrent
                                ? 'border-sky-400 bg-sky-100/90 text-sky-950 font-bold shadow-xs ring-1 ring-sky-400'
                                : 'border-sky-100 bg-sky-50/30 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-75">
                              <span>0{idx + 1}</span>
                              {isDone && <Check className="h-3 w-3 text-emerald-600" />}
                            </div>
                            <div className="truncate mt-1 font-semibold text-[11px]" title={stageName}>
                              {stageName}
                            </div>
                            <div className="mt-1 text-[10px] font-bold">
                              {isDone ? 'Completed (100%)' : isCurrent ? `${m?.progress || 50}% In Progress` : 'Not Started'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Milestone Breakdown Table for Manager */}
                {isExpanded && (
                  <div className="border-t border-sky-100 bg-sky-50/30 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Stage-by-Stage Milestone Governance ({project.projectName})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Review trainer completion percentages, deliverables, and verify stage progress
                        </p>
                      </div>

                      <span className="text-xs text-sky-800 font-semibold">
                        Overall Calculated Progress: {project.overallCompletionPercentage}%
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-sky-100 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-sky-100 bg-sky-50/80 font-bold text-sky-950">
                          <tr>
                            <th className="px-4 py-3">Stage #</th>
                            <th className="px-4 py-3">Stage Name</th>
                            <th className="px-4 py-3">Target Completion</th>
                            <th className="px-4 py-3">Health / Status</th>
                            <th className="px-4 py-3">Progress</th>
                            <th className="px-4 py-3 text-right">Manager Governance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-50">
                          {PROJECT_STAGES.map((stageName, idx) => {
                            const m = milestones.find(item => item.stage === stageName || (item as any).stageName === stageName) || {
                              id: `temp_${idx}`,
                              projectId: project.id,
                              title: `${stageName} Deliverables`,
                              stage: stageName,
                              progress: project.currentStage === stageName ? 50 : 0,
                              status: (project.currentStage === stageName ? 'In Progress' : 'Not Started') as any,
                              order: idx + 1,
                            };

                            const isDone = m.status === 'Completed' || m.progress === 100;

                            return (
                              <tr key={stageName} className="hover:bg-sky-50/40 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-400">
                                  0{idx + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-bold text-slate-900">{stageName}</div>
                                  <div className="text-[11px] text-slate-400">{m.title || `${stageName} Deliverables`}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {m.dueDate || project.expectedCompletionDate}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                      isDone
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : m.status === 'In Progress'
                                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {m.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-24 rounded-full bg-sky-100 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                        style={{ width: `${m.progress}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-slate-700">{m.progress}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMilestoneEdit(project, m)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                                  >
                                    <Edit3 className="h-3 w-3 text-sky-600" />
                                    <span>Adjust Stage</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Publish / Assign Project Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Publish / Assign Curriculum Project"
          subtitle="Set up standard 9-stage milestone governance for direct assignment or trainer self-assignment"
        >
          <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. NextGen Microservices & Cloud Native Lab Infrastructure"
                value={createFormData.projectName}
                onChange={(e) => setCreateFormData({ ...createFormData, projectName: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Project Scope & Technical Objectives *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Specify curriculum objectives, architecture requirements, and milestone expectations..."
                value={createFormData.projectDescription}
                onChange={(e) => setCreateFormData({ ...createFormData, projectDescription: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Assignment Mode *
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setCreateFormData({ ...createFormData, assignmentMode: 'specific' })}
                  className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                    createFormData.assignmentMode === 'specific'
                      ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-2xs font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Assign to Specific Trainer
                </button>
                <button
                  type="button"
                  onClick={() => setCreateFormData({ ...createFormData, assignmentMode: 'open' })}
                  className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                    createFormData.assignmentMode === 'open'
                      ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-2xs font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Open for Trainer Self-Assignment
                </button>
              </div>

              {createFormData.assignmentMode === 'specific' && (
                <select
                  value={createFormData.assignedTo}
                  onChange={(e) => setCreateFormData({ ...createFormData, assignedTo: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                >
                  {allTrainers.map(t => (
                    <option key={t.uid} value={t.uid}>
                      {t.fullName} ({t.employeeId} - {t.subject})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={createFormData.startDate}
                  onChange={(e) => setCreateFormData({ ...createFormData, startDate: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Target Completion Date *
                </label>
                <input
                  type="date"
                  required
                  value={createFormData.expectedCompletionDate}
                  onChange={(e) => setCreateFormData({ ...createFormData, expectedCompletionDate: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Initial Development Stage
              </label>
              <select
                value={createFormData.currentStage}
                onChange={(e) => setCreateFormData({ ...createFormData, currentStage: e.target.value as ProjectStage })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                {PROJECT_STAGES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Deliverables & Documentation Targets
              </label>
              <input
                type="text"
                placeholder="e.g. Terraform configs, Postman collections, Docker Compose scripts..."
                value={createFormData.deliverables}
                onChange={(e) => setCreateFormData({ ...createFormData, deliverables: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50"
              >
                {saving ? 'Publishing...' : 'Publish / Assign Project'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Review & Edit Project Modal */}
      {editingProject && (
        <Modal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          title="Review & Edit Project Governance"
          subtitle={`Inspect trainer updates and modify specifications for: ${editingProject.projectName}`}
        >
          <form onSubmit={handleSaveProjectEdits} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={projectEditForm.projectName}
                onChange={(e) => setProjectEditForm({ ...projectEditForm, projectName: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Project Scope & Objectives *
              </label>
              <textarea
                rows={3}
                required
                value={projectEditForm.projectDescription}
                onChange={(e) => setProjectEditForm({ ...projectEditForm, projectDescription: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lead Trainer Assignment
                </label>
                <select
                  value={projectEditForm.assignedTo || 'OPEN'}
                  onChange={(e) => setProjectEditForm({ ...projectEditForm, assignedTo: e.target.value === 'OPEN' ? '' : e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                >
                  <option value="OPEN">Open Pool (Trainer Self-Assignment)</option>
                  {allTrainers.map(t => (
                    <option key={t.uid} value={t.uid}>{t.fullName} ({t.employeeId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={projectEditForm.expectedCompletionDate}
                  onChange={(e) => setProjectEditForm({ ...projectEditForm, expectedCompletionDate: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Active Development Stage *
                </label>
                <select
                  value={projectEditForm.currentStage}
                  onChange={(e) => setProjectEditForm({ ...projectEditForm, currentStage: e.target.value as ProjectStage })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                >
                  {PROJECT_STAGES.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Project Health Status *
                </label>
                <select
                  value={projectEditForm.currentStatus}
                  onChange={(e) => setProjectEditForm({ ...projectEditForm, currentStatus: e.target.value as ProjectStatus })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                >
                  <option value="On Track">On Track</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Artifacts & Key Deliverables
              </label>
              <input
                type="text"
                value={projectEditForm.deliverables}
                onChange={(e) => setProjectEditForm({ ...projectEditForm, deliverables: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Code Repository URL (GitHub, GitLab, etc.)
              </label>
              <input
                type="text"
                placeholder="https://github.com/org/repo"
                value={projectEditForm.repositoryUrl}
                onChange={(e) => setProjectEditForm({ ...projectEditForm, repositoryUrl: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Trainer Remarks / Manager Review Notes
              </label>
              <textarea
                rows={2}
                value={projectEditForm.remarks}
                onChange={(e) => setProjectEditForm({ ...projectEditForm, remarks: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Project Details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stage Governance Modal */}
      {editingMilestone && (
        <Modal
          isOpen={!!editingMilestone}
          onClose={() => setEditingMilestone(null)}
          title={`Adjust Stage: ${editingMilestone.milestone.stage || (editingMilestone.milestone as any).stageName}`}
          subtitle={`${editingMilestone.project.projectName} • Lead: ${editingMilestone.project.assignedToName}`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Stage Status *
              </label>
              <select
                value={milestoneStatus}
                onChange={(e) => setMilestoneStatus(e.target.value as any)}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Stage Completion Percentage</span>
                <span className="text-sky-600 font-bold text-sm">{milestoneProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={milestoneProgress}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMilestoneProgress(val);
                  if (val === 100) setMilestoneStatus('Completed');
                  else if (val > 0 && milestoneStatus === 'Not Started') setMilestoneStatus('In Progress');
                }}
                className="w-full accent-sky-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setEditingMilestone(null)}
                className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveMilestoneEdit}
                className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Stage'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <Modal
          isOpen={!!projectToDelete}
          onClose={() => !isDeleting && setProjectToDelete(null)}
          title="Delete Project Portfolio Item"
          subtitle="Manager Governance Action"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-950">
                  Are you sure you want to permanently delete this project?
                </p>
                <p className="text-rose-800 leading-relaxed">
                  Project: <strong>"{projectToDelete.projectName}"</strong>
                  {projectToDelete.assignedToName && (
                    <span> assigned to <strong>{projectToDelete.assignedToName}</strong></span>
                  )}
                </p>
                <p className="text-[11px] text-rose-700">
                  This will remove all 9-stage governance milestones, progress logs, and repository links from both manager and trainer portals.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-sky-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProjectToDelete(null)}
                className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteProject}
                className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 shadow-xs shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
