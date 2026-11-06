import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  Tag,
  Wrench,
  Camera,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { WorkCase, CaseStatus, CasePriority, WorkTypeCategory } from '../../types/models';
import { CaseDetailWorkspace } from './CaseDetailWorkspace';
import { exportCasesToExcel, exportCaseToPdf } from '../../services/caseExportService';

type SavedViewFilter =
  | 'all'
  | 'my_open'
  | 'today'
  | 'planned'
  | 'completed'
  | 'follow_up'
  | 'recent_visits'
  | 'fiber'
  | 'tower'
  | 'power'
  | 'no_reports';

export const WorkCasesModule: React.FC = () => {
  const {
    store,
    selectedCaseId,
    openCaseById,
    openCreateCaseModal,
    openEditCaseModal,
    duplicateWorkCase,
    deleteWorkCase,
    showToast
  } = useAppContext();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [savedView, setSavedView] = useState<SavedViewFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'priority' | 'case_num'>('date_desc');

  // If a case is selected, render the 11-tab workspace
  if (selectedCaseId) {
    return (
      <CaseDetailWorkspace
        caseId={selectedCaseId}
        onBack={() => openCaseById(null as any)}
      />
    );
  }

  const cases = store.workCases || [];
  const todayStr = new Date().toISOString().split('T')[0];

  // Metric strip calculations
  const metrics = useMemo(() => {
    const total = cases.length;
    const inProgress = cases.filter((c) => String(c.status).toLowerCase() === 'in_progress').length;
    const planned = cases.filter((c) => String(c.status).toLowerCase() === 'planned' || String(c.status).toLowerCase() === 'dispatched').length;
    const completed = cases.filter((c) => String(c.status).toLowerCase() === 'completed' || String(c.status).toLowerCase() === 'verified').length;
    const onHoldOrFollowUp = cases.filter(
      (c) => String(c.status).toLowerCase() === 'on_hold' || (c.followUpTasks && c.followUpTasks.some((t) => String(t.status).toLowerCase() === 'pending' || String(t.status).toLowerCase() === 'open'))
    ).length;
    const totalActualHours = cases.reduce((acc, c) => acc + (c.timeTracking?.actualHours || c.timestamps?.actualDurationHours || 0), 0);

    return { total, inProgress, planned, completed, onHoldOrFollowUp, totalActualHours };
  }, [cases]);

  // Filtered and sorted cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const statusLower = String(c.status).toLowerCase();
      const catLower = String(c.workTypeCategory || c.category || '').toLowerCase();
      const schedDate = c.scheduledDate || c.timestamps?.plannedDate || '';

      // Saved View Filter
      if (savedView === 'my_open') {
        if (statusLower === 'completed' || statusLower === 'verified' || statusLower === 'closed' || statusLower === 'cancelled') {
          return false;
        }
      } else if (savedView === 'today') {
        if (schedDate !== todayStr) return false;
      } else if (savedView === 'planned') {
        if (statusLower !== 'planned' && statusLower !== 'dispatched') return false;
      } else if (savedView === 'completed') {
        if (statusLower !== 'completed' && statusLower !== 'verified') return false;
      } else if (savedView === 'follow_up') {
        const hasPendingTasks = c.followUpTasks && c.followUpTasks.some((t) => String(t.status).toLowerCase() === 'pending' || String(t.status).toLowerCase() === 'open');
        if (!hasPendingTasks && statusLower !== 'on_hold') return false;
      } else if (savedView === 'recent_visits') {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
        if (schedDate < fourteenDaysAgo && (c.createdAt || '') < fourteenDaysAgo) return false;
      } else if (savedView === 'fiber') {
        if (!catLower.includes('fiber')) return false;
      } else if (savedView === 'tower') {
        if (!catLower.includes('tower')) return false;
      } else if (savedView === 'power') {
        if (!catLower.includes('power')) return false;
      } else if (savedView === 'no_reports') {
        if (c.reportIds && c.reportIds.length > 0) return false;
      }

      // Category Dropdown Filter
      if (selectedCategory !== 'all' && catLower !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Status Dropdown Filter
      if (selectedStatus !== 'all' && statusLower !== selectedStatus.toLowerCase()) {
        return false;
      }

      // Priority Dropdown Filter
      if (selectedPriority !== 'all' && String(c.priority).toLowerCase() !== selectedPriority.toLowerCase()) {
        return false;
      }

      // Comprehensive Search Text Filter (Section 8: ID, Title, Site Code/Name, Address, City/Region, Work Type, Equipment, Notes, Engineer, Tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = (c.caseNumber || '').toLowerCase().includes(q) || (c.id || '').toLowerCase().includes(q);
        const matchesTitle = (c.title || '').toLowerCase().includes(q);
        const matchesSite = (
          (c.siteCode || '') + ' ' +
          (c.siteName || '') + ' ' +
          (c.address || '') + ' ' +
          (c.city || '') + ' ' +
          (c.region || '')
        ).toLowerCase().includes(q);
        const matchesWorkType = (
          (c.workType || '') + ' ' +
          (c.category || '') + ' ' +
          (c.workTypeCategory || '')
        ).toLowerCase().includes(q);
        const matchesDesc = (
          (c.description || '') + ' ' +
          (c.summary || '') + ' ' +
          (c.reasonForWork || '') + ' ' +
          (c.reportedProblem || '') + ' ' +
          (c.initialObservations || '') + ' ' +
          (c.technicalFindings || '') + ' ' +
          (c.rootCause || '')
        ).toLowerCase().includes(q);
        const matchesEng = (
          (c.assignedEngineer || '') + ' ' +
          (c.responsibleEngineer || '') + ' ' +
          (c.createdByName || '') + ' ' +
          (c.customerOrProject || '')
        ).toLowerCase().includes(q);
        const matchesTags = c.tags ? c.tags.some((t) => t.toLowerCase().includes(q)) : false;
        const matchesEquipment = c.equipment
          ? c.equipment.some((eq) =>
              `${eq.name} ${eq.model || ''} ${eq.serialNumber || ''} ${eq.assetId || ''}`
                .toLowerCase()
                .includes(q)
            )
          : false;

        if (
          !matchesNum &&
          !matchesTitle &&
          !matchesSite &&
          !matchesWorkType &&
          !matchesDesc &&
          !matchesEng &&
          !matchesTags &&
          !matchesEquipment
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateB = b.scheduledDate || b.timestamps?.plannedDate || b.createdAt || '';
      const dateA = a.scheduledDate || a.timestamps?.plannedDate || a.createdAt || '';
      if (sortBy === 'date_desc') {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
      if (sortBy === 'case_num') {
        return b.caseNumber.localeCompare(a.caseNumber);
      }
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = {
          critical: 4, Critical: 4,
          high: 3, High: 3,
          medium: 2, Normal: 2,
          low: 1, Low: 1
        };
        return (pOrder[String(b.priority)] || 0) - (pOrder[String(a.priority)] || 0);
      }
      return 0;
    });
  }, [cases, savedView, selectedCategory, selectedStatus, selectedPriority, searchQuery, sortBy, todayStr]);

  const handleBulkExportExcel = () => {
    try {
      exportCasesToExcel(filteredCases, `telecom_work_cases_${todayStr}.xlsx`);
      showToast(`Successfully generated Excel workbook with ${filteredCases.length} cases.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to export cases.', 'error');
    }
  };

  const handleBulkExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredCases, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `telecom_work_cases_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast(`Exported ${filteredCases.length} work cases in JSON format.`, 'success');
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    Draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
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

  const savedViews: { id: SavedViewFilter; label: string }[] = [
    { id: 'all', label: 'All Cases' },
    { id: 'my_open', label: 'My Open Cases' },
    { id: 'today', label: "Today's Work" },
    { id: 'planned', label: 'Planned Visits' },
    { id: 'completed', label: 'Completed Cases' },
    { id: 'follow_up', label: 'Requiring Follow-up' },
    { id: 'recent_visits', label: 'Recent Site Visits' },
    { id: 'fiber', label: 'Fiber-Optic Work' },
    { id: 'tower', label: 'Tower Maintenance' },
    { id: 'power', label: 'Electrical & Power' },
    { id: 'no_reports', label: 'Without Final Reports' }
  ];

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Work Cases & Field Interventions
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Centralized telecom engineering case management • Manual recording of work, measurements, evidence & reports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkExportExcel}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-none cursor-pointer"
              title="Export filtered cases to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Excel Export
            </button>

            <button
              onClick={handleBulkExportJson}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-none cursor-pointer"
              title="Export filtered cases to JSON"
            >
              <FileCode className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              JSON
            </button>

            <button
              onClick={() => openCreateCaseModal()}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 rounded-none cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Work Case
            </button>
          </div>
        </div>

        {/* Top Metric Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cases</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{metrics.total}</div>
          </div>
          <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">In Progress</span>
            <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300">{metrics.inProgress}</div>
          </div>
          <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Planned Visits</span>
            <div className="text-xl font-bold font-mono text-blue-700 dark:text-blue-300">{metrics.planned}</div>
          </div>
          <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Completed</span>
            <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">{metrics.completed}</div>
          </div>
          <div className="p-2.5 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">Pending Follow-up</span>
            <div className="text-xl font-bold font-mono text-orange-700 dark:text-orange-300">{metrics.onHoldOrFollowUp}</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hours Logged</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{metrics.totalActualHours}h</div>
          </div>
        </div>
      </div>

      {/* Saved View Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 overflow-x-auto scrollbar-thin">
        <div className="flex items-center space-x-1 min-w-max">
          {savedViews.map((sv) => (
            <button
              key={sv.id}
              onClick={() => setSavedView(sv.id)}
              className={`px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors border-b-2 rounded-none cursor-pointer whitespace-nowrap ${
                savedView === sv.id
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {sv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Global Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by Case ID, title, site, tag, or engineer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="fiber_optics">Fiber Optics</option>
              <option value="radio_access_network">Radio Access Network (RAN)</option>
              <option value="tower_structures">Tower & Antenna</option>
              <option value="power_systems">Power & Energy</option>
              <option value="site_security_facility">Site Security & Infrastructure</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
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

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none font-mono"
            >
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="priority">Priority (High to Low)</option>
              <option value="case_num">Case Number (DESC)</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Density Work Cases Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold">No work cases match your current filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search filters or click "New Work Case" to record an intervention.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSavedView('all');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSelectedPriority('all');
              }}
              className="mt-4 inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3 w-32">Case ID</th>
                <th className="p-3">Title & Category</th>
                <th className="p-3">Site / Location</th>
                <th className="p-3 w-28">Scheduled</th>
                <th className="p-3 w-24">Priority</th>
                <th className="p-3 w-28">Status</th>
                <th className="p-3 w-36">Progress</th>
                <th className="p-3 w-24">Data Logged</th>
                <th className="p-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCases.map((c) => {
                const totalSteps = c.steps.length;
                const completedSteps = c.steps.filter((s) => s.status === 'completed').length;
                const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const photosCount = (store.photoAssets || []).filter((p) => (c.photoIds && c.photoIds.includes(p.id)) || p.workOrderId === c.id || p.visitId === c.id).length;

                return (
                  <tr
                    key={c.id}
                    onClick={() => openCaseById(c.id)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Case ID */}
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {c.caseNumber}
                    </td>

                    {/* Title & Category */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 mt-0.5">
                        <span>{(c.workTypeCategory || c.category || '').replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{c.workType}</span>
                      </div>
                    </td>

                    {/* Site */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.siteName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {c.siteCode} ({c.region})
                      </div>
                    </td>

                    {/* Scheduled */}
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {c.scheduledDate}
                    </td>

                    {/* Priority */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`text-[11px] uppercase ${priorityColors[c.priority]}`}>
                        {c.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${statusColors[c.status]}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="p-3">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-none overflow-hidden mb-1">
                        <div
                          className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                        <span>{pct}%</span>
                        <span>{completedSteps}/{totalSteps} steps</span>
                      </div>
                    </td>

                    {/* Data Logged (Counts) */}
                    <td className="p-3">
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span title="Measurements recorded" className="flex items-center">
                          <Activity className="w-3 h-3 mr-0.5 text-slate-400" />
                          {c.measurements.length}
                        </span>
                        <span title="Photos attached" className="flex items-center">
                          <Camera className="w-3 h-3 mr-0.5 text-slate-400" />
                          {photosCount}
                        </span>
                        <span title="Materials used" className="flex items-center">
                          <Wrench className="w-3 h-3 mr-0.5 text-slate-400" />
                          {c.materials.length}
                        </span>
                      </div>
                    </td>

                    {/* Quick Actions */}
                    <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => openCaseById(c.id)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-none cursor-pointer"
                          title="Open Case Workspace"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => duplicateWorkCase(c.id)}
                          className="px-1.5 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-none cursor-pointer"
                          title="Duplicate Case"
                        >
                          Clone
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
