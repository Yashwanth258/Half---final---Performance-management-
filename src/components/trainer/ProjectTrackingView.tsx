import React, { useState } from 'react';
import { 
  FolderGit2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  AlertCircle,
  Edit2,
  Plus,
  UserCheck,
  ExternalLink,
  FileText,
  BookmarkPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ProjectItem, ProjectMilestone, ProjectStage, ProjectStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';

export const PROJECT_STAGES: ProjectStage[] = [
  'Planning',
  'Research',
  'Requirement Analysis',
  'Design',
  'Architecture & Prototyping',
  'Development',
  'Testing',
  'Deployment',
  'Completed',
];

export const ProjectTrackingView: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    projects = [], 
    updateProjectMilestone, 
    updateProject, 
    createProject 
  } = useData();

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  
  // Milestone Progress Modal
  const [selectedMilestone, setSelectedMilestone] = useState<{
    project: ProjectItem;
    milestone: any;
  } | null>(null);
  const [milestoneProgress, setMilestoneProgress] = useState(0);
  const [milestoneStatus, setMilestoneStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('Not Started');
  
  // Project Details Edit Modal
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [projectEditForm, setProjectEditForm] = useState({
    projectName: '',
    projectDescription: '',
    currentStage: 'Planning' as ProjectStage,
    currentStatus: 'On Track' as ProjectStatus,
    deliverables: '',
    repositoryUrl: '',
    remarks: '',
  });

  // Self-Create Project Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [newProjectForm, setNewProjectForm] = useState({
    projectName: '',
    projectDescription: '',
    startDate: todayStr,
    expectedCompletionDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    currentStage: 'Architecture & Prototyping' as ProjectStage,
    deliverables: '',
    repositoryUrl: '',
    remarks: '',
  });

  const [saving, setSaving] = useState(false);

  // My assigned/active projects
  const myProjects = userProfile 
    ? (projects || []).filter(p => p.assignedTo === userProfile.uid) 
    : [];

  // Available/Open projects created by manager that can be self-assigned
  const openProjects = (projects || []).filter(p => 
    !p.assignedTo || 
    p.isOpenForSelfAssignment || 
    p.assignedTo === ''
  );

  // Handle Quick Self-Assignment to an Open Project
  const handleSelfAssign = async (project: ProjectItem) => {
    if (!userProfile) return;
    setSaving(true);
    try {
      await updateProject(project.id, {
        assignedTo: userProfile.uid,
        assignedToName: userProfile.fullName,
        assignedToEmployeeId: userProfile.employeeId,
        isSelfAssigned: true,
        isOpenForSelfAssignment: false,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Open Project Details Editor
  const handleOpenProjectEdit = (project: ProjectItem) => {
    setEditingProject(project);
    setProjectEditForm({
      projectName: project.projectName || '',
      projectDescription: project.projectDescription || '',
      currentStage: project.currentStage || 'Planning',
      currentStatus: project.currentStatus || 'On Track',
      deliverables: project.deliverables || '',
      repositoryUrl: project.repositoryUrl || '',
      remarks: project.remarks || '',
    });
  };

  // Save Project Details
  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSaving(true);
    try {
      await updateProject(editingProject.id, {
        projectName: projectEditForm.projectName,
        projectDescription: projectEditForm.projectDescription,
        currentStage: projectEditForm.currentStage,
        currentStatus: projectEditForm.currentStatus,
        deliverables: projectEditForm.deliverables,
        repositoryUrl: projectEditForm.repositoryUrl,
        remarks: projectEditForm.remarks,
      });
      setEditingProject(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle Self-Initiated Project Creation
  const handleCreateSelfProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    try {
      const defaultMilestones: ProjectMilestone[] = PROJECT_STAGES.map((st, idx) => ({
        id: `ms_${Date.now()}_${idx}`,
        projectId: '',
        title: `${st} Deliverables`,
        stage: st,
        status: idx === 0 ? 'In Progress' : 'Not Started',
        progress: idx === 0 ? 30 : 0,
        order: idx + 1,
      }));

      await createProject({
        projectName: newProjectForm.projectName,
        projectDescription: newProjectForm.projectDescription,
        startDate: newProjectForm.startDate,
        expectedCompletionDate: newProjectForm.expectedCompletionDate,
        currentStage: newProjectForm.currentStage,
        overallCompletionPercentage: 10,
        currentStatus: 'On Track',
        managerId: userProfile.managerId || 'mgr-enterprise-01',
        managerName: userProfile.managerName || 'Curriculum Director',
        assignedTo: userProfile.uid,
        assignedToName: userProfile.fullName,
        assignedToEmployeeId: userProfile.employeeId,
        teamId: userProfile.teamId || 'team-frontend',
        deliverables: newProjectForm.deliverables,
        repositoryUrl: newProjectForm.repositoryUrl,
        remarks: newProjectForm.remarks,
        isSelfAssigned: true,
        milestones: defaultMilestones,
      });

      setIsCreateModalOpen(false);
      setNewProjectForm({
        projectName: '',
        projectDescription: '',
        startDate: todayStr,
        expectedCompletionDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
        currentStage: 'Architecture & Prototyping',
        deliverables: '',
        repositoryUrl: '',
        remarks: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMilestoneEdit = (project: ProjectItem, milestone: any) => {
    setSelectedMilestone({ project, milestone });
    setMilestoneProgress(milestone.progress || 0);
    setMilestoneStatus(milestone.status);
  };

  const handleSaveMilestone = async () => {
    if (!selectedMilestone) return;
    setSaving(true);
    try {
      await updateProjectMilestone(
        selectedMilestone.project.id,
        selectedMilestone.milestone.id,
        milestoneProgress,
        milestoneStatus
      );
      setSelectedMilestone(null);
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
            Project Management & 9-Stage Milestone Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized lifecycle progression across Planning, Research, Requirement Analysis, Design, Architecture & Prototyping, Development, Testing, Deployment, and Completion
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Propose / Self-Assign Project</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">My Active Projects</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{myProjects.length}</span>
            <span className="text-xs font-semibold text-sky-600">Assigned / Self-Assigned</span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Milestone Progress</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-sky-700">
              {myProjects.length > 0
                ? `${Math.round(myProjects.reduce((s, p) => s + (p.overallCompletionPercentage || 0), 0) / myProjects.length)}%`
                : '0%'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {myProjects.length === 0 ? '0% (No Active Project)' : 'Weighted Milestone %'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Open Project Pool</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-700">{openProjects.length}</span>
            <span className="text-xs font-semibold text-purple-600">Available for Self-Assignment</span>
          </div>
        </div>
      </div>

      {/* Open Projects for Self-Assignment (if any) */}
      {openProjects.length > 0 && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <BookmarkPlus className="h-5 w-5 text-purple-700" />
            <div>
              <h2 className="text-sm font-bold text-purple-950">
                Open Projects Available for Self-Assignment
              </h2>
              <p className="text-xs text-purple-700">
                Managers have published the following initiatives. You can self-assign yourself to lead execution.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {openProjects.map(proj => (
              <div key={proj.id} className="rounded-xl border border-purple-200 bg-white p-4 text-xs shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900">{proj.projectName}</h3>
                    <p className="text-slate-600 line-clamp-2">{proj.projectDescription}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>Stage: <strong>{proj.currentStage}</strong></span>
                      <span>Target: <strong>{proj.expectedCompletionDate}</strong></span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSelfAssign(proj)}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 font-semibold text-white hover:bg-purple-500 shrink-0"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Assign Myself</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Projects List */}
      <div className="space-y-6">
        {myProjects.length === 0 ? (
          <div className="rounded-2xl border border-sky-100 bg-white p-12 text-center shadow-xs">
            <FolderGit2 className="mx-auto h-10 w-10 text-sky-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No active projects currently undertaken
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Milestone progress score is currently <strong>0%</strong> because you are not undertaking any active project. You can self-assign from the open pool or propose a new curriculum project above.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                <Plus className="h-4 w-4" />
                <span>Propose / Create Project</span>
              </button>
            </div>
          </div>
        ) : (
          myProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const milestones = project.milestones || [];

            return (
              <div
                key={project.id}
                className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs"
              >
                {/* Project Overview Card */}
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-base font-bold text-slate-900">
                          {project.projectName}
                        </h2>
                        <StatusBadge type="projectStatus" value={project.currentStatus} size="sm" />
                        {project.isSelfAssigned && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                            Self-Assigned
                          </span>
                        )}
                        {/* Current Stage Development Display with Project Title */}
                        <span className="rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
                          Current Stage: {project.currentStage}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                        {project.projectDescription}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 font-medium">
                        <span>📅 Start: {project.startDate}</span>
                        <span>🎯 Target: {project.expectedCompletionDate}</span>
                        <span>👤 Manager: {project.managerName}</span>
                        {project.deliverables && (
                          <span className="text-slate-700">📦 Deliverables: <strong>{project.deliverables}</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 min-w-[280px]">
                      <div className="w-full">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-600">Overall Milestone Progress</span>
                          <span className="text-sky-600 font-bold">{project.overallCompletionPercentage}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-sky-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-500"
                            style={{ width: `${project.overallCompletionPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProjectEdit(project)}
                          className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50 transition-colors shadow-2xs"
                          title="Enter / Edit Project Details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                          className="flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide' : '9 Stages'}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 9 Stage Stepper Overview */}
                  <div className="mt-6 pt-5 border-t border-sky-50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">
                        {project.projectName} • 9-Stage Governance Pipeline
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Active Development Stage: <strong className="text-sky-700">{project.currentStage}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                      {PROJECT_STAGES.map((stageName, idx) => {
                        const m = milestones.find(item => item.stage === stageName || (item as any).stageName === stageName);
                        const isCompleted = m?.status === 'Completed' || (m?.progress || 0) === 100;
                        const isCurrent = project.currentStage === stageName;

                        return (
                          <div
                            key={stageName}
                            className={`rounded-xl p-2.5 text-center text-xs transition-all border ${
                              isCompleted
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold'
                                : isCurrent
                                ? 'border-sky-400 bg-sky-100/90 text-sky-950 font-bold shadow-xs ring-1 ring-sky-400'
                                : 'border-sky-100 bg-sky-50/30 text-slate-500'
                            }`}
                          >
                            <div className="text-[10px] opacity-70">Stage 0{idx + 1}</div>
                            <div className="truncate mt-0.5 font-medium text-[11px]">{stageName}</div>
                            <div className="mt-1 text-[10px] font-bold">
                              {m ? `${m.progress}%` : (isCurrent ? '50%' : '0%')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Milestone Table */}
                {isExpanded && (
                  <div className="border-t border-sky-100 bg-sky-50/20 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Stage Milestone Breakdown & Deliverable Management
                      </h3>
                      <span className="text-xs text-slate-500">
                        Click 'Update' on any stage to adjust progress percentage and completion status
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-sky-100 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-sky-100 bg-sky-50/80 font-bold text-sky-950">
                          <tr>
                            <th className="px-4 py-3">Stage #</th>
                            <th className="px-4 py-3">Stage Name</th>
                            <th className="px-4 py-3">Target Completion</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Progress</th>
                            <th className="px-4 py-3 text-right">Update Stage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-50">
                          {PROJECT_STAGES.map((stageName, idx) => {
                            const m = milestones.find(item => item.stage === stageName || (item as any).stageName === stageName) || {
                              id: `temp_${idx}`,
                              projectId: project.id,
                              title: `${stageName} Deliverable`,
                              stage: stageName,
                              progress: project.currentStage === stageName ? 50 : 0,
                              status: (project.currentStage === stageName ? 'In Progress' : 'Not Started') as any,
                              order: idx + 1,
                            };

                            return (
                              <tr key={stageName} className="hover:bg-sky-50/40 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-500">
                                  0{idx + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-bold text-slate-900">{stageName}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {m.dueDate || project.expectedCompletionDate}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                      m.status === 'Completed'
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
                                        className="h-full rounded-full bg-sky-500"
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
                                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50/60 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>Update Progress</span>
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

      {/* Project Details & Access Editor Modal */}
      {editingProject && (
        <Modal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          title="Edit Project Details & Deliverables"
          subtitle={`Update specifications and stage progression for: ${editingProject.projectName}`}
        >
          <form onSubmit={handleSaveProjectDetails} className="space-y-4 text-xs">
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
                Artifacts & Key Deliverables (Repos, Documentation, Links)
              </label>
              <input
                type="text"
                placeholder="e.g. GitHub repo link, test suite reports, PR review links..."
                value={projectEditForm.deliverables}
                onChange={(e) => setProjectEditForm({ ...projectEditForm, deliverables: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Instructor Remarks & Implementation Notes
              </label>
              <textarea
                rows={2}
                placeholder="Notes on current challenges, sprint blockers, or upcoming milestones..."
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
                className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {saving ? 'Saving Details...' : 'Save Project Details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Propose / Self-Initiate Project Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Propose / Self-Assign New Project"
          subtitle="Initiate a curriculum innovation or lab project with 9-stage governance"
        >
          <form onSubmit={handleCreateSelfProject} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Distributed Database Virtual Lab & Benchmarking Harness"
                value={newProjectForm.projectName}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, projectName: e.target.value })}
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
                placeholder="Describe project objectives, curriculum outcomes, and planned technical architecture..."
                value={newProjectForm.projectDescription}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, projectDescription: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newProjectForm.startDate}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
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
                  value={newProjectForm.expectedCompletionDate}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, expectedCompletionDate: e.target.value })}
                  className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Starting Stage
              </label>
              <select
                value={newProjectForm.currentStage}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, currentStage: e.target.value as ProjectStage })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                {PROJECT_STAGES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
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
                className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {saving ? 'Initiating...' : 'Self-Assign & Initiate'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Milestone Edit Modal */}
      {selectedMilestone && (
        <Modal
          isOpen={!!selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          title={`Update Stage: ${selectedMilestone.milestone.stage || (selectedMilestone.milestone as any).stageName}`}
          subtitle={`${selectedMilestone.project.projectName}`}
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
                onClick={() => setSelectedMilestone(null)}
                className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveMilestone}
                className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update Stage Progress'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
