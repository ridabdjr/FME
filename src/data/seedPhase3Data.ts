import {
  Alarm,
  AppNotification,
  ChecklistTemplate,
  Incident,
  IncidentTimelineEvent,
  SiteVisit,
  SLAConfiguration,
  Team,
  User,
  UserRole,
  WorkOrder,
} from '../types/models';

export const DEMO_SLA_CONFIGURATION: SLAConfiguration = {
  updatedAt: '2026-10-27T08:00:00Z',
  updatedBy: 'Sofia Lindqvist (Administrator)',
  rules: {
    Critical: {
      severity: 'Critical',
      timeToAcknowledgeMins: 15,
      timeToAssignMins: 30,
      timeToDispatchMins: 45,
      timeToRestoreMins: 180,
      timeToResolveMins: 240,
    },
    Major: {
      severity: 'Major',
      timeToAcknowledgeMins: 30,
      timeToAssignMins: 60,
      timeToDispatchMins: 120,
      timeToRestoreMins: 360,
      timeToResolveMins: 480,
    },
    Minor: {
      severity: 'Minor',
      timeToAcknowledgeMins: 60,
      timeToAssignMins: 180,
      timeToDispatchMins: 360,
      timeToRestoreMins: 720,
      timeToResolveMins: 1440,
    },
    Warning: {
      severity: 'Warning',
      timeToAcknowledgeMins: 120,
      timeToAssignMins: 360,
      timeToDispatchMins: 720,
      timeToRestoreMins: 1440,
      timeToResolveMins: 2880,
    },
  },
};

