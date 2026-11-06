import {
  ChecklistItemResult,
  EquipmentReplacement,
  MaintenanceReport,
  MeasurementRecord,
  PhotoAsset,
  PhotoStampConfig,
  ReportBrandingConfig,
  SiteVisit,
  SparePartUsage,
  UserRole,
} from '../types/models';

export const DEMO_REPORT_BRANDING: ReportBrandingConfig = {
  companyName: 'ApexTel Carrier Infrastructure Group',
  departmentName: 'RAN, BSS, Transmission & Electromechanical Field Operations',
  logoText: 'TELECOMOPS 360',
  confidentialityLabel: 'INTERNAL ENGINEERING USE ONLY',
  reportNumberPrefix: 'TM',
  accentColorHex: '#0284c7',
};

export const DEFAULT_PHOTO_STAMP_CONFIG: PhotoStampConfig = {
  enabled: true,
  position: 'bottom-bar',
  layoutStyle: 'two-column-grid',
  fontSize: 'medium',
  backgroundOpacity: 0.85,
  visibleFields: [
    'organizationName',
    'reportReference',
    'incidentId',
    'workOrderId',
    'siteCode',
    'siteName',
    'region',
    'equipmentInfo',
    'photoTitle',
    'classification',
    'captureTimestamp',
    'engineerName',
    'coordinates',
  ],
  organizationName: 'ApexTel Carrier Infrastructure Group',
  reportReference: 'TM-2026-000101',
  customText1: 'Verified Field Evidence',
  customText2: '',
};

/**
 * Generates high-contrast, crisp technical diagram / field hardware photograph SVG data URLs
 * so that the Photo Annotation Studio and PDF Generator work out-of-the-box with realistic visual assets
 * without external network dependencies or CORS failures.
 */
