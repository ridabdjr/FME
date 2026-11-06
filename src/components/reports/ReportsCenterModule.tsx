import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Camera,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  exportEngineeringWorkbookXlsx,
  exportValidatedJsonPackage,
  generateEngineeringPdfDocument,
} from '../../services/reportExportService';
import {
  MaintenanceReport,
  PdfVariantMode,
  ReportBrandingConfig,
  ReportStatus,
  ReportType,
} from '../../types/models';
import { useTranslation } from '../../i18n';
import { formatUtcTimestamp } from '../common/StatusIndicators';

export const ALL_16_REPORT_TYPES: {
  type: ReportType;
  category: string;
  description: string;
}[] = [
  {
    type: 'Incident Investigation Report',
    category: 'NOC & Incident RCA',
    description:
      'End-to-end root cause investigation, OSS alarm correlation, SLA milestone timeline, and service restoration verification.',
  },
  {
    type: 'Corrective Maintenance Report',
    category: 'Field Maintenance',
    description:
      'Fault repair documentation covering site arrival, diagnostic troubleshooting, component replacement, and post-repair checks.',
  },
  {
    type: 'Preventive Maintenance Report',
    category: 'Field Maintenance',
    description:
      'Scheduled routine preventive maintenance checklist results, environmental readings, and proactive hardware care.',
  },
  {
    type: 'Site Visit Report',
    category: 'Field Operations',
    description:
      'Complete documentation of an individual engineer site visit including arrival/departure timestamps, findings, and photos.',
  },
  {
    type: 'Tower Inspection Report',
    category: 'Structural & RF',
    description:
      'Tower structural integrity, aviation obstruction lighting, feeder clamping, grounding busbars, and antenna mounts.',
  },
  {
    type: 'Equipment Replacement Report',
    category: 'Hardware & Spares',
    description:
      'Detailed hardware swap ledger tracking removed vs. installed serial numbers, part numbers, firmware versions, and RMA reasons.',
  },
  {
    type: 'BSC/NOC Alarm Report',
    category: 'NOC & Incident RCA',
    description:
      'Analysis of BSS/BSC/RAN internal network element traps, repeat-occurrence deduplication, and clearance verification.',
  },
  {
    type: 'External Alarm Investigation Report',
    category: 'Environmental & Power',
    description:
      'Investigation of dry-contact external alarms: door intrusion, high shelter temperature, smoke/fire, LLVD/BLVD, and generator faults.',
  },
  {
    type: 'Transmission and Microwave Maintenance Report',
    category: 'Transmission & Fiber',
    description:
      'Split-mount and all-outdoor microwave link alignment, RSL/XPD measurements, ACM modulation stability, and IF/PoE cabling.',
  },
  {
    type: 'Fiber and Optical Maintenance Report',
    category: 'Transmission & Fiber',
    description:
      'ODF patch panel inspection, IEC connector end-face scope results, optical Tx/Rx power meter readings, and OTDR trace references.',
  },
  {
    type: 'Power System Maintenance Report',
    category: 'Environmental & Power',
    description:
      '-48V DC rectifier load sharing, LLVD/BLVD thresholds, VRLA/LiFePO4 battery string conductance, and standby diesel generator transfer.',
  },
  {
    type: 'Site Acceptance or Verification Report',
    category: 'Quality & Acceptance',
    description:
      'Post-installation or post-repair engineering verification sign-off confirming zero active alarms and nominal KPIs.',
  },
  {
    type: 'Daily Engineering Activity Report',
    category: 'Management Summary',
    description:
      '24-hour operational digest of active incidents, dispatched work orders, completed site visits, and SLA compliance.',
  },
  {
    type: 'Weekly and Monthly Maintenance Summary',
    category: 'Management Summary',
    description:
      'Periodic regional Roll-up of corrective vs. preventive maintenance completion, spare parts consumed, and MTTR trends.',
  },
  {
    type: 'Team Performance Report',
    category: 'Management Summary',
    description:
      'Engineering squad workload distribution, dispatch response times, checklist completion rates, and verified work orders.',
  },
  {
    type: 'Custom Report',
    category: 'Custom Assembly',
    description:
      'Custom multi-record engineering package assembled from user-selected incidents, work orders, site visits, and photographs.',
  },
];