export const DEMO_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'CHK-TPL-RAN',
    name: 'RAN, BBU, RRU & Antenna Line Inspection',
    domainType: 'Radio & Antenna Equipment',
    description:
      'Standard field inspection checklist for 2G/3G/4G/5G BBU subracks, RRH/AAU optical/RF ports, VSWR return loss sweeps, and AISG RET actuators.',
    updatedAt: '2026-10-15T10:00:00Z',
    items: [
      {
        id: 'RAN-01',
        label: 'Measure Sector RF Feeder / Jumper Return Loss & VSWR (Site Master)',
        expectedStandard: 'VSWR <= 1.4:1 across operating band',
        requiresMeasurement: true,
        unit: 'ratio',
      },
      {
        id: 'RAN-02',
        label: 'Verify CPRI / eCPRI SFP+ Optical Rx/Tx Power Levels at BBU & RRU',
        expectedStandard: 'Rx between -3.0 dBm and -11.5 dBm',
        requiresMeasurement: true,
        unit: 'dBm',
      },
      {
        id: 'RAN-03',
        label: 'Inspect 4.3-10 / DIN 7/16 RF Connector Torque & Cold-Shrink Weatherproofing',
        expectedStandard: 'No moisture ingress; torqued to 5 Nm (4.3-10)',
        requiresMeasurement: false,
      },
      {
        id: 'RAN-04',
        label: 'Verify AISG RS-485 RET Actuator Bus Continuity & Electrical Tilt Calibration',
        expectedStandard: 'RET online in NMS; tilt matches RF design sheet',
        requiresMeasurement: true,
        unit: 'deg',
      },
      {
        id: 'RAN-05',
        label: 'Verify RRU Protective Earth Bonding to Tower Busbar',
        expectedStandard: 'Ground lug tight, < 0.2 Ohm continuity',
        requiresMeasurement: true,
        unit: 'Ohm',
      },
    ],
  },
  {
    id: 'CHK-TPL-MW',
    name: 'Microwave & Backhaul Transmission Alignment Checklist',
    domainType: 'Transmission & Microwave',
    description:
      'Checklist for split-mount and all-outdoor microwave links (IDU/ODU, IF cable, waveguide pressure, RSL/XPD, and ACM modulation stability).',
    updatedAt: '2026-10-15T10:00:00Z',
    items: [
      {
        id: 'MW-01',
        label: 'Record Received Signal Level (RSL) at Local & Far-End ODU',
        expectedStandard: 'Within +/- 2.0 dB of link budget target (-36.5 dBm)',
        requiresMeasurement: true,
        unit: 'dBm',
      },
      {
        id: 'MW-02',
        label: 'Verify Cross-Polarization Discrimination (XPD) & ACM Modulation Lock',
        expectedStandard: 'XPD > 28 dB; locked at 256QAM / 512QAM in clear sky',
        requiresMeasurement: true,
        unit: 'dB',
      },
      {
        id: 'MW-03',
        label: 'Inspect Dish Pan/Tilt Struts, Ice Shield & Azimuth Lockbolts',
        expectedStandard: 'Zero play on fine-adjust threads; anti-seize applied',
        requiresMeasurement: false,
      },
      {
        id: 'MW-04',
        label: 'Check Coaxial IF Cable / Ethernet PoE Surge Arrestor & Grounding Kit',
        expectedStandard: 'Weatherproofed at top, midpoint, and shelter entry',
        requiresMeasurement: false,
      },
    ],
  },
  {
    id: 'CHK-TPL-PWR',
    name: 'AC/DC Power Plant, Rectifier, Battery Bank & Diesel Generator Checklist',
    domainType: 'Power Systems (AC/DC/DG/Batteries)',
    description:
      'Electromechanical and DC plant preventive/corrective checklist covering ATS transfer, rectifier load sharing, LLVD/BLVD thresholds, and VRLA/LiFePO4 health.',
    updatedAt: '2026-10-15T10:00:00Z',
    items: [
      {
        id: 'PWR-01',
        label: 'Measure -48V DC Bus Float Voltage & Rectifier Module Load Sharing',
        expectedStandard: '-53.5V to -54.2V DC float; < 5% current imbalance',
        requiresMeasurement: true,
        unit: 'VDC',
      },
      {
        id: 'PWR-02',
        label: 'Verify LLVD (43.2V) & BLVD (45.0V) Contactor Thresholds in Controller',
        expectedStandard: 'Smartpack2 / NetSure thresholds match carrier standard',
        requiresMeasurement: true,
        unit: 'VDC',
      },
      {
        id: 'PWR-03',
        label: 'Test Standby Diesel Generator Auto-Start & ATS Load Transfer',
        expectedStandard: 'Starts within 12s; 400VAC / 50Hz or 208VAC / 60Hz stable',
        requiresMeasurement: true,
        unit: 'VAC',
      },
      {
        id: 'PWR-04',
        label: 'Inspect Fuel Tank Level, Crank Battery (24V), Oil Pressure & Coolant Heater',
        expectedStandard: 'Fuel > 65%; crank battery > 25.4V float',
        requiresMeasurement: true,
        unit: '%',
      },
      {
        id: 'PWR-05',
        label: 'Measure Battery String Internal Conductance / BMS Cell Balance',
        expectedStandard: 'Zero swollen monoblocks; BMS SOH >= 85%',
        requiresMeasurement: true,
        unit: '% SOH',
      },
    ],
  },
  {
    id: 'CHK-TPL-FBR',
    name: 'Fiber-Optic ODF, DWDM & Outside Plant Splice Verification',
    domainType: 'Fiber & Optical Infrastructure',
    description:
      'Optical inspection checklist for ODF patch panels, SFP28/QSFP28 transceivers, OTDR trace loss, and FDT/Manhole splice enclosures.',
    updatedAt: '2026-10-15T10:00:00Z',
    items: [
      {
        id: 'FBR-01',
        label: 'Inspect & Clean LC/UPC or SC/APC Connector End-Faces with Digital Scope',
        expectedStandard: 'IEC 61300-3-35 Pass (zero core or cladding contamination)',
        requiresMeasurement: false,
      },
      {
        id: 'FBR-02',
        label: 'Measure Optical Tx/Rx Power & Span Attenuation with Optical Power Meter',
        expectedStandard: 'Span loss < 0.25 dB/km @ 1550nm + 0.3 dB per mated pair',
        requiresMeasurement: true,
        unit: 'dBm',
      },
      {
        id: 'FBR-03',
        label: 'Verify Minimum Bend Radius (> 30mm) & Patch Cord Labeling in ODF',
        expectedStandard: 'No macro-bends; TIA-606 compliant labels on both ends',
        requiresMeasurement: false,
      },
    ],
  },
  {
    id: 'CHK-TPL-ENV',
    name: 'Environmental, HVAC, Grounding & External Dry-Contact Alarms',
    domainType: 'Environmental & External Alarms',
    description:
      'Checklist for shelter HVAC/free-cooling blowers, door intrusion sensors, smoke/fire relays, Class I/II SPD arrestors, and earth pit resistance.',
    updatedAt: '2026-10-15T10:00:00Z',
    items: [
      {
        id: 'ENV-01',
        label: 'Measure Shelter / Cabinet Internal Ambient Temperature & Humidity',
        expectedStandard: 'Temperature +18°C to +30°C; RH < 65%',
        requiresMeasurement: true,
        unit: '°C',
      },
      {
        id: 'ENV-02',
        label: 'Measure Main Earth Ground Bar & Pit Resistance (Clamp Tester)',
        expectedStandard: 'Earth resistance < 5.0 Ohms (< 2.0 Ohms for Core/BSC)',
        requiresMeasurement: true,
        unit: 'Ohm',
      },
      {
        id: 'ENV-03',
        label: 'Test Door Intrusion, High-Temp, Smoke & SPD Dry-Contact Loops to NOC',
        expectedStandard: 'All DI relays verified end-to-end with NOC operator',
        requiresMeasurement: false,
      },
      {
        id: 'ENV-04',
        label: 'Inspect HVAC Intake Filters, Damper Actuators & 48V Emergency Blowers',
        expectedStandard: 'Filters clean; emergency DC fan engages at +32°C',
        requiresMeasurement: false,
      },
    ],
  },
];

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'NOTIF-3001',
    timestamp: '2026-10-27T11:25:00Z',
    severity: 'Critical',
    category: 'SLA Breach',
    title: 'SLA Restore Warning: INC-2026-0401 (NTH-IND-018)',
    message:
      'Critical power outage at Harbor West Logistics Tower has been active for 2h 11m (Restore SLA target: 3h 00m). Field engineer David Okafor is on-site.',
    linkedEntityType: 'Incident',
    linkedEntityId: 'INC-2026-0401',
    read: false,
    deliveryChannelNote: 'In-App Only (External SMTP/SMS/Push gateway not configured in Demo Mode)',
  },
  {
    id: 'NOTIF-3002',
    timestamp: '2026-10-27T11:20:15Z',
    severity: 'Warning',
    category: 'SLA Breach',
    title: 'Acknowledge & Restore SLA Breached: INC-2026-0404 (HLD-MW-009)',
    message:
      'Major Microwave RSL degradation alarm ALM-90104 remains unacknowledged past the 30-minute Major SLA target.',
    linkedEntityType: 'Incident',
    linkedEntityId: 'INC-2026-0404',
    read: false,
    deliveryChannelNote: 'In-App Only (External SMTP/SMS/Push gateway not configured in Demo Mode)',
  },
  {
    id: 'NOTIF-3003',
    timestamp: '2026-10-27T11:10:05Z',
    severity: 'Info',
    category: 'Alarm Intake',
    title: 'Rule-Based Correlation Candidate Detected on STH-HWY-044',
    message:
      'Alarm ALM-90106 (AISG RET Timeout) shares site STH-HWY-044 and Sector 2 antenna line with active Major incident INC-2026-0403. Review correlation in Alarm Center.',
    linkedEntityType: 'Alarm',
    linkedEntityId: 'ALM-90106',
    read: false,
    deliveryChannelNote: 'In-App Only (External SMTP/SMS/Push gateway not configured in Demo Mode)',
  },
];

