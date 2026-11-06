import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  Camera,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cpu,
  FileText,
  Globe,
  Languages,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Monitor,
  Moon,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation, AppLanguage } from '../../i18n';
import { NavigationSectionId, UserRole } from '../../types/models';
import { AlarmCenterModule } from '../alarms/AlarmCenterModule';
import { EquipmentInventoryModule } from '../equipment/EquipmentInventoryModule';
import { GisMapModule } from '../gis/GisMapModule';
import { IncidentManagementModule } from '../incidents/IncidentManagementModule';
import {
  CreateIncidentModal,
  UpsertSiteModal,
  UpsertWorkOrderModal,
} from '../modals/OperationModals';
import { WorkCasesModule } from '../cases/WorkCasesModule';
import { UpsertWorkCaseModal } from '../cases/UpsertWorkCaseModal';
import { OverviewModule } from '../overview/OverviewModule';
import { PhotoAnnotationStudio } from '../photos/PhotoAnnotationStudio';
import { PlannedModuleView } from '../placeholders/PlannedModuleView';
import { ReportsCenterModule } from '../reports/ReportsCenterModule';
import { SettingsAndSecurityModule } from '../settings/SettingsAndSecurityModule';
import { SitesModule } from '../sites/SitesModule';
import { TeamsAndUsersModule } from '../teams/TeamsAndUsersModule';
import { SiteVisitsModule } from '../visits/SiteVisitsModule';
import { WorkOrdersModule } from '../workorders/WorkOrdersModule';

interface NavItemConfig {
  id: NavigationSectionId;
  translationKey: string;
  defaultLabel: string;
  icon: React.FC<{ className?: string }>;
  sectionGroup: 'primary-work' | 'operations';
  countBadge?: (args: {
    activeIncidents: number;
    unackAlarms: number;
    offlineSites: number;
    activeWos: number;
    pendingVisits: number;
    gisCount: number;
    workCasesCount: number;
  }) => number | null;
}

const NAV_ITEMS: NavItemConfig[] = [
  // Primary Personal Work Archive & Tools
  {
    id: 'overview',
    translationKey: 'nav.overview',
    defaultLabel: 'Overview',
    icon: LayoutDashboard,
    sectionGroup: 'primary-work',
  },
  {
    id: 'cases',
    translationKey: 'nav.cases',
    defaultLabel: 'Work Cases',
    icon: Briefcase,
    sectionGroup: 'primary-work',
    countBadge: ({ workCasesCount }) => (workCasesCount > 0 ? workCasesCount : null),
  },
  {
    id: 'gis-map',
    translationKey: 'nav.gisMap',
    defaultLabel: 'GIS MAP',
    icon: Map,
    sectionGroup: 'primary-work',
    countBadge: ({ gisCount }) => (gisCount > 0 ? gisCount : null),
  },
  {
    id: 'sites',
    translationKey: 'nav.sites',
    defaultLabel: 'Sites Directory',
    icon: Building2,
    sectionGroup: 'primary-work',
    countBadge: ({ offlineSites }) => (offlineSites > 0 ? offlineSites : null),
  },
  {
    id: 'equipment',
    translationKey: 'nav.equipment',
    defaultLabel: 'Equipment Inventory',
    icon: Cpu,
    sectionGroup: 'primary-work',
  },
  {
    id: 'photo-studio',
    translationKey: 'nav.photoStudio',
    defaultLabel: 'Photo Studio',
    icon: Camera,
    sectionGroup: 'primary-work',
  },
  {
    id: 'reports',
    translationKey: 'nav.reports',
    defaultLabel: 'Report Center',
    icon: FileText,
    sectionGroup: 'primary-work',
  },
  // Operational Monitoring & Extended Tools
  {
    id: 'incidents',
    translationKey: 'nav.incidents',
    defaultLabel: 'Incident Center',
    icon: ShieldAlert,
    sectionGroup: 'operations',
    countBadge: ({ activeIncidents }) => (activeIncidents > 0 ? activeIncidents : null),
  },
  {
    id: 'alarms',
    translationKey: 'nav.alarms',
    defaultLabel: 'Alarm Center',
    icon: Activity,
    sectionGroup: 'operations',
    countBadge: ({ unackAlarms }) => (unackAlarms > 0 ? unackAlarms : null),
  },
  {
    id: 'work-orders',
    translationKey: 'nav.workOrders',
    defaultLabel: 'Work Orders',
    icon: ClipboardList,
    sectionGroup: 'operations',
    countBadge: ({ activeWos }) => (activeWos > 0 ? activeWos : null),
  },
  {
    id: 'site-visits',
    translationKey: 'nav.siteVisits',
    defaultLabel: 'Field Operations',
    icon: CalendarClock,
    sectionGroup: 'operations',
    countBadge: ({ pendingVisits }) => (pendingVisits > 0 ? pendingVisits : null),
  },
  {
    id: 'teams-users',
    translationKey: 'nav.teamsUsers',
    defaultLabel: 'Team & Users',
    icon: Users,
    sectionGroup: 'operations',
  },
  {
    id: 'settings',
    translationKey: 'nav.settings',
    defaultLabel: 'Settings & Security',
    icon: Settings,
    sectionGroup: 'operations',
  },
];

