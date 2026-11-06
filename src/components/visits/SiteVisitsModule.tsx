import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Save,
  Search,
  Settings,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  exportValidatedJsonPackage,
  validateAndProcessUploadedImage,
} from '../../services/reportExportService';
import {
  ChecklistDomainType,
  ChecklistItemResult,
  ChecklistResultStatus,
  EquipmentCategory,
  PhotoClassification,
  SiteVisit,
  TimestampRecordSource,
  VisitFinalOutcome,
} from '../../types/models';
import { formatUtcTimestamp } from '../common/StatusIndicators';

const CHECKLIST_CATEGORIES: ChecklistDomainType[] = [
  'Radio & Antenna Equipment',
  'Transmission & Microwave',
  'Power Systems (AC/DC/DG/Batteries)',
  'Fiber & Optical Infrastructure',
  'Environmental & External Alarms',
];

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  'BTS / eNodeB / gNodeB',
  'BBU (Baseband Unit)',
  'RRU / RRH (Remote Radio)',
  'Antenna / Feeder / RET',
  'Microwave IDU/ODU',
  'Fiber OLT / DWDM Mux',
  'Rectifier & DC Power',
  'Battery Bank (VRLA/LiFePO4)',
  'Diesel Generator / ATS',
  'Grounding & Env Sensor',
  'BSC / Core Node',
];

const VISIT_TYPES: NonNullable<SiteVisit['inspectionType']>[] = [
  'Emergency Fault',
  'Routine Preventive',
  'RF & Antenna Audit',
  'Power & Battery Test',
  'Microwave Alignment',
  'Post-Repair Verification',
  'Tower Structural Inspection',
  'Fiber & Optical Maintenance',
];

const OUTCOMES: VisitFinalOutcome[] = [
  'Resolved / Restored',
  'Temporary Mitigation',
  'Further Visit Required',
  'Pending Parts / Access',
  'Routine Inspection Pass',
  'Not Recorded',
];