/**
 * Enriches Phase 1/2 seed records with Phase 3 operational fields
 * (specialties, availability, managed objects, correlation links, separated timestamps,
 * timelines, checklists, and SLA metadata) while preserving all existing IDs.
 */
export function enrichUsersWithPhase3(users: User[]): User[] {
  const specsByUser: Record<
    string,
    {
      specialties: string[];
      availabilityStatus: User['availabilityStatus'];
      certifications: string[];
    }
  > = {
    'USR-01': {
      specialties: ['Nokia mcBSC / Abis', 'Ericsson ENM', '2G/3G/4G/5G Alarm Triage', 'MML Diagnostics'],
      availabilityStatus: 'Available',
      certifications: ['Nokia NetAct Tier-2', '3GPP RAN Signalling Specialist'],
    },
    'USR-02': {
      specialties: ['OSS/BSS Architecture', 'SLA Governance', 'GIS Network Planning', 'Disaster Recovery'],
      availabilityStatus: 'Available',
      certifications: ['CCIE Service Provider', 'ITIL v4 Master'],
    },
    'USR-03': {
      specialties: ['Ericsson BBU/RRU', 'Eltek 48V DC Plant', 'Cummins DG & ATS', 'Fiber eCPRI'],
      availabilityStatus: 'On-Site',
      certifications: ['Tower Climbing & RF Safety Level 3', 'Eltek Smartpack2 Certified'],
    },
    'USR-04': {
      specialties: ['Nokia AirScale RRH', 'Anritsu VSWR/DTF Sweep', 'AISG RET & PIM Testing', 'Team Dispatch'],
      availabilityStatus: 'Busy / Dispatched',
      certifications: ['Anritsu Site Master Instructor', 'PIM & Sweep Specialist'],
    },
    'USR-05': {
      specialties: ['Vertiv NetSure DC', 'Diesel Generator Overhaul', 'HVAC & Grounding', 'LiFePO4 BMS'],
      availabilityStatus: 'On-Site',
      certifications: ['Licensed High-Voltage & DC Plant Engineer', 'DEHN Surge Protection'],
    },
    'USR-06': {
      specialties: ['ISO/SLA Compliance', 'Regulatory Audit', 'Root-Cause Verification'],
      availabilityStatus: 'Available',
      certifications: ['Lead Telecom Quality Auditor'],
    },
    'USR-07': {
      specialties: ['Ericsson MINI-LINK 18/80GHz', 'Huawei OptiX DWDM', 'OTDR & Optical Splicing'],
      availabilityStatus: 'Available',
      certifications: ['Ericsson Microwave Transmission Pro', 'CFOT Optical Specialist'],
    },
  };

  return users.map((u) => {
    const extra = specsByUser[u.id];
    return {
      ...u,
      specialties: u.specialties || extra?.specialties || ['General Telecom Operations'],
      availabilityStatus: u.availabilityStatus || extra?.availabilityStatus || 'Available',
      certifications: u.certifications || extra?.certifications || ['Telecom Safety Certified'],
    };
  });
}

