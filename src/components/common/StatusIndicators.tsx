import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  PauseCircle,
  ShieldAlert,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  AlarmSeverity,
  IncidentStatus,
  SiteOperationalStatus,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../../types/models';

export const SeverityIndicator: React.FC<{ severity: AlarmSeverity }> = ({ severity }) => {
  switch (severity) {
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap shrink-0">
          <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>CRITICAL</span>
        </span>
      );
    case 'Major':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>MAJOR</span>
        </span>
      );
    case 'Minor':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>MINOR</span>
        </span>
      );
    case 'Warning':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap shrink-0">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>WARNING</span>
        </span>
      );
  }
};

export const IncidentStatusIndicator: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  switch (status) {
    case 'New':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap shrink-0">
          <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>New</span>
        </span>
      );
    case 'Acknowledged':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Acknowledged</span>
        </span>
      );
    case 'Assigned':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap shrink-0">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Assigned</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap shrink-0">
          <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>In Progress</span>
        </span>
      );
    case 'Pending Parts or Access':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
          <PauseCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Pending Parts/Access</span>
        </span>
      );
    case 'Monitoring':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-300 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Monitoring</span>
        </span>
      );
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Resolved</span>
        </span>
      );
    case 'Closed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Closed</span>
        </span>
      );
  }
};

export const SiteStatusIndicator: React.FC<{ status: SiteOperationalStatus }> = ({ status }) => {
  switch (status) {
    case 'Online':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Online</span>
        </span>
      );
    case 'Degraded':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Degraded</span>
        </span>
      );
    case 'Offline':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap shrink-0">
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Offline</span>
        </span>
      );
    case 'Maintenance':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
          <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Maintenance</span>
        </span>
      );
    case 'Planned':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Planned</span>
        </span>
      );
  }
};

export const WorkOrderPriorityIndicator: React.FC<{ priority: WorkOrderPriority }> = ({
  priority,
}) => {
  if (priority.startsWith('P1')) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap shrink-0">
        <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{priority}</span>
      </span>
    );
  }
  if (priority.startsWith('P2')) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{priority}</span>
      </span>
    );
  }
  if (priority.startsWith('P3')) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{priority}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0">
      <span>{priority}</span>
    </span>
  );
};

export const WorkOrderStatusIndicator: React.FC<{ status: WorkOrderStatus }> = ({ status }) => {
  switch (status) {
    case 'Completed':
    case 'Verified':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap shrink-0">
          <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>In Progress</span>
        </span>
      );
    case 'Dispatched':
    case 'Scheduled':
    case 'Assigned':
    case 'Ready for Assignment':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case 'Waiting for Access':
    case 'Waiting for Parts':
    case 'Awaiting Parts':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 line-through whitespace-nowrap shrink-0">
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
          <span>{status}</span>
        </span>
      );
  }
};

export const SlaStatusIndicator: React.FC<{
  state: 'Breached' | 'At Risk' | 'Within SLA' | 'Met (Closed)';
}> = ({ state }) => {
  switch (state) {
    case 'Breached':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
          <AlertOctagon className="w-3 h-3 shrink-0" />
          <span>SLA BREACHED</span>
        </span>
      );
    case 'At Risk':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>SLA AT RISK</span>
        </span>
      );
    case 'Met (Closed)':
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>SLA MET</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap">
          <Clock className="w-3 h-3 shrink-0" />
          <span>WITHIN SLA</span>
        </span>
      );
  }
};

export function formatUtcTimestamp(iso?: string, timezone: string = 'UTC'): string {
  if (!iso) return 'Not yet recorded';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    if (timezone && timezone !== 'UTC') {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short',
      }).format(d);
    }
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
  } catch {
    return iso;
  }
}
