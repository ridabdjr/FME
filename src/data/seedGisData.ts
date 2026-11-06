import { TelecomGisFeature } from '../types/models';

/**
 * PHASE 2 — SEEDED TELECOM GIS INFRASTRUCTURE FEATURES
 * Connects geographically to the 8 seeded telecom sites in DEMO_SITES:
 * - SITE-1001 (NTH-MTR-001): [-118.4452, 34.0689] Northgate Financial Hub Macro
 * - SITE-1002 (NTH-IND-018): [-118.5104, 34.0921] Harbor West Logistics Tower (Offline)
 * - SITE-1003 (CTR-BSC-002): [-118.2437, 34.0522] Central Switching & BSC Aggregation Node
 * - SITE-1004 (STH-HWY-044): [-118.1892, 33.8415] South Ridge Valley Relay Tower
 * - SITE-1005 (HLD-MW-009):  [-117.9845, 34.2108] Highland Crest Microwave Repeater
 * - SITE-1006 (CTR-IBS-012): [-118.4081, 33.9425] Metro International Airport Concourse B DAS
 * - SITE-1007 (STH-MET-029): [-118.1937, 33.7701] Bayview Tech Park Rooftop Sector
 * - SITE-1008 (NTH-SUB-063): [-118.3911, 34.1478] Oakridge Residential Monopole
 *
 * Note: GeoJSON coordinates strictly follow [longitude, latitude] (RFC 7946).
 */