export function enrichTeamsWithPhase3(teams: Team[]): Team[] {
  return teams.map((t) => ({
    ...t,
    availabilityStatus:
      t.availabilityStatus || (t.id === 'TEAM-FLD-N1' ? 'High Load' : 'Available'),
    specializations:
      t.specializations ||
      (t.id === 'TEAM-NOC-01'
        ? ['BSC/RNC Signalling', '2G/3G/4G/5G Surveillance', 'SLA Escalation']
        : t.id === 'TEAM-FLD-N1'
        ? ['BTS/eNodeB/gNodeB Hardware', 'Antenna VSWR & RET', 'Emergency Portable DG']
        : t.id === 'TEAM-PWR-S1'
        ? ['48V DC Rectifiers', 'Cummins/Perkins Diesel Generators', 'VRLA/LiFePO4 & HVAC']
        : ['18GHz/80GHz Microwave Links', 'DWDM OLT/Mux', 'Outside Plant Fiber Splicing']),
  }));
}

export function enrichAlarmsWithPhase3(alarms: Alarm[]): Alarm[] {
  const vendorById: Record<string, { vendor: string; mo: string; incId: string; proposed?: string; reason?: string }> = {
    'ALM-90101': {
      vendor: 'Cummins / Eltek',
      mo: 'PLMN-North/SITE-1002/PWR-RACK-1/LLVD-01',
      incId: 'INC-2026-0401',
    },
    'ALM-90102': {
      vendor: 'Nokia',
      mo: 'PLMN-Core/BSC-002/BCSU-2/LAPD-SET-04',
      incId: 'INC-2026-0402',
    },
    'ALM-90103': {
      vendor: 'Nokia',
      mo: 'PLMN-South/SITE-1004/MRBTS-44/LNMME-1/RRH-S2',
      incId: 'INC-2026-0403',
    },
    'ALM-90104': {
      vendor: 'Ericsson',
      mo: 'ENM-TX/SITE-1005/ML6692-1/RAU2X-18G-HOP1',
      incId: 'INC-2026-0404',
    },
    'ALM-90105': {
      vendor: 'Vertiv',
      mo: 'PLMN-South/SITE-1007/SHELTER-ENV/DI-06',
      incId: 'INC-2026-0405',
    },
    'ALM-90106': {
      vendor: 'CommScope / Nokia',
      mo: 'PLMN-South/SITE-1004/MRBTS-44/ANT-S2/RET-02',
      incId: 'INC-2026-0406',
      proposed: 'INC-2026-0403',
      reason:
        'Rule [SAME_SITE_SECTOR_RF_CHAIN]: Shares site STH-HWY-044, Sector 2 antenna mounting position, and 90-second occurrence window with Major VSWR incident INC-2026-0403.',
    },
    'ALM-90107': {
      vendor: 'Ericsson',
      mo: 'ENM-North/SITE-1001/gNodeB-01/AAU-S1/SFP28-1',
      incId: 'INC-2026-0407',
    },
    'ALM-90108': {
      vendor: 'Eltek',
      mo: 'PLMN-North/SITE-1008/CABINET-01/DOOR-DI-03',
      incId: 'INC-2026-0408',
    },
  };

  return alarms.map((a) => {
    const meta = vendorById[a.id];
    return {
      ...a,
      vendor: a.vendor || meta?.vendor || 'Multi-Vendor OSS',
      managedObject: a.managedObject || meta?.mo || `PLMN/${a.siteCode}/${a.equipmentId}`,
      linkedIncidentId: a.linkedIncidentId || meta?.incId,
      proposedCorrelationIncidentId: a.proposedCorrelationIncidentId || meta?.proposed,
      correlationRuleReason: a.correlationRuleReason || meta?.reason,
      lastSyncedAt: a.lastSyncedAt || '2026-10-27T11:30:00Z',
      clearedAt: !a.isSimulatedActive ? a.clearedAt || a.lastOccurrence : undefined,
      clearedByObservation: !a.isSimulatedActive
        ? a.clearedByObservation || 'Verified optical/sensor telemetry within nominal threshold'
        : undefined,
      alarmNotes: a.alarmNotes || [],
    };
  });
}