function buildTechnicalFieldPhotoDataUrl(opts: {
  title: string;
  subtitle: string;
  siteCode: string;
  badgeText: string;
  badgeColor: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  highlightColor: string;
  diagramType: 'rru-sfp' | 'rectifier-bus' | 'mw-dish';
  isAfter: boolean;
}): string {
  const {
    title,
    subtitle,
    siteCode,
    badgeText,
    badgeColor,
    bgGradientStart,
    bgGradientEnd,
    highlightColor,
    diagramType,
    isAfter,
  } = opts;

  let hardwareIllustration = '';
  if (diagramType === 'rru-sfp') {
    hardwareIllustration = `
      <!-- RRU Chassis Body -->
      <rect x="140" y="95" width="680" height="330" rx="14" fill="#1e293b" stroke="#475569" stroke-width="4"/>
      <!-- Heatsink Fins -->
      <g stroke="#334155" stroke-width="5">
        <line x1="175" y1="115" x2="175" y2="405"/>
        <line x1="205" y1="115" x2="205" y2="405"/>
        <line x1="235" y1="115" x2="235" y2="405"/>
        <line x1="265" y1="115" x2="265" y2="405"/>
        <line x1="295" y1="115" x2="295" y2="405"/>
        <line x1="325" y1="115" x2="325" y2="405"/>
      </g>
      <!-- CPRI / Optical Cage Module Bay -->
      <rect x="370" y="135" width="410" height="250" rx="8" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
      <text x="395" y="168" fill="#94a3b8" font-family="monospace" font-size="15" font-weight="bold">NOKIA AirScale RRH 4T4R B1/B3 — CPRI OPTICAL BAY</text>
      <!-- CPRI Port 1 (Primary) -->
      <rect x="405" y="195" width="155" height="125" rx="6" fill="#1e293b" stroke="${highlightColor}" stroke-width="3"/>
      <text x="422" y="222" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">OPT1 (CPRI 9.8G)</text>
      <circle cx="440" cy="252" r="9" fill="${isAfter ? '#22c55e' : '#ef4444'}"/>
      <text x="460" y="257" fill="${isAfter ? '#86efac' : '#fca5a5'}" font-family="monospace" font-size="13" font-weight="bold">${
        isAfter ? 'LINK UP (-5.4 dBm)' : 'LOS FAULT (-31.8 dBm)'
      }</text>
      <text x="422" y="292" fill="#cbd5e1" font-family="monospace" font-size="12">${
        isAfter ? 'SFP+: FTLF1428P3BCV (NEW)' : 'SFP+: WATER INGRESS SEAL'
      }</text>
      <!-- CPRI Port 2 (Secondary) -->
      <rect x="590" y="195" width="155" height="125" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <text x="608" y="222" fill="#94a3b8" font-family="monospace" font-size="13" font-weight="bold">OPT2 (CASCADE)</text>
      <circle cx="625" cy="252" r="8" fill="#22c55e"/>
      <text x="642" y="257" fill="#86efac" font-family="monospace" font-size="12">STANDBY OK</text>
      <text x="608" y="292" fill="#94a3b8" font-family="monospace" font-size="12">4.3-10 Torque: 5.0 Nm</text>
      <!-- Bottom Ground Lug & Boot -->
      <rect x="445" y="325" width="75" height="55" rx="4" fill="${
        isAfter ? '#0284c7' : '#b91c1c'
      }" stroke="#e2e8f0" stroke-width="2"/>
      <text x="453" y="357" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold">${
        isAfter ? 'BOOT SEALED' : 'SEAL CRACKED'
      }</text>
    `;
  } else if (diagramType === 'rectifier-bus') {
    hardwareIllustration = `
      <!-- Eltek / Vertiv DC Subrack -->
      <rect x="130" y="95" width="700" height="330" rx="10" fill="#0f172a" stroke="#475569" stroke-width="4"/>
      <text x="160" y="132" fill="#e2e8f0" font-family="monospace" font-size="16" font-weight="bold">ELTEK FLATPACK2 -48V DC POWER PLANT &amp; LLVD BUSBAR</text>
      <!-- Rectifier Slots 1 to 4 -->
      <rect x="160" y="155" width="145" height="190" rx="6" fill="#1e293b" stroke="#22c55e" stroke-width="2"/>
      <text x="178" y="185" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">RECT MOD #1</text>
      <text x="178" y="215" fill="#86efac" font-family="monospace" font-size="13">-53.8 VDC / 28A</text>
      <text x="178" y="245" fill="#94a3b8" font-family="monospace" font-size="11">LOAD SHARE: OK</text>

      <rect x="320" y="155" width="145" height="190" rx="6" fill="#1e293b" stroke="${highlightColor}" stroke-width="3"/>
      <text x="338" y="185" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">RECT MOD #2</text>
      <text x="338" y="215" fill="${isAfter ? '#86efac' : '#fca5a5'}" font-family="monospace" font-size="13" font-weight="bold">${
        isAfter ? '-53.8 VDC / 27A' : '0.0 VDC (FAULT)'
      }</text>
      <text x="338" y="245" fill="#cbd5e1" font-family="monospace" font-size="11">${
        isAfter ? 'SN: FP2-260988B' : 'FAN ROTOR LOCKED'
      }</text>

      <rect x="480" y="155" width="145" height="190" rx="6" fill="#1e293b" stroke="#22c55e" stroke-width="2"/>
      <text x="498" y="185" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">RECT MOD #3</text>
      <text x="498" y="215" fill="#86efac" font-family="monospace" font-size="13">-53.8 VDC / 28A</text>

      <rect x="640" y="155" width="160" height="190" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <text x="655" y="185" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">SMARTPACK2 CTRL</text>
      <text x="655" y="215" fill="#e2e8f0" font-family="monospace" font-size="12">BUS: -53.8 VDC</text>
      <text x="655" y="240" fill="#e2e8f0" font-family="monospace" font-size="12">BATT: 96% SOH</text>
      <text x="655" y="265" fill="#94a3b8" font-family="monospace" font-size="11">LLVD: 43.2V ARMED</text>
    `;
  } else {
    hardwareIllustration = `
      <!-- Microwave Dish & ODU Mount -->
      <rect x="140" y="95" width="680" height="330" rx="12" fill="#0f172a" stroke="#475569" stroke-width="3"/>
      <circle cx="330" cy="260" r="115" fill="#1e293b" stroke="#94a3b8" stroke-width="6"/>
      <circle cx="330" cy="260" r="35" fill="#334155" stroke="${highlightColor}" stroke-width="3"/>
      <rect x="490" y="150" width="290" height="220" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <text x="512" y="185" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold">ERICSSON MINI-LINK 6363 ODU</text>
      <text x="512" y="218" fill="${isAfter ? '#86efac' : '#fde047'}" font-family="monospace" font-size="14" font-weight="bold">${
        isAfter ? 'RSL: -35.8 dBm (OPTIMAL)' : 'RSL: -54.2 dBm (DEGRADED)'
      }</text>
      <text x="512" y="248" fill="#e2e8f0" font-family="monospace" font-size="13">${
        isAfter ? 'XPD: 31.4 dB | 512QAM LOCK' : 'XPD: 17.5 dB | QPSK FALLBACK'
      }</text>
      <text x="512" y="278" fill="#94a3b8" font-family="monospace" font-size="12">Azimuth: 142.5° | Tilt: -0.4°</text>
      <text x="512" y="308" fill="#cbd5e1" font-family="monospace" font-size="12">${
        isAfter ? 'Strut Locknut Torqued: 45 Nm' : 'Wind Deflection: +1.8° Drift'
      }</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgGradientStart}"/>
        <stop offset="100%" stop-color="${bgGradientEnd}"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#bg)"/>
    <!-- Subtle Technical Reticle Grid -->
    <g stroke="#334155" stroke-width="0.7" opacity="0.45">
      <line x1="0" y1="90" x2="960" y2="90"/>
      <line x1="0" y1="180" x2="960" y2="180"/>
      <line x1="0" y1="270" x2="960" y2="270"/>
      <line x1="0" y1="360" x2="960" y2="360"/>
      <line x1="0" y1="450" x2="960" y2="450"/>
      <line x1="160" y1="0" x2="160" y2="540"/>
      <line x1="320" y1="0" x2="320" y2="540"/>
      <line x1="480" y1="0" x2="480" y2="540"/>
      <line x1="640" y1="0" x2="640" y2="540"/>
      <line x1="800" y1="0" x2="800" y2="540"/>
    </g>
    <!-- Top Camera Frame Header -->
    <rect x="28" y="22" width="904" height="52" rx="8" fill="#090d16" opacity="0.88" stroke="#334155" stroke-width="1.5"/>
    <text x="48" y="45" fill="#f8fafc" font-family="monospace" font-size="15" font-weight="bold">${title}</text>
    <text x="48" y="64" fill="#94a3b8" font-family="monospace" font-size="12">${subtitle} | SITE: ${siteCode}</text>
    <rect x="755" y="33" width="160" height="30" rx="5" fill="${badgeColor}"/>
    <text x="835" y="53" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold">${badgeText}</text>
    ${hardwareIllustration}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_PHOTO_ASSETS: PhotoAsset[] = [
  {
    id: 'PHO-2026-001',
    title: 'Sector-2 RRU CPRI Port 1 Water Ingress & Optical SFP+ Fault (Before Repair)',
    caption:
      'Observed moisture condensation inside cracked cold-shrink boot on Nokia AirScale RRH OPT1 port; optical Rx degraded to -31.8 dBm.',
    figureNumber: 'Figure 1.1',
    classification: 'Before',
    pairGroupId: 'PAIR-NTH-MTR-001-RRU',
    equipmentOrArea: 'Sector-2 Nokia AirScale RRH 4T4R (EQ-1002)',
    tags: ['RRU', 'CPRI', 'SFP+', 'Water Ingress', 'Before Repair'],
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    siteName: 'North Metro Financial Tower',
    siteAddress: '450 Commerce Blvd, North Metro District',
    region: 'North Metro',
    incidentId: 'INC-2026-101',
    workOrderId: 'WO-2026-9001',
    visitId: 'SV-2026-301',
    reportId: 'RPT-2026-501',
    originalDataUrl: buildTechnicalFieldPhotoDataUrl({
      title: 'FIELD EVIDENCE PHO-2026-001 — SECTOR 2 RRU CPRI PORT 1',
      subtitle: 'Pre-Maintenance Inspection — Cracked Weatherproofing Boot & Optical LOS',
      siteCode: 'NTH-MTR-001',
      badgeText: 'BEFORE REPAIR',
      badgeColor: '#dc2626',
      bgGradientStart: '#0f172a',
      bgGradientEnd: '#1e1b4b',
      highlightColor: '#ef4444',
      diagramType: 'rru-sfp',
      isAfter: false,
    }),
    isAnnotated: true,
    mimeType: 'image/svg+xml',
    width: 960,
    height: 540,
    fileSizeKb: 148,
    captureTimestamp: '2026-10-27T09:18:00Z',
    captureTimestampSource: 'Recorded (Device/EXIF)',
    uploadTimestamp: '2026-10-27T09:24:00Z',
    uploadedBy: 'Tariq Al-Mansoor',
    gpsCoordinates: {
      latitude: 37.7897,
      longitude: -122.4014,
      source: 'Recorded (Device/EXIF)',
    },
    annotations: [
      {
        id: 'ANN-101',
        tool: 'rect',
        color: '#ef4444',
        strokeWidth: 4,
        x: 400,
        y: 190,
        width: 165,
        height: 195,
      },
      {
        id: 'ANN-102',
        tool: 'arrow',
        color: '#facc15',
        strokeWidth: 4,
        x: 0,
        y: 0,
        points: [280, 355, 438, 355],
      },
      {
        id: 'ANN-103',
        tool: 'text',
        color: '#facc15',
        strokeWidth: 2,
        x: 145,
        y: 325,
        text: 'Cracked boot & corroded SFP+ latch',
        fontSize: 18,
      },
    ],
    stampConfig: {
      ...DEFAULT_PHOTO_STAMP_CONFIG,
      reportReference: 'TM-2026-000101',
      customText1: 'Optical Rx: -31.8 dBm (LOS Threshold Breach)',
    },
    revisionHistory: [
      {
        id: 'REV-PHO-1',
        revisionNumber: 1,
        timestamp: '2026-10-27T09:26:00Z',
        editorName: 'Tariq Al-Mansoor',
        editorRole: UserRole.FIELD_ENGINEER,
        summary: 'Highlighted cracked weatherproofing seal and OPT1 LOS status.',
        annotationCount: 3,
        stampEnabled: true,
      },
    ],
  },
  {
    id: 'PHO-2026-002',
    title: 'Sector-2 RRU CPRI Port 1 New SFP+ Transceiver & Cold-Shrink Seal (After Repair)',
    caption:
      'Replaced Finisar 9.8G SFP+ transceiver, cleaned LC/UPC bulkhead, and installed new 3M cold-shrink boot. Optical Rx restored to -5.4 dBm.',
    figureNumber: 'Figure 1.2',
    classification: 'After',
    pairGroupId: 'PAIR-NTH-MTR-001-RRU',
    equipmentOrArea: 'Sector-2 Nokia AirScale RRH 4T4R (EQ-1002)',
    tags: ['RRU', 'CPRI', 'SFP+', 'Restored', 'After Repair'],
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    siteName: 'North Metro Financial Tower',
    siteAddress: '450 Commerce Blvd, North Metro District',
    region: 'North Metro',
    incidentId: 'INC-2026-101',
    workOrderId: 'WO-2026-9001',
    visitId: 'SV-2026-301',
    reportId: 'RPT-2026-501',
    originalDataUrl: buildTechnicalFieldPhotoDataUrl({
      title: 'FIELD EVIDENCE PHO-2026-002 — SECTOR 2 RRU CPRI PORT 1',
      subtitle: 'Post-Repair Verification — New SFP+ Installed & Cold-Shrink Weatherproofed',
      siteCode: 'NTH-MTR-001',
      badgeText: 'AFTER REPAIR',
      badgeColor: '#16a34a',
      bgGradientStart: '#0f172a',
      bgGradientEnd: '#064e3b',
      highlightColor: '#22c55e',
      diagramType: 'rru-sfp',
      isAfter: true,
    }),
    isAnnotated: true,
    mimeType: 'image/svg+xml',
    width: 960,
    height: 540,
    fileSizeKb: 152,
    captureTimestamp: '2026-10-27T10:42:00Z',
    captureTimestampSource: 'Recorded (Device/EXIF)',
    uploadTimestamp: '2026-10-27T10:46:00Z',
    uploadedBy: 'Tariq Al-Mansoor',
    gpsCoordinates: {
      latitude: 37.7897,
      longitude: -122.4014,
      source: 'Recorded (Device/EXIF)',
    },
    annotations: [
      {
        id: 'ANN-201',
        tool: 'circle',
        color: '#22c55e',
        strokeWidth: 4,
        x: 482,
        y: 255,
        radius: 75,
      },
      {
        id: 'ANN-202',
        tool: 'text',
        color: '#4ade80',
        strokeWidth: 2,
        x: 390,
        y: 102,
        text: 'VERIFIED: Rx -5.4 dBm | VSWR 1.18:1 | 3M Cold-Shrink Applied',
        fontSize: 17,
      },
    ],
    stampConfig: {
      ...DEFAULT_PHOTO_STAMP_CONFIG,
      reportReference: 'TM-2026-000101',
      customText1: 'Optical Rx: -5.4 dBm (Verified Pass)',
    },
    revisionHistory: [
      {
        id: 'REV-PHO-2',
        revisionNumber: 1,
        timestamp: '2026-10-27T10:48:00Z',
        editorName: 'Tariq Al-Mansoor',
        editorRole: UserRole.FIELD_ENGINEER,
        summary: 'Marked restored CPRI optical link and sealed boot.',
        annotationCount: 2,
        stampEnabled: true,
      },
    ],
  },
  {
    id: 'PHO-2026-003',
    title: 'Eltek Flatpack2 DC Plant Slot-2 Rectifier Fan Fault (Before Replacement)',
    caption:
      'Rectifier Module #2 showing 0.0 VDC output due to seized cooling fan rotor; bus running on N+0 redundancy.',
    figureNumber: 'Figure 2.1',
    classification: 'Before',
    pairGroupId: 'PAIR-BSC-002-RECT',
    equipmentOrArea: 'Eltek Flatpack2 -48V DC Plant (EQ-2002)',
    tags: ['DC Power', 'Rectifier', 'Eltek', 'Before Replacement'],
    siteId: 'SITE-1002',
    siteCode: 'CENTRAL-BSC-002',
    siteName: 'Central Core & BSC Switching Complex',
    siteAddress: '1200 Telecom Way, Central Hub',
    region: 'Central Core',
    incidentId: 'INC-2026-102',
    workOrderId: 'WO-2026-9002',
    visitId: 'SV-2026-302',
    reportId: 'RPT-2026-502',
    originalDataUrl: buildTechnicalFieldPhotoDataUrl({
      title: 'FIELD EVIDENCE PHO-2026-003 — ELTEK FLATPACK2 SLOT 2',
      subtitle: 'DC Power Bay Inspection — Module #2 Thermal Shutdown & Fan Rotor Fault',
      siteCode: 'CENTRAL-BSC-002',
      badgeText: 'BEFORE REPAIR',
      badgeColor: '#d97706',
      bgGradientStart: '#0f172a',
      bgGradientEnd: '#3f2e1e',
      highlightColor: '#f59e0b',
      diagramType: 'rectifier-bus',
      isAfter: false,
    }),
    isAnnotated: true,
    mimeType: 'image/svg+xml',
    width: 960,
    height: 540,
    fileSizeKb: 142,
    captureTimestamp: '2026-10-27T08:15:00Z',
    captureTimestampSource: 'Recorded (Device/EXIF)',
    uploadTimestamp: '2026-10-27T08:25:00Z',
    uploadedBy: 'Elena Rostova',
    gpsCoordinates: {
      latitude: 37.7749,
      longitude: -122.4194,
      source: 'Site Registry',
    },
    annotations: [
      {
        id: 'ANN-301',
        tool: 'rect',
        color: '#f59e0b',
        strokeWidth: 4,
        x: 315,
        y: 150,
        width: 155,
        height: 200,
      },
    ],
    stampConfig: {
      ...DEFAULT_PHOTO_STAMP_CONFIG,
      reportReference: 'TM-2026-000102',
      customText1: 'Slot 2 Rectifier Module Faulty (0.0A)',
    },
    revisionHistory: [],
  },
  {
    id: 'PHO-2026-004',
    title: 'Eltek Flatpack2 DC Plant Slot-2 Hot-Swapped 3000W HE Module (After Replacement)',
    caption:
      'Installed new Eltek Flatpack2 48V/3000W HE module (SN: FP2-260988B). Active current sharing balanced at 27.5A across all 3 modules.',
    figureNumber: 'Figure 2.2',
    classification: 'After',
    pairGroupId: 'PAIR-BSC-002-RECT',
    equipmentOrArea: 'Eltek Flatpack2 -48V DC Plant (EQ-2002)',
    tags: ['DC Power', 'Rectifier', 'Eltek', 'After Replacement'],
    siteId: 'SITE-1002',
    siteCode: 'CENTRAL-BSC-002',
    siteName: 'Central Core & BSC Switching Complex',
    siteAddress: '1200 Telecom Way, Central Hub',
    region: 'Central Core',
    incidentId: 'INC-2026-102',
    workOrderId: 'WO-2026-9002',
    visitId: 'SV-2026-302',
    reportId: 'RPT-2026-502',
    originalDataUrl: buildTechnicalFieldPhotoDataUrl({
      title: 'FIELD EVIDENCE PHO-2026-004 — ELTEK FLATPACK2 SLOT 2',
      subtitle: 'Post-Swap Verification — Balanced Load Sharing (-53.8 VDC / 27A per Module)',
      siteCode: 'CENTRAL-BSC-002',
      badgeText: 'AFTER REPAIR',
      badgeColor: '#16a34a',
      bgGradientStart: '#0f172a',
      bgGradientEnd: '#064e3b',
      highlightColor: '#22c55e',
      diagramType: 'rectifier-bus',
      isAfter: true,
    }),
    isAnnotated: false,
    mimeType: 'image/svg+xml',
    width: 960,
    height: 540,
    fileSizeKb: 144,
    captureTimestamp: '2026-10-27T09:05:00Z',
    captureTimestampSource: 'Recorded (Device/EXIF)',
    uploadTimestamp: '2026-10-27T09:10:00Z',
    uploadedBy: 'Elena Rostova',
    gpsCoordinates: {
      latitude: 37.7749,
      longitude: -122.4194,
      source: 'Site Registry',
    },
    annotations: [],
    stampConfig: {
      ...DEFAULT_PHOTO_STAMP_CONFIG,
      reportReference: 'TM-2026-000102',
      customText1: 'Bus Float: -53.8 VDC | N+1 Redundancy Restored',
    },
    revisionHistory: [],
  },
];

export const DEMO_MEASUREMENT_RECORDS: MeasurementRecord[] = [
  {
    id: 'MSR-2026-01',
    visitId: 'SV-2026-301',
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    incidentId: 'INC-2026-101',
    workOrderId: 'WO-2026-9001',
    parameterName: 'CPRI Port 1 Optical Rx Power (Pre-Repair)',
    equipmentOrSector: 'Sector-2 Nokia AirScale RRH B1/B3',
    measuredValue: '-31.8',
    unit: 'dBm',
    referenceRange: '-3.0 to -11.5 dBm',
    status: 'Critical',
    testInstrument: 'EXFO FPM-300 Optical Power Meter',
    recordedAt: '2026-10-27T09:15:00Z',
    recordedBy: 'Tariq Al-Mansoor',
  },
  {
    id: 'MSR-2026-02',
    visitId: 'SV-2026-301',
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    incidentId: 'INC-2026-101',
    workOrderId: 'WO-2026-9001',
    parameterName: 'CPRI Port 1 Optical Rx Power (Post-Repair)',
    equipmentOrSector: 'Sector-2 Nokia AirScale RRH B1/B3',
    measuredValue: '-5.4',
    unit: 'dBm',
    referenceRange: '-3.0 to -11.5 dBm',
    status: 'Within Range',
    testInstrument: 'EXFO FPM-300 Optical Power Meter',
    recordedAt: '2026-10-27T10:35:00Z',
    recordedBy: 'Tariq Al-Mansoor',
  },
  {
    id: 'MSR-2026-03',
    visitId: 'SV-2026-301',
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    incidentId: 'INC-2026-101',
    workOrderId: 'WO-2026-9001',
    parameterName: 'Sector-2 RF Feeder Return Loss / VSWR Sweep',
    equipmentOrSector: 'Sector-2 TX/RX Port A-D (1800/2100 MHz)',
    measuredValue: '1.18',
    unit: 'ratio',
    referenceRange: '<= 1.40:1',
    status: 'Within Range',
    testInstrument: 'Anritsu Site Master S331L',
    recordedAt: '2026-10-27T10:40:00Z',
    recordedBy: 'Tariq Al-Mansoor',
  },
  {
    id: 'MSR-2026-04',
    visitId: 'SV-2026-302',
    siteId: 'SITE-1002',
    siteCode: 'CENTRAL-BSC-002',
    incidentId: 'INC-2026-102',
    workOrderId: 'WO-2026-9002',
    parameterName: '-48V DC Main Bus Float Voltage',
    equipmentOrSector: 'Eltek Flatpack2 DC Plant Busbar A',
    measuredValue: '-53.82',
    unit: 'VDC',
    referenceRange: '-53.50 to -54.20 VDC',
    status: 'Within Range',
    testInstrument: 'Fluke 87V True-RMS Multimeter',
    recordedAt: '2026-10-27T09:02:00Z',
    recordedBy: 'Elena Rostova',
  },
  {
    id: 'MSR-2026-05',
    visitId: 'SV-2026-302',
    siteId: 'SITE-1002',
    siteCode: 'CENTRAL-BSC-002',
    incidentId: 'INC-2026-102',
    workOrderId: 'WO-2026-9002',
    parameterName: 'VRLA Battery Bank String A State of Health',
    equipmentOrSector: '4x12V 190Ah Enersys PowerSafe String',
    measuredValue: '96.0',
    unit: '% SOH',
    referenceRange: '>= 85.0 % SOH',
    status: 'Within Range',
    testInstrument: 'Midtronics CELLTRON Advantage',
    recordedAt: '2026-10-27T09:12:00Z',
    recordedBy: 'Elena Rostova',
  },
];

export const DEMO_EQUIPMENT_REPLACEMENTS: EquipmentReplacement[] = [
  {
    id: 'EQR-2026-01',
    visitId: 'SV-2026-301',
    workOrderId: 'WO-2026-9001',
    incidentId: 'INC-2026-101',
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    equipmentCategory: 'RRU / RRH (Remote Radio)',
    sectorOrSlot: 'Sector-2 RRH OPT1 Cage',
    removedManufacturerModel: 'Finisar 9.8G CPRI SFP+ 1310nm 10km',
    removedPartNumber: 'FTLF1428P3BCV-N1',
    removedSerialNumber: 'FNS-2104892A',
    faultReason: 'Moisture corrosion on optical TOSA/ROSA pins due to cracked weatherproofing boot',
    installedManufacturerModel: 'Finisar 9.8G CPRI SFP+ 1310nm 10km',
    installedPartNumber: 'FTLF1428P3BCV-N2',
    installedSerialNumber: 'FNS-2609114K',
    firmwareVersion: 'REV-A4.2',
    verifiedOperational: true,
    replacedBy: 'Tariq Al-Mansoor',
    replacedAt: '2026-10-27T10:25:00Z',
  },
  {
    id: 'EQR-2026-02',
    visitId: 'SV-2026-302',
    workOrderId: 'WO-2026-9002',
    incidentId: 'INC-2026-102',
    siteId: 'SITE-1002',
    siteCode: 'CENTRAL-BSC-002',
    equipmentCategory: 'Rectifier & DC Power',
    sectorOrSlot: 'Shelf 1 — Slot 2',
    removedManufacturerModel: 'Eltek Flatpack2 48V/3000W HE',
    removedPartNumber: '241119.105',
    removedSerialNumber: 'FP2-1904412C',
    faultReason: 'Internal cooling fan rotor bearing seized; thermal protection tripped',
    installedManufacturerModel: 'Eltek Flatpack2 48V/3000W HE',
    installedPartNumber: '241119.105',
    installedSerialNumber: 'FP2-260988B',
    firmwareVersion: 'SW-4.08',
    verifiedOperational: true,
    replacedBy: 'Elena Rostova',
    replacedAt: '2026-10-27T08:50:00Z',
  },
];

export const DEMO_SPARE_PART_USAGES: SparePartUsage[] = [
  {
    id: 'SPU-2026-01',
    visitId: 'SV-2026-301',
    workOrderId: 'WO-2026-9001',
    incidentId: 'INC-2026-101',
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    partNumber: 'FTLF1428P3BCV-N2',
    partName: '10G/9.8G CPRI SFP+ Single-Mode Optical Transceiver',
    category: 'Optical Transceiver',
    quantity: 1,
    unit: 'pcs',
    serialOrBatchNumber: 'FNS-2609114K',
    warehouseSource: 'North Metro Regional Depot Van-04',
    usedBy: 'Tariq Al-Mansoor',
    recordedAt: '2026-10-27T10:25:00Z',
  },
  {
    id: 'SPU-2026-02',
    visitId: 'SV-2026-301',
    workOrderId: 'WO-2026-9001',
    incidentId: 'INC-2026-101',
    siteId: 'SITE-1001',
    siteCode: 'NTH-MTR-001',
    partNumber: '3M-CSB-98-CPRI',
    partName: '3M Cold-Shrink Weatherproofing Boot Assembly',
    category: 'Weatherproofing & Sealing',
    quantity: 2,
    unit: 'kits',
    serialOrBatchNumber: 'LOT-2026-08A',
    warehouseSource: 'North Metro Regional Depot Van-04',
    usedBy: 'Tariq Al-Mansoor',
    recordedAt: '2026-10-27T10:30:00Z',
  },
  {
    id: 'SPU-2026-03',
    visitId: 'SV-2026-302',
    workOrderId: 'WO-2026-9002',
    incidentId: 'INC-2026-102',
    siteId: 'SITE-1002',
    siteCode: 'CENTRAL-BSC-002',
    partNumber: '241119.105',
    partName: 'Eltek Flatpack2 48V 3000W HE Rectifier Module',
    category: 'DC Power Module',
    quantity: 1,
    unit: 'pcs',
    serialOrBatchNumber: 'FP2-260988B',
    warehouseSource: 'Central Core Spares Cage B2',
    usedBy: 'Elena Rostova',
    recordedAt: '2026-10-27T08:50:00Z',
  },
];

export function enrichSiteVisitsWithPhase4(visits: SiteVisit[]): SiteVisit[] {
  return visits.map((sv, idx) => {
    const isFirst = idx === 0 || sv.id === 'SV-2026-301';
    const isSecond = idx === 1 || sv.id === 'SV-2026-302';

    const visitPhotos = DEMO_PHOTO_ASSETS.filter((p) => p.visitId === sv.id).map((p) => p.id);
    const visitMeasurements = DEMO_MEASUREMENT_RECORDS.filter((m) => m.visitId === sv.id);
    const visitReplacements = DEMO_EQUIPMENT_REPLACEMENTS.filter((r) => r.visitId === sv.id);
    const visitSpares = DEMO_SPARE_PART_USAGES.filter((s) => s.visitId === sv.id);

    // Ensure checklist items never default to Pass if untested
    const normalizedChecklist: ChecklistItemResult[] | undefined = sv.checklistItems?.map(
      (item) => ({
        ...item,
        unit: item.unit || (item.measuredValue?.includes('dBm') ? 'dBm' : undefined),
        result: item.result === 'Pending' ? 'Not Tested' : item.result,
      })
    );

    return {
      ...sv,
      siteAddress:
        sv.siteAddress ||
        (isFirst
          ? '450 Commerce Blvd, North Metro District'
          : isSecond
          ? '1200 Telecom Way, Central Hub'
          : '88 Harbor View Rd, South Coast'),
      region: sv.region || (isFirst ? 'North Metro' : isSecond ? 'Central Core' : 'South Coast'),
      operator: sv.operator || 'ApexTel Carrier Group',
      gpsCoordinates: sv.gpsCoordinates || {
        latitude: isFirst ? 37.7897 : isSecond ? 37.7749 : 37.7599,
        longitude: isFirst ? -122.4014 : isSecond ? -122.4194 : -122.3894,
        source: 'Site Registry',
      },
      checkInSource: sv.checkInSource || (sv.checkInTime ? 'Device Recorded' : undefined),
      workStartTime:
        sv.workStartTime || (sv.checkInTime ? '2026-10-27T09:10:00Z' : undefined),
      workStartSource: sv.workStartSource || (sv.checkInTime ? 'Device Recorded' : undefined),
      workCompletionTime:
        sv.workCompletionTime || (sv.checkOutTime ? '2026-10-27T10:45:00Z' : undefined),
      workCompletionSource:
        sv.workCompletionSource || (sv.checkOutTime ? 'Device Recorded' : undefined),
      checkOutSource: sv.checkOutSource || (sv.checkOutTime ? 'Device Recorded' : undefined),
      createdAt: sv.createdAt || '2026-10-27T08:00:00Z',
      updatedAt: sv.updatedAt || '2026-10-27T11:00:00Z',
      submissionState: sv.submissionState || (sv.status === 'Completed' ? 'Submitted' : 'Draft'),
      initialSiteCondition:
        sv.initialSiteCondition ||
        (isFirst
          ? 'Compound gate locked; aviation obstruction light normal; Sector-2 RRU CPRI alarm LED flashing red on tower leg B.'
          : 'Shelter HVAC nominal (+22.4°C); Eltek DC shelf showing major alarm LED on Slot 2.'),
      reportedFault:
        sv.reportedFault ||
        (isFirst
          ? 'Sector-2 LTE/5G Cell Outage — CPRI Optical Link Loss of Signal (LOS) on RRH OPT1'
          : 'Rectifier Module #2 Failure & Redundancy Loss on -48V DC Bus'),
      suspectedRootCause:
        sv.suspectedRootCause ||
        (isFirst
          ? 'Suspected fiber jumper pinch or degraded CPRI SFP+ transceiver at tower-top RRH'
          : 'Rectifier cooling fan failure causing thermal trip'),
      confirmedRootCause:
        sv.confirmedRootCause ||
        (isFirst
          ? 'UV-degraded weatherproofing boot on Sector-2 RRH OPT1 allowed moisture ingress onto SFP+ optical pins.'
          : 'Seized ball bearing on Slot-2 Eltek Flatpack2 internal blower fan.'),
      correctiveActions:
        sv.correctiveActions ||
        (isFirst
          ? 'Cleaned LC/UPC fiber end-faces, replaced 9.8G CPRI SFP+ transceiver, and sealed port with new 3M cold-shrink boot.'
          : 'Hot-swapped Slot-2 Eltek 3000W HE rectifier module and verified active current sharing.'),
      preventiveRecommendations:
        sv.preventiveRecommendations ||
        (isFirst
          ? 'Inspect Sector-1 and Sector-3 RRH cold-shrink boots during Q4 preventive tower climb.'
          : 'Schedule vacuum dust cleaning of DC rack intake filters every 6 months.'),
      finalVisitOutcome:
        sv.finalVisitOutcome ||
        (sv.status === 'Completed' ? 'Resolved / Restored' : 'Not Recorded'),
      checklistItems: normalizedChecklist,
      equipmentRecords: sv.equipmentRecords || [
        isFirst
          ? {
              id: `VEQ-${sv.id}-1`,
              equipmentId: 'EQ-1002',
              equipmentCategory: 'RRU / RRH (Remote Radio)',
              manufacturer: 'Nokia',
              model: 'AirScale RRH 4T4R B1/B3 160W',
              equipmentIdentifier: 'NTH-MTR-001-RRH-S2',
              serialNumber: 'NK-RRH-8841209',
              originalCondition: 'Faulty / Down',
              faultSymptoms: 'OPT1 CPRI Link Down, Optical Rx -31.8 dBm, VSWR alarm masked',
              diagnosticObservations:
                'Moisture residue inside OPT1 gland; LC fiber ferrule intact after scope cleaning.',
              replacementParts: 'Finisar 9.8G SFP+ (FTLF1428P3BCV-N2), 3M Cold-Shrink Boot',
              removedEquipmentDetails: 'Finisar SFP+ SN: FNS-2104892A (corroded pins)',
              installedEquipmentDetails: 'Finisar SFP+ SN: FNS-2609114K (Rx -5.4 dBm)',
              testAndVerificationResults:
                'CPRI link locked at 9.8304 Gbps; VSWR 1.18:1; Sector-2 S1-U/NG-U traffic active.',
            }
          : {
              id: `VEQ-${sv.id}-1`,
              equipmentId: 'EQ-2002',
              equipmentCategory: 'Rectifier & DC Power',
              manufacturer: 'Eltek',
              model: 'Flatpack2 48V/3000W HE System',
              equipmentIdentifier: 'CENTRAL-BSC-002-DC-01',
              serialNumber: 'ELT-SYS-99201',
              originalCondition: 'Degraded',
              faultSymptoms: 'Slot-2 rectifier output 0.0A; Smartpack2 major alarm relay active',
              diagnosticObservations: 'Internal cooling fan rotor locked; bus voltage held by Slots 1 & 3.',
              replacementParts: 'Eltek Flatpack2 48V/3000W HE (PN: 241119.105)',
              removedEquipmentDetails: 'SN: FP2-1904412C',
              installedEquipmentDetails: 'SN: FP2-260988B',
              testAndVerificationResults:
                'Float voltage -53.82 VDC; balanced load sharing 27.5A per module.',
            },
      ],
      measurementRecords:
        sv.measurementRecords && sv.measurementRecords.length > 0
          ? sv.measurementRecords
          : visitMeasurements,
      equipmentReplacements:
        sv.equipmentReplacements && sv.equipmentReplacements.length > 0
          ? sv.equipmentReplacements
          : visitReplacements,
      sparePartUsages:
        sv.sparePartUsages && sv.sparePartUsages.length > 0 ? sv.sparePartUsages : visitSpares,
      photoAssetIds:
        sv.photoAssetIds && sv.photoAssetIds.length > 0 ? sv.photoAssetIds : visitPhotos,
    };
  });
}

export function enrichMaintenanceReportsWithPhase4(
  reports: MaintenanceReport[]
): MaintenanceReport[] {
  const enrichedExisting = reports.map((r, idx): MaintenanceReport => {
    const isFirst = idx === 0;
    const reportNumber = r.reportNumber.startsWith('TM-')
      ? r.reportNumber
      : `TM-2026-00010${idx + 1}`;
    return {
      ...r,
      reportNumber,
      reportType:
        r.reportType ||
        (isFirst ? 'Corrective Maintenance Report' : 'Power System Maintenance Report'),
      revisionNumber: r.revisionNumber || 1,
      revisionCode: r.revisionCode || 'Rev 1.0',
      siteName:
        r.siteName ||
        (isFirst ? 'North Metro Financial Tower' : 'Central Core & BSC Switching Complex'),
      region: r.region || (isFirst ? 'North Metro' : 'Central Core'),
      operator: r.operator || 'ApexTel Carrier Group',
      linkedWorkOrderId: r.linkedWorkOrderId || (isFirst ? 'WO-2026-9001' : 'WO-2026-9002'),
      linkedIncidentId: r.linkedIncidentId || (isFirst ? 'INC-2026-101' : 'INC-2026-102'),
      linkedVisitIds: r.linkedVisitIds || [isFirst ? 'SV-2026-301' : 'SV-2026-302'],
      linkedAlarmIds: r.linkedAlarmIds || [isFirst ? 'ALM-90101' : 'ALM-90102'],
      photoAssetIds:
        r.photoAssetIds ||
        (isFirst ? ['PHO-2026-001', 'PHO-2026-002'] : ['PHO-2026-003', 'PHO-2026-004']),
      priority: r.priority || (isFirst ? 'P1 - Critical' : 'P2 - High'),
      authorRole: r.authorRole || UserRole.FIELD_ENGINEER,
      reviewedBy:
        r.reviewedBy || (r.approvalStatus === 'Approved' ? 'Marcus Vance (Team Leader)' : undefined),
      reviewedAt:
        r.reviewedAt || (r.approvalStatus === 'Approved' ? '2026-10-27T11:30:00Z' : undefined),
      approvedBy:
        r.approvedBy ||
        (r.approvalStatus === 'Approved' ? 'Sofia Lindqvist (Maintenance Manager)' : undefined),
      approvedAt:
        r.approvedAt || (r.approvalStatus === 'Approved' ? '2026-10-27T11:45:00Z' : undefined),
      generatedAt: r.generatedAt || r.submittedAt || '2026-10-27T11:10:00Z',
      updatedAt: r.updatedAt || '2026-10-27T11:45:00Z',
      confidentialityLabel: r.confidentialityLabel || 'INTERNAL ENGINEERING USE ONLY',
      purposeOfVisit:
        r.purposeOfVisit ||
        (isFirst
          ? 'Emergency tower climb and CPRI optical restoration on Sector-2 Nokia AirScale RRH.'
          : 'Corrective hot-swap of faulty Eltek Flatpack2 3000W rectifier module and battery conductance test.'),
      serviceImpactSummary:
        r.serviceImpactSummary ||
        (isFirst
          ? 'Sector-2 4G LTE / 5G NR cell outage (approx. 1,450 active UE sessions shifted to neighboring sectors during fault window).'
          : 'Zero traffic outage; DC plant operated on N+0 redundancy for 95 minutes prior to module replacement.'),
      mainFindings:
        r.mainFindings ||
        (isFirst
          ? 'Cracked weatherproofing boot on RRH OPT1 allowed moisture ingress onto 9.8G SFP+ transceiver pins, dropping Rx power to -31.8 dBm.'
          : 'Slot-2 rectifier cooling fan bearing seized, triggering internal thermal shutdown.'),
      finalOutcome:
        r.finalOutcome ||
        (isFirst
          ? 'SFP+ transceiver and cold-shrink boot replaced; optical Rx restored to -5.4 dBm; Sector-2 cell traffic verified nominal.'
          : 'New 3000W HE rectifier installed in Slot-2; bus float verified at -53.82 VDC with balanced load sharing.'),
      diagnosticProcedures:
        r.diagnosticProcedures ||
        (isFirst
          ? '1. Optical power measurement at BBU and RRH using EXFO FPM-300.\n2. IEC 61300-3-35 fiber end-face scope inspection.\n3. Anritsu Site Master VSWR return loss sweep across 1800/2100 MHz.'
          : '1. True-RMS bus voltage and ripple check with Fluke 87V.\n2. Smartpack2 controller alarm log extraction.\n3. Midtronics battery string conductance test.'),
      postRepairVerificationChecks:
        r.postRepairVerificationChecks ||
        (isFirst
          ? 'CPRI link locked at 9.8 Gbps with zero CRC errors over 30-minute soak test; VSWR 1.18:1; NOC confirmed ALM-90101 cleared.'
          : 'All three rectifier modules sharing load within 1.5% variance; LLVD/BLVD thresholds verified; NOC confirmed external dry-contact alarm cleared.'),
      connectivityAndAlarmStatus:
        r.connectivityAndAlarmStatus ||
        'All active NE and external dry-contact alarms cleared; S1/NG/Abis links stable.',
      outstandingFaults: r.outstandingFaults || 'None recorded.',
      recommendations:
        r.recommendations ||
        (isFirst
          ? 'Perform preventive cold-shrink boot inspection on Sector-1 and Sector-3 RRHs during next scheduled climb.'
          : 'Include rectifier fan RPM telemetry check in monthly NOC remote health audit.'),
      revisionHistory: r.revisionHistory || [
        {
          revisionNumber: 1,
          revisionCode: 'Rev 1.0',
          statusAtRevision: r.approvalStatus,
          generatedAt: r.submittedAt || '2026-10-27T11:10:00Z',
          generatedBy: r.authorName,
          generatedByRole: UserRole.FIELD_ENGINEER,
          changeNotes: 'Initial engineering report generated from field visit records and measurements.',
        },
      ],
      approvalRecords:
        r.approvalRecords ||
        (r.approvalStatus === 'Approved'
          ? [
              {
                id: `APR-${r.id}-1`,
                action: 'Submitted for Review',
                actorName: r.authorName,
                actorRole: UserRole.FIELD_ENGINEER,
                timestamp: '2026-10-27T11:12:00Z',
                comments: 'Submitted with before/after stamped photos and Site Master/EXFO measurements.',
                verificationMethod: 'Authenticated Role Sign-Off (In-App)',
              },
              {
                id: `APR-${r.id}-2`,
                action: 'Approved',
                actorName: 'Sofia Lindqvist',
                actorRole: UserRole.MAINTENANCE_MANAGER,
                timestamp: '2026-10-27T11:45:00Z',
                comments: 'Verified optical Rx margin (-5.4 dBm) and cold-shrink weatherproofing evidence.',
                verificationMethod: 'Authenticated Role Sign-Off (In-App)',
              },
            ]
          : []),
    };
  });

  // Add a third seed report if fewer than 3 exist so users see Approved, Pending Review, and Draft/Generated states
  if (enrichedExisting.length < 3) {
    enrichedExisting.push({
      id: 'RPT-2026-503',
      reportNumber: 'TM-2026-000103',
      reportType: 'Incident Investigation Report',
      revisionNumber: 1,
      revisionCode: 'Rev 1.0',
      siteId: 'SITE-1001',
      siteCode: 'NTH-MTR-001',
      siteName: 'North Metro Financial Tower',
      region: 'North Metro',
      operator: 'ApexTel Carrier Group',
      workOrderNumber: 'WO-2026-9001',
      linkedWorkOrderId: 'WO-2026-9001',
      linkedIncidentId: 'INC-2026-101',
      linkedVisitIds: ['SV-2026-301'],
      linkedAlarmIds: ['ALM-90101'],
      photoAssetIds: ['PHO-2026-001', 'PHO-2026-002'],
      priority: 'P1 - Critical',
      title: 'Root Cause & SLA Investigation Report — NTH-MTR-001 Sector-2 CPRI Outage',
      authorName: 'Marcus Vance',
      authorRole: UserRole.TEAM_LEADER,
      submittedAt: '2026-10-27T12:05:00Z',
      generatedAt: '2026-10-27T12:05:00Z',
      updatedAt: '2026-10-27T12:05:00Z',
      approvalStatus: 'Pending Review',
      confidentialityLabel: 'CONFIDENTIAL — CARRIER OPERATIONS',
      summary:
        'End-to-end technical investigation of P1 critical cell outage INC-2026-101 at North Metro Financial Tower, covering OSS alarm correlation, dispatch timeline, optical link budget measurements, and hardware replacement.',
      purposeOfVisit: 'Verify root cause of CPRI link flap and restore Sector-2 4G/5G radio service.',
      serviceImpactSummary: 'Single-sector outage lasting 87 minutes; zero core network impact.',
      mainFindings: 'Weatherproofing boot crack on RRH OPT1 caused moisture damage to 9.8G SFP+ module.',
      finalOutcome: 'Service restored and alarm cleared in Nokia NetAct OSS; awaiting final manager sign-off.',
      diagnosticProcedures:
        'NetAct OSS trap correlation + field optical power meter test + VSWR sweep.',
      postRepairVerificationChecks:
        'Verified 0% packet loss and nominal KPIs (RRC setup success rate 99.84%).',
      connectivityAndAlarmStatus: 'Cleared in network.',
      outstandingFaults: 'None recorded.',
      recommendations: 'Add cold-shrink boot inspection to pre-winter tower checklist.',
      revisionHistory: [
        {
          revisionNumber: 1,
          revisionCode: 'Rev 1.0',
          statusAtRevision: 'Pending Review',
          generatedAt: '2026-10-27T12:05:00Z',
          generatedBy: 'Marcus Vance',
          generatedByRole: UserRole.TEAM_LEADER,
          changeNotes: 'Initial RCA report compiled for Maintenance Manager review.',
        },
      ],
      approvalRecords: [
        {
          id: 'APR-RPT-503-1',
          action: 'Submitted for Review',
          actorName: 'Marcus Vance',
          actorRole: UserRole.TEAM_LEADER,
          timestamp: '2026-10-27T12:05:00Z',
          comments: 'Ready for Maintenance Manager approval.',
          verificationMethod: 'Authenticated Role Sign-Off (In-App)',
        },
      ],
    });
  }

  return enrichedExisting;
}