export const DEMO_GIS_FEATURES: TelecomGisFeature[] = [
  // B. FIBER & TRANSMISSION INFRASTRUCTURE — Fiber-Optic Routes (LineString)
  {
    id: 'GIS-FBR-101',
    layerGroup: 'fiber-transmission',
    featureType: 'Fiber Route',
    name: 'North Metro DWDM Ring Segment A (CTR-BSC-002 to NTH-MTR-001)',
    description:
      '144-core Single-Mode G.652D underground armored fiber trunk connecting Central BSC Aggregation Node to Northgate Financial Hub.',
    region: 'North Metro',
    operator: 'ApexTel Carrier Group',
    status: 'Operational',
    linkedSiteId: 'SITE-1001',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-118.2437, 34.0522],
        [-118.312, 34.0595],
        [-118.3785, 34.0642],
        [-118.4452, 34.0689],
      ],
    },
    properties: {
      cableType: '144F SM G.652D Armored',
      capacityGbps: 400,
      burialDepthMeters: 1.4,
      installYear: 2024,
    },
    createdBy: 'Sofia Lindqvist',
    updatedBy: 'Karim Mansour',
    createdAt: '2025-02-15T10:00:00Z',
    updatedAt: '2026-10-20T09:00:00Z',
  },
  {
    id: 'GIS-FBR-102',
    layerGroup: 'fiber-transmission',
    featureType: 'Fiber Route',
    name: 'Aviation & South Corridor Optical Trunk (CTR-BSC-002 to STH-MET-029)',
    description:
      '96-core DWDM optical feeder linking Central Core Exchange via Metro Airport Concourse B DAS to Bayview Tech Park.',
    region: 'Central',
    operator: 'ApexTel Carrier Group',
    status: 'Operational',
    linkedSiteId: 'SITE-1003',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-118.2437, 34.0522],
        [-118.329, 33.995],
        [-118.4081, 33.9425],
        [-118.305, 33.855],
        [-118.1937, 33.7701],
      ],
    },
    properties: {
      cableType: '96F SM G.655 NZDSF',
      capacityGbps: 200,
      topology: 'Protected Linear Spur',
    },
    createdBy: 'Sofia Lindqvist',
    updatedBy: 'Youssef Haddad',
    createdAt: '2025-03-10T11:30:00Z',
    updatedAt: '2026-10-25T16:15:00Z',
  },
  {
    id: 'GIS-DUCT-103',
    layerGroup: 'fiber-transmission',
    featureType: 'Underground Duct',
    name: 'Harbor West 4-Way HDPE Sub-Duct Corridor (NTH-MTR-001 to NTH-IND-018)',
    description:
      '4x50mm HDPE underground telecom conduit bank along Harbor Logistics corridor.',
    region: 'North Metro',
    operator: 'ApexTel Carrier Group',
    status: 'Operational',
    linkedSiteId: 'SITE-1002',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-118.4452, 34.0689],
        [-118.478, 34.0815],
        [-118.5104, 34.0921],
      ],
    },
    properties: {
      ductMaterial: '4x50mm HDPE SDR11',
      occupiedSubducts: 2,
      spareSubducts: 2,
    },
    createdBy: 'Elena Rostova-Alvarez',
    updatedBy: 'Elena Rostova-Alvarez',
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2026-10-12T12:00:00Z',
  },
  // B. FIBER & TRANSMISSION INFRASTRUCTURE — Microwave Links (LineString)
  {
    id: 'GIS-MW-104',
    layerGroup: 'fiber-transmission',
    featureType: 'Microwave Link',
    name: '18GHz Backhaul Hop HLD-CTR (HLD-MW-009 <-> CTR-BSC-002)',
    description:
      'Long-haul split-mount Ericsson MINI-LINK 6692 18GHz radio hop. Currently experiencing RSL fade degradation (-58.2 dBm) and ACM downshift under INC-2026-0404.',
    region: 'Highland',
    operator: 'National Shared Towers Co.',
    status: 'Degraded',
    linkedSiteId: 'SITE-1005',
    linkedIncidentId: 'INC-2026-0404',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-117.9845, 34.2108],
        [-118.2437, 34.0522],
      ],
    },
    properties: {
      frequencyBand: '18 GHz',
      channelBandwidthMHz: 56,
      modulationProfile: 'ACM 16QAM (Degraded from 256QAM)',
      rslDbm: -58.2,
      equipmentModel: 'Ericsson MINI-LINK 6692',
    },
    createdBy: 'Youssef Haddad',
    updatedBy: 'Youssef Haddad',
    createdAt: '2024-08-14T14:00:00Z',
    updatedAt: '2026-10-27T04:20:00Z',
  },
  {
    id: 'GIS-MW-105',
    layerGroup: 'fiber-transmission',
    featureType: 'Microwave Link',
    name: '23GHz Spur Hop NTH-SUB-063 <-> NTH-MTR-001',
    description: 'Short-haul 23GHz IP microwave backhaul feeding Oakridge Residential Monopole.',
    region: 'North Metro',
    operator: 'National Shared Towers Co.',
    status: 'Operational',
    linkedSiteId: 'SITE-1008',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-118.3911, 34.1478],
        [-118.4452, 34.0689],
      ],
    },
    properties: {
      frequencyBand: '23 GHz',
      channelBandwidthMHz: 112,
      modulationProfile: '512QAM Nominal',
      rslDbm: -34.8,
    },
    createdBy: 'Youssef Haddad',
    updatedBy: 'Youssef Haddad',
    createdAt: '2025-03-10T10:00:00Z',
    updatedAt: '2026-10-08T15:00:00Z',
  },
  {
    id: 'GIS-MW-106',
    layerGroup: 'fiber-transmission',
    featureType: 'Microwave Link',
    name: '15GHz Relay Hop STH-HWY-044 <-> STH-MET-029',
    description:
      'South Corridor microwave link tying Highway 9C Relay Tower to Bayview Tech Park fiber node.',
    region: 'South Corridor',
    operator: 'National Shared Towers Co.',
    status: 'Operational',
    linkedSiteId: 'SITE-1004',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-118.1892, 33.8415],
        [-118.1937, 33.7701],
      ],
    },
    properties: {
      frequencyBand: '15 GHz',
      channelBandwidthMHz: 56,
      rslDbm: -38.1,
    },
    createdBy: 'Youssef Haddad',
    updatedBy: 'Marcus Chen',
    createdAt: '2024-05-01T08:00:00Z',
    updatedAt: '2026-09-05T11:00:00Z',
  },
  // B. FIBER & TRANSMISSION INFRASTRUCTURE — Manholes, FDTs & Splitters (Point)
  {
    id: 'GIS-MH-107',
    layerGroup: 'fiber-transmission',
    featureType: 'Manhole / Handhole',
    name: 'MH-NTH-042 Splice Chamber (Midtown West)',
    description:
      'Pre-cast concrete telecom manhole housing 144F dome splice closure and OTDR test access loop.',
    region: 'North Metro',
    operator: 'ApexTel Carrier Group',
    status: 'Operational',
    linkedSiteId: 'SITE-1001',
    geometry: {
      type: 'Point',
      coordinates: [-118.3785, 34.0642],
    },
    properties: {
      chamberType: 'Heavy-Duty Carriageway Manhole J4',
      spliceClosureCount: 2,
      waterLevelSensor: 'Dry / Nominal',
    },
    createdBy: 'David Okafor',
    updatedBy: 'David Okafor',
    createdAt: '2025-02-15T12:00:00Z',
    updatedAt: '2026-10-12T10:00:00Z',
  },
  {
    id: 'GIS-FDT-108',
    layerGroup: 'fiber-transmission',
    featureType: 'Fiber Distribution Cabinet (FDT)',
    name: 'FDT-CTR-019 Street Optical Cross-Connect Cabinet',
    description:
      '288-port stainless street FDT serving enterprise leased lines and small-cell CPRI fronthaul.',
    region: 'Central',
    operator: 'ApexTel Carrier Group',
    status: 'Operational',
    linkedSiteId: 'SITE-1003',
    geometry: {
      type: 'Point',
      coordinates: [-118.329, 33.995],
    },
    properties: {
      portCapacity: 288,
      activePorts: 214,
      connectorType: 'LC/APC',
    },
    createdBy: 'Youssef Haddad',
    updatedBy: 'Youssef Haddad',
    createdAt: '2025-04-01T09:00:00Z',
    updatedAt: '2026-10-19T14:00:00Z',
  },
  {
    id: 'GIS-SPL-109',
    layerGroup: 'fiber-transmission',
    featureType: 'Optical Splitter / FAT',
    name: 'FAT-STH-088 Pole-Mounted 1:32 PLC Optical Terminal',
    description: 'Outdoor IP68 fiber access terminal and 1:32 PLC splitter near Bayview promenade.',
    region: 'South Corridor',
    operator: 'ApexTel Carrier Group',
    status: 'Operational',
    linkedSiteId: 'SITE-1007',
    geometry: {
      type: 'Point',
      coordinates: [-118.248, 33.812],
    },
    properties: {
      splitterRatio: '1:32 PLC',
      insertionLossDb: 16.4,
    },
    createdBy: 'Marcus Chen',
    updatedBy: 'Marcus Chen',
    createdAt: '2025-06-11T10:00:00Z',
    updatedAt: '2026-10-20T08:00:00Z',
  },
  // C. EQUIPMENT & INFRASTRUCTURE — Cabinets, Power/Generators, Polygons
  {
    id: 'GIS-EQP-201',
    layerGroup: 'equipment-infra',
    featureType: 'Power / Rectifier / DG Pad',
    name: 'Harbor West 30kVA Cummins DG & Eltek 48V Plant Pad',
    description:
      'External concrete generator pad and ATS enclosure at NTH-IND-018. Active P1 emergency repair underway (INC-2026-0401 / WO-2026-9001).',
    region: 'North Metro',
    operator: 'ApexTel Carrier Group',
    status: 'Offline',
    linkedSiteId: 'SITE-1002',
    linkedIncidentId: 'INC-2026-0401',
    geometry: {
      type: 'Point',
      coordinates: [-118.5112, 34.0926],
    },
    properties: {
      generatorCapacityKva: 30,
      rectifierModel: 'Eltek Flatpack2 48V 18kW',
      fuelTankLevelPercent: 78,
    },
    createdBy: 'David Okafor',
    updatedBy: 'David Okafor',
    createdAt: '2024-11-05T10:00:00Z',
    updatedAt: '2026-10-27T10:15:00Z',
  },
  {
    id: 'GIS-EQP-202',
    layerGroup: 'equipment-infra',
    featureType: 'Outdoor Telecom Cabinet',
    name: 'Northgate Rooftop BBU6648 & -48V LiFePO4 Enclosure',
    description:
      'Dual-bay IP55 outdoor RAN baseband and battery cabinet feeding 5G Massive MIMO AAU sectors.',
    region: 'North Metro',
    operator: 'ApexTel Carrier Group',
    status: 'Operational',
    linkedSiteId: 'SITE-1001',
    geometry: {
      type: 'Point',
      coordinates: [-118.4446, 34.0693],
    },
    properties: {
      cabinetVendor: 'Ericsson Enclosure 6150',
      batteryAutonomyHours: 8,
    },
    createdBy: 'Elena Rostova-Alvarez',
    updatedBy: 'David Okafor',
    createdAt: '2025-02-16T09:00:00Z',
    updatedAt: '2026-10-27T07:55:00Z',
  },
  {
    id: 'GIS-EQP-203',
    layerGroup: 'equipment-infra',
    featureType: 'Battery & Env Sensor Node',
    name: 'Bayview Rooftop Shelter HVAC & Surge Arrestor Monitor',
    description:
      'Vertiv NetSure dry-contact environmental sensor and Class I/II SPD monitor at STH-MET-029.',
    region: 'South Corridor',
    operator: 'ApexTel Carrier Group',
    status: 'Maintenance',
    linkedSiteId: 'SITE-1007',
    linkedIncidentId: 'INC-2026-0405',
    geometry: {
      type: 'Point',
      coordinates: [-118.1942, 33.7706],
    },
    properties: {
      ambientTempCelsius: 36.2,
      earthResistanceOhms: 2.1,
    },
    createdBy: 'Marcus Chen',
    updatedBy: 'Marcus Chen',
    createdAt: '2025-01-20T11:00:00Z',
    updatedAt: '2026-10-27T09:10:00Z',
  },
  {
    id: 'GIS-POLY-204',
    layerGroup: 'equipment-infra',
    featureType: 'Infrastructure Area / Compound',
    name: 'Central Exchange & BSC Core Campus Security Perimeter',
    description:
      'Fenced telecom core switching compound housing mcBSC subracks, OSN 9800 DWDM OLT, and dual 150kVA standby generators.',
    region: 'Central',
    operator: 'ApexTel Carrier Group',
    status: 'Degraded',
    linkedSiteId: 'SITE-1003',
    linkedIncidentId: 'INC-2026-0402',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-118.262, 34.062],
          [-118.225, 34.062],
          [-118.225, 34.041],
          [-118.262, 34.041],
          [-118.262, 34.062],
        ],
      ],
    },
    properties: {
      zoneClassification: 'Tier-3 Core Telecom Facility',
      securityClearance: 'Biometric + NOC Escort',
    },
    createdBy: 'Sofia Lindqvist',
    updatedBy: 'Karim Mansour',
    createdAt: '2023-06-01T08:00:00Z',
    updatedAt: '2026-10-27T10:42:00Z',
  },
  {
    id: 'GIS-POLY-205',
    layerGroup: 'equipment-infra',
    featureType: 'Infrastructure Area / Compound',
    name: 'Harbor West Industrial Port Outage Impact Footprint',
    description:
      'Sector coverage polygon currently impacted by commercial AC + generator crank failure at NTH-IND-018.',
    region: 'North Metro',
    operator: 'ApexTel Carrier Group',
    status: 'Offline',
    linkedSiteId: 'SITE-1002',
    linkedIncidentId: 'INC-2026-0401',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-118.532, 34.106],
          [-118.489, 34.106],
          [-118.489, 34.078],
          [-118.532, 34.078],
          [-118.532, 34.106],
        ],
      ],
    },
    properties: {
      zoneClassification: 'Macro Sector Outage Zone',
      affectedCarriers: '2G / 3G / 4G / 5G',
    },
    createdBy: 'Karim Mansour',
    updatedBy: 'David Okafor',
    createdAt: '2026-10-27T09:20:00Z',
    updatedAt: '2026-10-27T10:12:00Z',
  },
];