export function enrichIncidentsWithPhase3(incidents: Incident[]): Incident[] {
  return incidents.map((inc) => {
    const defaultTimeline: IncidentTimelineEvent[] = [
      {
        id: `TL-${inc.id}-1`,
        incidentId: inc.id,
        timestamp: inc.createdAt,
        actorName: 'System / NOC Intake',
        actorRole: UserRole.NOC_ENGINEER,
        eventType: 'CREATED',
        title: `Incident ${inc.id} Created from Simulated Alarm ${inc.alarmId}`,
        details: `${inc.severity} alarm "${inc.alarmName}" registered on ${inc.siteCode}.`,
      },
    ];

    if (inc.acknowledged && inc.acknowledgedAt) {
      defaultTimeline.push({
        id: `TL-${inc.id}-2`,
        incidentId: inc.id,
        timestamp: inc.acknowledgedAt,
        actorName: inc.acknowledgedBy || 'Karim Mansour',
        actorRole: UserRole.NOC_ENGINEER,
        eventType: 'ACKNOWLEDGED',
        title: `Alarm & Incident Acknowledged`,
        details: `Acknowledged by ${inc.acknowledgedBy || 'NOC Engineer'}.`,
      });
    }

    if (inc.assignedEngineerId) {
      defaultTimeline.push({
        id: `TL-${inc.id}-3`,
        incidentId: inc.id,
        timestamp: inc.acknowledgedAt || inc.createdAt,
        actorName: inc.acknowledgedBy || 'Karim Mansour',
        actorRole: UserRole.NOC_ENGINEER,
        eventType: 'ASSIGNED',
        title: `Assigned to ${inc.assignedOwnerName}`,
        details: `Ownership assigned for technical investigation and remediation.`,
      });
    }

    if (inc.status === 'Resolved' || inc.status === 'Closed') {
      defaultTimeline.push({
        id: `TL-${inc.id}-4`,
        incidentId: inc.id,
        timestamp: inc.resolvedAt || inc.updatedAt,
        actorName: inc.acknowledgedBy || 'David Okafor',
        actorRole: UserRole.FIELD_ENGINEER,
        eventType: 'SERVICE_RESTORED',
        title: 'Service Restored & Alarm Cleared on Network Element',
        details: inc.resolutionSummary || 'Service restoration verified.',
      });
    }

    return {
      ...inc,
      relatedAlarmIds: inc.relatedAlarmIds || [inc.alarmId],
      operator: inc.operator || 'ApexTel Carrier Group',
      title: inc.title || inc.alarmName,
      category:
        inc.category ||
        (inc.domain === 'Power / AC-DC / Gen'
          ? 'AC/DC Power & Rectifier'
          : inc.domain === 'BSS / BSC'
          ? 'BSC / Core Signalling'
          : inc.domain === 'Transmission / MW'
          ? 'Microwave Backhaul'
          : inc.domain === 'Fiber Optics'
          ? 'Fiber Optic / DWDM'
          : inc.domain === 'Environmental / Site Access'
          ? 'Environmental / HVAC'
          : 'RAN / Cell Outage'),
      incidentSource:
        inc.incidentSource ||
        (inc.classification === 'External' ? 'External Alarm' : 'BSC/NOC'),
      impact:
        inc.impact ||
        (inc.severity === 'Critical' && inc.siteCode === 'NTH-IND-018'
          ? 'Site Down'
          : inc.domain === 'Power / AC-DC / Gen'
          ? 'Power Failure'
          : inc.domain === 'Transmission / MW'
          ? 'Transmission Failure'
          : inc.domain === 'Environmental / Site Access'
          ? 'Environmental Issue'
          : 'Service Degraded'),
      scope:
        inc.scope ||
        (inc.siteCode === 'CTR-BSC-002'
          ? 'Multiple Sites'
          : inc.domain === 'Transmission / MW'
          ? 'Transmission Path'
          : 'Single Site'),
      priority:
        inc.priority ||
        (inc.severity === 'Critical'
          ? 'P1 - Critical'
          : inc.severity === 'Major'
          ? 'P2 - High'
          : inc.severity === 'Minor'
          ? 'P3 - Medium'
          : 'P4 - Low'),
      reportedAt: inc.reportedAt || inc.firstOccurrence,
      createdBy: inc.createdBy || 'Karim Mansour (NOC)',
      assignedAt:
        inc.assignedAt ||
        (inc.assignedEngineerId ? inc.acknowledgedAt || inc.createdAt : undefined),
      workStartedAt:
        inc.workStartedAt ||
        (inc.status === 'In Progress' || inc.status === 'Monitoring' || inc.status === 'Resolved' || inc.status === 'Closed'
          ? inc.updatedAt
          : undefined),
      serviceRestoredAt:
        inc.serviceRestoredAt ||
        (inc.status === 'Resolved' || inc.status === 'Closed' ? inc.resolvedAt : undefined),
      alarmClearedAt:
        inc.alarmClearedAt || (inc.alarmClearedInNetwork ? inc.resolvedAt : undefined),
      resolutionVerifiedAt:
        inc.resolutionVerifiedAt ||
        (inc.status === 'Resolved' || inc.status === 'Closed' ? inc.resolvedAt : undefined),
      resolutionVerifiedBy:
        inc.resolutionVerifiedBy ||
        (inc.status === 'Resolved' || inc.status === 'Closed' ? 'Karim Mansour' : undefined),
      closedAt: inc.closedAt || (inc.status === 'Closed' ? inc.updatedAt : undefined),
      reviewedAndApprovedBy:
        inc.reviewedAndApprovedBy ||
        (inc.status === 'Closed' ? 'Elena Rostova-Alvarez' : undefined),
      reportedSymptoms: inc.reportedSymptoms || inc.description,
      diagnosticObservations:
        inc.diagnosticObservations ||
        (inc.notes[0]?.content ?? 'Not yet determined — awaiting engineering inspection.'),
      measurementsAndTestResults:
        inc.measurementsAndTestResults ||
        (inc.id === 'INC-2026-0401'
          ? 'DC Bus before LLVD: 43.1V DC; Utility Phase A/B/C: 0V AC; DG Crank Attempts: 3 (Failed - Fuel Solenoid Open)'
          : inc.id === 'INC-2026-0403'
          ? 'RRH Port 2B Return Loss: 6.5 dB (VSWR 2.8:1 at 1842 MHz); DTF fault peak at 54.2m jumper interface'
          : inc.id === 'INC-2026-0404'
          ? 'Local RSL: -58.2 dBm (Nominal: -36.5 dBm); SNR: 18.4 dB; ACM locked at 16QAM'
          : inc.id === 'INC-2026-0407'
          ? 'Pre-cleaning Rx Power: -13.9 dBm; Post-cleaning Rx Power: -6.4 dBm (0 CRC errors)'
          : 'Not yet determined'),
      suspectedRootCause:
        inc.suspectedRootCause ||
        (inc.id === 'INC-2026-0401'
          ? 'Open 24V fuel stop solenoid coil on Cummins 30kVA generator during utility mains outage'
          : inc.id === 'INC-2026-0402'
          ? 'Transient parity error on BCSU-2 backplane bus triggering watchdog switchover'
          : inc.id === 'INC-2026-0403'
          ? 'Water ingress in top 4.3-10 RF jumper connector on Sector 2 antenna port + pinched AISG cable'
          : inc.id === 'INC-2026-0404'
          ? 'High-gust wind deflection on 1.2m 18GHz dish mount at Highland Crest'
          : inc.rootCauseCategory || 'Not yet determined'),
      confirmedRootCause:
        inc.confirmedRootCause || inc.rootCauseCategory || 'Not yet determined',
      correctiveAction:
        inc.correctiveAction ||
        inc.resolutionSummary ||
        (inc.id === 'INC-2026-0401'
          ? 'Connected 15kVA portable genset to restore 48V DC plant; replacing 24V fuel solenoid on permanent DG'
          : 'Not yet determined'),
      preventiveAction:
        inc.preventiveAction ||
        (inc.status === 'Resolved' || inc.status === 'Closed'
          ? 'Added optical bulkhead dust-cap inspection to quarterly PM checklist.'
          : 'Not yet determined'),
      partsReplaced:
        inc.partsReplaced ||
        (inc.id === 'INC-2026-0407'
          ? ['Ericsson SFP28 25G eCPRI LR 10km (S/N: ERI-SFP-88412)']
          : inc.id === 'INC-2026-0405'
          ? ['48V DC Centrifugal Blower #2', 'G4 Pleated Air Filter Element']
          : []),
      escalationLevel: inc.escalationLevel ?? (inc.id === 'INC-2026-0401' ? 1 : 0),
      escalationHistory:
        inc.escalationHistory ||
        (inc.id === 'INC-2026-0401'
          ? [
              {
                id: 'ESC-101',
                level: 1,
                triggeredAt: '2026-10-27T09:30:00Z',
                triggeredBy: 'Karim Mansour',
                reason: 'Total macro site outage (2G/3G/4G/5G down) in Port Industrial Zone',
                notifiedTarget: 'Elena Rostova-Alvarez (North Metro Team Leader)',
              },
            ]
          : []),
      timeline: inc.timeline && inc.timeline.length > 0 ? inc.timeline : defaultTimeline,
    };
  });
}

