import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/common/Toast';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import { useSessionInactivity } from './hooks/useSessionInactivity';
import { ActiveSessionTimeoutModal } from './components/common/ActiveSessionTimeoutModal';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { AuthPage } from './components/auth/AuthPage';

// Trainer Views
import { TrainerDashboard } from './components/trainer/TrainerDashboard';
import { DailyWorkView } from './components/trainer/DailyWorkView';
import { HolisticContributionsView } from './components/trainer/HolisticContributionsView';
import { ClassTrackingView } from './components/trainer/ClassTrackingView';
import { TaskManagementView } from './components/trainer/TaskManagementView';
import { ProjectTrackingView } from './components/trainer/ProjectTrackingView';
import { TrainerTargetsView } from './components/trainer/TrainerTargetsView';
import { TrainerProfileView } from './components/trainer/TrainerProfileView';

// Manager Views
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { TeamPerformanceView } from './components/manager/TeamPerformanceView';
import { IndividualPerformanceView } from './components/manager/IndividualPerformanceView';
import { TeamComparisonView } from './components/manager/TeamComparisonView';
import { ClassMonitoringView } from './components/manager/ClassMonitoringView';
import { TaskManagerView } from './components/manager/TaskManagerView';
import { ProjectManagerView } from './components/manager/ProjectManagerView';
import { AnalyticsView } from './components/manager/AnalyticsView';
import { AttentionRequiredView } from './components/manager/AttentionRequiredView';
import { ReportsView } from './components/manager/ReportsView';
import { CalculationMetricsView } from './components/manager/CalculationMetricsView';
import { ManagerProfileView } from './components/manager/ManagerProfileView';
import { ManagerChangeRequestsView } from './components/manager/ManagerChangeRequestsView';

const MainAppContent: React.FC = () => {
  const { isManager, isTrainer, userProfile, loading } = useAuth();
  const { allTrainers, selectedTraineeId, setSelectedTraineeId } = useData();
  const { addToast } = useToast();

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Automatic 30-Minute Session Inactivity Security Guard
  const { showWarningModal, remainingSeconds, extendSession, logoutNow } = useSessionInactivity();

  const handleExtendSession = useCallback(() => {
    extendSession();
    addToast({
      id: `session-extended-${Date.now()}`,
      title: 'Active Session Renewed',
      message: 'Your active session has been renewed for another 30 minutes.',
      type: 'info',
      category: 'system',
      duration: 3500,
    });
  }, [extendSession, addToast]);

  const handleNavigate = useCallback((view: string) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  }, []);

  const handleSelectEmployee = (empId: string) => {
    setSelectedTraineeId(empId);
  };

  // Reset view when user role changes
  useEffect(() => {
    setCurrentView('dashboard');
  }, [userProfile?.role]);

  // Real-time toast alerts for new tasks & approaching project deadlines (called unconditionally)
  useRealtimeNotifications(handleNavigate);

  // If user is not logged in, show AuthPage directly (no intermediate portal loading screen)
  if (!userProfile) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-sky-50 text-slate-800 antialiased">
      {/* Toast Notification Layer */}
      <ToastContainer />

      {/* Active Session Inactivity Warning Modal (Auto-locks dashboard at 30 min) */}
      <ActiveSessionTimeoutModal
        isOpen={showWarningModal}
        remainingSeconds={remainingSeconds}
        onExtendSession={handleExtendSession}
        onLogoutNow={logoutNow}
      />

      {/* Sidebar navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-sky-50/50">
        {/* Top Navigation Bar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={handleNavigate}
        />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* TRAINER VIEWS (Strictly only accessible to Trainers/Trainees) */}
            {isTrainer && (
              <>
                {currentView === 'dashboard' && <TrainerDashboard onNavigate={handleNavigate} />}
                {currentView === 'daily-work' && <DailyWorkView />}
                {(currentView === 'holistic-guidance' || currentView === 'holistic-contributions') && <HolisticContributionsView />}
                {currentView === 'task-management' && <TaskManagementView />}
                {(currentView === 'project-tracking' || currentView === 'projects') && <ProjectTrackingView />}
                {currentView === 'class-tracking' && <ClassTrackingView />}
                {(currentView === 'targets' || currentView === 'trainer-targets') && <TrainerTargetsView />}
                {(currentView === 'profile' || currentView === 'settings') && <TrainerProfileView />}
              </>
            )}

            {/* MANAGER VIEWS (Strictly only accessible to Managers) */}
            {isManager && (
              <>
                {currentView === 'dashboard' && (
                  <ManagerDashboard
                    onNavigate={handleNavigate}
                    onSelectEmployee={handleSelectEmployee}
                  />
                )}
                {currentView === 'team-performance' && (
                  <TeamPerformanceView
                    onSelectEmployee={handleSelectEmployee}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentView === 'individual-performance' && (
                  <IndividualPerformanceView
                    selectedEmployeeId={selectedTraineeId}
                    onSelectEmployee={handleSelectEmployee}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentView === 'team-comparison' && (
                  <TeamComparisonView />
                )}
                {currentView === 'class-monitoring' && <ClassMonitoringView />}
                {currentView === 'task-management' && <TaskManagerView />}
                {(currentView === 'project-tracking' || currentView === 'project-management' || currentView === 'projects') && <ProjectManagerView />}
                {currentView === 'analytics' && <AnalyticsView />}
                {currentView === 'attention-required' && <AttentionRequiredView />}
                {currentView === 'reports' && <ReportsView />}
                {(currentView === 'calculation-metrics' || currentView === 'metric-calculations' || currentView === 'calculations') && <CalculationMetricsView />}
                {(currentView === 'manager-change-requests' || currentView === 'change-requests') && (
                  <ManagerChangeRequestsView onNavigate={handleNavigate} />
                )}
                {(currentView === 'profile' || currentView === 'settings') && <ManagerProfileView />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <MainAppContent />
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
