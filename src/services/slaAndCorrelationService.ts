import {
  Alarm,
  AlarmSeverity,
  Incident,
  SLAConfiguration,
  SLAThresholdRule,
} from '../types/models';

export interface IncidentSlaEvaluation {
  severity: AlarmSeverity;
  rule: SLAThresholdRule;
  ackElapsedMins: number;
  ackBreached: boolean;
  assignElapsedMins: number;
  assignBreached: boolean;
  restoreElapsedMins: number;
  restoreRemainingMins: number;
  restoreBreached: boolean;
  resolveElapsedMins: number;
  resolveRemainingMins: number;
  resolveBreached: boolean;
  anyBreached: boolean;
  atRisk: boolean; // Within 25% of target deadline
  overallState: 'Breached' | 'At Risk' | 'Within SLA' | 'Met (Closed)';
}

/**
 * Reference clock helper:
 * Because the demonstration dataset is anchored around 2026-10-27T11:30:00Z,
 * if a record's timestamps are from the 2026-10-27 seed window, we measure relative to
 * the latest store reference timestamp or real elapsed minutes so SLA timers are realistic.
 */
function getEffectiveNowMs(startIso: string): number {
  const startMs = new Date(startIso).getTime();
  const realNowMs = Date.now();
  // If startIso is within 48 hours of realNowMs, use realNowMs; otherwise anchor to 2026-10-27T11:35:00Z
  if (Math.abs(realNowMs - startMs) < 48 * 3600 * 1000) {
    return Math.max(realNowMs, startMs + 60_000);
  }
  const seedRefMs = new Date('2026-10-27T11:35:00Z').getTime();
  return Math.max(seedRefMs, startMs + 60_000);
}

function diffMinutes(startIso: string, endIso?: string): number {
  const s = new Date(startIso).getTime();
  if (Number.isNaN(s)) return 0;
  const e = endIso ? new Date(endIso).getTime() : getEffectiveNowMs(startIso);
  if (Number.isNaN(e)) return 0;
  return Math.max(0, Math.round((e - s) / 60_000));
}

export function evaluateIncidentSla(
  incident: Incident,
  slaConfig: SLAConfiguration
): IncidentSlaEvaluation {
  const rule = slaConfig.rules[incident.severity];
  const startIso = incident.reportedAt || incident.firstOccurrence || incident.createdAt;

  const ackElapsedMins = diffMinutes(
    startIso,
    incident.acknowledged ? incident.acknowledgedAt || incident.updatedAt : undefined
  );
  const ackBreached = !incident.acknowledged
    ? ackElapsedMins > rule.timeToAcknowledgeMins
    : ackElapsedMins > rule.timeToAcknowledgeMins;

  const hasAssignee =
    Boolean(incident.assignedEngineerId) ||
    !incident.assignedOwnerName.toLowerCase().startsWith('unassigned');
  const assignElapsedMins = diffMinutes(
    startIso,
    hasAssignee ? incident.assignedAt || incident.acknowledgedAt || incident.createdAt : undefined
  );
  const assignBreached = !hasAssignee && assignElapsedMins > rule.timeToAssignMins;

  const isRestored = Boolean(incident.serviceRestoredAt) || incident.status === 'Resolved' || incident.status === 'Closed';
  const restoreElapsedMins = diffMinutes(
    startIso,
    isRestored ? incident.serviceRestoredAt || incident.resolvedAt || incident.updatedAt : undefined
  );
  const restoreRemainingMins = rule.timeToRestoreMins - restoreElapsedMins;
  const restoreBreached = restoreElapsedMins > rule.timeToRestoreMins;

  const isResolvedOrClosed = incident.status === 'Resolved' || incident.status === 'Closed';
  const resolveElapsedMins = diffMinutes(
    startIso,
    isResolvedOrClosed
      ? incident.resolutionVerifiedAt || incident.resolvedAt || incident.closedAt || incident.updatedAt
      : undefined
  );
  const resolveRemainingMins = rule.timeToResolveMins - resolveElapsedMins;
  const resolveBreached = resolveElapsedMins > rule.timeToResolveMins;

  const anyBreached =
    (!incident.acknowledged && ackBreached) ||
    (!hasAssignee && assignBreached) ||
    (!isRestored && restoreBreached) ||
    (!isResolvedOrClosed && resolveBreached);

  const atRisk =
    !anyBreached &&
    !isResolvedOrClosed &&
    (restoreRemainingMins <= rule.timeToRestoreMins * 0.25 ||
      (!incident.acknowledged &&
        rule.timeToAcknowledgeMins - ackElapsedMins <= rule.timeToAcknowledgeMins * 0.25));

  let overallState: IncidentSlaEvaluation['overallState'] = 'Within SLA';
  if (isResolvedOrClosed && !restoreBreached && !resolveBreached) {
    overallState = 'Met (Closed)';
  } else if (anyBreached) {
    overallState = 'Breached';
  } else if (atRisk) {
    overallState = 'At Risk';
  }

  return {
    severity: incident.severity,
    rule,
    ackElapsedMins,
    ackBreached,
    assignElapsedMins,
    assignBreached,
    restoreElapsedMins,
    restoreRemainingMins,
    restoreBreached,
    resolveElapsedMins,
    resolveRemainingMins,
    resolveBreached,
    anyBreached,
    atRisk,
    overallState,
  };
}