export const SiteVisitsModule: React.FC = () => {
  const {
    store,
    selectedSiteVisitId,
    setSelectedSiteVisitId,
    can,
    upsertSiteVisit,
    updateSiteVisitChecklist,
    upsertChecklistTemplate,
    addVisitEquipmentRecord,
    addVisitMeasurementRecord,
    addVisitEquipmentReplacement,
    addVisitSparePartUsage,
    uploadPhotoAsset,
    openPhotoInStudio,
    openSiteById,
    openWorkOrderById,
    openIncidentById,
    navigateTo,
    showToast,
  } = useApp();

  const tz = store.userTimezone || 'UTC';
  const canManageVisit = can('visit:manage');
  const canViewContact = can('user:view_contact_details');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create New Site Visit Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSiteId, setNewSiteId] = useState(store.sites[0]?.id || 'SITE-1001');
  const [newWorkOrderId, setNewWorkOrderId] = useState(store.workOrders[0]?.id || '');
  const [newIncidentId, setNewIncidentId] = useState('');
  const [newEngineerId, setNewEngineerId] = useState(
    store.users[2]?.id || store.users[0]?.id || ''
  );
  const [newInspectionType, setNewInspectionType] =
    useState<NonNullable<SiteVisit['inspectionType']>>('Emergency Fault');
  const [newPurpose, setNewPurpose] = useState('');
  const [newReportedFault, setNewReportedFault] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('2026-10-28T10:00');
  const [newTemplateId, setNewTemplateId] = useState(
    store.checklistTemplates?.[0]?.id || 'CHK-TPL-RAN'
  );

  // Template Configurator Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] =
    useState<ChecklistDomainType>('Radio & Antenna Equipment');
  const [tplItemsText, setTplItemsText] = useState(
    'Inspect RRU grounding cable lugs|Ohm\nVerify optical SFP RX/TX power within margin|dBm\nConfirm weatherproofing boot integrity|'
  );

  // Active Workspace Tab inside Selected Visit Drawer/Panel
  const [activeVisitTab, setActiveVisitTab] = useState<
    'overview' | 'details' | 'equipment' | 'checklists' | 'photos'
  >('overview');
  const [hasUnsavedDraftChanges, setHasUnsavedDraftChanges] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);

  // Visit Details Form State
  const [initialConditionInput, setInitialConditionInput] = useState('');
  const [reportedFaultInput, setReportedFaultInput] = useState('');
  const [observationsInput, setObservationsInput] = useState('');
  const [suspectedCauseInput, setSuspectedCauseInput] = useState('');
  const [confirmedCauseInput, setConfirmedCauseInput] = useState('');
  const [workPerformedInput, setWorkPerformedInput] = useState('');
  const [correctiveActionsInput, setCorrectiveActionsInput] = useState('');
  const [preventiveRecsInput, setPreventiveRecsInput] = useState('');
  const [followUpInput, setFollowUpInput] = useState('');
  const [finalOutcomeInput, setFinalOutcomeInput] =
    useState<VisitFinalOutcome>('Not Recorded');
  const [manualTimestampField, setManualTimestampField] = useState<
    'checkInTime' | 'workStartTime' | 'workCompletionTime' | 'checkOutTime'
  >('checkInTime');
  const [manualTimestampValue, setManualTimestampValue] = useState('');

  // New Equipment Record Form
  const [eqCategory, setEqCategory] = useState<EquipmentCategory>('RRU / RRH (Remote Radio)');
  const [eqManufacturer, setEqManufacturer] = useState('Nokia');
  const [eqModel, setEqModel] = useState('AirScale RRH 4T4R');
  const [eqIdentifier, setEqIdentifier] = useState('RRH-SEC-2');
  const [eqSerial, setEqSerial] = useState('NK-8841299');
  const [eqCondition, setEqCondition] = useState<
    'Operational' | 'Degraded' | 'Faulty / Down' | 'Damaged' | 'Not Recorded'
  >('Faulty / Down');
  const [eqSymptoms, setEqSymptoms] = useState('');
  const [eqDiagnostics, setEqDiagnostics] = useState('');
  const [eqReplacedParts, setEqReplacedParts] = useState('');
  const [eqRemovedDetails, setEqRemovedDetails] = useState('');
  const [eqInstalledDetails, setEqInstalledDetails] = useState('');
  const [eqVerification, setEqVerification] = useState('');

  // New Equipment Replacement Form
  const [repCategory, setRepCategory] = useState<EquipmentCategory>('RRU / RRH (Remote Radio)');
  const [repSlot, setRepSlot] = useState('Sector-2 OPT1');
  const [repRemovedModel, setRepRemovedModel] = useState('Finisar 9.8G SFP+');
  const [repRemovedPart, setRepRemovedPart] = useState('FTLF1428P3BCV-N1');
  const [repRemovedSn, setRepRemovedSn] = useState('');
  const [repReason, setRepReason] = useState('');
  const [repInstalledModel, setRepInstalledModel] = useState('Finisar 9.8G SFP+');
  const [repInstalledPart, setRepInstalledPart] = useState('FTLF1428P3BCV-N2');
  const [repInstalledSn, setRepInstalledSn] = useState('');
  const [repFirmware, setRepFirmware] = useState('REV-A4.2');

  // New Measurement Form
  const [msrParam, setMsrParam] = useState('Optical Rx Power');
  const [msrSector, setMsrSector] = useState('Sector-2 RRH OPT1');
  const [msrValue, setMsrValue] = useState('-5.4');
  const [msrUnit, setMsrUnit] = useState('dBm');
  const [msrRange, setMsrRange] = useState('-3.0 to -11.5 dBm');
  const [msrStatus, setMsrStatus] = useState<
    'Within Range' | 'Out of Range' | 'Critical' | 'Informational'
  >('Within Range');
  const [msrInstrument, setMsrInstrument] = useState('EXFO FPM-300 Optical Power Meter');

  // New Spare Part Usage Form
  const [spPartNumber, setSpPartNumber] = useState('3M-CSB-98');
  const [spPartName, setSpPartName] = useState('3M Cold-Shrink Boot Kit');
  const [spCategory, setSpCategory] = useState('Weatherproofing');
  const [spQty, setSpQty] = useState(1);
  const [spUnit, setSpUnit] = useState('kits');
  const [spWarehouse, setSpWarehouse] = useState('Regional Field Van-04');

  // Quick Photo Upload inside Visit
  const [quickPhotoTitle, setQuickPhotoTitle] = useState('');
  const [quickPhotoClass, setQuickPhotoClass] = useState<PhotoClassification>('Before');
  const [quickPhotoPairId, setQuickPhotoPairId] = useState('PAIR-VISIT-01');

  const selectedVisit = useMemo(
    () =>
      store.siteVisits.find((v) => v.id === selectedSiteVisitId) ||
      store.siteVisits[0] ||
      null,
    [store.siteVisits, selectedSiteVisitId]
  );

  useEffect(() => {
    if (!selectedSiteVisitId && store.siteVisits[0]) {
      setSelectedSiteVisitId(store.siteVisits[0].id);
    }
  }, [selectedSiteVisitId, store.siteVisits, setSelectedSiteVisitId]);

  useEffect(() => {
    if (selectedVisit) {
      setInitialConditionInput(selectedVisit.initialSiteCondition || '');
      setReportedFaultInput(selectedVisit.reportedFault || '');
      setObservationsInput(selectedVisit.observations || '');
      setSuspectedCauseInput(selectedVisit.suspectedRootCause || '');
      setConfirmedCauseInput(selectedVisit.confirmedRootCause || '');
      setWorkPerformedInput(selectedVisit.workPerformed || '');
      setCorrectiveActionsInput(selectedVisit.correctiveActions || '');
      setPreventiveRecsInput(selectedVisit.preventiveRecommendations || '');
      setFollowUpInput(selectedVisit.followUpRecommendations || '');
      setFinalOutcomeInput(selectedVisit.finalVisitOutcome || 'Not Recorded');
      setHasUnsavedDraftChanges(false);
    }
  }, [selectedVisit?.id]);

  const filteredVisits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return store.siteVisits.filter((sv) => {
      if (statusFilter !== 'ALL' && sv.status !== statusFilter) return false;
      if (q) {
        const hay = [
          sv.visitCode,
          sv.siteCode,
          sv.siteName,
          sv.engineerName,
          sv.teamName,
          sv.purpose,
          sv.workOrderId || '',
          sv.linkedIncidentId || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [store.siteVisits, searchQuery, statusFilter]);

  const visitPhotos = useMemo(() => {
    if (!selectedVisit) return [];
    return store.photoAssets.filter(
      (p) =>
        p.visitId === selectedVisit.id ||
        (selectedVisit.photoAssetIds && selectedVisit.photoAssetIds.includes(p.id))
    );
  }, [selectedVisit, store.photoAssets]);

  const handleSelectVisitSafely = (visitId: string) => {
    if (hasUnsavedDraftChanges && visitId !== selectedVisit?.id) {
      // Autosave current draft before switching so unsaved work is never discarded
      handleSaveVisitDetails('Draft', true);
    }
    setSelectedSiteVisitId(visitId);
  };

  const handleCreateVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = upsertSiteVisit({
      siteId: newSiteId,
      workOrderId: newWorkOrderId || undefined,
      linkedIncidentId: newIncidentId || undefined,
      assignedEngineerId: newEngineerId,
      inspectionType: newInspectionType,
      purpose: newPurpose || `${newInspectionType} Field Visit`,
      reportedFault: newReportedFault,
      scheduledDate: new Date(newScheduledDate).toISOString(),
      status: 'Scheduled',
      submissionState: 'Draft',
      checklistTemplateId: newTemplateId,
    });
    if (res.ok && res.visit) {
      setCreateModalOpen(false);
      setNewPurpose('');
      setNewReportedFault('');
      setSelectedSiteVisitId(res.visit.id);
    }
  };

  const handleSaveVisitDetails = (
    submissionStateOverride?: 'Draft' | 'Submitted',
    silentAutosave?: boolean
  ) => {
    if (!selectedVisit) return;

    // Validate required fields before marking Submitted
    if (submissionStateOverride === 'Submitted') {
      if (!observationsInput.trim() || !workPerformedInput.trim()) {
        showToast(
          'Inspection Findings and Work Performed are required before submitting a final field visit.',
          'error'
        );
        return;
      }
    }

    const nowIso = new Date().toISOString();
    upsertSiteVisit({
      id: selectedVisit.id,
      siteId: selectedVisit.siteId,
      purpose: selectedVisit.purpose,
      updatedAt: nowIso,
      submissionState: submissionStateOverride || selectedVisit.submissionState || 'Draft',
      status:
        submissionStateOverride === 'Submitted' ? 'Completed' : selectedVisit.status,
      initialSiteCondition: initialConditionInput,
      reportedFault: reportedFaultInput,
      observations: observationsInput,
      suspectedRootCause: suspectedCauseInput,
      confirmedRootCause: confirmedCauseInput,
      workPerformed: workPerformedInput,
      correctiveActions: correctiveActionsInput,
      preventiveRecommendations: preventiveRecsInput,
      followUpRecommendations: followUpInput,
      finalVisitOutcome: finalOutcomeInput,
    });

    setHasUnsavedDraftChanges(false);
    setLastAutosavedAt(nowIso);
    if (!silentAutosave && submissionStateOverride === 'Submitted') {
      showToast(`Field Visit ${selectedVisit.visitCode} validated and submitted.`, 'success');
    }
  };

  const handleRecordDeviceTimestamp = (
    milestone: 'checkInTime' | 'workStartTime' | 'workCompletionTime' | 'checkOutTime'
  ) => {
    if (!selectedVisit) return;
    const nowIso = new Date().toISOString();
    const patch: Partial<SiteVisit> = { updatedAt: nowIso };

    if (milestone === 'checkInTime') {
      patch.checkInTime = nowIso;
      patch.checkInSource = 'Device Recorded';
      patch.status = 'On-Site';
    } else if (milestone === 'workStartTime') {
      patch.workStartTime = nowIso;
      patch.workStartSource = 'Device Recorded';
      patch.status = 'On-Site';
    } else if (milestone === 'workCompletionTime') {
      patch.workCompletionTime = nowIso;
      patch.workCompletionSource = 'Device Recorded';
    } else if (milestone === 'checkOutTime') {
      patch.checkOutTime = nowIso;
      patch.checkOutSource = 'Device Recorded';
      patch.status = 'Completed';
    }

    upsertSiteVisit({
      id: selectedVisit.id,
      siteId: selectedVisit.siteId,
      purpose: selectedVisit.purpose,
      ...patch,
    });
  };

  const handleApplyManualTimestamp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !manualTimestampValue) return;
    const iso = new Date(manualTimestampValue).toISOString();
    const sourceKey =
      manualTimestampField === 'checkInTime'
        ? 'checkInSource'
        : manualTimestampField === 'workStartTime'
        ? 'workStartSource'
        : manualTimestampField === 'workCompletionTime'
        ? 'workCompletionSource'
        : 'checkOutSource';

    upsertSiteVisit({
      id: selectedVisit.id,
      siteId: selectedVisit.siteId,
      purpose: selectedVisit.purpose,
      [manualTimestampField]: iso,
      [sourceKey]: 'Manual Entry' as TimestampRecordSource,
    });
    setManualTimestampValue('');
  };

  const handleChecklistItemChange = (
    itemId: string,
    field: 'result' | 'measuredValue' | 'unit' | 'remarks',
    value: string
  ) => {
    if (!selectedVisit || !selectedVisit.checklistItems) return;
    const updated: ChecklistItemResult[] = selectedVisit.checklistItems.map((it) =>
      it.itemId === itemId ? { ...it, [field]: value } : it
    );
    updateSiteVisitChecklist(selectedVisit.id, updated);
  };

  const handleSwitchChecklistTemplate = (templateId: string) => {
    if (!selectedVisit) return;
    const tpl = store.checklistTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const resetItems: ChecklistItemResult[] = tpl.items.map((item) => ({
      itemId: item.id,
      label: item.label,
      result: 'Not Tested',
      measuredValue: '',
      unit: item.unit || '',
      remarks: '',
    }));
    upsertSiteVisit({
      id: selectedVisit.id,
      siteId: selectedVisit.siteId,
      purpose: selectedVisit.purpose,
      checklistTemplateId: tpl.id,
      checklistItems: resetItems,
      checklistCompletedPercent: 0,
    });
  };

  const handleAddEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !eqModel.trim()) return;
    addVisitEquipmentRecord(selectedVisit.id, {
      equipmentCategory: eqCategory,
      manufacturer: eqManufacturer.trim(),
      model: eqModel.trim(),
      equipmentIdentifier: eqIdentifier.trim(),
      serialNumber: eqSerial.trim() || 'Not recorded',
      originalCondition: eqCondition,
      faultSymptoms: eqSymptoms.trim() || 'Not recorded',
      diagnosticObservations: eqDiagnostics.trim() || 'Not recorded',
      replacementParts: eqReplacedParts.trim() || 'None',
      removedEquipmentDetails: eqRemovedDetails.trim() || 'None',
      installedEquipmentDetails: eqInstalledDetails.trim() || 'None',
      testAndVerificationResults: eqVerification.trim() || 'Pending verification',
    });
    setEqSymptoms('');
    setEqDiagnostics('');
  };

  const handleAddReplacementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !repRemovedSn.trim() || !repInstalledSn.trim()) return;
    addVisitEquipmentReplacement(selectedVisit.id, {
      workOrderId: selectedVisit.workOrderId,
      incidentId: selectedVisit.linkedIncidentId,
      siteId: selectedVisit.siteId,
      siteCode: selectedVisit.siteCode,
      equipmentCategory: repCategory,
      sectorOrSlot: repSlot.trim(),
      removedManufacturerModel: repRemovedModel.trim(),
      removedPartNumber: repRemovedPart.trim(),
      removedSerialNumber: repRemovedSn.trim(),
      faultReason: repReason.trim() || 'Hardware fault confirmed during visit',
      installedManufacturerModel: repInstalledModel.trim(),
      installedPartNumber: repInstalledPart.trim(),
      installedSerialNumber: repInstalledSn.trim(),
      firmwareVersion: repFirmware.trim() || 'Not recorded',
      verifiedOperational: true,
    });
    setRepRemovedSn('');
    setRepInstalledSn('');
    setRepReason('');
  };

  const handleAddMeasurementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !msrParam.trim() || !msrValue.trim()) return;
    addVisitMeasurementRecord(selectedVisit.id, {
      siteId: selectedVisit.siteId,
      siteCode: selectedVisit.siteCode,
      incidentId: selectedVisit.linkedIncidentId,
      workOrderId: selectedVisit.workOrderId,
      parameterName: msrParam.trim(),
      equipmentOrSector: msrSector.trim(),
      measuredValue: msrValue.trim(),
      unit: msrUnit.trim(),
      referenceRange: msrRange.trim(),
      status: msrStatus,
      testInstrument: msrInstrument.trim() || 'Not recorded',
    });
    setMsrValue('');
  };

  const handleAddSparePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !spPartName.trim()) return;
    addVisitSparePartUsage(selectedVisit.id, {
      workOrderId: selectedVisit.workOrderId,
      incidentId: selectedVisit.linkedIncidentId,
      siteId: selectedVisit.siteId,
      siteCode: selectedVisit.siteCode,
      partNumber: spPartNumber.trim(),
      partName: spPartName.trim(),
      category: spCategory.trim(),
      quantity: Number(spQty) || 1,
      unit: spUnit.trim(),
      warehouseSource: spWarehouse.trim(),
    });
  };

  const handleQuickPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVisit) return;
    const valid = await validateAndProcessUploadedImage(file);
    if (!valid.ok || !valid.dataUrl) {
      showToast(valid.error || 'Photo upload validation failed.', 'error');
      return;
    }
    uploadPhotoAsset({
      title: quickPhotoTitle.trim() || `${selectedVisit.siteCode} ${quickPhotoClass} Evidence`,
      caption: `Uploaded during field visit ${selectedVisit.visitCode} (${selectedVisit.purpose})`,
      classification: quickPhotoClass,
      pairGroupId: quickPhotoPairId.trim() || undefined,
      equipmentOrArea: selectedVisit.equipmentName || 'Site Field Equipment',
      tags: [selectedVisit.visitCode, quickPhotoClass],
      siteId: selectedVisit.siteId,
      incidentId: selectedVisit.linkedIncidentId,
      workOrderId: selectedVisit.workOrderId,
      visitId: selectedVisit.id,
      originalDataUrl: valid.dataUrl,
      mimeType: valid.mimeType || 'image/jpeg',
      width: valid.width || 960,
      height: valid.height || 540,
      fileSizeKb: valid.fileSizeKb || 120,
      captureTimestamp: new Date().toISOString(),
      captureTimestampSource: 'Recorded (Device/EXIF)',
    });
    setQuickPhotoTitle('');
    e.target.value = '';
  };

  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = tplItemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!tplName.trim() || lines.length === 0) return;
    upsertChecklistTemplate({
      id: `CHK-TPL-${Date.now().toString().slice(-4)}`,
      name: tplName.trim(),
      domainType: tplCategory,
      description: `Configurable ${tplCategory} field inspection template`,
      updatedAt: new Date().toISOString(),
      items: lines.map((line, idx) => {
        const [labelPart, unitPart] = line.split('|');
        return {
          id: `CHK-ITM-${idx + 1}`,
          label: labelPart.trim(),
          expectedStandard: 'Pass / Within Operating Margin',
          requiresMeasurement: Boolean(unitPart && unitPart.trim()),
          unit: unitPart ? unitPart.trim() : undefined,
        };
      }),
    });
    setTemplateModalOpen(false);
    setTplName('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>
              PHASE 4 FIELD OPERATIONS, EQUIPMENT REPLACEMENTS, CHECKLISTS &amp; EVIDENCE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Field Operations &amp; Site Visits ({store.siteVisits.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Mobile-ready field maintenance workspace supporting arrival/work/departure timestamps,
            multi-equipment diagnostics, domain checklists, measurements, and stamped photo pairs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {can('checklist:configure') && (
            <button
              type="button"
              onClick={() => setTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-sky-500" />
              <span>Checklist Templates ({store.checklistTemplates?.length || 0})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigateTo('photo-studio')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-500" />
            <span>Photo Annotation Studio</span>
          </button>

          <button
            type="button"
            disabled={!canManageVisit}
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Field Visit / Inspection</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Left Visit List + Right 5-Tab Field Operations Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Site Visits List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Visit ID, Site, WO, Incident, Engineer..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {['ALL', 'Scheduled', 'On-Site', 'Completed', 'Deferred'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer ${
                    statusFilter === st
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredVisits.map((sv) => {
              const isSelected = selectedVisit?.id === sv.id;
              return (
                <div
                  key={sv.id}
                  onClick={() => handleSelectVisitSafely(sv.id)}
                  className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {sv.visitCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">
                        {sv.submissionState || 'Draft'}
                      </span>
                      <span>·</span>
                      <span
                        className={`font-semibold ${
                          sv.status === 'Completed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : sv.status === 'On-Site'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {sv.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 font-semibold text-xs text-slate-900 dark:text-white">
                    {sv.siteCode} — {sv.siteName}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {sv.purpose}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>
                      {canViewContact ? sv.engineerName : 'Field Engineer'} · {sv.teamName}
                    </span>
                    <span>Checklist: {sv.checklistCompletedPercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Structured 5-Tab Field Operations Workspace */}
        <div className="lg:col-span-8">
          {selectedVisit ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
              {/* Visit Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {selectedVisit.visitCode}
                    </span>
                    <span>·</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {selectedVisit.inspectionType || 'Field Inspection'}
                    </span>
                    <span>·</span>
                    <span className="text-slate-500">
                      State: <strong>{selectedVisit.submissionState || 'Draft'}</strong>
                    </span>
                    {hasUnsavedDraftChanges && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        (Unsaved Draft Edits)
                      </span>
                    )}
                    {lastAutosavedAt && !hasUnsavedDraftChanges && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        (Saved {formatUtcTimestamp(lastAutosavedAt, tz)})
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {selectedVisit.siteCode} — {selectedVisit.siteName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedVisit.siteAddress || 'Address on file'} · Region:{' '}
                    {selectedVisit.region || 'North Metro'} · Operator:{' '}
                    {selectedVisit.operator || 'ApexTel'}
                  </p>
                </div>

                {/* Action Buttons: Save Draft, Submit Final, Export Visit JSON */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const res = exportValidatedJsonPackage(
                        'single-visit',
                        { visitId: selectedVisit.id },
                        {
                          siteVisits: [selectedVisit],
                          photoAssets: visitPhotos,
                        },
                        canViewContact,
                        `${selectedVisit.visitCode}_${selectedVisit.siteCode}.json`
                      );
                      if (res.ok) {
                        showToast(`Exported validated JSON for ${selectedVisit.visitCode}.`, 'info');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span>JSON</span>
                  </button>

                  {canManageVisit && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveVisitDetails('Draft')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 text-sky-500" />
                        <span>Save Draft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveVisitDetails('Submitted')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submit Completed Visit</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Touch-Friendly 5-Tab Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl text-xs font-semibold">
                {(
                  [
                    { id: 'overview', label: '1. ID & Timestamps', icon: Clock },
                    { id: 'details', label: '2. Findings & RCA', icon: FileText },
                    {
                      id: 'equipment',
                      label: `3. Equipment (${
                        (selectedVisit.equipmentRecords?.length || 0) +
                        (selectedVisit.equipmentReplacements?.length || 0)
                      })`,
                      icon: Cpu,
                    },
                    {
                      id: 'checklists',
                      label: `4. Checklists (${selectedVisit.checklistCompletedPercent}%)`,
                      icon: ClipboardCheck,
                    },
                    {
                      id: 'photos',
                      label: `5. Photos (${visitPhotos.length})`,
                      icon: Camera,
                    },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveVisitTab(tab.id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg cursor-pointer transition-colors ${
                        activeVisitTab === tab.id
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: IDENTIFICATION, GPS & DISTINGUISHED TIMESTAMPS */}
              {activeVisitTab === 'overview' && (
                <div className="space-y-5 text-xs">
                  {/* Identification & Cross-Navigation Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-[11px] font-mono text-slate-500">Linked Work Order</div>
                      {selectedVisit.workOrderId ? (
                        <button
                          type="button"
                          onClick={() => openWorkOrderById(selectedVisit.workOrderId!)}
                          className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                        >
                          <span>{selectedVisit.workOrderId}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="font-mono text-slate-500 mt-0.5">
                          Standalone Authorized Inspection
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-mono text-slate-500">Linked Incident</div>
                      {selectedVisit.linkedIncidentId ? (
                        <button
                          type="button"
                          onClick={() => openIncidentById(selectedVisit.linkedIncidentId!)}
                          className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                        >
                          <span>{selectedVisit.linkedIncidentId}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="font-mono text-slate-500 mt-0.5">Not linked</div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-mono text-slate-500">
                        GPS Coordinates &amp; Source
                      </div>
                      <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedVisit.gpsCoordinates
                          ? `${selectedVisit.gpsCoordinates.latitude.toFixed(5)}, ${selectedVisit.gpsCoordinates.longitude.toFixed(5)} [${selectedVisit.gpsCoordinates.source}]`
                          : 'Not recorded'}
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Field Timestamp Capture Buttons */}
                  {canManageVisit && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        One-Tap Device Timestamp Capture (Field Engineer Controls)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleRecordDeviceTimestamp('checkInTime')}
                          className="py-3 px-3 rounded-xl border border-sky-500/40 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/60 text-left cursor-pointer"
                        >
                          <div className="font-bold text-sky-700 dark:text-sky-300">
                            1. Record Arrival
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {selectedVisit.checkInTime
                              ? formatUtcTimestamp(selectedVisit.checkInTime, tz)
                              : 'Tap on site arrival'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRecordDeviceTimestamp('workStartTime')}
                          className="py-3 px-3 rounded-xl border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-left cursor-pointer"
                        >
                          <div className="font-bold text-amber-700 dark:text-amber-300">
                            2. Start Physical Work
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {selectedVisit.workStartTime
                              ? formatUtcTimestamp(selectedVisit.workStartTime, tz)
                              : 'Tap when starting work'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRecordDeviceTimestamp('workCompletionTime')}
                          className="py-3 px-3 rounded-xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-left cursor-pointer"
                        >
                          <div className="font-bold text-emerald-700 dark:text-emerald-300">
                            3. Complete Work
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {selectedVisit.workCompletionTime
                              ? formatUtcTimestamp(selectedVisit.workCompletionTime, tz)
                              : 'Tap when repair done'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRecordDeviceTimestamp('checkOutTime')}
                          className="py-3 px-3 rounded-xl border border-slate-400/40 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-left cursor-pointer"
                        >
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            4. Record Departure
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {selectedVisit.checkOutTime
                              ? formatUtcTimestamp(selectedVisit.checkOutTime, tz)
                              : 'Tap on site sign-out'}
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Distinguished Timestamp Ledger Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-500">
                          <th className="py-2.5 px-3">Visit Milestone</th>
                          <th className="py-2.5 px-3">Recorded Timestamp ({tz})</th>
                          <th className="py-2.5 px-3">Provenance / Capture Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                        <tr>
                          <td className="py-2 px-3 font-sans font-medium">Scheduled Window</td>
                          <td className="py-2 px-3">
                            {formatUtcTimestamp(selectedVisit.scheduledDate, tz)}
                          </td>
                          <td className="py-2 px-3 text-slate-500">Scheduled</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans font-medium">Actual Arrival (Check-In)</td>
                          <td className="py-2 px-3">
                            {selectedVisit.checkInTime
                              ? formatUtcTimestamp(selectedVisit.checkInTime, tz)
                              : 'Not recorded'}
                          </td>
                          <td className="py-2 px-3 text-sky-600 dark:text-sky-400">
                            {selectedVisit.checkInSource || (selectedVisit.checkInTime ? 'Device Recorded' : '—')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans font-medium">Work Started</td>
                          <td className="py-2 px-3">
                            {selectedVisit.workStartTime
                              ? formatUtcTimestamp(selectedVisit.workStartTime, tz)
                              : 'Not recorded'}
                          </td>
                          <td className="py-2 px-3 text-sky-600 dark:text-sky-400">
                            {selectedVisit.workStartSource || (selectedVisit.workStartTime ? 'Device Recorded' : '—')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans font-medium">Physical Work Completed</td>
                          <td className="py-2 px-3">
                            {selectedVisit.workCompletionTime
                              ? formatUtcTimestamp(selectedVisit.workCompletionTime, tz)
                              : 'Not recorded'}
                          </td>
                          <td className="py-2 px-3 text-sky-600 dark:text-sky-400">
                            {selectedVisit.workCompletionSource ||
                              (selectedVisit.workCompletionTime ? 'Device Recorded' : '—')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans font-medium">Actual Departure (Check-Out)</td>
                          <td className="py-2 px-3">
                            {selectedVisit.checkOutTime
                              ? formatUtcTimestamp(selectedVisit.checkOutTime, tz)
                              : 'Not recorded'}
                          </td>
                          <td className="py-2 px-3 text-sky-600 dark:text-sky-400">
                            {selectedVisit.checkOutSource || (selectedVisit.checkOutTime ? 'Device Recorded' : '—')}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans font-medium">Record Last Updated</td>
                          <td className="py-2 px-3">
                            {formatUtcTimestamp(selectedVisit.updatedAt || selectedVisit.createdAt, tz)}
                          </td>
                          <td className="py-2 px-3 text-slate-500">Server / Store Recorded</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Manual Timestamp Entry Form (Explicitly marked as Manual Entry) */}
                  {canManageVisit && (
                    <form
                      onSubmit={handleApplyManualTimestamp}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3"
                    >
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Manual Timestamp Override (Labeled as Manual Entry)
                        </label>
                        <select
                          value={manualTimestampField}
                          onChange={(e) =>
                            setManualTimestampField(
                              e.target.value as
                                | 'checkInTime'
                                | 'workStartTime'
                                | 'workCompletionTime'
                                | 'checkOutTime'
                            )
                          }
                          className="px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="checkInTime">Actual Arrival</option>
                          <option value="workStartTime">Work Start</option>
                          <option value="workCompletionTime">Work Completion</option>
                          <option value="checkOutTime">Departure</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          value={manualTimestampValue}
                          onChange={(e) => setManualTimestampValue(e.target.value)}
                          className="px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-semibold cursor-pointer"
                      >
                        Record Manual Timestamp
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: VISIT DETAILS, FINDINGS, RCA & FINAL OUTCOME */}
              {activeVisitTab === 'details' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Initial Site Condition
                      </label>
                      <textarea
                        rows={2}
                        value={initialConditionInput}
                        onChange={(e) => {
                          setInitialConditionInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        placeholder="Compound access, gate lock, shelter temperature, visible alarms..."
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Reported Fault
                      </label>
                      <textarea
                        rows={2}
                        value={reportedFaultInput}
                        onChange={(e) => {
                          setReportedFaultInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        placeholder="Fault symptoms reported by NOC or work order..."
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Inspection Findings *
                      </label>
                      <textarea
                        rows={3}
                        value={observationsInput}
                        onChange={(e) => {
                          setObservationsInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        placeholder="Detailed physical and diagnostic inspection findings..."
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Work Performed *
                      </label>
                      <textarea
                        rows={3}
                        value={workPerformedInput}
                        onChange={(e) => {
                          setWorkPerformedInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        placeholder="Step-by-step maintenance and repair actions performed..."
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Suspected Root Cause
                      </label>
                      <input
                        type="text"
                        value={suspectedCauseInput}
                        onChange={(e) => {
                          setSuspectedCauseInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        placeholder="Initial hypothesis..."
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Confirmed Root Cause
                      </label>
                      <input
                        type="text"
                        value={confirmedCauseInput}
                        onChange={(e) => {
                          setConfirmedCauseInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        placeholder="Confirmed physical or configuration root cause..."
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Corrective Actions
                      </label>
                      <textarea
                        rows={2}
                        value={correctiveActionsInput}
                        onChange={(e) => {
                          setCorrectiveActionsInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Preventive Recommendations
                      </label>
                      <textarea
                        rows={2}
                        value={preventiveRecsInput}
                        onChange={(e) => {
                          setPreventiveRecsInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Follow-Up Requirements &amp; Final Outcome
                      </label>
                      <select
                        value={finalOutcomeInput}
                        onChange={(e) => {
                          setFinalOutcomeInput(e.target.value as VisitFinalOutcome);
                          setHasUnsavedDraftChanges(true);
                        }}
                        className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 mb-1.5"
                      >
                        {OUTCOMES.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={followUpInput}
                        onChange={(e) => {
                          setFollowUpInput(e.target.value);
                          setHasUnsavedDraftChanges(true);
                        }}
                        placeholder="Follow-up requirements..."
                        className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EQUIPMENT INSPECTED, REPLACEMENTS & SPARE PARTS */}
              {activeVisitTab === 'equipment' && (
                <div className="space-y-5 text-xs">
                  {/* Inspected Equipment Records */}
                  <div className="space-y-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Inspected Equipment Units ({selectedVisit.equipmentRecords?.length || 0})
                    </h3>
                    {(selectedVisit.equipmentRecords || []).map((eq) => (
                      <div
                        key={eq.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            {eq.equipmentCategory} — {eq.manufacturer} {eq.model}
                          </span>
                          <span>
                            ID: {eq.equipmentIdentifier} · SN: {eq.serialNumber} · Condition:{' '}
                            <strong>{eq.originalCondition}</strong>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                          <div>
                            <strong>Symptoms:</strong> {eq.faultSymptoms}
                          </div>
                          <div>
                            <strong>Diagnostics:</strong> {eq.diagnosticObservations}
                          </div>
                          <div>
                            <strong>Removed / Installed:</strong> {eq.removedEquipmentDetails} →{' '}
                            {eq.installedEquipmentDetails}
                          </div>
                          <div>
                            <strong>Verification:</strong> {eq.testAndVerificationResults}
                          </div>
                        </div>
                      </div>
                    ))}

                    {canManageVisit && (
                      <form
                        onSubmit={handleAddEquipmentSubmit}
                        className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          + Add Equipment Unit to Visit
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <select
                            value={eqCategory}
                            onChange={(e) => setEqCategory(e.target.value as EquipmentCategory)}
                            className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                          >
                            {EQUIPMENT_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={eqManufacturer}
                            onChange={(e) => setEqManufacturer(e.target.value)}
                            placeholder="Manufacturer (e.g. Nokia)"
                            className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={eqModel}
                            onChange={(e) => setEqModel(e.target.value)}
                            placeholder="Model"
                            className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={eqSerial}
                            onChange={(e) => setEqSerial(e.target.value)}
                            placeholder="Serial Number"
                            className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={eqSymptoms}
                            onChange={(e) => setEqSymptoms(e.target.value)}
                            placeholder="Fault symptoms..."
                            className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={eqDiagnostics}
                            onChange={(e) => setEqDiagnostics(e.target.value)}
                            placeholder="Diagnostic observations..."
                            className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                          />
                          <button
                            type="submit"
                            className="px-3 py-2 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                          >
                            Add Equipment Entry
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Equipment Replacements Table & Form */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Hardware Replacements — Removed vs. Installed Serial Numbers (
                      {selectedVisit.equipmentReplacements?.length || 0})
                    </h3>
                    {(selectedVisit.equipmentReplacements || []).length > 0 && (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                              <th className="py-2 px-3">Slot / Sector</th>
                              <th className="py-2 px-3">Removed Model &amp; SN</th>
                              <th className="py-2 px-3">Installed Model &amp; SN</th>
                              <th className="py-2 px-3">Firmware</th>
                              <th className="py-2 px-3">Fault Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                            {selectedVisit.equipmentReplacements?.map((r) => (
                              <tr key={r.id}>
                                <td className="py-2 px-3">{r.sectorOrSlot}</td>
                                <td className="py-2 px-3 text-red-600 dark:text-red-400">
                                  {r.removedManufacturerModel} (SN: {r.removedSerialNumber})
                                </td>
                                <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400">
                                  {r.installedManufacturerModel} (SN: {r.installedSerialNumber})
                                </td>
                                <td className="py-2 px-3">{r.firmwareVersion}</td>
                                <td className="py-2 px-3 font-sans">{r.faultReason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {canManageVisit && (
                      <form
                        onSubmit={handleAddReplacementSubmit}
                        className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-2"
                      >
                        <input
                          type="text"
                          value={repSlot}
                          onChange={(e) => setRepSlot(e.target.value)}
                          placeholder="Slot/Sector"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          value={repRemovedSn}
                          onChange={(e) => setRepRemovedSn(e.target.value)}
                          placeholder="Removed Serial No *"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                        <input
                          type="text"
                          value={repInstalledSn}
                          onChange={(e) => setRepInstalledSn(e.target.value)}
                          placeholder="Installed Serial No *"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                        <input
                          type="text"
                          value={repReason}
                          onChange={(e) => setRepReason(e.target.value)}
                          placeholder="Fault reason..."
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-semibold cursor-pointer"
                        >
                          Log Replacement
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Spare Parts Consumed */}
                  <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Spare Parts Consumed ({selectedVisit.sparePartUsages?.length || 0})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(selectedVisit.sparePartUsages || []).map((sp) => (
                        <span
                          key={sp.id}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]"
                        >
                          {sp.partNumber}: {sp.partName} ({sp.quantity} {sp.unit}) —{' '}
                          {sp.warehouseSource}
                        </span>
                      ))}
                    </div>
                    {canManageVisit && (
                      <form
                        onSubmit={handleAddSparePartSubmit}
                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1"
                      >
                        <input
                          type="text"
                          value={spPartNumber}
                          onChange={(e) => setSpPartNumber(e.target.value)}
                          placeholder="Part Number"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                        <input
                          type="text"
                          value={spPartName}
                          onChange={(e) => setSpPartName(e.target.value)}
                          placeholder="Part Description *"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                        />
                        <input
                          type="number"
                          min="1"
                          value={spQty}
                          onChange={(e) => setSpQty(Number(e.target.value))}
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                        <input
                          type="text"
                          value={spWarehouse}
                          onChange={(e) => setSpWarehouse(e.target.value)}
                          placeholder="Depot / Van Source"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-semibold cursor-pointer"
                        >
                          Record Spare Part
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: DOMAIN CHECKLISTS & STRUCTURED MEASUREMENTS */}
              {activeVisitTab === 'checklists' && (
                <div className="space-y-5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Active Inspection Checklist Template
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Untested items remain explicitly marked &ldquo;Not Tested&rdquo; and are
                        never automatically marked Passed.
                      </p>
                    </div>
                    <select
                      disabled={!canManageVisit}
                      value={selectedVisit.checklistTemplateId || store.checklistTemplates[0]?.id}
                      onChange={(e) => handleSwitchChecklistTemplate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold"
                    >
                      {store.checklistTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.domainType} — {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2.5">
                    {(selectedVisit.checklistItems || []).map((item, idx) => (
                      <div
                        key={item.itemId}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            <span className="font-mono text-sky-600 dark:text-sky-400 mr-2">
                              {idx + 1}.
                            </span>
                            {item.label}
                          </div>

                          {/* Touch-friendly status buttons: Pass, Fail, Not Applicable, Not Tested */}
                          <div className="flex flex-wrap items-center gap-1 shrink-0">
                            {(
                              ['Pass', 'Fail', 'Not Applicable', 'Not Tested'] as ChecklistResultStatus[]
                            ).map((st) => {
                              const active =
                                item.result === st ||
                                (st === 'Not Tested' && item.result === 'Pending') ||
                                (st === 'Not Applicable' && item.result === 'N/A');
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={!canManageVisit}
                                  onClick={() =>
                                    handleChecklistItemChange(item.itemId, 'result', st)
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                                    active
                                      ? st === 'Pass'
                                        ? 'bg-emerald-600 text-white'
                                        : st === 'Fail'
                                        ? 'bg-red-600 text-white'
                                        : st === 'Not Applicable'
                                        ? 'bg-slate-600 text-white'
                                        : 'bg-amber-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              disabled={!canManageVisit}
                              value={item.measuredValue || ''}
                              onChange={(e) =>
                                handleChecklistItemChange(
                                  item.itemId,
                                  'measuredValue',
                                  e.target.value
                                )
                              }
                              placeholder="Measured value (e.g. -5.4)"
                              className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                            />
                            <input
                              type="text"
                              disabled={!canManageVisit}
                              value={item.unit || ''}
                              onChange={(e) =>
                                handleChecklistItemChange(item.itemId, 'unit', e.target.value)
                              }
                              placeholder="Unit (dBm/VDC)"
                              className="w-24 px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                            />
                          </div>

                          <input
                            type="text"
                            disabled={!canManageVisit}
                            value={item.remarks || ''}
                            onChange={(e) =>
                              handleChecklistItemChange(item.itemId, 'remarks', e.target.value)
                            }
                            placeholder="Engineer notes / diagnostic remarks..."
                            className="sm:col-span-2 px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Structured Test & Measurement Table */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-sky-500" />
                      <span>
                        Calibrated Instrument Measurements (
                        {selectedVisit.measurementRecords?.length || 0})
                      </span>
                    </h3>

                    {(selectedVisit.measurementRecords || []).length > 0 && (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                              <th className="py-2 px-3">Parameter</th>
                              <th className="py-2 px-3">Equipment / Sector</th>
                              <th className="py-2 px-3">Reading &amp; Unit</th>
                              <th className="py-2 px-3">Reference Range</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Test Instrument</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                            {selectedVisit.measurementRecords?.map((m) => (
                              <tr key={m.id}>
                                <td className="py-2 px-3 font-sans font-medium">
                                  {m.parameterName}
                                </td>
                                <td className="py-2 px-3">{m.equipmentOrSector}</td>
                                <td className="py-2 px-3 font-bold">
                                  {m.measuredValue} {m.unit}
                                </td>
                                <td className="py-2 px-3 text-slate-500">{m.referenceRange}</td>
                                <td
                                  className={`py-2 px-3 font-bold ${
                                    m.status === 'Within Range'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : m.status === 'Critical'
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {m.status}
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-500">
                                  {m.testInstrument}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {canManageVisit && (
                      <form
                        onSubmit={handleAddMeasurementSubmit}
                        className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-6 gap-2"
                      >
                        <input
                          type="text"
                          value={msrParam}
                          onChange={(e) => setMsrParam(e.target.value)}
                          placeholder="Parameter *"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          value={msrValue}
                          onChange={(e) => setMsrValue(e.target.value)}
                          placeholder="Value *"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                        <input
                          type="text"
                          value={msrUnit}
                          onChange={(e) => setMsrUnit(e.target.value)}
                          placeholder="Unit (dBm, VDC)"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                        <input
                          type="text"
                          value={msrRange}
                          onChange={(e) => setMsrRange(e.target.value)}
                          placeholder="Ref Range"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                        />
                        <input
                          type="text"
                          value={msrInstrument}
                          onChange={(e) => setMsrInstrument(e.target.value)}
                          placeholder="Instrument"
                          className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                        >
                          Add Reading
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: SUPPORTING PHOTOGRAPHS & ANNOTATION STUDIO LAUNCHER */}
              {activeVisitTab === 'photos' && (
                <div className="space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Before, During &amp; After Photographic Evidence ({visitPhotos.length})
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Upload photos directly from mobile camera or library, or launch the Photo
                        Annotation Studio to draw arrows, shapes, and metadata stamps.
                      </p>
                    </div>

                    {can('photo:upload') && (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={quickPhotoTitle}
                          onChange={(e) => setQuickPhotoTitle(e.target.value)}
                          placeholder="Photo title..."
                          className="px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        />
                        <select
                          value={quickPhotoClass}
                          onChange={(e) =>
                            setQuickPhotoClass(e.target.value as PhotoClassification)
                          }
                          className="px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                        >
                          <option value="Before">Before</option>
                          <option value="During">During</option>
                          <option value="After">After</option>
                          <option value="Inspection">Inspection</option>
                        </select>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                            capture="environment"
                            onChange={handleQuickPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {visitPhotos.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                      No photographs linked to {selectedVisit.visitCode} yet. Upload a photograph
                      above or open the Photo Studio.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visitPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2.5"
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-sky-600 dark:text-sky-400">
                              {photo.id} · {photo.classification.toUpperCase()}
                            </span>
                            <span className="text-slate-500">
                              {photo.annotations.length} annotations ·{' '}
                              {photo.isAnnotated ? 'Stamped' : 'Original'}
                            </span>
                          </div>

                          <img
                            src={photo.annotatedDataUrl || photo.originalDataUrl}
                            alt={photo.title}
                            className="w-full h-48 object-contain bg-slate-900 rounded-lg border border-slate-800"
                          />

                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {photo.title}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{photo.caption}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-mono text-slate-500">
                              Pair Group: {photo.pairGroupId || 'None'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                openPhotoInStudio(photo.id, {
                                  siteId: selectedVisit.siteId,
                                  incidentId: selectedVisit.linkedIncidentId,
                                  workOrderId: selectedVisit.workOrderId,
                                  visitId: selectedVisit.id,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Annotate &amp; Stamp in Studio</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Create Field Visit Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Field Site Visit or Standalone Inspection
              </h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVisitSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Target Site *</label>
                  <select
                    value={newSiteId}
                    onChange={(e) => setNewSiteId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {store.sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteCode} — {s.siteName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Visit Type *</label>
                  <select
                    value={newInspectionType}
                    onChange={(e) =>
                      setNewInspectionType(
                        e.target.value as NonNullable<SiteVisit['inspectionType']>
                      )
                    }
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {VISIT_TYPES.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">
                    Linked Work Order (Optional for Standalone)
                  </label>
                  <select
                    value={newWorkOrderId}
                    onChange={(e) => setNewWorkOrderId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="">Standalone Authorized Inspection</option>
                    {store.workOrders.map((wo) => (
                      <option key={wo.id} value={wo.id}>
                        {wo.workOrderNumber} ({wo.siteCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Linked Incident (Optional)</label>
                  <select
                    value={newIncidentId}
                    onChange={(e) => setNewIncidentId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="">None</option>
                    {store.incidents.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        {inc.id} ({inc.siteCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Assigned Engineer *</label>
                  <select
                    value={newEngineerId}
                    onChange={(e) => setNewEngineerId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {store.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Scheduled Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Domain Checklist Template *</label>
                <select
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  {store.checklistTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.domainType} — {tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Reason for Visit / Scope *</label>
                <input
                  type="text"
                  required
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  placeholder="e.g., Sector-2 RRH CPRI optical SFP+ troubleshooting & VSWR check"
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Create Field Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checklist Template Configurator Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Configure Equipment Domain Checklist Template
              </h2>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Equipment Domain</label>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value as ChecklistDomainType)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  {CHECKLIST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g., 5G Massive MIMO AAU & eCPRI Acceptance Checklist"
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Checklist Items (One per line, optional |unit suffix)
                </label>
                <textarea
                  rows={5}
                  value={tplItemsText}
                  onChange={(e) => setTplItemsText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