export function enrichWorkOrdersWithPhase3(workOrders: WorkOrder[]): WorkOrder[] {
  return workOrders.map((wo) => ({
    ...wo,
    requestedDate: wo.requestedDate || wo.createdAt,
    equipmentId:
      wo.equipmentId ||
      (wo.id === 'WO-01'
        ? 'EQ-2002'
        : wo.id === 'WO-02'
        ? 'EQ-2006'
        : wo.id === 'WO-03'
        ? 'EQ-2010'
        : wo.id === 'WO-04'
        ? 'EQ-2008'
        : 'EQ-2009'),
    equipmentName:
      wo.equipmentName ||
      (wo.id === 'WO-01'
        ? 'Standby Diesel Generator 30kVA & Eltek 48V DC Plant'
        : wo.id === 'WO-02'
        ? 'Sector 2 Remote Radio Head 1800/2100MHz'
        : wo.id === 'WO-03'
        ? 'Outdoor Shelter Environmental & Grounding Unit'
        : wo.id === 'WO-04'
        ? 'Long-Haul Split-Mount Microwave Link (Hop HLD-CTR)'
        : '5G Massive MIMO 64T64R Active Antenna Unit'),
    workStartedAt:
      wo.workStartedAt ||
      (wo.status === 'In Progress' || wo.status === 'Completed' || wo.status === 'Verified'
        ? wo.updatedAt
        : undefined),
    completedAt:
      wo.completedAt ||
      (wo.status === 'Completed' || wo.status === 'Verified' ? wo.updatedAt : undefined),
    safetyAndAccessRequirements:
      wo.safetyAndAccessRequirements ||
      (wo.jobType === 'Emergency Repair'
        ? 'Lockout/Tagout (LOTO) on ATS breaker before solenoid replacement; insulated DC gloves.'
        : 'Full-body climbing harness, dual lanyard, RF personal exposure monitor, and NOC climb permit.'),
    workPerformed:
      wo.workPerformed ||
      (wo.id === 'WO-01'
        ? 'Connected mobile 15kVA generator to temporary AC inlet; bypassed faulted fuel stop solenoid to test alternator output.'
        : wo.id === 'WO-03'
        ? 'Replaced clogged G4 intake filters and swapped faulty 48V DC heat-exchanger blower #2.'
        : wo.completionNotes || ''),
    partsConsumed:
      wo.partsConsumed ||
      (wo.id === 'WO-03'
        ? ['48V DC Centrifugal Blower Fan Assembly', 'G4 Pleated Air Filter Pack (3x)']
        : wo.id === 'WO-05'
        ? ['Ericsson 25G SFP28 eCPRI LR 10km Transceiver']
        : []),
    verificationStatus:
      wo.verificationStatus ||
      (wo.status === 'Verified'
        ? 'Verified'
        : wo.status === 'Completed'
        ? 'Pending Verification'
        : 'Not Requested'),
  }));
}