export const ReportsCenterModule: React.FC = () => {
  const {
    store,
    selectedReportId,
    setSelectedReportId,
    can,
    createOrRegenerateReport,
    updateReportWorkflowStatus,
    updateReportBranding,
    recordReportExportAudit,
    openSiteById,
    openIncidentById,
    openWorkOrderById,
    openSiteVisitById,
    openPhotoInStudio,
    openCaseById,
    reportBuilderPrefillCaseId,
    setReportBuilderPrefillCaseId,
    showToast,
  } = useApp();

  const tz = store.userTimezone || 'UTC';
  const canCreateReport = can('report:create');
  const canReviewReport = can('report:review');
  const canApproveReport = can('report:approve');
  const canExportBatch = can('report:export_batch');
  const canManageBranding = can('report:manage_branding');
  const canViewContact = can('user:view_contact_details');

  // Active Top View ('library' | 'preview' | 'builder' | 'batch-branding')
  const [activeView, setActiveView] = useState<
    'library' | 'preview' | 'builder' | 'batch-branding'
  >('preview');

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Multi-select for Batch Exports
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(() =>
    store.maintenanceReports.map((r) => r.id)
  );
  const { language, t } = useTranslation();
  const [reportLanguage, setReportLanguage] = useState<'en' | 'fr' | 'ar'>(() =>
    language === 'ar' || language === 'fr' ? language : 'en'
  );
  const [pdfVariant, setPdfVariant] = useState<PdfVariantMode>('full-with-photos');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [largeBatchConfirmOpen, setLargeBatchConfirmOpen] = useState(false);

  // Workflow Approval / Review Comment Input
  const [workflowComment, setWorkflowComment] = useState('');

  // Report Builder / Regeneration Form State
  const [editingReportId, setEditingReportId] = useState<string | undefined>(undefined);
  const [builderType, setBuilderType] = useState<ReportType>(
    'Corrective Maintenance Report'
  );
  const [builderSiteId, setBuilderSiteId] = useState(store.sites[0]?.id || 'SITE-1001');
  const [builderIncidentId, setBuilderIncidentId] = useState(
    store.incidents[0]?.id || ''
  );
  const [builderWorkOrderId, setBuilderWorkOrderId] = useState(
    store.workOrders[0]?.id || ''
  );
  const [builderCaseId, setBuilderCaseId] = useState<string>('');
  const [builderVisitIds, setBuilderVisitIds] = useState<string[]>(
    store.siteVisits[0] ? [store.siteVisits[0].id] : []
  );
  const [builderPhotoIds, setBuilderPhotoIds] = useState<string[]>(
    store.photoAssets.slice(0, 2).map((p) => p.id)
  );
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderSummary, setBuilderSummary] = useState('');
  const [builderPurpose, setBuilderPurpose] = useState('');
  const [builderImpact, setBuilderImpact] = useState('');
  const [builderFindings, setBuilderFindings] = useState('');
  const [builderOutcome, setBuilderOutcome] = useState('');
  const [builderDiagnostics, setBuilderDiagnostics] = useState('');
  const [builderVerification, setBuilderVerification] = useState('');
  const [builderConnectivity, setBuilderConnectivity] = useState(
    'All NE and external dry-contact alarms cleared; S1/NG/Abis links nominal.'
  );
  const [builderOutstanding, setBuilderOutstanding] = useState('None recorded.');
  const [builderRecommendations, setBuilderRecommendations] = useState('');
  const [builderConfidentiality, setBuilderConfidentiality] = useState(
    store.reportBranding.confidentialityLabel
  );

  // Branding Configuration Form State
  const [brandConfig, setBrandConfig] = useState<ReportBrandingConfig>(
    () => store.reportBranding
  );

  const selectedReport = useMemo(
    () =>
      store.maintenanceReports.find((r) => r.id === selectedReportId) ||
      store.maintenanceReports[0] ||
      null,
    [store.maintenanceReports, selectedReportId]
  );

  useEffect(() => {
    if (!selectedReportId && store.maintenanceReports[0]) {
      setSelectedReportId(store.maintenanceReports[0].id);
    }
  }, [selectedReportId, store.maintenanceReports, setSelectedReportId]);

  useEffect(() => {
    if (reportBuilderPrefillCaseId) {
      const targetCase = (store.workCases || []).find((c) => c.id === reportBuilderPrefillCaseId);
      if (targetCase) {
        setBuilderCaseId(targetCase.id);
        if (targetCase.siteId) setBuilderSiteId(targetCase.siteId);
        handleAutoPopulateFromSources(
          targetCase.siteId || builderSiteId,
          builderIncidentId,
          builderWorkOrderId,
          targetCase.id,
          builderType
        );
        setActiveView('builder');
      }
      setReportBuilderPrefillCaseId(null);
    }
  }, [reportBuilderPrefillCaseId]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return store.maintenanceReports.filter((r) => {
      if (filterType !== 'ALL' && r.reportType !== filterType) return false;
      if (filterStatus !== 'ALL' && r.approvalStatus !== filterStatus) return false;
      if (filterRegion !== 'ALL' && r.region !== filterRegion) return false;
      if (filterPriority !== 'ALL' && !(r.priority || '').includes(filterPriority)) {
        return false;
      }
      if (dateFrom && r.submittedAt < dateFrom) return false;
      if (dateTo && r.submittedAt.slice(0, 10) > dateTo) return false;

      if (q) {
        const hay = [
          r.reportNumber,
          r.title,
          r.siteId,
          r.siteCode,
          r.siteName || '',
          r.region || '',
          r.operator || '',
          r.workOrderNumber,
          r.linkedIncidentId || '',
          r.authorName,
          r.reportType || '',
          r.approvalStatus,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    store.maintenanceReports,
    searchQuery,
    filterType,
    filterStatus,
    filterRegion,
    filterPriority,
    dateFrom,
    dateTo,
  ]);

  // Populate Builder from Selected Source Records
  const handleAutoPopulateFromSources = (
    siteIdArg = builderSiteId,
    incIdArg = builderIncidentId,
    woIdArg = builderWorkOrderId,
    caseIdArg = builderCaseId,
    typeArg = builderType
  ) => {
    const site = store.sites.find((s) => s.id === siteIdArg);
    const inc = store.incidents.find((i) => i.id === incIdArg);
    const wo = store.workOrders.find((w) => w.id === woIdArg);
    const workCase = (store.workCases || []).find((c) => c.id === caseIdArg);

    const matchingVisits = store.siteVisits.filter(
      (v) =>
        v.siteId === siteIdArg ||
        (wo && v.workOrderId === wo.id) ||
        (inc && v.linkedIncidentId === inc.id)
    );
    const matchingPhotos = store.photoAssets.filter(
      (p) =>
        p.siteId === siteIdArg ||
        (inc && p.incidentId === inc.id) ||
        (workCase && (workCase.photoIds || []).includes(p.id))
    );

    setBuilderVisitIds(matchingVisits.map((v) => v.id));
    setBuilderPhotoIds(matchingPhotos.map((p) => p.id));

    const primaryVisit = matchingVisits[0];

    if (workCase) {
      setBuilderTitle(`${typeArg} — Case ${workCase.caseNumber}: ${workCase.title}`.trim());
      setBuilderPurpose(
        `${workCase.workTypeCategory ? workCase.workTypeCategory + ' — ' : ''}${workCase.workType || workCase.category}: ${workCase.reportedProblem || workCase.summary || workCase.title}`
      );
      setBuilderSummary(
        `Technical documentation for Work Case ${workCase.caseNumber} (${workCase.category} - ${workCase.workType || 'Engineering'}). Status: ${workCase.status}. Priority: ${workCase.priority}.\n${workCase.description || workCase.summary || ''}`.trim()
      );
      setBuilderImpact(
        `Equipment Status After: ${workCase.equipmentStatusAfter || 'Nominal - Operational'}. Service Status After: ${workCase.serviceStatusAfter || 'Restored'}. Priority: ${workCase.priority.toUpperCase()}.`
      );
      setBuilderFindings(
        `Technical Observations & Findings:\n${workCase.technicalFindings || workCase.initialObservations || 'All parameters nominal.'}\n\nRoot Cause Analysis:\n${workCase.rootCause || 'Not applicable / scheduled engineering maintenance.'}`
      );
      setBuilderOutcome(
        workCase.finalResult ||
          (workCase.status === 'Completed' || workCase.status === 'Verified' || workCase.status === 'Closed'
            ? 'Intervention successfully completed and verified.'
            : 'In progress')
      );
      setBuilderDiagnostics(
        `Calibrated Measurements:\n${(workCase.measurements || []).map((m) => `• ${m.parameter || m.parameterName}: ${m.value} ${m.unit} [${m.status}]`).join('\n') || 'None recorded'}\n\nExecuted Work Steps:\n${(workCase.steps || []).map((s) => `[Step ${s.stepNumber || 1}] ${s.description} (${s.isCompleted || s.status === 'Completed' || s.status === 'completed' || Boolean(s.completedAt) ? 'Completed' : 'Pending'})`).join('\n') || 'None recorded'}\n\nEquipment Swapped / Serviced:\n${(workCase.equipment || []).map((eq) => `• ${eq.type || eq.name} ${eq.model || ''} S/N: ${eq.serialNumber || 'N/A'}`).join('\n') || 'None'}\n\nMaterials Consumed:\n${(workCase.materials || []).map((mat) => `• ${mat.name || mat.partName} (${mat.quantity} ${mat.unit})`).join('\n') || 'None'}`
      );
      setBuilderVerification(
        `Verification Method: ${workCase.verificationMethod || 'Post-repair functional checks completed nominal.'}\nCorrective Action: ${workCase.correctiveAction || 'None required'}.\nTools Used: ${(workCase.toolsUsed || []).join(', ') || 'Standard test equipment'}`
      );
      setBuilderOutstanding(workCase.remainingIssues || 'None recorded.');
      setBuilderRecommendations(
        workCase.preventiveRecommendations || 'Continue scheduled preventative maintenance and monitor telemetry.'
      );
      return;
    }

    setBuilderTitle(
      `${typeArg} — ${site?.siteCode || 'Site'} ${
        inc ? `(${inc.id})` : wo ? `(${wo.workOrderNumber})` : ''
      }`.trim()
    );
    setBuilderPurpose(
      primaryVisit?.purpose ||
        wo?.workDescription ||
        inc?.description ||
        `Scheduled ${typeArg} for ${site?.siteCode}`
    );
    setBuilderSummary(
      `Engineering documentation for ${typeArg} at ${site?.siteCode} (${site?.siteName}). ${
        inc ? `Linked Incident ${inc.id} (${inc.severity}): ${inc.alarmName}.` : ''
      } ${primaryVisit?.workPerformed || ''}`.trim()
    );
    setBuilderImpact(
      inc?.impact
        ? `${inc.impact} (${inc.scope || 'Single Site'}) — Severity: ${inc.severity}`
        : 'No unplanned traffic outage recorded during maintenance window.'
    );
    setBuilderFindings(
      primaryVisit?.observations ||
        inc?.diagnosticObservations ||
        inc?.confirmedRootCause ||
        'Not recorded'
    );
    setBuilderOutcome(
      primaryVisit?.finalVisitOutcome ||
        (inc?.status === 'Resolved' || inc?.status === 'Closed'
          ? 'Resolved / Restored'
          : 'Pending verification')
    );
    setBuilderDiagnostics(
      primaryVisit?.measurementsAndTestResults ||
        inc?.measurementsAndTestResults ||
        'Calibrated optical/RF/DC measurements recorded in Field Operations.'
    );
    setBuilderVerification(
      inc?.resolutionSummary ||
        wo?.completionNotes ||
        'Post-maintenance checks completed; awaiting supervisor sign-off.'
    );
    setBuilderRecommendations(
      primaryVisit?.preventiveRecommendations ||
        inc?.preventiveAction ||
        'Continue routine preventive inspection schedule.'
    );
  };

  const handleOpenEditOrRegenerate = (report: MaintenanceReport) => {
    setEditingReportId(report.id);
    setBuilderType(report.reportType || 'Corrective Maintenance Report');
    setBuilderSiteId(report.siteId);
    setBuilderIncidentId(report.linkedIncidentId || '');
    setBuilderWorkOrderId(report.linkedWorkOrderId || '');
    setBuilderCaseId(report.linkedCaseId || '');
    setBuilderVisitIds(report.linkedVisitIds || []);
    setBuilderPhotoIds(report.photoAssetIds || []);
    setBuilderTitle(report.title);
    setBuilderSummary(report.summary);
    setBuilderPurpose(report.purposeOfVisit || '');
    setBuilderImpact(report.serviceImpactSummary || '');
    setBuilderFindings(report.mainFindings || '');
    setBuilderOutcome(report.finalOutcome || '');
    setBuilderDiagnostics(report.diagnosticProcedures || '');
    setBuilderVerification(report.postRepairVerificationChecks || '');
    setBuilderConnectivity(report.connectivityAndAlarmStatus || '');
    setBuilderOutstanding(report.outstandingFaults || '');
    setBuilderRecommendations(report.recommendations || '');
    setBuilderConfidentiality(
      (report.confidentialityLabel as ReportBrandingConfig['confidentialityLabel']) ||
        store.reportBranding.confidentialityLabel
    );
    setActiveView('builder');
  };

  const handleBuilderSubmit = (saveAsDraft: boolean) => {
    const res = createOrRegenerateReport({
      existingReportId: editingReportId,
      reportType: builderType,
      siteId: builderSiteId,
      linkedIncidentId: builderIncidentId || undefined,
      linkedWorkOrderId: builderWorkOrderId || undefined,
      linkedCaseId: builderCaseId || undefined,
      linkedVisitIds: builderVisitIds,
      photoAssetIds: builderPhotoIds,
      title: builderTitle,
      summary: builderSummary,
      purposeOfVisit: builderPurpose,
      serviceImpactSummary: builderImpact,
      mainFindings: builderFindings,
      finalOutcome: builderOutcome,
      diagnosticProcedures: builderDiagnostics,
      postRepairVerificationChecks: builderVerification,
      connectivityAndAlarmStatus: builderConnectivity,
      outstandingFaults: builderOutstanding,
      recommendations: builderRecommendations,
      confidentialityLabel: builderConfidentiality,
      saveAsDraft,
    });

    if (res.ok && res.report) {
      setEditingReportId(undefined);
      setSelectedReportId(res.report.id);
      setActiveView('preview');
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  };

  // Single or Batch PDF Generation Handler
  const handleDownloadPdf = async (targetReports: MaintenanceReport[]) => {
    if (targetReports.length === 0) {
      showToast('Select at least one report to generate a PDF.', 'error');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const res = await generateEngineeringPdfDocument(
        targetReports,
        store,
        pdfVariant,
        canViewContact,
        undefined,
        reportLanguage
      );
      if (res.ok) {
        recordReportExportAudit(
          'PDF',
          `Generated ${pdfVariant} PDF "${res.filename}" (${res.pageCount} pages, ${targetReports.length} report(s)).`
        );
        showToast(
          `Downloaded PDF "${res.filename}" (${res.pageCount} pages).`,
          'success'
        );
      } else {
        showToast(res.error || 'PDF generation failed.', 'error');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Excel Workbook Export Handler
  const handleDownloadXlsx = (targetReports: MaintenanceReport[]) => {
    const res = exportEngineeringWorkbookXlsx(
      {
        reports: targetReports,
        filenamePrefix:
          targetReports.length === 1
            ? `${targetReports[0].reportNumber}_${targetReports[0].siteCode}`
            : `TelecomOps360_Batch_${targetReports.length}_Reports`,
      },
      store,
      canViewContact
    );
    if (res.ok) {
      recordReportExportAudit(
        'XLSX',
        `Exported ${res.sheetCount}-sheet Excel workbook "${res.filename}" (${targetReports.length} reports).`
      );
      showToast(
        `Downloaded Excel workbook "${res.filename}" (${res.sheetCount} sheets).`,
        'success'
      );
    } else {
      showToast(res.error || 'XLSX export failed.', 'error');
    }
  };

  // Validated JSON Export Handler
  const handleDownloadJson = (
    targetReports: MaintenanceReport[],
    scope: 'single-report' | 'selected-batch' | 'complete-permitted-batch'
  ) => {
    const linkedIncIds = new Set(
      targetReports.map((r) => r.linkedIncidentId).filter(Boolean)
    );
    const linkedWoIds = new Set(
      targetReports.map((r) => r.linkedWorkOrderId || r.workOrderNumber).filter(Boolean)
    );
    const linkedVisitIds = new Set(
      targetReports.flatMap((r) => r.linkedVisitIds || [])
    );
    const linkedSiteIds = new Set(targetReports.map((r) => r.siteId));

    const res = exportValidatedJsonPackage(
      scope,
      {
        typeFilter: filterType,
        statusFilter: filterStatus,
        regionFilter: filterRegion,
      },
      {
        reports: targetReports,
        incidents: store.incidents.filter((i) => linkedIncIds.has(i.id)),
        workOrders: store.workOrders.filter(
          (w) => linkedWoIds.has(w.id) || linkedWoIds.has(w.workOrderNumber)
        ),
        siteVisits: store.siteVisits.filter((v) => linkedVisitIds.has(v.id)),
        sites: store.sites.filter((s) => linkedSiteIds.has(s.id)),
        photoAssets: store.photoAssets.filter((p) =>
          targetReports.some((r) => r.photoAssetIds?.includes(p.id) || p.reportId === r.id)
        ),
      },
      canViewContact,
      targetReports.length === 1
        ? `${targetReports[0].reportNumber}_${targetReports[0].siteCode}.json`
        : undefined
    );

    if (res.ok) {
      recordReportExportAudit(
        'JSON',
        `Exported validated JSON package "${res.filename}" (${Math.round(res.byteSize / 1024)} KB).`
      );
      showToast(`Downloaded validated JSON "${res.filename}".`, 'success');
    } else {
      showToast(res.error || 'JSON export failed.', 'error');
    }
  };

  // Linked entities for currently previewed report
  const previewSite = useMemo(
    () =>
      selectedReport
        ? store.sites.find(
            (s) => s.id === selectedReport.siteId || s.siteCode === selectedReport.siteCode
          )
        : undefined,
    [selectedReport, store.sites]
  );

  const previewIncident = useMemo(
    () =>
      selectedReport?.linkedIncidentId
        ? store.incidents.find((i) => i.id === selectedReport.linkedIncidentId)
        : undefined,
    [selectedReport, store.incidents]
  );

  const previewWorkOrder = useMemo(
    () =>
      selectedReport
        ? store.workOrders.find(
            (w) =>
              w.id === selectedReport.linkedWorkOrderId ||
              w.workOrderNumber === selectedReport.workOrderNumber
          )
        : undefined,
    [selectedReport, store.workOrders]
  );

  const previewVisits = useMemo(
    () =>
      selectedReport
        ? store.siteVisits.filter(
            (v) =>
              selectedReport.linkedVisitIds?.includes(v.id) ||
              (previewWorkOrder && v.workOrderId === previewWorkOrder.id) ||
              (previewIncident && v.linkedIncidentId === previewIncident.id)
          )
        : [],
    [selectedReport, previewWorkOrder, previewIncident, store.siteVisits]
  );

  const previewPhotos = useMemo(
    () =>
      selectedReport
        ? store.photoAssets.filter(
            (p) =>
              selectedReport.photoAssetIds?.includes(p.id) ||
              p.reportId === selectedReport.id
          )
        : [],
    [selectedReport, store.photoAssets]
  );

  return (
    <div className="space-y-5">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <FileText className="w-3.5 h-3.5" />
            <span>
              PHASE 4 PROFESSIONAL ENGINEERING REPORT CENTER · PDF / XLSX / JSON EXPORTS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Engineering Reports &amp; Technical Documentation ({store.maintenanceReports.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            16 telecom report templates with revision numbering ({store.reportBranding.reportNumberPrefix}-2026-XXXXXX),
            approval sign-off, embedded stamped photos, and multi-format batch exports.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl">
          {(
            [
              { id: 'preview', label: 'Report Preview & Sign-Off', icon: Eye },
              {
                id: 'library',
                label: `Report Library (${filteredReports.length})`,
                icon: Layers,
              },
              { id: 'builder', label: '16-Type Report Builder', icon: Plus },
              {
                id: 'batch-branding',
                label: 'Batch Export & Branding',
                icon: FileSpreadsheet,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'builder' && !editingReportId) {
                    handleAutoPopulateFromSources();
                  }
                  setActiveView(tab.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  activeView === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: ENGINEERING DOCUMENT PREVIEW, WORKFLOW SIGN-OFF & DIRECT EXPORTS */}
      {activeView === 'preview' && selectedReport && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Quick Selector Strip */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Engineering Report ({store.maintenanceReports.length})
              </div>
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {store.maintenanceReports.map((r) => {
                  const active = r.id === selectedReport.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedReportId(r.id)}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-sky-600 dark:text-sky-400">
                          {r.reportNumber}
                        </span>
                        <span className="text-slate-500">{r.revisionCode || 'Rev 1.0'}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                        {r.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-1">
                        <span>{r.siteCode}</span>
                        <span
                          className={`font-semibold ${
                            r.approvalStatus === 'Approved'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : r.approvalStatus === 'Pending Review'
                              ? 'text-amber-600 dark:text-amber-400'
                              : r.approvalStatus === 'Rejected'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {r.approvalStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Export Controls Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                Download &amp; Export Options
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  PDF Layout &amp; Photo Variant
                </label>
                <select
                  value={pdfVariant}
                  onChange={(e) => setPdfVariant(e.target.value as PdfVariantMode)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="full-with-photos">
                    Full Engineering Report (With Photographs)
                  </option>
                  <option value="full-without-photos">
                    Full Engineering Report (Without Photographs)
                  </option>
                  <option value="compact-with-photos">
                    Compact Summary Report (With Photographs)
                  </option>
                  <option value="compact-without-photos">
                    Compact Summary Report (Without Photographs)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t('reports.reportLanguage', 'Report Language')}
                </label>
                <select
                  value={reportLanguage}
                  onChange={(e) => setReportLanguage(e.target.value as 'en' | 'fr' | 'ar')}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-medium"
                >
                  <option value="en">English (EN)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="ar">العربية (AR)</option>
                </select>
              </div>

              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleDownloadPdf([selectedReport])}
                className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isGeneratingPdf ? 'Rendering Multi-Page PDF...' : 'Download Engineering PDF'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadXlsx([selectedReport])}
                  className="py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadJson([selectedReport], 'single-report')}
                  className="py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>JSON (.json)</span>
                </button>
              </div>

              {canCreateReport && (
                <button
                  type="button"
                  onClick={() => handleOpenEditOrRegenerate(selectedReport)}
                  className="w-full py-2 px-3 rounded-lg border border-sky-500/50 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {selectedReport.approvalStatus === 'Approved'
                      ? 'Regenerate as New Revision (Supersedes Approved)'
                      : 'Edit / Regenerate Report'}
                  </span>
                </button>
              )}
            </div>

            {/* Formal Review & Approval Sign-Off Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-500" />
                <span>Document Review &amp; Approval Workflow</span>
              </div>

              <div className="text-[11px] text-slate-500">
                Current Status:{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {selectedReport.approvalStatus} ({selectedReport.revisionCode || 'Rev 1.0'})
                </strong>
              </div>

              <input
                type="text"
                value={workflowComment}
                onChange={(e) => setWorkflowComment(e.target.value)}
                placeholder="Reviewer / Approver sign-off remarks..."
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />

              <div className="flex flex-wrap gap-1.5">
                {(canCreateReport || canReviewReport) &&
                  selectedReport.approvalStatus !== 'Pending Review' &&
                  selectedReport.approvalStatus !== 'Approved' && (
                    <button
                      type="button"
                      onClick={() => {
                        updateReportWorkflowStatus(
                          selectedReport.id,
                          'Pending Review',
                          workflowComment
                        );
                        setWorkflowComment('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                    >
                      Submit for Review
                    </button>
                  )}

                {canApproveReport && selectedReport.approvalStatus !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      updateReportWorkflowStatus(
                        selectedReport.id,
                        'Approved',
                        workflowComment
                      );
                      setWorkflowComment('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                  >
                    Approve &amp; Sign Off
                  </button>
                )}

                {canApproveReport && selectedReport.approvalStatus !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      updateReportWorkflowStatus(
                        selectedReport.id,
                        'Rejected',
                        workflowComment
                      );
                      setWorkflowComment('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right 9-Section Engineering Document Sheet */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            {/* 1. DOCUMENT HEADER BANNER */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-sky-400">
                <span>
                  {store.reportBranding.logoText} ·{' '}
                  {selectedReport.confidentialityLabel ||
                    store.reportBranding.confidentialityLabel}
                </span>
                <span>
                  Report No: {selectedReport.reportNumber} ·{' '}
                  {selectedReport.revisionCode || 'Rev 1.0'}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1.5">
                {selectedReport.reportType || 'Engineering Maintenance Report'}:{' '}
                {selectedReport.title}
              </h2>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-2 text-xs text-slate-300">
                <span>
                  {store.reportBranding.companyName} — {store.reportBranding.departmentName}
                </span>
                <span className="font-mono">
                  Status: <strong>{selectedReport.approvalStatus.toUpperCase()}</strong> ·
                  Generated: {formatUtcTimestamp(selectedReport.generatedAt || selectedReport.submittedAt, tz)}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* 2. DOCUMENT CONTROL */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  01. Document Control &amp; Authoritative References
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">Prepared By</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {canViewContact ? selectedReport.authorName : 'Field Engineer [Masked]'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">Reviewed By</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedReport.reviewedBy || 'Pending review'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">Approved By</div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedReport.approvedBy || 'Pending approval (Not signed off)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-500">Source Links</div>
                    <div className="flex flex-wrap gap-1.5 mt-0.5 font-mono">
                      {selectedReport.linkedCaseId && (
                        <button
                          type="button"
                          onClick={() => openCaseById(selectedReport.linkedCaseId!)}
                          className="inline-flex items-center text-sky-600 dark:text-sky-400 hover:underline cursor-pointer font-semibold"
                        >
                          <Briefcase className="w-3 h-3 mr-1" />
                          {selectedReport.caseNumber || selectedReport.linkedCaseId}
                        </button>
                      )}
                      {selectedReport.linkedIncidentId && (
                        <button
                          type="button"
                          onClick={() => openIncidentById(selectedReport.linkedIncidentId!)}
                          className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          {selectedReport.linkedIncidentId}
                        </button>
                      )}
                      {previewWorkOrder && (
                        <button
                          type="button"
                          onClick={() => openWorkOrderById(previewWorkOrder.id)}
                          className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          {previewWorkOrder.workOrderNumber}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. EXECUTIVE SUMMARY */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  02. Executive Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="font-mono text-[11px] text-slate-500">Purpose of Visit</div>
                    <p className="mt-1 text-slate-800 dark:text-slate-200">
                      {selectedReport.purposeOfVisit || 'Not recorded'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="font-mono text-[11px] text-slate-500">Service Impact</div>
                    <p className="mt-1 text-slate-800 dark:text-slate-200">
                      {selectedReport.serviceImpactSummary || 'Not recorded'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="font-mono text-[11px] text-slate-500">
                      Incident &amp; Maintenance Summary
                    </div>
                    <p className="mt-1 text-slate-800 dark:text-slate-200">
                      {selectedReport.summary || 'Not recorded'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="font-mono text-[11px] text-slate-500">
                      Main Findings &amp; Final Outcome
                    </div>
                    <p className="mt-1 text-slate-800 dark:text-slate-200">
                      <strong>Findings:</strong> {selectedReport.mainFindings || 'Not recorded'}
                    </p>
                    <p className="mt-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                      Outcome: {selectedReport.finalOutcome || 'Pending verification'}
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. SITE & INCIDENT INFORMATION */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    03. Site Information
                  </h3>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
                    <div>
                      Site ID / Code:{' '}
                      <strong className="text-sky-600 dark:text-sky-400">
                        {previewSite?.id || selectedReport.siteId} /{' '}
                        {previewSite?.siteCode || selectedReport.siteCode}
                      </strong>
                    </div>
                    <div className="font-sans">
                      Site Name: <strong>{previewSite?.siteName || selectedReport.siteName || 'Not recorded'}</strong>
                    </div>
                    <div className="font-sans">
                      Operator &amp; Region:{' '}
                      {previewSite?.operator || selectedReport.operator || 'Not recorded'} ·{' '}
                      {previewSite?.region || selectedReport.region || 'Not recorded'}
                    </div>
                    <div className="font-sans">
                      Address: {previewSite?.address || 'Not recorded'}
                    </div>
                    <div>
                      Coordinates:{' '}
                      {previewSite
                        ? `${previewSite.latitude.toFixed(5)}, ${previewSite.longitude.toFixed(5)}`
                        : 'Not recorded'}
                    </div>
                    <div className="font-sans">
                      Type &amp; Technologies:{' '}
                      {previewSite
                        ? `${previewSite.siteType} (${previewSite.technologies.join(', ')})`
                        : 'Not recorded'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    04. Incident Milestones &amp; Root Cause
                  </h3>
                  {previewIncident ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
                      <div>
                        Incident ID:{' '}
                        <strong className="text-sky-600 dark:text-sky-400">
                          {previewIncident.id}
                        </strong>{' '}
                        ({previewIncident.severity} · {previewIncident.priority || 'P1'})
                      </div>
                      <div>
                        Alarm Ref(s):{' '}
                        {[previewIncident.alarmId, ...(previewIncident.relatedAlarmIds || [])].join(
                          ', '
                        )}
                      </div>
                      <div>
                        First Occurrence: {formatUtcTimestamp(previewIncident.firstOccurrence, tz)}
                      </div>
                      <div>
                        Acknowledged:{' '}
                        {previewIncident.acknowledgedAt
                          ? formatUtcTimestamp(previewIncident.acknowledgedAt, tz)
                          : 'Not recorded'}
                      </div>
                      <div>
                        Service Restored:{' '}
                        {previewIncident.serviceRestoredAt
                          ? formatUtcTimestamp(previewIncident.serviceRestoredAt, tz)
                          : 'Pending restoration'}
                      </div>
                      <div>
                        Alarm Cleared / Closed:{' '}
                        {previewIncident.alarmClearedAt
                          ? formatUtcTimestamp(previewIncident.alarmClearedAt, tz)
                          : 'Active'}{' '}
                        /{' '}
                        {previewIncident.closedAt
                          ? formatUtcTimestamp(previewIncident.closedAt, tz)
                          : 'Open'}
                      </div>
                      <div className="font-sans pt-1">
                        <strong>Confirmed Root Cause:</strong>{' '}
                        {previewIncident.confirmedRootCause || 'Not yet determined'}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500">
                      No incident record linked to this report (Routine / Standalone Maintenance).
                    </div>
                  )}
                </div>
              </section>

              {/* 5. FIELD WORK, MEASUREMENTS, CHECKLISTS & REPLACEMENTS */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  05. Field Work, Calibrated Measurements, Checklists &amp; Replacements
                </h3>

                {/* Measurements Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                        <th className="py-2 px-3">Parameter</th>
                        <th className="py-2 px-3">Equipment / Sector</th>
                        <th className="py-2 px-3">Value &amp; Unit</th>
                        <th className="py-2 px-3">Ref Range</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Instrument</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {previewVisits.flatMap((v) => v.measurementRecords || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-3 px-3 text-slate-500 font-sans">
                            Not tested / No structured instrument measurements recorded.
                          </td>
                        </tr>
                      ) : (
                        previewVisits
                          .flatMap((v) => v.measurementRecords || [])
                          .map((m) => (
                            <tr key={m.id}>
                              <td className="py-2 px-3 font-sans font-medium">{m.parameterName}</td>
                              <td className="py-2 px-3">{m.equipmentOrSector}</td>
                              <td className="py-2 px-3 font-bold">
                                {m.measuredValue} {m.unit}
                              </td>
                              <td className="py-2 px-3 text-slate-500">{m.referenceRange}</td>
                              <td className="py-2 px-3">{m.status}</td>
                              <td className="py-2 px-3 font-sans text-slate-500">
                                {m.testInstrument}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Equipment Replacements Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                        <th className="py-2 px-3">Category &amp; Slot</th>
                        <th className="py-2 px-3">Removed Model &amp; Serial</th>
                        <th className="py-2 px-3">Installed Model &amp; Serial</th>
                        <th className="py-2 px-3">Firmware</th>
                        <th className="py-2 px-3">Fault Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {previewVisits.flatMap((v) => v.equipmentReplacements || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-3 px-3 text-slate-500 font-sans">
                            No hardware modules replaced during linked field visits.
                          </td>
                        </tr>
                      ) : (
                        previewVisits
                          .flatMap((v) => v.equipmentReplacements || [])
                          .map((eq) => (
                            <tr key={eq.id}>
                              <td className="py-2 px-3">
                                {eq.equipmentCategory} ({eq.sectorOrSlot})
                              </td>
                              <td className="py-2 px-3 text-red-600 dark:text-red-400">
                                {eq.removedManufacturerModel} | SN: {eq.removedSerialNumber}
                              </td>
                              <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400">
                                {eq.installedManufacturerModel} | SN: {eq.installedSerialNumber}
                              </td>
                              <td className="py-2 px-3">{eq.firmwareVersion}</td>
                              <td className="py-2 px-3 font-sans">{eq.faultReason}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 6. PHOTOGRAPHIC EVIDENCE */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  06. Photographic Evidence &amp; Annotated Figures ({previewPhotos.length})
                </h3>
                {previewPhotos.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500">
                    No photographs attached to this report.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {previewPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            {photo.figureNumber || `Figure ${idx + 1}`} [{photo.classification}] —{' '}
                            {photo.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => openPhotoInStudio(photo.id)}
                            className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                          >
                            Open in Photo Studio →
                          </button>
                        </div>
                        <img
                          src={photo.annotatedDataUrl || photo.originalDataUrl}
                          alt={photo.title}
                          className="w-full h-48 object-contain bg-slate-900 rounded border border-slate-800"
                        />
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {photo.title}
                        </div>
                        <p className="text-[11px] text-slate-500">{photo.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 7. VERIFICATION, SIGN-OFF & REVISION HISTORY */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  07. Post-Repair Verification, Sign-Off &amp; Revision Audit Trail
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="font-mono text-[11px] text-slate-500">
                      Post-Repair Verification Checks
                    </div>
                    <p className="mt-1">
                      {selectedReport.postRepairVerificationChecks || 'Pending verification'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="font-mono text-[11px] text-slate-500">
                      Preventive Recommendations &amp; Outstanding Faults
                    </div>
                    <p className="mt-1">
                      <strong>Outstanding:</strong>{' '}
                      {selectedReport.outstandingFaults || 'None recorded'}
                    </p>
                    <p className="mt-1">
                      <strong>Recommendations:</strong>{' '}
                      {selectedReport.recommendations || 'Not recorded'}
                    </p>
                  </div>
                </div>

                {/* Revision History Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                        <th className="py-2 px-3">Revision</th>
                        <th className="py-2 px-3">Status at Revision</th>
                        <th className="py-2 px-3">Generated At ({tz})</th>
                        <th className="py-2 px-3">Author / Role</th>
                        <th className="py-2 px-3">Revision Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {(selectedReport.revisionHistory || []).map((rev) => (
                        <tr key={rev.revisionNumber}>
                          <td className="py-2 px-3 font-bold text-sky-600 dark:text-sky-400">
                            {rev.revisionCode}
                          </td>
                          <td className="py-2 px-3">{rev.statusAtRevision}</td>
                          <td className="py-2 px-3">
                            {formatUtcTimestamp(rev.generatedAt, tz)}
                          </td>
                          <td className="py-2 px-3">
                            {canViewContact ? rev.generatedBy : rev.generatedByRole}
                          </td>
                          <td className="py-2 px-3 font-sans">{rev.changeNotes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REPORT LIBRARY & SEARCH */}
      {activeView === 'library' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Report No, Incident, WO, Site, Engineer..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="ALL">All 16 Report Types</option>
                {ALL_16_REPORT_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.type}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Generated">Generated</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Superseded">Superseded</option>
              </select>

              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                <option value="ALL">All Regions</option>
                <option value="North Metro">North Metro</option>
                <option value="Central Core">Central Core</option>
                <option value="South Coast">South Coast</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] uppercase text-slate-500">
                  <th className="py-3 px-4">Report Number &amp; Rev</th>
                  <th className="py-3 px-4">Report Type &amp; Title</th>
                  <th className="py-3 px-4">Site / Region</th>
                  <th className="py-3 px-4">Linked Records</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredReports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-sky-600 dark:text-sky-400">
                        {r.reportNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {r.revisionCode || 'Rev 1.0'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {r.reportType || 'Maintenance Report'}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{r.title}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {r.siteCode}
                      </div>
                      <div className="text-[11px] text-slate-500">{r.region || 'North Metro'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {r.linkedCaseId && (
                        <div className="font-semibold text-sky-600 dark:text-sky-400">
                          <button
                            type="button"
                            onClick={() => openCaseById(r.linkedCaseId!)}
                            className="inline-flex items-center hover:underline cursor-pointer"
                          >
                            <Briefcase className="w-3 h-3 mr-1" />
                            {r.caseNumber || r.linkedCaseId}
                          </button>
                        </div>
                      )}
                      <div>Inc: {r.linkedIncidentId || '—'}</div>
                      <div>WO: {r.workOrderNumber}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span
                        className={`font-semibold ${
                          r.approvalStatus === 'Approved'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : r.approvalStatus === 'Pending Review'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {r.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReportId(r.id);
                          setActiveView('preview');
                        }}
                        className="px-2.5 py-1 rounded bg-sky-600 text-white font-semibold cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf([r])}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: 16-TYPE REPORT BUILDER & ASSEMBLER */}
      {activeView === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: 16 Report Templates Selector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Choose Engineering Report Template (16 Types)
            </h2>
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {ALL_16_REPORT_TYPES.map((tpl, idx) => {
                const active = builderType === tpl.type;
                return (
                  <div
                    key={tpl.type}
                    onClick={() => {
                      setBuilderType(tpl.type);
                      handleAutoPopulateFromSources(
                        builderSiteId,
                        builderIncidentId,
                        builderWorkOrderId,
                        tpl.type
                      );
                    }}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        {String(idx + 1).padStart(2, '0')}. {tpl.category}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {tpl.type}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Source Record Linker & Structured Document Editor */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingReportId
                    ? `Regenerate / Update Report (${editingReportId})`
                    : `Assemble ${builderType}`}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select authoritative source records to auto-populate timestamps, measurements,
                  and photographs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAutoPopulateFromSources()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/50 text-sky-600 dark:text-sky-400 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync From Source Records</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Source Work Case</label>
                <select
                  value={builderCaseId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setBuilderCaseId(cId);
                    const targetCase = (store.workCases || []).find((c) => c.id === cId);
                    const nextSiteId = targetCase?.siteId || builderSiteId;
                    if (targetCase?.siteId) setBuilderSiteId(targetCase.siteId);
                    handleAutoPopulateFromSources(
                      nextSiteId,
                      builderIncidentId,
                      builderWorkOrderId,
                      cId,
                      builderType
                    );
                  }}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="">None (Incident / Manual)</option>
                  {(store.workCases || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Source Site *</label>
                <select
                  value={builderSiteId}
                  onChange={(e) => {
                    setBuilderSiteId(e.target.value);
                    handleAutoPopulateFromSources(
                      e.target.value,
                      builderIncidentId,
                      builderWorkOrderId,
                      builderCaseId,
                      builderType
                    );
                  }}
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
                <label className="block text-slate-500 mb-1">Linked Incident</label>
                <select
                  value={builderIncidentId}
                  onChange={(e) => setBuilderIncidentId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="">None (Routine / Preventive)</option>
                  {store.incidents.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.id} ({i.siteCode} · {i.severity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Linked Work Order</label>
                <select
                  value={builderWorkOrderId}
                  onChange={(e) => setBuilderWorkOrderId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="">None</option>
                  {store.workOrders.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.workOrderNumber} ({w.siteCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Document Title *</label>
              <input
                type="text"
                value={builderTitle}
                onChange={(e) => setBuilderTitle(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Executive Summary *</label>
                <textarea
                  rows={3}
                  value={builderSummary}
                  onChange={(e) => setBuilderSummary(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Main Technical Findings *</label>
                <textarea
                  rows={3}
                  value={builderFindings}
                  onChange={(e) => setBuilderFindings(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">
                  Diagnostic Procedures &amp; Instruments
                </label>
                <textarea
                  rows={2}
                  value={builderDiagnostics}
                  onChange={(e) => setBuilderDiagnostics(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">
                  Post-Repair Verification &amp; Final Outcome
                </label>
                <textarea
                  rows={2}
                  value={builderVerification}
                  onChange={(e) => setBuilderVerification(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleBuilderSubmit(true)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleBuilderSubmit(false)}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                {editingReportId
                  ? 'Generate New Revision'
                  : 'Generate Final Engineering Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: BATCH EXPORT & ORGANIZATION BRANDING CENTER */}
      {activeView === 'batch-branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Batch Export Selection Table */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Batch Report &amp; Multi-Record Export Center
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select multiple reports to package into a combined PDF, 11-sheet XLSX workbook,
                  or versioned JSON export.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedBatchIds(store.maintenanceReports.map((r) => r.id))
                  }
                  className="text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setSelectedBatchIds([])}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {store.maintenanceReports.map((r) => {
                const checked = selectedBatchIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedBatchIds((prev) =>
                            checked ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                          )
                        }
                        className="rounded border-slate-300"
                      />
                      <div>
                        <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {r.reportNumber} ({r.revisionCode || 'Rev 1.0'}) — {r.siteCode}
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">{r.title}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {r.approvalStatus}
                    </span>
                  </label>
                );
              })}
            </div>

            {largeBatchConfirmOpen && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-center justify-between">
                <span className="text-amber-800 dark:text-amber-200">
                  Confirm generating combined multi-report PDF package for{' '}
                  {selectedBatchIds.length} reports?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLargeBatchConfirmOpen(false)}
                    className="px-2.5 py-1 rounded border border-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLargeBatchConfirmOpen(false);
                      const batch = store.maintenanceReports.filter((r) =>
                        selectedBatchIds.includes(r.id)
                      );
                      handleDownloadPdf(batch);
                    }}
                    className="px-3 py-1 rounded bg-sky-600 text-white font-semibold cursor-pointer"
                  >
                    Confirm &amp; Generate
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={!canExportBatch || selectedBatchIds.length === 0}
                onClick={() => {
                  const batch = store.maintenanceReports.filter((r) =>
                    selectedBatchIds.includes(r.id)
                  );
                  if (batch.length >= 3) {
                    setLargeBatchConfirmOpen(true);
                  } else {
                    handleDownloadPdf(batch);
                  }
                }}
                className="py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Batch PDF ({selectedBatchIds.length})</span>
              </button>

              <button
                type="button"
                disabled={!canExportBatch || selectedBatchIds.length === 0}
                onClick={() => {
                  const batch = store.maintenanceReports.filter((r) =>
                    selectedBatchIds.includes(r.id)
                  );
                  handleDownloadXlsx(batch);
                }}
                className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>11-Sheet XLSX Workbook</span>
              </button>

              <button
                type="button"
                disabled={!canExportBatch || selectedBatchIds.length === 0}
                onClick={() => {
                  const batch = store.maintenanceReports.filter((r) =>
                    selectedBatchIds.includes(r.id)
                  );
                  handleDownloadJson(batch, 'selected-batch');
                }}
                className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCode2 className="w-4 h-4" />
                <span>Validated Batch JSON</span>
              </button>
            </div>
          </div>

          {/* Organization Branding & Report Numbering Config */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Organization Branding &amp; Report Numbering Service
            </h2>
            <p className="text-[11px] text-slate-500">
              Configures PDF headers, footers, confidentiality labels, and atomic report sequence
              numbering (Next ID: {brandConfig.reportNumberPrefix}-2026-
              {String(store.nextReportSequence || 104).padStart(6, '0')}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 mb-1">Company / Operator Name</label>
                <input
                  type="text"
                  disabled={!canManageBranding}
                  value={brandConfig.companyName}
                  onChange={(e) =>
                    setBrandConfig({ ...brandConfig, companyName: e.target.value })
                  }
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Department / Maintenance Team Header
                </label>
                <input
                  type="text"
                  disabled={!canManageBranding}
                  value={brandConfig.departmentName}
                  onChange={(e) =>
                    setBrandConfig({ ...brandConfig, departmentName: e.target.value })
                  }
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Report Number Prefix</label>
                  <input
                    type="text"
                    disabled={!canManageBranding}
                    value={brandConfig.reportNumberPrefix}
                    onChange={(e) =>
                      setBrandConfig({
                        ...brandConfig,
                        reportNumberPrefix: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Confidentiality Classification</label>
                  <select
                    disabled={!canManageBranding}
                    value={brandConfig.confidentialityLabel}
                    onChange={(e) =>
                      setBrandConfig({
                        ...brandConfig,
                        confidentialityLabel:
                          e.target.value as ReportBrandingConfig['confidentialityLabel'],
                      })
                    }
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="INTERNAL ENGINEERING USE ONLY">
                      INTERNAL ENGINEERING USE ONLY
                    </option>
                    <option value="CONFIDENTIAL — CARRIER OPERATIONS">
                      CONFIDENTIAL — CARRIER OPERATIONS
                    </option>
                    <option value="CUSTOMER DELIVERABLE">CUSTOMER DELIVERABLE</option>
                    <option value="PUBLIC">PUBLIC</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={!canManageBranding}
                onClick={() => updateReportBranding(brandConfig)}
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
              >
                Save Organization Branding Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
