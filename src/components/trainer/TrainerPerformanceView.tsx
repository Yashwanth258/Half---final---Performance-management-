import React, { useMemo } from 'react';
import { 
  Award, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  BarChart2, 
  Info,
  Clock,
  Layers,
  FileCheck2,
  Calculator,
  FolderGit2,
  HeartHandshake,
  Users,
  Share2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../common/StatusBadge';
import { 
  calculateAdditionalDutiesWork,
  calculateHolisticGuidanceMetrics,
  calculateWorkEffortBreakdown
} from '../../lib/performanceEngine';
import { WorkEffortPieChart } from '../common/WorkEffortPieChart';

export const TrainerPerformanceView: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    dailyUpdates = [],
    tasks = [],
    projects = [],
    userHolisticContributions = []
  } = useData();

  // Holistic Mentorship & Peer Enablement Metrics (Calculated Separately)
  const holisticMetrics = useMemo(() => {
    return calculateHolisticGuidanceMetrics(userHolisticContributions);
  }, [userHolisticContributions]);

  const myUpdates = useMemo(() => {
    if (!userProfile) return [];
    return (dailyUpdates || []).filter(u => {
      if (u.userId && u.userId === userProfile.uid) return true;
      if (userProfile.employeeId && u.employeeId && u.employeeId.toUpperCase() === userProfile.employeeId.toUpperCase()) return true;
      if (userProfile.companyEmail && ((u as any).userEmail || (u as any).email || (u as any).companyEmail) && ((u as any).userEmail || (u as any).email || (u as any).companyEmail).toLowerCase() === userProfile.companyEmail.toLowerCase()) return true;
      if (userProfile.fullName && u.employeeName && u.employeeName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) return true;
      return false;
    });
  }, [dailyUpdates, userProfile]);

  const myTasks = useMemo(() => {
    return userProfile ? (tasks || []).filter(t => t.assignedTo === userProfile.uid) : [];
  }, [tasks, userProfile]);

  const myProjects = useMemo(() => {
    return userProfile ? (projects || []).filter(p => p.assignedTo === userProfile.uid) : [];
  }, [projects, userProfile]);

  // Additional Duty Calculation for trainer
  const additionalDutiesCalc = useMemo(() => {
    return calculateAdditionalDutiesWork(myUpdates);
  }, [myUpdates]);

  // Average milestone progress across active projects
  const avgMilestoneProgress = useMemo(() => {
    if (myProjects.length === 0) return 0;
    const total = myProjects.reduce((acc, p) => acc + (p.overallCompletionPercentage || 0), 0);
    return Math.round(total / myProjects.length);
  }, [myProjects]);

  // Work effort and extra hours breakdown for the pie graph
  const workEffortBreakdown = useMemo(() => {
    return calculateWorkEffortBreakdown(myUpdates, userHolisticContributions);
  }, [myUpdates, userHolisticContributions]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            My Performance & Effort Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Activity telemetry covering additional duties, project milestone governance, and work effort distribution
          </p>
        </div>
      </div>

      {/* Additional Tasks & Project Math Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Additional Tasks & Paper Evaluation Work Calculation */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-5 w-5 text-purple-700" />
            <div>
              <h3 className="text-sm font-bold text-purple-950">
                Additional Duties & Paper Evaluation Calculation
              </h3>
              <p className="text-[11px] text-purple-700">
                Accurate mathematical computation of extra duties (Standard benchmark: 2.0 hrs / evaluation session)
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-purple-200 bg-white p-2.5 text-center">
                <span className="text-[10px] text-slate-500 block font-medium">Paper Evaluation</span>
                <span className="text-base font-bold text-purple-900">{additionalDutiesCalc.totalPaperEvaluationHours} hrs</span>
              </div>
              <div className="rounded-xl border border-purple-200 bg-white p-2.5 text-center">
                <span className="text-[10px] text-slate-500 block font-medium">In-Service Training</span>
                <span className="text-base font-bold text-purple-900">{additionalDutiesCalc.totalInServiceHours} hrs</span>
              </div>
              <div className="rounded-xl border border-purple-200 bg-white p-2.5 text-center">
                <span className="text-[10px] text-slate-500 block font-medium">Calculated Rate</span>
                <span className="text-base font-bold text-purple-700">{additionalDutiesCalc.completionPercentage}%</span>
              </div>
            </div>

            <div className="rounded-xl border border-purple-200 bg-white p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Duty Status:</span>
                <span className="font-bold text-purple-900">
                  {additionalDutiesCalc.hasUndertakenDuties
                    ? `${additionalDutiesCalc.dutySessionsCount} Session(s) Undertaken`
                    : '0% (No Additional Duties Undertaken)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Calculation Method:</strong> If an instructor undertakes paper evaluation for 2 hours against a standard 2.0-hour evaluation session block, completion is <strong>100%</strong> (2.0 / 2.0 × 100). If no additional duties are undertaken, the score is strictly <strong>0%</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Project Milestone Progress Status */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <FolderGit2 className="h-5 w-5 text-sky-700" />
            <div>
              <h3 className="text-sm font-bold text-sky-950">
                Project Milestone & Governance Status
              </h3>
              <p className="text-[11px] text-sky-700">
                Standardized 9-stage milestone completion tracking
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-sky-200 bg-white p-2.5 text-center">
                <span className="text-[10px] text-slate-500 block font-medium">Assigned Projects</span>
                <span className="text-base font-bold text-sky-950">{myProjects.length}</span>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white p-2.5 text-center">
                <span className="text-[10px] text-slate-500 block font-medium">Milestone Progress</span>
                <span className="text-base font-bold text-sky-700">{avgMilestoneProgress}%</span>
              </div>
            </div>

            <div className="rounded-xl border border-sky-200 bg-white p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Governance Baseline:</span>
                <span className="font-bold text-sky-900">
                  {myProjects.length > 0
                    ? `${myProjects.length} Active Initiative(s)`
                    : '0% (No Active Projects Assigned)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Zero Baseline:</strong> The project milestone progress score strictly defaults to <strong>0%</strong> when an instructor is not undertaking any project. As stages are updated (e.g. Architecture & Prototyping, Development), actual completion is computed.
              </p>
            </div>
          </div>
        </div>
      </div>



      <WorkEffortPieChart 
        breakdown={workEffortBreakdown} 
        title="My Additional Work & Extra Effort Distribution"
        subtitle="Visualizing percentage of total work done including class delivery, overtime hours, paper evaluations, and in-service training"
      />

      {/* Recorded Telemetry History Table */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-sky-100 pb-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Recorded Work History & Telemetry Logs
              </h3>
              <p className="text-xs text-slate-500">
                Chronological record of actual recorded work days
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {myUpdates.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No work records submitted yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-sky-100 bg-sky-50/50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Hours Logged</th>
                  <th className="px-4 py-3">Tasks Worked On</th>
                  <th className="px-4 py-3">Additional Duties</th>
                  <th className="px-4 py-3">In-Service Training</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {myUpdates.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-sky-50/30">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {u.date}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {u.hoursLogged || 6} hrs
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {u.tasksWorkedOn || 'Standard daily operations'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {(u.paperEvaluationHours || 0) > 0 ? `Paper Evaluation (${u.paperEvaluationHours}h)` : 'None'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {(u.inServiceTrainingHours || 0) > 0 ? `In-Service (${u.inServiceTrainingHours}h)` : 'None'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