export function enrichSiteVisitsWithPhase3(siteVisits: SiteVisit[]): SiteVisit[] {
  return siteVisits.map((sv) => ({
    ...sv,
    linkedIncidentId:
      sv.linkedIncidentId ||
      (sv.workOrderId === 'WO-01'
        ? 'INC-2026-0401'
        : sv.workOrderId === 'WO-02'
        ? 'INC-2026-0403'
        : sv.workOrderId === 'WO-03'
        ? 'INC-2026-0405'
        : undefined),
    assignedEngineerId:
      sv.assignedEngineerId ||
      (sv.engineerName.includes('David')
        ? 'USR-03'
        : sv.engineerName.includes('Elena')
        ? 'USR-04'
        : 'USR-05'),
    equipmentId:
      sv.equipmentId ||
      (sv.workOrderId === 'WO-01'
        ? 'EQ-2002'
        : sv.workOrderId === 'WO-02'
        ? 'EQ-2006'
        : 'EQ-2010'),
    equipmentName:
      sv.equipmentName ||
      (sv.workOrderId === 'WO-01'
        ? 'Standby Diesel Generator 30kVA'
        : sv.workOrderId === 'WO-02'
        ? 'Sector 2 Remote Radio Head 1800/2100MHz'
        : 'Outdoor Shelter Environmental & Grounding Unit'),
    inspectionType:
      sv.inspectionType ||
      (sv.workOrderId === 'WO-01'
        ? 'Emergency Fault'
        : sv.workOrderId === 'WO-02'
        ? 'RF & Antenna Audit'
        : 'Routine Preventive'),
    observations:
      sv.observations ||
      (sv.id === 'SV-301'
        ? 'Main utility AC breaker tripped on grid side; Cummins 30kVA DG failed to start due to open 24V fuel solenoid coil.'
        : sv.id === 'SV-303'
        ? 'Shelter intake filter obstructed by dust; blower #2 bearing seized causing +44.8°C high-temp alarm.'
        : 'Scheduled arrival pending.'),
    workPerformed:
      sv.workPerformed ||
      (sv.id === 'SV-301'
        ? 'Connected 15kVA mobile genset; 48V Eltek rectifier shelf charging battery bank at -53.8V DC.'
        : sv.id === 'SV-303'
        ? 'Installed new 48V radial blower and G4 filters; tested SPD dry-contact loop.'
        : ''),
    measurementsAndTestResults:
      sv.measurementsAndTestResults ||
      (sv.id === 'SV-301'
        ? 'DC Bus: -53.8V DC | Rectifier Load: 68A | Mobile AC Input: 231V / 50.0Hz'
        : sv.id === 'SV-303'
        ? 'Shelter Temp: +31.4°C (dropping) | Earth Pit Resistance: 2.8 Ohms'
        : ''),
    checklistTemplateId:
      sv.checklistTemplateId ||
      (sv.workOrderId === 'WO-01'
        ? 'CHK-TPL-PWR'
        : sv.workOrderId === 'WO-02'
        ? 'CHK-TPL-RAN'
        : 'CHK-TPL-ENV'),
    checklistItems:
      sv.checklistItems ||
      (sv.id === 'SV-301'
        ? [
            {
              itemId: 'PWR-01',
              label: 'Measure -48V DC Bus Float Voltage & Rectifier Module Load Sharing',
              result: 'Pass',
              measuredValue: '-53.8 VDC',
              remarks: 'Restored on mobile genset feed',
            },
            {
              itemId: 'PWR-02',
              label: 'Verify LLVD (43.2V) & BLVD (45.0V) Contactor Thresholds in Controller',
              result: 'Pass',
              measuredValue: '43.2 VDC',
              remarks: 'LLVD contactor re-closed cleanly',
            },
            {
              itemId: 'PWR-03',
              label: 'Test Standby Diesel Generator Auto-Start & ATS Load Transfer',
              result: 'Fail',
              measuredValue: '0 VAC',
              remarks: '24V fuel solenoid open circuit — replacement in progress',
            },
          ]
        : []),
    partsUsed:
      sv.partsUsed ||
      (sv.id === 'SV-303' ? ['48V DC Centrifugal Blower #2', 'G4 Air Filter Element'] : []),
    followUpRecommendations:
      sv.followUpRecommendations ||
      (sv.id === 'SV-301'
        ? 'Complete permanent 24V solenoid replacement and run 60-minute load bank test before disconnecting mobile genset.'
        : 'Monitor shelter ambient temperature for 2 hours to confirm dry-contact auto-clear.'),
  }));
}
