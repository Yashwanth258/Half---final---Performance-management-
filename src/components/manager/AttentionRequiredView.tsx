import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ShieldAlert, 
  MessageSquare,
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { Tooltip } from '../common/Tooltip';

export const AttentionRequiredView: React.FC = () => {
  const { alerts = [], acknowledgeAlert, resolveAlert } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Resolve / Action modal
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredAlerts = (alerts || []).filter(a => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.employeeName.toLowerCase().includes(q) ||
        a.employeeId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const criticalCount = (alerts || []).filter(a => a.severity === 'CRITICAL' && a.status === 'NEW').length;
  const highCount = (alerts || []).filter(a => a.severity === 'HIGH' && a.status === 'NEW').length;
  const newCount = (alerts || []).filter(a => a.status === 'NEW').length;

  const handleOpenResolve = (alertId: string) => {
    setSelectedAlertId(alertId);
    setActionNote('');
  };

  const handleConfirmResolve = async () => {
    if (!selectedAlertId) return;
    setSaving(true);
    try {
      await resolveAlert(selectedAlertId, actionNote);
      setSelectedAlertId(null);
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
          Attention Required & Operational Alerts
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Automated real-time anomaly detection engine flagging overdue deliverables, performance drops, low ratings, and compliance issues
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-rose-600 p-2.5 text-white shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-rose-900">Critical Priority Alerts</span>
              <p className="text-2xl font-black text-rose-950">{criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-amber-500 p-2.5 text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900">High Priority Alerts</span>
              <p className="text-2xl font-black text-amber-950">{highCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-sky-600 p-2.5 text-white shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-sky-900">Total Unresolved Alerts</span>
              <p className="text-2xl font-black text-sky-950">{newCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-sky-600/70" />
          <input
            type="text"
            placeholder="Search alerts by employee, description, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-hidden"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-hidden"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New (Unresolved)</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3.5">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-sky-100 bg-white p-12 text-center shadow-xs">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No active alerts matching criteria
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              All team deliverables, class sessions, and performance scores are healthy.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex flex-col sm:flex-row sm:items-start justify-between rounded-2xl border p-5 shadow-xs transition-all gap-4 ${
                alert.status === 'RESOLVED'
                  ? 'border-emerald-200 bg-emerald-50/30 opacity-80'
                  : alert.severity === 'CRITICAL'
                  ? 'border-rose-200 bg-rose-50/30'
                  : 'border-sky-100 bg-white hover:border-sky-300'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge type="alertSeverity" value={alert.severity} size="sm" />
                  <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200/60">
                    {alert.type}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {alert.title}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  {alert.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>👤 Employee: <strong className="text-slate-800 font-semibold">{alert.employeeName}</strong> ({alert.employeeId})</span>
                  <span>📅 Flagged Date: <strong className="text-slate-700">{alert.date}</strong></span>
                  <span>Status: <strong className={alert.status === 'RESOLVED' ? 'text-emerald-700 font-bold' : 'text-sky-700 font-bold'}>{alert.status}</strong></span>
                </div>

                {alert.actionTaken && (
                  <div className="mt-2.5 rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-slate-800">
                    <strong className="text-sky-900 font-bold">Manager Action Recorded:</strong> "{alert.actionTaken}"
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {alert.status !== 'RESOLVED' && (
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {alert.status === 'NEW' && (
                    <Tooltip content="Acknowledge and mark alert under review" placement="top">
                      <button
                        type="button"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50 shadow-2xs transition-colors"
                        aria-label={`Acknowledge alert for ${alert.employeeName}`}
                      >
                        Acknowledge
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="Document resolution action note and close flag" placement="top">
                    <button
                      type="button"
                      onClick={() => handleOpenResolve(alert.id)}
                      className="rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs shadow-sky-600/20 transition-colors"
                      aria-label={`Resolve alert and record action for ${alert.employeeName}`}
                    >
                      Resolve & Note
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {selectedAlertId && (
        <Modal
          isOpen={!!selectedAlertId}
          onClose={() => setSelectedAlertId(null)}
          title="Resolve Alert & Record Action Note"
          subtitle="Document the remediation plan, coaching meeting, or adjustment made"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Remediation / Coaching Action Note
              </label>
              <textarea
                rows={4}
                required
                placeholder="e.g. Conducted 1-on-1 coaching session, reallocated junior tasks, scheduled student QA shadow session..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setSelectedAlertId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmResolve}
                className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 font-semibold text-white shadow-xs shadow-sky-600/20 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