export const AppShell: React.FC = () => {
  const {
    store,
    currentUser,
    theme,
    themeMode,
    setThemeMode,
    activeSection,
    metrics,
    toastMessage,
    toggleTheme,
    navigateTo,
    openIncidentById,
    openAlarmById,
    openSiteById,
    openWorkOrderById,
    openCaseById,
    isCreateCaseOpen,
    closeCreateCaseModal,
    editingCase,
    createCasePrefill,
    markNotificationRead,
    markAllNotificationsRead,
    setUserTimezone,
    switchDemoRole,
    signOut,
  } = useApp();

  const { language, setLanguage, dir, isRTL, t, availableLanguages } = useTranslation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const tz = store.userTimezone || 'UTC';

  const unackAlarmsCount = useMemo(
    () => store.alarms.filter((a) => a.isSimulatedActive && !a.acknowledged).length,
    [store.alarms]
  );

  const unreadNotifCount = useMemo(
    () => (store.notifications || []).filter((n) => !n.read).length,
    [store.notifications]
  );

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeSection) || NAV_ITEMS[0];

  // Global search results across Cases, Sites, Incidents, Alarms, and Work Orders
  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return null;

    const matchedCases = (store.workCases || [])
      .filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.siteCode.toLowerCase().includes(q) ||
          c.siteName.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedSites = store.sites
      .filter(
        (s) =>
          s.siteCode.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.siteName.toLowerCase().includes(q) ||
          s.region.toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedIncidents = store.incidents
      .filter(
        (inc) =>
          inc.id.toLowerCase().includes(q) ||
          inc.alarmId.toLowerCase().includes(q) ||
          inc.siteCode.toLowerCase().includes(q) ||
          (inc.title || inc.alarmName).toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedAlarms = store.alarms
      .filter(
        (alm) =>
          alm.id.toLowerCase().includes(q) ||
          alm.vendorCode.toLowerCase().includes(q) ||
          alm.alarmName.toLowerCase().includes(q) ||
          alm.siteCode.toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedWorkOrders = store.workOrders
      .filter(
        (wo) =>
          wo.workOrderNumber.toLowerCase().includes(q) ||
          wo.siteCode.toLowerCase().includes(q) ||
          wo.workDescription.toLowerCase().includes(q)
      )
      .slice(0, 3);

    return {
      matchedCases,
      matchedSites,
      matchedIncidents,
      matchedAlarms,
      matchedWorkOrders,
      total:
        matchedCases.length +
        matchedSites.length +
        matchedIncidents.length +
        matchedAlarms.length +
        matchedWorkOrders.length,
    };
  }, [globalSearch, store.sites, store.incidents, store.alarms, store.workOrders, store.workCases]);

  return (
    <div
      dir={dir}
      className="min-h-screen flex flex-col lg:flex-row bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
    >
      {/* Persistent Desktop Sidebar (Hidden on Mobile/Tablet < 1024px) */}
      <aside
        className={`hidden lg:flex lg:flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 z-30 ${
          sidebarCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {/* Brand Wordmark & Collapse Toggle */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => navigateTo('overview')}
              className="flex items-center gap-2.5 text-left cursor-pointer whitespace-nowrap overflow-hidden"
            >
              <Radio className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {t('common.appName', 'TelecomOps 360')}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateTo('overview')}
              className="mx-auto text-sky-600 dark:text-sky-400 cursor-pointer"
              title={t('common.appName', 'TelecomOps 360')}
            >
              <Radio className="w-6 h-6" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              isRTL ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : isRTL ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4" aria-label="Main Navigation">
          {/* Primary Personal Work Archive */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-mono font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {t('nav.personalWork', 'PERSONAL WORK ARCHIVE')}
              </p>
            )}
            <div className="space-y-1">
              {NAV_ITEMS.filter((item) => item.sectionGroup === 'primary-work').map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const label = t(item.translationKey, item.defaultLabel);
                const badgeVal = item.countBadge
                  ? item.countBadge({
                      activeIncidents: metrics.activeIncidents,
                      unackAlarms: unackAlarmsCount,
                      offlineSites: metrics.sitesCurrentlyOffline,
                      activeWos: metrics.workOrdersInProgress,
                      pendingVisits: metrics.pendingSiteVisits,
                      gisCount: store.sites.length + store.gisFeatures.length,
                      workCasesCount: (store.workCases || []).filter(
                        (c) => c.status === 'in_progress' || c.status === 'planned'
                      ).length,
                    })
                  : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    title={sidebarCollapsed ? label : undefined}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span>{label}</span>}
                    </span>
                    {!sidebarCollapsed && badgeVal !== null && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ltr-protect ${
                          isActive
                            ? 'text-white'
                            : item.id === 'cases'
                            ? 'text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operational Monitoring & Extended Tools */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-mono font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {t('nav.operations', 'OPERATIONS & EXTENDED TOOLS')}
              </p>
            )}
            <div className="space-y-1">
              {NAV_ITEMS.filter((item) => item.sectionGroup === 'operations').map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const label = t(item.translationKey, item.defaultLabel);
                const badgeVal = item.countBadge
                  ? item.countBadge({
                      activeIncidents: metrics.activeIncidents,
                      unackAlarms: unackAlarmsCount,
                      offlineSites: metrics.sitesCurrentlyOffline,
                      activeWos: metrics.workOrdersInProgress,
                      pendingVisits: metrics.pendingSiteVisits,
                      gisCount: store.sites.length + store.gisFeatures.length,
                      workCasesCount: (store.workCases || []).filter(
                        (c) => c.status === 'in_progress' || c.status === 'planned'
                      ).length,
                    })
                  : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    title={sidebarCollapsed ? label : undefined}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span>{label}</span>}
                    </span>
                    {!sidebarCollapsed && badgeVal !== null && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ltr-protect ${
                          isActive
                            ? 'text-white'
                            : item.id === 'alarms' || item.id === 'incidents'
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer: Current Engineer */}
        {currentUser && !sidebarCollapsed && (
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs">
            <div className="font-semibold text-slate-900 dark:text-white truncate">
              {currentUser.fullName}
            </div>
            <div className="font-mono text-[11px] text-sky-600 dark:text-sky-400 truncate">
              {currentUser.role}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">{currentUser.region}</div>
          </div>
        )}
      </aside>

      {/* Mobile / Tablet Navigation Drawer (< 1024px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className={`relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 border-slate-200 dark:border-slate-800 shadow-2xl ${
              isRTL ? 'mr-auto border-l' : 'ml-auto border-r'
            }`}
          >
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-sky-500" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {t('common.appName', 'TelecomOps 360')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <p className="px-2 mb-2 text-[10px] font-mono font-semibold text-slate-400 uppercase">
                  {t('nav.personalWork', 'PERSONAL WORK ARCHIVE')}
                </p>
                <div className="space-y-1">
                  {NAV_ITEMS.filter((i) => i.sectionGroup === 'primary-work').map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigateTo(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-xs font-semibold ${
                          isActive
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{t(item.translationKey, item.defaultLabel)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-2 mb-2 text-[10px] font-mono font-semibold text-slate-400 uppercase">
                  {t('nav.operations', 'OPERATIONS & TEAM TOOLS')}
                </p>
                <div className="space-y-1">
                  {NAV_ITEMS.filter((i) => i.sectionGroup === 'operations').map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigateTo(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-xs font-semibold ${
                          isActive
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{t(item.translationKey, item.defaultLabel)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>

            {currentUser && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 px-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-30">
          {/* Left Zone: Mobile Menu Trigger + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap truncate">
              <span className="text-slate-400 hidden sm:inline">
                {t('common.appName', 'TelecomOps 360')}
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {t(activeNavItem.translationKey, activeNavItem.defaultLabel)}
              </span>
            </div>
          </div>

          {/* Center Zone: Global Multi-field Search */}
          <div className="relative flex-1 max-w-xs sm:max-w-md hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 200)}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder={t(
                'cases.searchPlaceholder',
                'Global search: Case, Site, Incident, Alarm...'
              )}
              className="w-full pl-9 pr-7 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Global Search Results Dropdown */}
            {searchFocused && globalSearchResults && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs max-h-96 overflow-y-auto space-y-3">
                {globalSearchResults.total === 0 ? (
                  <p className="text-slate-500 text-center py-3">
                    No matching records found across Cases, Sites, Incidents, or Alarms.
                  </p>
                ) : (
                  <>
                    {globalSearchResults.matchedCases.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] font-bold text-emerald-500 mb-1">
                          WORK CASES ({globalSearchResults.matchedCases.length})
                        </p>
                        {globalSearchResults.matchedCases.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              openCaseById(c.id);
                              navigateTo('cases');
                              setGlobalSearch('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                          >
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {c.caseNumber} — {c.title}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {c.siteCode}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {globalSearchResults.matchedSites.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] font-bold text-sky-500 mb-1">
                          SITES ({globalSearchResults.matchedSites.length})
                        </p>
                        {globalSearchResults.matchedSites.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={() => {
                              openSiteById(s.id);
                              setGlobalSearch('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                          >
                            <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                              {s.siteCode} — {s.siteName}
                            </span>
                            <span className="text-[11px] text-slate-500">{s.region}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Zone: Language Selector, Theme Toggle, Notifications, User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLanguageMenuOpen((prev) => !prev);
                  setThemeMenuOpen(false);
                  setNotificationsOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer min-h-[38px]"
                aria-label="Select Language"
                title="Change Application Language"
              >
                <Languages className="w-3.5 h-3.5 text-sky-500" />
                <span className="hidden sm:inline uppercase font-mono text-[11px]">
                  {language}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {languageMenuOpen && (
                <div
                  className={`absolute mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 text-xs space-y-1 ${
                    isRTL ? 'left-0' : 'right-0'
                  }`}
                >
                  <p className="px-2 py-1 text-[10px] font-mono text-slate-400 font-semibold uppercase">
                    {t('settings.language', 'Display Language')}
                  </p>
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setLanguageMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
                        language === lang.code
                          ? 'bg-sky-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeLabel}</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80 uppercase">
                        {lang.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Mode Dropdown (Light, Dark, System Auto) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setThemeMenuOpen((prev) => !prev);
                  setLanguageMenuOpen(false);
                  setNotificationsOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                aria-label="Theme mode"
                title={`Current theme: ${themeMode}`}
              >
                {themeMode === 'light' ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : themeMode === 'dark' ? (
                  <Moon className="w-4 h-4 text-sky-400" />
                ) : (
                  <Monitor className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {themeMenuOpen && (
                <div
                  className={`absolute mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 text-xs space-y-1 ${
                    isRTL ? 'left-0' : 'right-0'
                  }`}
                >
                  <p className="px-2 py-1 text-[10px] font-mono text-slate-400 font-semibold uppercase">
                    {t('settings.themeMode', 'Color Theme')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('light');
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>{t('settings.light', 'Light Mode')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('dark');
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-sky-400" />
                    <span>{t('settings.dark', 'Dark (NOC Slate)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('system');
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer ${
                      themeMode === 'system'
                        ? 'bg-sky-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Monitor className="w-4 h-4 text-slate-400" />
                    <span>{t('settings.system', 'System Default (Auto)')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* In-App Notifications Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setLanguageMenuOpen(false);
                  setThemeMenuOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                aria-label="Open notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount + unackAlarmsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-mono font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {unreadNotifCount + unackAlarmsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  className={`absolute mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 z-50 text-xs space-y-3 ${
                    isRTL ? 'left-0' : 'right-0'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Notifications ({unreadNotifCount} unread)
                    </span>
                    <div className="flex items-center gap-2">
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(store.notifications || []).length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No notifications.</p>
                    ) : (
                      (store.notifications || []).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.linkedEntityType === 'Incident' && notif.linkedEntityId) {
                              openIncidentById(notif.linkedEntityId);
                            } else if (
                              notif.linkedEntityType === 'WorkCase' &&
                              notif.linkedEntityId
                            ) {
                              openCaseById(notif.linkedEntityId);
                            }
                            setNotificationsOpen(false);
                          }}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            notif.read
                              ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                              : 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {notif.timestamp ? notif.timestamp.split('T')[1]?.slice(0, 5) : ''}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px]">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile & Demo Role Switcher */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setLanguageMenuOpen(false);
                    setThemeMenuOpen(false);
                    setNotificationsOpen(false);
                  }}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <div className="text-left hidden md:block">
                    <div className="font-bold text-slate-900 dark:text-white leading-tight">
                      {currentUser.fullName}
                    </div>
                    <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400 leading-tight">
                      {currentUser.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileMenuOpen && (
                  <div
                    className={`absolute mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 z-50 text-xs space-y-3 ${
                      isRTL ? 'left-0' : 'right-0'
                    }`}
                  >
                    <div className="pb-2.5 border-b border-slate-200 dark:border-slate-800">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {currentUser.fullName}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">{currentUser.email}</p>
                      <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                        Role: {currentUser.role}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Simulate Role Switch (Demo RBAC):
                      </label>
                      <select
                        value={currentUser.role}
                        onChange={(e) => {
                          switchDemoRole(e.target.value as UserRole);
                          setProfileMenuOpen(false);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                      >
                        {Object.values(UserRole).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          navigateTo('settings');
                          setProfileMenuOpen(false);
                        }}
                        className="text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                      >
                        {t('nav.settings', 'Settings')}
                      </button>

                      <button
                        type="button"
                        onClick={signOut}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div
            className={`fixed bottom-20 md:bottom-5 z-50 max-w-md px-4 py-3 rounded-xl border shadow-2xl text-xs font-medium flex items-center justify-between gap-3 bg-slate-900 text-white border-slate-700 ${
              isRTL ? 'left-5' : 'right-5'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Active Module Viewport (Adds pb-20 on mobile to clear bottom navigation) */}
        <main
          className={`flex-1 w-full mx-auto pb-24 md:pb-6 ${
            activeSection === 'gis-map'
              ? 'p-2 sm:p-4 max-w-[1920px]'
              : 'p-3 sm:p-6 lg:p-8 max-w-[1600px]'
          }`}
        >
          {activeSection === 'overview' && <OverviewModule />}
          {activeSection === 'cases' && <WorkCasesModule />}
          {activeSection === 'gis-map' && <GisMapModule />}
          {activeSection === 'incidents' && <IncidentManagementModule />}
          {activeSection === 'alarms' && <AlarmCenterModule />}
          {activeSection === 'sites' && <SitesModule />}
          {activeSection === 'work-orders' && <WorkOrdersModule />}
          {activeSection === 'site-visits' && <SiteVisitsModule />}
          {activeSection === 'photo-studio' && <PhotoAnnotationStudio />}
          {activeSection === 'reports' && <ReportsCenterModule />}
          {activeSection === 'teams-users' && <TeamsAndUsersModule />}
          {activeSection === 'equipment' && <EquipmentInventoryModule />}
          {activeSection === 'settings' && <SettingsAndSecurityModule />}
          {activeSection !== 'overview' &&
            activeSection !== 'cases' &&
            activeSection !== 'gis-map' &&
            activeSection !== 'incidents' &&
            activeSection !== 'alarms' &&
            activeSection !== 'sites' &&
            activeSection !== 'work-orders' &&
            activeSection !== 'site-visits' &&
            activeSection !== 'photo-studio' &&
            activeSection !== 'reports' &&
            activeSection !== 'teams-users' &&
            activeSection !== 'equipment' &&
            activeSection !== 'settings' && <PlannedModuleView section={activeSection} />}
        </main>

        {/* Mobile Bottom Navigation Bar (< 768px) with min 44px tap targets */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe flex items-stretch justify-around px-1"
          aria-label="Mobile Navigation"
        >
          <button
            type="button"
            onClick={() => navigateTo('overview')}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[48px] text-[11px] font-semibold cursor-pointer ${
              activeSection === 'overview'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="truncate max-w-[64px]">{t('nav.overview', 'Overview')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('cases')}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[48px] text-[11px] font-semibold cursor-pointer relative ${
              activeSection === 'cases'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Briefcase className="w-5 h-5 mb-0.5" />
            <span className="truncate max-w-[64px]">{t('nav.cases', 'Cases')}</span>
            {(store.workCases || []).filter(
              (c) => c.status === 'in_progress' || c.status === 'planned'
            ).length > 0 && (
              <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-sky-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigateTo('gis-map')}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[48px] text-[11px] font-semibold cursor-pointer ${
              activeSection === 'gis-map'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Map className="w-5 h-5 mb-0.5" />
            <span className="truncate max-w-[64px]">{t('nav.gisMap', 'GIS')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('sites')}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[48px] text-[11px] font-semibold cursor-pointer ${
              activeSection === 'sites'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="truncate max-w-[64px]">{t('nav.sites', 'Sites')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 min-h-[48px] text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="truncate max-w-[64px]">{t('common.more', 'More')}</span>
          </button>
        </nav>

        {/* Global Modals */}
        <CreateIncidentModal />
        <UpsertSiteModal />
        <UpsertWorkOrderModal />
        <UpsertWorkCaseModal
          isOpen={isCreateCaseOpen}
          onClose={closeCreateCaseModal}
          editingCase={editingCase}
          prefill={createCasePrefill}
        />
      </div>
    </div>
  );
};
