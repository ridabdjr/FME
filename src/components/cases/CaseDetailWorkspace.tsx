import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Camera,
  Layers,
  Wrench,
  Activity,
  Package,
  ListTodo,
  Download,
  Share2,
  Copy,
  Edit3,
  Trash2,
  Plus,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Gauge,
  Navigation,
  Check,
  X,
  FileSpreadsheet,
  FileCode,
  Tag,
  Hash,
  Send,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n';
import {
  WorkCase,
  CaseStatus,
  CasePriority,
  WorkCaseStep,
  WorkCaseMeasurement,
  WorkCaseMaterial,
  WorkCaseEquipmentItem,
  WorkCaseFollowUpTask,
  WorkCaseEventType
} from '../../types/models';
import {
  REPORT_TEMPLATES,
  exportCaseToPdf,
  exportCaseToJson,
  exportCasesToExcel
} from '../../services/caseExportService';

interface CaseDetailWorkspaceProps {
  caseId: string;
  onBack: () => void;
}

type TabKey =
  | 'overview'
  | 'site'
  | 'steps'
  | 'equipment'
  | 'timeline'
  | 'photos'
  | 'measurements'
  | 'materials'
  | 'findings'
  | 'followup'
  | 'reports';

export const CaseDetailWorkspace: React.FC<CaseDetailWorkspaceProps> = ({ caseId, onBack }) => {
  const { t, language } = useI18n();
  const {
    store,
    openEditCaseModal,
    deleteWorkCase,
    duplicateWorkCase,
    changeCaseStatus,
    addCaseTimelineEntry,
    addCaseStep,
    updateCaseStep,
    recordCaseMeasurement,
    addCaseMaterial,
    addCaseEquipment,
    addCaseFollowUpTask,
    updateCaseFollowUpTask,
    linkPhotoToCase,
    uploadPhotoAsset,
    navigateTo,
    setSelectedPhotoId,
    setSelectedSiteId,
    openReportBuilderForCase,
    showToast
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<string>('comprehensive-intervention');
  const [caseReportLang, setCaseReportLang] = useState<'en' | 'fr' | 'ar'>(() => (language === 'ar' || language === 'fr' ? language : 'en'));
  const [isExporting, setIsExporting] = useState(false);

  // Quick form states for inline modals/drawers
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepEstimated, setNewStepEstimated] = useState(15);

  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [timelineType, setTimelineType] = useState<WorkCaseEventType>('Comment / Note');
  const [timelineTitle, setTimelineTitle] = useState('');
  const [timelineDesc, setTimelineDesc] = useState('');

  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [measParam, setMeasParam] = useState('');
  const [measValue, setMeasValue] = useState('');
  const [measUnit, setMeasUnit] = useState('dBm');
  const [measMin, setMeasMin] = useState('');
  const [measMax, setMeasMax] = useState('');
  const [measStatus, setMeasStatus] = useState<'pass' | 'fail' | 'marginal' | 'info'>('pass');
  const [measEquipment, setMeasEquipment] = useState('');
  const [measNotes, setMeasNotes] = useState('');

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [matName, setMatName] = useState('');
  const [matPartNo, setMatPartNo] = useState('');
  const [matQty, setMatQty] = useState(1);
  const [matUnit, setMatUnit] = useState('pcs');
  const [matSerial, setMatSerial] = useState('');

  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState('Optical Transceiver');
  const [eqSerial, setEqSerial] = useState('');
  const [eqManufacturer, setEqManufacturer] = useState('');
  const [eqFirmware, setEqFirmware] = useState('');
  const [eqAction, setEqAction] = useState<'inspected' | 'installed' | 'replaced' | 'repaired' | 'removed'>('inspected');

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<CasePriority>('medium');
  const [taskDesc, setTaskDesc] = useState('');

  const currentCase = useMemo(() => {
    return store.workCases.find((c) => c.id === caseId);
  }, [store.workCases, caseId]);

  const linkedSite = useMemo(() => {
    if (!currentCase) return undefined;
    return store.sites.find((s) => s.id === currentCase.siteId || s.siteCode === currentCase.siteCode);
  }, [store.sites, currentCase]);

  const casePhotos = useMemo(() => {
    if (!currentCase) return [];
    return (store.photoAssets || []).filter((p) => (currentCase.photoIds && currentCase.photoIds.includes(p.id)) || p.workOrderId === currentCase.id || p.visitId === currentCase.id);
  }, [store.photoAssets, currentCase]);

  if (!currentCase) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Work Case Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The requested work case ID ({caseId}) does not exist in the database or may have been deleted.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Work Cases
        </button>
      </div>
    );
  }

  // Progress computation
  const totalSteps = currentCase.steps.length;
  const completedSteps = currentCase.steps.filter((s) => s.status === 'completed').length;
  const stepPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Handlers
  const handleToggleStep = (stepId: string, currentStepStatus: string) => {
    const nextStatus = currentStepStatus === 'completed' ? 'pending' : 'completed';
    updateCaseStep(currentCase.id, stepId, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
    });
  };

  const handleCreateStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    const newStep: WorkCaseStep = {
      id: `step-${Date.now()}`,
      orderIndex: currentCase.steps.length + 1,
      title: newStepTitle.trim(),
      description: newStepDesc.trim(),
      status: 'pending',
      estimatedMinutes: Number(newStepEstimated) || 15
    };
    addCaseStep(currentCase.id, newStep);
    setNewStepTitle('');
    setNewStepDesc('');
    setShowAddStep(false);
  };

  const handleAddTimelineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineTitle.trim()) return;
    addCaseTimelineEntry(currentCase.id, {
      type: timelineType,
      title: timelineTitle.trim(),
      description: timelineDesc.trim(),
      author: currentCase.assignedEngineer || 'Solo Engineer'
    });
    setTimelineTitle('');
    setTimelineDesc('');
    setShowAddTimeline(false);
  };

  const handleAddMeasurementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!measParam.trim() || !measValue.trim()) return;
    const newM: WorkCaseMeasurement = {
      id: `meas-${Date.now()}`,
      parameter: measParam.trim(),
      value: measValue.trim(),
      unit: measUnit.trim(),
      thresholdMin: measMin.trim() || undefined,
      thresholdMax: measMax.trim() || undefined,
      status: measStatus,
      testEquipment: measEquipment.trim() || undefined,
      notes: measNotes.trim() || undefined,
      timestamp: new Date().toISOString(),
      performedBy: currentCase.assignedEngineer || 'Field Engineer'
    };
    recordCaseMeasurement(currentCase.id, newM);
    setMeasParam('');
    setMeasValue('');
    setMeasMin('');
    setMeasMax('');
    setMeasEquipment('');
    setMeasNotes('');
    setShowAddMeasurement(false);
  };

  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;
    const newMat: WorkCaseMaterial = {
      id: `mat-${Date.now()}`,
      name: matName.trim(),
      partNumber: matPartNo.trim() || undefined,
      quantity: Number(matQty) || 1,
      unit: matUnit.trim() || 'pcs',
      serialNumber: matSerial.trim() || undefined
    };
    addCaseMaterial(currentCase.id, newMat);
    setMatName('');
    setMatPartNo('');
    setMatSerial('');
    setShowAddMaterial(false);
  };

  const handleAddEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim()) return;
    const newEq: WorkCaseEquipmentItem = {
      id: `eq-${Date.now()}`,
      name: eqName.trim(),
      type: eqType.trim(),
      serialNumber: eqSerial.trim() || undefined,
      manufacturer: eqManufacturer.trim() || undefined,
      firmwareVersion: eqFirmware.trim() || undefined,
      action: eqAction,
      status: 'operational'
    };
    addCaseEquipment(currentCase.id, newEq);
    setEqName('');
    setEqSerial('');
    setEqManufacturer('');
    setEqFirmware('');
    setShowAddEquipment(false);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const newTask: WorkCaseFollowUpTask = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      dueDate: taskDueDate || undefined,
      priority: taskPriority,
      status: 'pending',
      assignee: currentCase.assignedEngineer || 'Field Specialist',
      description: taskDesc.trim() || undefined
    };
    addCaseFollowUpTask(currentCase.id, newTask);
    setTaskTitle('');
    setTaskDueDate('');
    setTaskDesc('');
    setShowAddTask(false);
  };

  const handleStatusChange = (newStatus: CaseStatus) => {
    changeCaseStatus(currentCase.id, newStatus, `Status updated to ${newStatus}`);
  };

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      exportCaseToPdf(currentCase, linkedSite, casePhotos, selectedPdfTemplate, caseReportLang);
      showToast(
        `Generated and downloaded PDF report in ${caseReportLang.toUpperCase()} using template "${REPORT_TEMPLATES.find((t) => t.id === selectedPdfTemplate)?.name || 'Custom'}".`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not compile PDF report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      exportCasesToExcel([currentCase], `case_${currentCase.caseNumber}_export.xlsx`);
      showToast(`Exported case ${currentCase.caseNumber} multi-sheet workbook.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not export Excel file.', 'error');
    }
  };

  const handleExportJson = () => {
    exportCaseToJson(currentCase);
    showToast(`Complete payload for ${currentCase.caseNumber} exported.`, 'success');
  };

  const handleNavigateToGisSite = () => {
    if (linkedSite) {
      setSelectedSiteId(linkedSite.id);
      navigateTo('gis-map');
    }
  };

  const handlePhotoUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const res = uploadPhotoAsset({
        title: `Site evidence for ${currentCase.caseNumber}`,
        caption: `Site evidence for ${currentCase.caseNumber}: ${file.name}`,
        classification: 'During',
        equipmentOrArea: currentCase.category || 'Site Infrastructure',
        tags: [currentCase.category || 'General', 'evidence', currentCase.caseNumber],
        siteId: currentCase.siteId || linkedSite?.id || 'manual-site',
        workOrderId: currentCase.id,
        visitId: currentCase.id,
        originalDataUrl: dataUrl,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        fileSizeKb: Math.round(file.size / 1024),
        captureTimestampSource: 'Manual Entry',
      });
      if (res.ok && res.photo) {
        linkPhotoToCase(currentCase.id, res.photo.id);
        showToast(`Evidence photo attached to ${currentCase.caseNumber}.`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    Draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    planned: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    Planned: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    dispatched: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
    in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    'In Progress': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    on_hold: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900',
    'On Hold': 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900',
    completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    verified: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900',
    Verified: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900',
    closed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    Closed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900'
  };

  const priorityColors: Record<string, string> = {
    critical: 'text-rose-600 dark:text-rose-400 font-bold',
    Critical: 'text-rose-600 dark:text-rose-400 font-bold',
    high: 'text-orange-600 dark:text-orange-400 font-semibold',
    High: 'text-orange-600 dark:text-orange-400 font-semibold',
    medium: 'text-amber-600 dark:text-amber-400 font-medium',
    Normal: 'text-amber-600 dark:text-amber-400 font-medium',
    low: 'text-slate-600 dark:text-slate-400 font-normal',
    Low: 'text-slate-600 dark:text-slate-400 font-normal'
  };

  const tabs: { key: TabKey; label: string; count?: number; icon: React.FC<{ className?: string }> }[] = [
    { key: 'overview', label: '1. Overview', icon: FileText },
    { key: 'site', label: '2. Site & Location', icon: MapPin },
    { key: 'steps', label: '3. Work Steps', count: currentCase.steps.length, icon: CheckCircle2 },
    { key: 'equipment', label: '4. Equipment', count: currentCase.equipment.length, icon: Wrench },
    { key: 'timeline', label: '5. Timeline', count: currentCase.timeline.length, icon: Clock },
    { key: 'photos', label: '6. Photos & Evidence', count: casePhotos.length, icon: Camera },
    { key: 'measurements', label: '7. Measurements', count: currentCase.measurements.length, icon: Activity },
    { key: 'materials', label: '8. Materials', count: currentCase.materials.length, icon: Package },
    { key: 'findings', label: '9. Findings & Actions', icon: ShieldCheck },
    { key: 'followup', label: '10. Follow-up Tasks', count: currentCase.followUpTasks.length, icon: ListTodo },
    { key: 'reports', label: '11. Reports & Exports', icon: Download }
  ];

  return (
    <div className="space-y-4">
      {/* Top Header / Actions Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none cursor-pointer"
              title="Return to Work Cases List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-slate-100">{currentCase.caseNumber}</span>
                <span>/</span>
                <span>{currentCase.siteCode}</span>
                <span>/</span>
                <span className="uppercase">{currentCase.workTypeCategory || currentCase.category}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {currentCase.title}
              </h1>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <div className="flex items-center border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-2">
                Status:
              </span>
              <select
                value={currentCase.status}
                onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Edit Case */}
            <button
              onClick={() => openEditCaseModal(currentCase)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-none cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Edit
            </button>

            {/* Quick Action Shortcuts (Section 4) */}
            <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Add a timeline entry or technician note"
              >
                + Note
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Add and annotate photographs"
              >
                + Photo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('measurements')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Record test equipment measurement"
              >
                + Measure
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('followup')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Create follow-up task"
              >
                + Task
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Generate engineering report"
              >
                Report
              </button>
            </div>

            {/* Duplicate as Template */}
            <button
              onClick={() => duplicateWorkCase(currentCase.id)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-none cursor-pointer"
              title="Duplicate this case as a template for another site or intervention"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Duplicate
            </button>

            {/* Quick Export PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 rounded-none cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {isExporting ? 'Generating...' : 'Export PDF'}
            </button>

            {/* Delete Case */}
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete Work Case ${currentCase.caseNumber}? This action cannot be undone.`)) {
                  deleteWorkCase(currentCase.id);
                  onBack();
                }
              }}
              className="inline-flex items-center p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-none cursor-pointer"
              title="Delete Case"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Strip & Key Indicators */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-2 py-0.5 border font-semibold uppercase tracking-wider text-[11px] ${statusColors[currentCase.status]}`}>
              {currentCase.status.replace('_', ' ')}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 dark:text-slate-400">
              Priority: <strong className={priorityColors[currentCase.priority]}>{currentCase.priority.toUpperCase()}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 dark:text-slate-400">
              Scheduled: <strong className="text-slate-800 dark:text-slate-200">{currentCase.scheduledDate}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 dark:text-slate-400">
              Engineer: <strong className="text-slate-800 dark:text-slate-200">{currentCase.assignedEngineer || 'Solo Engineer'}</strong>
            </span>
          </div>

          {/* Execution Progress */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Execution Progress:</span>
            <div className="w-28 bg-slate-200 dark:bg-slate-700 h-2 rounded-none overflow-hidden">
              <div
                className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
              {stepPercent}% ({completedSteps}/{totalSteps})
            </span>
          </div>
        </div>
      </div>

      {/* 11 Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 overflow-x-auto scrollbar-thin">
        <div className="flex items-center space-x-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center px-3 py-2 text-xs font-semibold tracking-tight transition-colors border-b-2 rounded-none cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mr-1.5 ${isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-750 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 min-h-[480px]">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary Cards */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Case Identification
                </h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Case ID:</dt>
                    <dd className="font-mono font-bold text-slate-900 dark:text-slate-100">{currentCase.caseNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Work Category:</dt>
                    <dd className="font-semibold text-slate-900 dark:text-slate-100 uppercase">{currentCase.workTypeCategory || currentCase.category}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Work Type:</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">{currentCase.workType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Primary Operator:</dt>
                    <dd className="font-semibold text-slate-900 dark:text-slate-100">{currentCase.operator || 'Primary Operator'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Region:</dt>
                    <dd className="text-slate-900 dark:text-slate-100">{currentCase.region}</dd>
                  </div>
                </dl>
              </div>

              {/* Time Tracking */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Time & Field Tracking
                </h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Estimated Duration:</dt>
                    <dd className="font-mono text-slate-900 dark:text-slate-100">
                      {(currentCase.timeTracking?.estimatedHours ?? currentCase.timestamps?.estimatedDurationHours ?? 2)} hrs ({((currentCase.timeTracking?.estimatedHours ?? currentCase.timestamps?.estimatedDurationHours ?? 2) * 60)} mins)
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Actual Time Logged:</dt>
                    <dd className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {currentCase.timeTracking?.actualHours || currentCase.timestamps?.actualDurationHours
                        ? `${currentCase.timeTracking?.actualHours || currentCase.timestamps?.actualDurationHours} hrs`
                        : 'In progress'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Site Arrival:</dt>
                    <dd className="font-mono text-slate-900 dark:text-slate-100">
                      {currentCase.fieldTimestamps?.arrivedAt || currentCase.timestamps?.actualArrival
                        ? new Date(currentCase.fieldTimestamps?.arrivedAt || currentCase.timestamps?.actualArrival!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Not logged'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Site Departure:</dt>
                    <dd className="font-mono text-slate-900 dark:text-slate-100">
                      {currentCase.fieldTimestamps?.departedAt || currentCase.timestamps?.departure
                        ? new Date(currentCase.fieldTimestamps?.departedAt || currentCase.timestamps?.departure!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'On site'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Linked Records */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Linked Telecom Assets
                </h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Site Name:</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100">{currentCase.siteName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Linked Incident:</dt>
                    <dd className="font-mono text-slate-900 dark:text-slate-100">{currentCase.linkedIncidentId || 'None (Direct Work)'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Linked Alarms:</dt>
                    <dd className="font-mono text-slate-900 dark:text-slate-100">
                      {currentCase.linkedAlarmIds && currentCase.linkedAlarmIds.length > 0
                        ? currentCase.linkedAlarmIds.join(', ')
                        : 'None'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Evidence Photos:</dt>
                    <dd className="font-mono text-slate-900 dark:text-slate-100">{casePhotos.length} attached</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Scope / Objective */}
            <div className="border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Work Scope & Objectives
              </h3>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {currentCase.description || 'No detailed scope description provided.'}
              </p>
            </div>

            {/* Required Tools & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 dark:border-slate-800 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center">
                  <Wrench className="w-3.5 h-3.5 mr-1.5" />
                  Required Tools & Test Gear
                </h4>
                {currentCase.requiredTools && currentCase.requiredTools.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {currentCase.requiredTools.map((tool, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Standard telecom field toolkit.</p>
                )}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center">
                  <Tag className="w-3.5 h-3.5 mr-1.5" />
                  Tags & Metadata
                </h4>
                {currentCase.tags && currentCase.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {currentCase.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No tags assigned.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SITE & LOCATION */}
        {activeTab === 'site' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">Site Identification</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {currentCase.siteName} ({currentCase.siteCode})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {currentCase.siteAddress || 'Address not registered'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {currentCase.gpsCoordinates && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${currentCase.gpsCoordinates.latitude},${currentCase.gpsCoordinates.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none"
                  >
                    <Navigation className="w-3.5 h-3.5 mr-1.5" />
                    Google Maps Directions
                  </a>
                )}
                {linkedSite && (
                  <button
                    onClick={handleNavigateToGisSite}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-none cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Locate on GIS Map
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Geospatial Coordinates
                </h4>
                {currentCase.gpsCoordinates ? (
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-500">Latitude:</dt>
                      <dd className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {currentCase.gpsCoordinates.latitude.toFixed(6)}° N
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Longitude:</dt>
                      <dd className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {currentCase.gpsCoordinates.longitude.toFixed(6)}° E
                      </dd>
                    </div>
                    {currentCase.gpsCoordinates.altitudeMeters && (
                      <div>
                        <dt className="text-slate-500">Altitude:</dt>
                        <dd className="font-mono text-slate-900 dark:text-slate-100">
                          {currentCase.gpsCoordinates.altitudeMeters} m AMSL
                        </dd>
                      </div>
                    )}
                    {currentCase.gpsCoordinates.accuracyMeters && (
                      <div>
                        <dt className="text-slate-500">GPS Accuracy:</dt>
                        <dd className="font-mono text-slate-900 dark:text-slate-100">
                          ±{currentCase.gpsCoordinates.accuracyMeters} m
                        </dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-xs text-slate-500">No GPS coordinates recorded for this case or site.</p>
                )}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Site Access & Security Notes
                </h4>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200 dark:border-slate-700">
                  {linkedSite?.accessInstructions ||
                    'Standard tower access key required. 4x4 vehicle required during winter. Security contact prior to ascending ladder.'}
                </div>
              </div>
            </div>

            {/* Environmental & Weather Log */}
            {currentCase.weatherCondition && (
              <div className="border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Field Environment & Weather Conditions
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Condition:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{currentCase.weatherCondition.condition}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Temperature:</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{currentCase.weatherCondition.temperatureC}°C</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Wind Speed:</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{currentCase.weatherCondition.windSpeedKmh} km/h</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Safety Status:</span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">Safe for Tower Climb</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WORK STEPS & EXECUTION */}
        {activeTab === 'steps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Execution Checklist & Work Steps</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track technical procedure execution and record technician remarks for each step.
                </p>
              </div>
              <button
                onClick={() => setShowAddStep(!showAddStep)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Step
              </button>
            </div>

            {/* Add Step Form */}
            {showAddStep && (
              <form onSubmit={handleCreateStepSubmit} className="p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  New Execution Step
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Step Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Measure optical power levels at ODF port 12"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Est. Minutes
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={newStepEstimated}
                      onChange={(e) => setNewStepEstimated(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Technical Instructions / Acceptance Criteria
                  </label>
                  <input
                    type="text"
                    placeholder="Specific thresholds, port references, safety precautions..."
                    value={newStepDesc}
                    onChange={(e) => setNewStepDesc(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStep(false)}
                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    Save Step
                  </button>
                </div>
              </form>
            )}

            {/* Steps List */}
            {currentCase.steps.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                No work steps recorded yet. Click "Add Step" to build the execution checklist.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800">
                {currentCase.steps.map((step, idx) => {
                  const isDone = step.status === 'completed';
                  return (
                    <div
                      key={step.id}
                      className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                        isDone ? 'bg-slate-50/50 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => handleToggleStep(step.id, step.status)}
                          className={`mt-0.5 w-5 h-5 flex items-center justify-center border cursor-pointer transition-colors ${
                            isDone
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400'
                          }`}
                          title={isDone ? 'Mark as pending' : 'Mark as complete'}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                isDone
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {step.title}
                            </span>
                            {step.estimatedMinutes && (
                              <span className="text-[10px] font-mono text-slate-400">
                                ({step.estimatedMinutes} min)
                              </span>
                            )}
                          </div>
                          {step.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {step.description}
                            </p>
                          )}
                          {step.remarks && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 border border-amber-200 dark:border-amber-900/40 inline-block">
                              Note: {step.remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                        {step.completedAt ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Completed {new Date(step.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="uppercase text-[10px] text-amber-600 dark:text-amber-400">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EQUIPMENT & HARDWARE */}
        {activeTab === 'equipment' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Equipment & Installed Hardware</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track network equipment inspected, installed, replaced, or decommissioned during this intervention.
                </p>
              </div>
              <button
                onClick={() => setShowAddEquipment(!showAddEquipment)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Equipment
              </button>
            </div>

            {/* Add Equipment Form */}
            {showAddEquipment && (
              <form onSubmit={handleAddEquipmentSubmit} className="p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Record Hardware Item
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Equipment Name / Model *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SFP+ 10G-LR Transceiver"
                      value={eqName}
                      onChange={(e) => setEqName(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Hardware Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Optical Transceiver, Rectifier Module"
                      value={eqType}
                      onChange={(e) => setEqType(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Action Performed
                    </label>
                    <select
                      value={eqAction}
                      onChange={(e) => setEqAction(e.target.value as any)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    >
                      <option value="inspected">Inspected / Tested</option>
                      <option value="installed">Installed New</option>
                      <option value="replaced">Replaced Faulty</option>
                      <option value="repaired">Repaired / Cleaned</option>
                      <option value="removed">Decommissioned / Removed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="SN-XXXX-YYYY"
                      value={eqSerial}
                      onChange={(e) => setEqSerial(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Finisar, Huawei, Delta"
                      value={eqManufacturer}
                      onChange={(e) => setEqManufacturer(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Firmware / SW Version
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. v4.2.1"
                      value={eqFirmware}
                      onChange={(e) => setEqFirmware(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEquipment(false)}
                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    Record Equipment
                  </button>
                </div>
              </form>
            )}

            {/* Equipment Table */}
            {currentCase.equipment.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                No equipment recorded for this case. Click "Add Equipment" to register hardware.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase font-semibold text-slate-600 dark:text-slate-400 text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Equipment Item</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Manufacturer</th>
                      <th className="p-3">Serial Number</th>
                      <th className="p-3">Firmware</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {currentCase.equipment.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-slate-100">{item.name}</td>
                        <td className="p-3 font-sans text-slate-600 dark:text-slate-300">{item.type}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {item.action || 'inspected'}
                        </td>
                        <td className="p-3 font-sans text-slate-500">{item.manufacturer || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{item.serialNumber || '—'}</td>
                        <td className="p-3 text-slate-500">{item.firmwareVersion || '—'}</td>
                        <td className="p-3 font-sans">
                          <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TIMELINE & ACTIVITY HISTORY */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Activity History & Field Timeline</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chronological trail of arrival, diagnostic findings, status changes, and technician logs.
                </p>
              </div>
              <button
                onClick={() => setShowAddTimeline(!showAddTimeline)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Entry
              </button>
            </div>

            {/* Add Timeline Entry Form */}
            {showAddTimeline && (
              <form onSubmit={handleAddTimelineSubmit} className="p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Add Activity / Timeline Entry
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Event Type
                    </label>
                    <select
                      value={timelineType}
                      onChange={(e) => setTimelineType(e.target.value as any)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    >
                      <option value="note_added">Technician Field Note</option>
                      <option value="arrived_on_site">Arrived on Site</option>
                      <option value="measurement_recorded">Measurement Taken</option>
                      <option value="hardware_replaced">Hardware Replaced</option>
                      <option value="status_change">Status Update</option>
                      <option value="departed_site">Departed Site</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Headline / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Swapped damaged patch cord on Port 4"
                      value={timelineTitle}
                      onChange={(e) => setTimelineTitle(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Details / Observations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specific findings, test readings, technician notes..."
                    value={timelineDesc}
                    onChange={(e) => setTimelineDesc(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTimeline(false)}
                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    Post Entry
                  </button>
                </div>
              </form>
            )}

            {/* Timeline Stream */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {currentCase.timeline.map((entry) => (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 bg-slate-900 dark:bg-slate-100 border-2 border-white dark:border-slate-900 rounded-none" />
                  <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{entry.title}</span>
                      <span className="font-mono text-slate-400">
                        {entry.timestamp
                          ? new Date(entry.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">{entry.description}</p>
                    )}
                    <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>By: {entry.authorName || entry.author || 'Solo Engineer'}</span>
                      <span className="uppercase text-[9px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5">
                        {(entry.eventType || entry.type || 'Event').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Audit History of Significant Field Changes (Section 4) */}
            {currentCase.activityHistory && currentCase.activityHistory.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Field Update Audit Trail ({currentCase.activityHistory.length} events)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    Previous vs New Values Tracked
                  </span>
                </div>
                <div className="space-y-2">
                  {currentCase.activityHistory.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {log.action}
                        </span>
                        {log.fieldName && (
                          <span className="ml-2 font-mono text-[11px] text-sky-600 dark:text-sky-400">
                            [{log.fieldName}]
                          </span>
                        )}
                        {log.previousValue !== undefined && log.newValue !== undefined && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            <span className="line-through text-rose-500">{String(log.previousValue)}</span>
                            <span className="mx-1.5 text-slate-400">→</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{String(log.newValue)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[10px] font-mono text-slate-400 shrink-0">
                        <div>{log.actorName}</div>
                        <div>
                          {new Date(log.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PHOTOS & EVIDENCE */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Site Photographic Evidence</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload, inspect, and annotate field photos before, during, and after telecom intervention.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <label className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer">
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUploadMock} className="hidden" />
                </label>
              </div>
            </div>

            {casePhotos.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No photographic evidence attached to this case.</p>
                <p className="text-[11px] text-slate-400 mt-1">Upload site photos to document antenna alignment, cable dressing, or cabinet status.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {casePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img src={photo.annotatedDataUrl || photo.originalDataUrl} alt={photo.caption} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider bg-slate-900/80 text-white">
                        {photo.classification}
                      </div>
                      {photo.annotations && photo.annotations.length > 0 && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-white">
                          {photo.annotations.length} Annotations
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {photo.caption || photo.title}
                      </p>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                        <span>{new Date(photo.uploadTimestamp || photo.captureTimestamp || '').toLocaleDateString()}</span>
                        <span>{photo.uploadedBy}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedPhotoId(photo.id);
                            navigateTo('photo-studio');
                          }}
                          className="inline-flex items-center text-xs font-bold text-slate-900 dark:text-slate-100 hover:underline cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Annotate in Studio
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: MEASUREMENTS & TEST RESULTS */}
        {activeTab === 'measurements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Measurements & RF / Optical Results</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calibrated test results: optical power, OTDR fiber loss, VSWR, return loss, battery voltages, and SNR.
                </p>
              </div>
              <button
                onClick={() => setShowAddMeasurement(!showAddMeasurement)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Record Measurement
              </button>
            </div>

            {/* Add Measurement Form */}
            {showAddMeasurement && (
              <form onSubmit={handleAddMeasurementSubmit} className="p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Record Technical Measurement
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Parameter Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Optical Receive Power (Rx), VSWR Antenna A"
                      value={measParam}
                      onChange={(e) => setMeasParam(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Measured Value *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="-18.4"
                      value={measValue}
                      onChange={(e) => setMeasValue(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      placeholder="dBm, VDC, dB, Ohm"
                      value={measUnit}
                      onChange={(e) => setMeasUnit(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Min Threshold
                    </label>
                    <input
                      type="text"
                      placeholder="-24.0"
                      value={measMin}
                      onChange={(e) => setMeasMin(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Max Threshold
                    </label>
                    <input
                      type="text"
                      placeholder="-8.0"
                      value={measMax}
                      onChange={(e) => setMeasMax(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Evaluation Result
                    </label>
                    <select
                      value={measStatus}
                      onChange={(e) => setMeasStatus(e.target.value as any)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-semibold"
                    >
                      <option value="pass">PASS (Compliant)</option>
                      <option value="fail">FAIL (Out of Spec)</option>
                      <option value="marginal">MARGINAL</option>
                      <option value="info">Informational</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Test Equipment Used
                    </label>
                    <input
                      type="text"
                      placeholder="EXFO FTB-1, Anritsu S331E"
                      value={measEquipment}
                      onChange={(e) => setMeasEquipment(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Measurement Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Specific port, wavelength (1310nm / 1550nm), ambient temp..."
                    value={measNotes}
                    onChange={(e) => setMeasNotes(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMeasurement(false)}
                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    Record Reading
                  </button>
                </div>
              </form>
            )}

            {/* Measurements Table */}
            {currentCase.measurements.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                No technical measurements recorded yet. Click "Record Measurement" to log test results.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase font-semibold text-slate-600 dark:text-slate-400 text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Parameter</th>
                      <th className="p-3">Reading</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Acceptable Range</th>
                      <th className="p-3">Result</th>
                      <th className="p-3">Test Gear</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {currentCase.measurements.map((m) => {
                      const badge =
                        m.status === 'pass'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300'
                          : m.status === 'fail'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-sans font-bold text-slate-900 dark:text-slate-100">
                            {m.parameter}
                            {m.notes && <div className="text-[10px] text-slate-400 font-sans font-normal">{m.notes}</div>}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{m.value}</td>
                          <td className="p-3 text-slate-500">{m.unit}</td>
                          <td className="p-3 text-slate-500">
                            {m.thresholdMin || m.thresholdMax ? `${m.thresholdMin ?? '—'} to ${m.thresholdMax ?? '—'}` : 'N/A'}
                          </td>
                          <td className="p-3 font-sans">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badge}`}>
                              {m.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{m.testEquipment || 'Standard meter'}</td>
                          <td className="p-3 text-[11px] text-slate-400">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: MATERIALS & SPARE PARTS */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Materials, Consumables & Spares Consumed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track optical patch cords, connectors, fuses, breakers, and supplies utilized on site.
                </p>
              </div>
              <button
                onClick={() => setShowAddMaterial(!showAddMaterial)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Material
              </button>
            </div>

            {/* Add Material Form */}
            {showAddMaterial && (
              <form onSubmit={handleAddMaterialSubmit} className="p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Record Consumed Material
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Material Name / Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Single-mode LC/UPC-LC/APC Patch Cord 3m"
                      value={matName}
                      onChange={(e) => setMatName(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={matQty}
                      onChange={(e) => setMatQty(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      placeholder="pcs, meters, rolls"
                      value={matUnit}
                      onChange={(e) => setMatUnit(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Part / Item Number
                    </label>
                    <input
                      type="text"
                      placeholder="PN-FIB-SM-003"
                      value={matPartNo}
                      onChange={(e) => setMatPartNo(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Batch or Serial No.
                    </label>
                    <input
                      type="text"
                      placeholder="Optional batch code"
                      value={matSerial}
                      onChange={(e) => setMatSerial(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMaterial(false)}
                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    Save Material
                  </button>
                </div>
              </form>
            )}

            {/* Materials List */}
            {currentCase.materials.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                No consumable materials logged for this intervention.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase font-semibold text-slate-600 dark:text-slate-400 text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Material / Spare</th>
                      <th className="p-3">Part Number</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Serial / Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {currentCase.materials.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-slate-100">{m.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{m.partNumber || '—'}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{m.quantity}</td>
                        <td className="p-3 font-sans text-slate-500">{m.unit}</td>
                        <td className="p-3 text-slate-500">{m.serialNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 9: FINDINGS & CORRECTIVE ACTIONS */}
        {activeTab === 'findings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Technical Findings, Root Cause & Recommendations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record diagnostic findings, root cause analysis, corrective repairs performed, and long-term improvements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  Root Cause Analysis
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed min-h-[90px]">
                  {currentCase.rootCause ||
                    'Detailed root cause analysis: Optical macrobend detected at entry gland resulting in 9.2dB localized attenuation under high temperature fluctuations.'}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  Corrective Actions Executed
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed min-h-[90px]">
                  {currentCase.correctiveAction ||
                    'Immediate corrective actions: Splice tray reorganized, buffer tube re-routed to adhere to minimum 30mm bend radius, and fusion re-spliced with 0.02dB insertion loss.'}
                </div>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                Long-Term Engineering Recommendations
              </h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                {currentCase.recommendations ||
                  'Replace entry weatherproofing boot during Q3 preventative maintenance cycle. Schedule bi-annual fiber loop OTDR trace calibration.'}
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: FOLLOW-UP TASKS */}
        {activeTab === 'followup' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Subsequent & Follow-up Tasks</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage tasks that must be executed after this intervention, such as parts replenishment or secondary visits.
                </p>
              </div>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 border border-slate-700 rounded-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Follow-up Task
              </button>
            </div>

            {/* Add Task Form */}
            {showAddTask && (
              <form onSubmit={handleAddTaskSubmit} className="p-4 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  New Follow-up Task
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Order replacement SFP+ optical module for inventory"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Priority
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as CasePriority)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Target Due Date
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Notes / Action Item Description
                    </label>
                    <input
                      type="text"
                      placeholder="Specific instructions or part numbers..."
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            )}

            {/* Task List */}
            {currentCase.followUpTasks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                No follow-up tasks currently assigned for this case.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800">
                {currentCase.followUpTasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 flex items-start justify-between gap-3 ${
                        isDone ? 'bg-slate-50/50 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() =>
                            updateCaseFollowUpTask(currentCase.id, t.id, {
                              status: isDone ? 'pending' : 'completed'
                            })
                          }
                          className={`mt-0.5 w-5 h-5 flex items-center justify-center border cursor-pointer ${
                            isDone
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs font-bold ${
                                isDone
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {t.title}
                            </span>
                            <span className={`text-[10px] uppercase font-bold ${priorityColors[t.priority]}`}>
                              [{t.priority}]
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-mono text-slate-400">
                        {t.dueDate && <div>Due: {t.dueDate}</div>}
                        <span className="text-[10px] uppercase font-bold text-slate-500">{t.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 11: REPORTS & PROFESSIONAL EXPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Professional Engineering Reports & Technical Exports
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate executive-ready PDF intervention dossiers, multi-sheet Excel analytical workbooks, or portable JSON archives.
              </p>
            </div>

            {/* Template Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Select PDF Report Template (11 Specialized Engineering Formats)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {REPORT_TEMPLATES.map((tpl) => {
                  const isSelected = selectedPdfTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedPdfTemplate(tpl.id)}
                      className={`p-3.5 border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/80 ring-1 ring-slate-900 dark:ring-slate-100'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{tpl.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{tpl.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Export Trigger Actions */}
            <div className="p-6 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Ready to Compile Report
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Template: <strong className="text-slate-800 dark:text-slate-200">{REPORT_TEMPLATES.find((t) => t.id === selectedPdfTemplate)?.name}</strong>
                  {' • '}
                  Photos: <strong>{casePhotos.length} included</strong>
                  {' • '}
                  Measurements: <strong>{currentCase.measurements.length} logged</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('reports.reportLanguage', 'Language')}:
                  </span>
                  <select
                    value={caseReportLang}
                    onChange={(e) => setCaseReportLang(e.target.value as 'en' | 'fr' | 'ar')}
                    className="text-xs bg-transparent font-medium text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none"
                    aria-label="Case report language"
                  >
                    <option value="en">English (EN)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="ar">العربية (AR)</option>
                  </select>
                </div>

                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center px-4 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-none cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                  Export Excel (.xlsx)
                </button>

                <button
                  onClick={handleExportJson}
                  className="inline-flex items-center px-4 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-none cursor-pointer"
                >
                  <FileCode className="w-4 h-4 mr-2 text-blue-600" />
                  Export JSON (.json)
                </button>

                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="inline-flex items-center px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 rounded-none cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? 'Compiling PDF...' : 'Download PDF Report'}
                </button>

                <button
                  onClick={() => openReportBuilderForCase(currentCase.id)}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-none cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Formal Report Center (16 Types)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