export function formatDurationMins(mins: number): string {
  const abs = Math.abs(Math.round(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Alarm Deduplication Rule:
 * Prevents duplicate active alarms and uncontrolled duplicate incidents when the same
 * source + managedObject + vendorCode is ingested while still active.
 */
export function findDuplicateActiveAlarm(
  existingAlarms: Alarm[],
  candidate: {
    siteId: string;
    alarmSource: string;
    vendorCode: string;
    managedObject?: string;
    equipmentId?: string;
  }
): Alarm | undefined {
  return existingAlarms.find(
    (a) =>
      a.isSimulatedActive &&
      a.siteId === candidate.siteId &&
      a.vendorCode.trim().toLowerCase() === candidate.vendorCode.trim().toLowerCase() &&
      ((candidate.managedObject &&
        a.managedObject?.trim().toLowerCase() === candidate.managedObject.trim().toLowerCase()) ||
        a.equipmentId === candidate.equipmentId ||
        a.alarmSource.trim().toLowerCase() === candidate.alarmSource.trim().toLowerCase())
  );
}

/**
 * Transparent Rule-Based Alarm Correlation:
 * Proposes linking an alarm to an existing open incident ONLY when specific technical
 * correlation criteria match (never merges unrelated incidents just because they share a site).
 */
export function evaluateProposedCorrelation(
  alarm: {
    siteId: string;
    domain: string;
    equipmentId: string;
    alarmName: string;
    vendorCode: string;
  },
  openIncidents: Incident[]
): { incidentId: string; ruleName: string; reason: string } | null {
  const sameSiteOpen = openIncidents.filter(
    (inc) => inc.siteId === alarm.siteId && inc.status !== 'Resolved' && inc.status !== 'Closed'
  );
  if (sameSiteOpen.length === 0) return null;

  for (const inc of sameSiteOpen) {
    // Rule 1: Exact same physical equipment unit
    if (inc.equipmentId === alarm.equipmentId) {
      return {
        incidentId: inc.id,
        ruleName: 'SAME_MANAGED_EQUIPMENT_UNIT',
        reason: `Alarm affects identical managed equipment (${alarm.equipmentId}) as open incident ${inc.id}.`,
      };
    }

    // Rule 2: Power Failure Cascade (Mains AC / Rectifier / Generator / LLVD -> RAN/BTS outage on same site)
    if (
      inc.domain === 'Power / AC-DC / Gen' &&
      (alarm.domain === 'Power / AC-DC / Gen' || alarm.domain === 'RAN / Radio')
    ) {
      return {
        incidentId: inc.id,
        ruleName: 'SITE_POWER_OUTAGE_CASCADE',
        reason: `Active primary power incident ${inc.id} (${inc.alarmName}) is already open on this site; downstream power/RAN alarms may be caused by the same power event.`,
      };
    }

    // Rule 3: Same RF Sector Chain (RRU/RRH + Antenna/RET on same sector)
    if (
      inc.domain === 'RAN / Radio' &&
      alarm.domain === 'RAN / Radio' &&
      (alarm.alarmName.toLowerCase().includes('ret') ||
        alarm.alarmName.toLowerCase().includes('vswr') ||
        alarm.alarmName.toLowerCase().includes('sector 2'))
    ) {
      return {
        incidentId: inc.id,
        ruleName: 'SAME_SITE_SECTOR_RF_CHAIN',
        reason: `Shares RF sector feeder/AISG chain with open RAN incident ${inc.id} (${inc.alarmName}).`,
      };
    }
  }

  return null;
}
