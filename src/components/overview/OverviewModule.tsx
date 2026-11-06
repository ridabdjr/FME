import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  ListTodo,
  Map,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
  TrendingUp,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WorkCase, CaseStatus, CasePriority, PhotoAsset } from '../../types/models';
import { formatUtcTimestamp } from '../common/StatusIndicators';
import { exportCasesToExcel } from '../../services/caseExportService';

type DateFilterRange = 'all' | 'today' | 'week' | 'month' | '30days';

export const OverviewModule: React.FC = () => {
  const {
    store,
    currentUser,
    navigateTo,
    openCaseById,
    openCreateCaseModal,
    openSiteById,
    openSiteInGisMap,
    openPhotoInStudio,
    openReportById,
    showToast,
  } = useApp();

  const tz = store.userTimezone || 'UTC';
  const allCases: WorkCase[] = store.workCases || [];
  const allSites = store.sites || [];
  const allPhotos: PhotoAsset[] = store.photoAssets || [];
  const allReports = store.maintenanceReports || [];

  // Filter state
  const [dateRange, setDateRange] = useState<DateFilterRange>('all');
  const [filterSiteId, setFilterSiteId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const now = new Date();
  const currentMonthPrefix = now.toISOString().slice(0, 7); // e.g. "2026-11"
  const todayDateStr = now.toISOString().slice(0, 10); // e.g. "2026-11-06"
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  // Filtered cases calculation
  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      // Date Range Filter
      const caseDate = c.timestamps?.plannedDate || c.createdAt || '';
      if (dateRange === 'today') {
        if (!caseDate.startsWith(todayDateStr)) return false;
      } else if (dateRange === 'week') {
        if (caseDate < oneWeekAgo) return false;
      } else if (dateRange === 'month') {
        if (!caseDate.startsWith(currentMonthPrefix)) return false;
      } else if (dateRange === '30days') {
        if (caseDate < thirtyDaysAgo) return false;
      }

      // Site Filter
      if (filterSiteId !== 'all' && c.siteId !== filterSiteId && c.siteCode !== filterSiteId) {
        return false;
      }

      // Category Filter
      if (filterCategory !== 'all') {
        const catStr = (c.category || c.workTypeCategory || '').toLowerCase();
        if (!catStr.includes(filterCategory.toLowerCase())) return false;
      }

      // Status Filter
      if (filterStatus !== 'all') {
        const st = String(c.status).toLowerCase();
        if (st !== filterStatus.toLowerCase()) return false;
      }

      // Priority Filter
      if (filterPriority !== 'all') {
        const pr = String(c.priority).toLowerCase();
        if (pr !== filterPriority.toLowerCase()) return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = (c.caseNumber || '').toLowerCase().includes(q);
        const matchesTitle = (c.title || '').toLowerCase().includes(q);
        const matchesSite = (c.siteCode + ' ' + c.siteName + ' ' + (c.address || '')).toLowerCase().includes(q);
        const matchesWorkType = (c.workType || '').toLowerCase().includes(q);
        const matchesDesc = (c.description || c.reasonForWork || '').toLowerCase().includes(q);
        const matchesEng = (c.responsibleEngineer || '').toLowerCase().includes(q);
        const matchesTags = c.tags ? c.tags.some((t) => t.toLowerCase().includes(q)) : false;
        if (!matchesNum && !matchesTitle && !matchesSite && !matchesWorkType && !matchesDesc && !matchesEng && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [
    allCases,
    dateRange,
    filterSiteId,
    filterCategory,
    filterStatus,
    filterPriority,
    searchQuery,
    todayDateStr,
    oneWeekAgo,
    thirtyDaysAgo,
    currentMonthPrefix,
  ]);

  // Key Dashboard KPI Metrics computed strictly from stored records
  const metrics = useMemo(() => {
    const totalCases = filteredCases.length;

    const casesOpenedThisMonth = allCases.filter((c) =>
      (c.createdAt || '').startsWith(currentMonthPrefix)
    ).length;

    const inProgressCases = filteredCases.filter(
      (c) => String(c.status).toLowerCase() === 'in_progress' || c.status === 'In Progress'
    ).length;

    const plannedVisits = filteredCases.filter(
      (c) =>
        String(c.status).toLowerCase() === 'planned' ||
        c.status === 'Planned' ||
        String(c.status).toLowerCase() === 'dispatched'
    ).length;

    const completedWork = filteredCases.filter(
      (c) =>
        String(c.status).toLowerCase() === 'completed' ||
        c.status === 'Completed' ||
        String(c.status).toLowerCase() === 'closed' ||
        c.status === 'Closed'
    ).length;

    const awaitingVerification = filteredCases.filter(
      (c) =>
        String(c.status).toLowerCase() === 'verified' ||
        c.status === 'Verified' ||
        (String(c.status).toLowerCase() === 'completed' && !c.supervisorConfirmation)
    ).length;

    // Follow-up tasks count
    let followUpCount = 0;
    filteredCases.forEach((c) => {
      if (c.followUpTasks) {
        c.followUpTasks.forEach((t) => {
          if (String(t.status).toLowerCase() === 'open' || String(t.status).toLowerCase() === 'pending') {
            followUpCount += 1;
          }
        });
      }
    });

    // Time spent calculation
    const totalActualHours = filteredCases.reduce((sum, c) => {
      const actual = c.timestamps?.actualDurationHours ?? c.timeTracking?.actualHours ?? 0;
      return sum + actual;
    }, 0);

    const totalEstimatedHours = filteredCases.reduce((sum, c) => {
      const est = c.timestamps?.estimatedDurationHours ?? c.timeTracking?.estimatedHours ?? 2.0;
      return sum + est;
    }, 0);

    return {
      totalCases,
      casesOpenedThisMonth,
      inProgressCases,
      plannedVisits,
      completedWork,
      awaitingVerification,
      followUpCount,
      totalActualHours: Math.round(totalActualHours * 10) / 10,
      totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
    };
  }, [filteredCases, allCases, currentMonthPrefix]);

  // Work distribution by category
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCases.forEach((c) => {
      const cat = c.category || c.workTypeCategory || 'General Engineering & Maintenance';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...Object.values(counts), 1);
    return entries.map(([categoryName, count]) => ({
      categoryName,
      count,
      percent: Math.round((count / Math.max(filteredCases.length, 1)) * 100),
      barWidthPercent: Math.round((count / maxVal) * 100),
    }));
  }, [filteredCases]);

  // Work distribution by region and site
  const siteDistribution = useMemo(() => {
    const siteCounts: Record<string, { siteCode: string; siteName: string; region: string; siteId: string; count: number }> = {};
    filteredCases.forEach((c) => {
      const key = c.siteCode || c.siteId;
      if (!siteCounts[key]) {
        siteCounts[key] = {
          siteCode: c.siteCode,
          siteName: c.siteName,
          region: c.region,
          siteId: c.siteId,
          count: 0,
        };
      }
      siteCounts[key].count += 1;
    });
    return Object.values(siteCounts).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredCases]);

  // Recently visited / serviced sites
  const recentlyVisitedSites = useMemo(() => {
    const siteMap: Record<string, { site: any; lastCase: WorkCase }> = {};
    // Sort all cases descending by date
    const sorted = [...allCases].sort((a, b) => {
      const da = a.timestamps?.workCompletion || a.timestamps?.plannedDate || a.createdAt || '';
      const db = b.timestamps?.workCompletion || b.timestamps?.plannedDate || b.createdAt || '';
      return db.localeCompare(da);
    });

    sorted.forEach((c) => {
      if (!siteMap[c.siteId] && Object.keys(siteMap).length < 5) {
        const site = allSites.find((s) => s.id === c.siteId) || {
          id: c.siteId,
          siteCode: c.siteCode,
          siteName: c.siteName,
          region: c.region,
          siteType: c.siteType,
          address: c.address,
        };
        siteMap[c.siteId] = { site, lastCase: c };
      }
    });

    return Object.values(siteMap);
  }, [allCases, allSites]);

  // Recent timeline activities aggregated from all cases
  const recentActivities = useMemo(() => {
    const events: Array<{
      caseId: string;
      caseNumber: string;
      title: string;
      siteCode: string;
      description: string;
      timestamp: string;
      eventType: string;
      authorName: string;
    }> = [];

    allCases.forEach((c) => {
      if (c.timeline && c.timeline.length > 0) {
        c.timeline.forEach((tl) => {
          events.push({
            caseId: c.id,
            caseNumber: c.caseNumber,
            title: tl.title,
            siteCode: c.siteCode,
            description: tl.description,
            timestamp: tl.timestamp || c.createdAt,
            eventType: tl.eventType || tl.type || 'Activity',
            authorName: tl.authorName || tl.author || c.responsibleEngineer || 'Field Specialist',
          });
        });
      }
    });

    return events
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 8);
  }, [allCases]);

  // Pending Follow-Up Tasks across all cases
  const pendingFollowUpTasks = useMemo(() => {
    const tasks: Array<{
      taskId: string;
      taskTitle: string;
      priority: CasePriority;
      dueDate?: string;
      caseId: string;
      caseNumber: string;
      siteCode: string;
      assignedTo?: string;
    }> = [];

    allCases.forEach((c) => {
      if (c.followUpTasks) {
        c.followUpTasks.forEach((t) => {
          if (String(t.status).toLowerCase() === 'open' || String(t.status).toLowerCase() === 'pending') {
            tasks.push({
              taskId: t.id,
              taskTitle: t.title,
              priority: t.priority,
              dueDate: t.dueDate,
              caseId: c.id,
              caseNumber: c.caseNumber,
              siteCode: c.siteCode,
              assignedTo: t.assignedTo || t.assignee || c.responsibleEngineer,
            });
          }
        });
      }
    });

    return tasks.slice(0, 6);
  }, [allCases]);

  // Recent photographs & reports
  const recentPhotos = useMemo(() => {
    return allPhotos.slice(0, 6);
  }, [allPhotos]);

  const recentReports = useMemo(() => {
    return allReports.slice(0, 5);
  }, [allReports]);

  const handleExportFilteredExcel = () => {
    try {
      exportCasesToExcel(filteredCases, `TelecomOps360_WorkCases_${todayDateStr}.xlsx`);
      showToast(`Exported ${filteredCases.length} work cases to Excel.`, 'success');
    } catch {
      showToast('Failed to export cases to Excel.', 'error');
    }
  };

  const handleResetFilters = () => {
    setDateRange('all');
    setFilterSiteId('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterPriority('all');
    setSearchQuery('');
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    Draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    planned: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    Planned: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
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
  };

  const priorityColors: Record<string, string> = {
    critical: 'text-rose-600 dark:text-rose-400 font-bold',
    Critical: 'text-rose-600 dark:text-rose-400 font-bold',
    high: 'text-orange-600 dark:text-orange-400 font-semibold',
    High: 'text-orange-600 dark:text-orange-400 font-semibold',
    medium: 'text-amber-600 dark:text-amber-400 font-medium',
    Normal: 'text-amber-600 dark:text-amber-400 font-medium',
    low: 'text-slate-600 dark:text-slate-400 font-normal',
    Low: 'text-slate-600 dark:text-slate-400 font-normal',
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                <Briefcase className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Personal Engineering Dashboard &amp; Work Overview
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Organized archive of your telecom field interventions, maintenance records, test measurements, site audits, and evidence documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openCreateCaseModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Work Case</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('cases')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <ListTodo className="w-4 h-4 text-sky-500" />
              <span>Work Cases Hub</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('gis-map')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Map className="w-4 h-4 text-emerald-500" />
              <span>GIS Map</span>
            </button>

            <button
              type="button"
              onClick={handleExportFilteredExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* 2. Interactive Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter cases, sites, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Date Range Selector */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateFilterRange)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>

          {/* Site Selector */}
          <div>
            <select
              value={filterSiteId}
              onChange={(e) => setFilterSiteId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 truncate"
            >
              <option value="all">All Sites ({allSites.length})</option>
              {allSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteCode} — {s.siteName}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Categories</option>
              <option value="Radio">Radio Access &amp; Towers</option>
              <option value="Fiber">Fiber Optics &amp; Fixed Access</option>
              <option value="Transmission">Transmission &amp; Networking</option>
              <option value="Power">Electrical &amp; Power Systems</option>
              <option value="General">General Engineering &amp; PM</option>
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="planned">Planned</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="verified">Verified</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Primary Work Metrics Strip (Stored Records Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div
          onClick={() => navigateTo('cases')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">Total Cases</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {metrics.totalCases}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Stored records</span>
        </div>

        <div
          onClick={() => navigateTo('cases')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-sky-600 dark:text-sky-400">This Month</span>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
            {metrics.casesOpenedThisMonth}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Opened recently</span>
        </div>

        <div
          onClick={() => navigateTo('cases')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 bg-amber-50/20 hover:border-amber-500/60 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-amber-600 dark:text-amber-400">In Progress</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {metrics.inProgressCases}
          </div>
          <span className="text-[10px] text-amber-600/80 font-mono mt-0.5 block">Active on-site</span>
        </div>

        <div
          onClick={() => navigateTo('cases')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-blue-600 dark:text-blue-400">Planned Visits</span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {metrics.plannedVisits}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Scheduled</span>
        </div>

        <div
          onClick={() => navigateTo('cases')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 hover:border-emerald-500/60 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-emerald-600 dark:text-emerald-400">Completed</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.completedWork}
          </div>
          <span className="text-[10px] text-emerald-600/80 font-mono mt-0.5 block">Interventions</span>
        </div>

        <div
          onClick={() => navigateTo('cases')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/50 bg-teal-50/20 hover:border-teal-500/60 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-teal-600 dark:text-teal-400">Verified</span>
          <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
            {metrics.awaitingVerification}
          </div>
          <span className="text-[10px] text-teal-600/80 font-mono mt-0.5 block">QC Approved</span>
        </div>

        <div
          onClick={() => navigateTo('cases')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/50 bg-orange-50/20 hover:border-orange-500/60 transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-orange-600 dark:text-orange-400">Follow-up Tasks</span>
          <div className="text-2xl font-bold font-mono text-orange-600 dark:text-orange-400 mt-1">
            {metrics.followUpCount}
          </div>
          <span className="text-[10px] text-orange-600/80 font-mono mt-0.5 block">Pending items</span>
        </div>

        <div
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
        >
          <span className="text-[10px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">Time Logged</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {metrics.totalActualHours}h
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Est: {metrics.totalEstimatedHours}h
          </span>
        </div>
      </div>

      {/* 4. Two-Column Analytics & Operational Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Work Distribution by Engineering Category */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Work Distribution by Engineering Category
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {filteredCases.length} total recorded
            </span>
          </div>

          <div className="space-y-3">
            {categoryDistribution.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No cases matching current filters.</p>
            ) : (
              categoryDistribution.map((item) => (
                <div key={item.categoryName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                      {item.categoryName}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px] shrink-0">
                      <strong>{item.count}</strong> cases ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${item.barWidthPercent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Top Serviced Sites & Geographic Distribution */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Serviced Sites &amp; Regional Activity
              </h3>
            </div>
            <button
              onClick={() => navigateTo('sites')}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Site Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {siteDistribution.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No site interventions recorded.</p>
            ) : (
              siteDistribution.map((s) => (
                <div
                  key={s.siteId}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        {s.siteCode}
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                        {s.siteName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{s.region}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {s.count} {s.count === 1 ? 'case' : 'cases'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openSiteInGisMap(s.siteId)}
                      className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                      title="Inspect site on GIS Map"
                    >
                      <Map className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openSiteById(s.siteId)}
                      className="p-1 rounded text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                      title="View Site Details"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Follow-Up Action Items & Recently Visited Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Follow-up Action Items */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pending Follow-up Tasks ({pendingFollowUpTasks.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Requires engineer action</span>
          </div>

          <div className="space-y-2">
            {pendingFollowUpTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                All follow-up action items have been completed.
              </p>
            ) : (
              pendingFollowUpTasks.map((t) => (
                <div
                  key={t.taskId}
                  onClick={() => openCaseById(t.caseId)}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {t.taskTitle}
                    </p>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="text-sky-600 dark:text-sky-400 font-bold">{t.caseNumber}</span>
                      <span>·</span>
                      <span>{t.siteCode}</span>
                      {t.dueDate && (
                        <>
                          <span>·</span>
                          <span>Due: {t.dueDate}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] uppercase font-bold ${priorityColors[t.priority]}`}>
                      {t.priority}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Visited / Serviced Sites */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recently Serviced Sites
              </h3>
            </div>
            <button
              onClick={() => navigateTo('sites')}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              All Sites
            </button>
          </div>

          <div className="space-y-2">
            {recentlyVisitedSites.map(({ site, lastCase }) => (
              <div
                key={site.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="font-mono text-xs text-sky-600 dark:text-sky-400">
                      {site.siteCode}
                    </strong>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {site.siteName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Last intervention: <span className="font-medium text-slate-700 dark:text-slate-300">{lastCase.title}</span> ({lastCase.caseNumber})
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openCaseById(lastCase.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    Open Case
                  </button>
                  <button
                    type="button"
                    onClick={() => openSiteInGisMap(site.id)}
                    className="p-1 text-slate-400 hover:text-emerald-500 cursor-pointer"
                    title="View in GIS"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Active Work Cases Quick Table */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active &amp; Recent Work Cases ({filteredCases.length})
            </h3>
          </div>
          <button
            onClick={() => navigateTo('cases')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Work Cases Module</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3 w-32">Case ID</th>
                <th className="p-3">Title &amp; Work Type</th>
                <th className="p-3">Site / Location</th>
                <th className="p-3 w-28">Planned Date</th>
                <th className="p-3 w-24">Priority</th>
                <th className="p-3 w-28">Status</th>
                <th className="p-3 w-32">Progress</th>
                <th className="p-3 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCases.slice(0, 8).map((c) => {
                const totalSteps = c.steps?.length || 0;
                const completedSteps = c.steps ? c.steps.filter((s) => s.status === 'completed' || s.status === 'Completed').length : 0;
                const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                return (
                  <tr
                    key={c.id}
                    onClick={() => openCaseById(c.id)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {c.caseNumber}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {c.workType} · {(c.category || c.workTypeCategory || '').replace('_', ' ')}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.siteName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {c.siteCode} ({c.region})
                      </div>
                    </td>

                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {(c.timestamps?.plannedDate || c.scheduledDate || c.createdAt || '').slice(0, 10)}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className={`text-[11px] uppercase ${priorityColors[c.priority]}`}>
                        {c.priority}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider rounded ${statusColors[c.status] || statusColors.draft}`}>
                        {String(c.status).replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="bg-emerald-600 h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                        <span>{pct}%</span>
                        <span>{completedSteps}/{totalSteps} steps</span>
                      </div>
                    </td>

                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openCaseById(c.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Bottom Grid: Photographic Evidence & Recent Generated Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Photographic Evidence */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Photographic Evidence ({allPhotos.length})
              </h3>
            </div>
            <button
              onClick={() => navigateTo('photo-studio')}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Photo Studio</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => openPhotoInStudio(photo.id)}
                className="group relative rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950 cursor-pointer hover:border-sky-500 transition-colors"
              >
                <div className="aspect-4/3 overflow-hidden bg-slate-900">
                  <img
                    src={photo.annotatedDataUrl || photo.originalDataUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="p-2 text-left bg-white dark:bg-slate-900">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                    {photo.title}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono flex items-center justify-between mt-0.5">
                    <span className="uppercase">{photo.classification}</span>
                    <span>{photo.siteCode}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Engineering Reports */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Engineering Reports &amp; Revisions
              </h3>
            </div>
            <button
              onClick={() => navigateTo('reports')}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Report Center</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentReports.map((rep) => (
              <div
                key={rep.id}
                onClick={() => openReportById(rep.id)}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {rep.reportNumber}
                    </strong>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {rep.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Site: {rep.siteCode} · {rep.reportType || 'Intervention Report'} · {rep.approvalStatus}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {rep.revisionCode || 'Rev 1.0'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. Recent Engineering Activity Timeline */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Chronological Engineering Activity History
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Real events from stored cases</span>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {recentActivities.map((act, idx) => (
            <div key={`${act.caseId}-${idx}`} className="relative group">
              <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-sky-600 border-2 border-white dark:border-slate-900" />
              <div
                onClick={() => openCaseById(act.caseId)}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                      {act.caseNumber}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {act.title}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {act.timestamp ? formatUtcTimestamp(act.timestamp, tz) : ''}
                  </span>
                </div>
                {act.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">{act.description}</p>
                )}
                <div className="mt-1.5 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Author: {act.authorName}</span>
                  <span className="text-slate-500 uppercase">{act.eventType} · {act.siteCode}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
