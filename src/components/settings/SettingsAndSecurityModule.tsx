import React, { useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  Calendar,
  Check,
  Clock,
  Database,
  Globe,
  History,
  Laptop,
  Lock,
  Moon,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sliders,
  Sun,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation, AppLanguage } from '../../i18n';
import { UserRole } from '../../types/models';
import { formatUtcTimestamp } from '../common/StatusIndicators';

export const SettingsAndSecurityModule: React.FC = () => {
  const {
    store,
    currentUser,
    can,
    themeMode,
    setThemeMode,
    tableDensity,
    setTableDensity,
    dateFormat,
    timeFormat,
    customTimezone,
    updateRegionalPreferences,
    switchActiveOrganization,
    setPlatformEnvironmentMode,
    createDatabaseBackupSnapshot,
    restoreDatabaseBackupSnapshot,
    executeSafeDemoMigration,
    resetDemoDatabase,
  } = useApp();

  const { language, setLanguage, t } = useTranslation();

  const tz = store.userTimezone || customTimezone || 'UTC';
  const canViewAudit = can('audit:view');
  const canManageBackup = can('backup:manage');
  const canManageSettings = can('org:manage_settings');
  const canMigrate = can('system:migrate_data');
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const [activeTab, setActiveTab] = useState<
    'preferences' | 'hierarchy' | 'integrations' | 'backups' | 'audit'
  >('preferences');
  const [backupLabel, setBackupLabel] = useState('Pre-Maintenance Window Snapshot');
  const [auditSearch, setAuditSearch] = useState('');

  const activeOrgId = store.activeOrganizationId || currentUser?.organizationId || 'ORG-TELECOM-01';

  const filteredAuditEvents = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return (store.auditEvents || []).filter((ev) => {
      if (!isSuperAdmin && (ev.organizationId || 'ORG-TELECOM-01') !== activeOrgId) {
        return false;
      }
      if (!q) return true;
      return [
        ev.id,
        ev.actorName,
        ev.actorRole,
        ev.actionType,
        ev.entityType,
        ev.entityId,
        ev.summary,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [store.auditEvents, auditSearch, isSuperAdmin, activeOrgId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              PHASE 5 PLATFORM SECURITY, MULTI-TENANT HIERARCHY, INTEGRATIONS, BACKUPS &amp; AUDIT
              LOG
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Platform Governance, Backend Operations &amp; Security Audit
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Configure organization hierarchy, OSS/NMS vendor connectors, database backups, safe
            schema migration, and append-only security audit trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            BACKEND: ONLINE (SCHEMA v{store.schemaVersion || '5.0.0'})
          </span>
          {canManageSettings && (
            <button
              type="button"
              onClick={() =>
                setPlatformEnvironmentMode(
                  store.environmentMode === 'production-enforced'
                    ? 'development-demo'
                    : 'production-enforced'
                )
              }
              className="px-3 py-1.5 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              Mode:{' '}
              {store.environmentMode === 'production-enforced'
                ? 'Production-Enforced (Switch to Demo)'
                : 'Development-Demo (Switch to Production)'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'preferences'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>0. Appearance, Language &amp; Regional Preferences</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hierarchy')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'hierarchy'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          1. Organizations &amp; Projects Hierarchy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'integrations'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          2. OSS/NMS &amp; Notification Connectors
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'backups'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          3. Backups, Recovery &amp; Safe Migration
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-sky-600 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-600 dark:text-slate-400'
          }`}
        >
          4. Append-Only Audit Trail ({filteredAuditEvents.length})
        </button>
      </div>

      {activeTab === 'preferences' && (
        <div className="space-y-6 text-xs">
          {/* Section 1: Appearance & Theme */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Appearance &amp; Global Theme Mode
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Select your preferred visual style. Changes apply immediately across all modules, GIS map overlays, canvas studios, and dialogs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'light' as const,
                  label: 'Light Mode',
                  desc: 'High-contrast clean daylight theme for outdoor field tablets',
                  icon: Sun,
                },
                {
                  id: 'dark' as const,
                  label: 'Dark Mode (NOC)',
                  desc: 'Low-fatigue dark slate theme optimized for 24/7 NOC surveillance',
                  icon: Moon,
                },
                {
                  id: 'system' as const,
                  label: 'System Default',
                  desc: 'Automatically synchronizes with your OS / browser preference',
                  icon: Laptop,
                },
              ].map((m) => {
                const Icon = m.icon;
                const active = themeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setThemeMode(m.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      active
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${active ? 'text-sky-500' : 'text-slate-400'}`} />
                        <span className="font-bold text-slate-900 dark:text-white">{m.label}</span>
                      </div>
                      {active && <Check className="w-4 h-4 text-sky-500" />}
                    </div>
                    <span className="text-[11px] text-slate-500 leading-relaxed">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Application Language (i18n & RTL) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Application Language &amp; Full RTL Layout
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Select the primary interface language. Arabic activates real bidirectional right-to-left layout, typography mirroring, and Arabic report formatting.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  code: 'en' as const,
                  name: 'English (UK / US)',
                  native: 'English',
                  flag: '🇬🇧',
                  dir: 'LTR Layout',
                },
                {
                  code: 'fr' as const,
                  name: 'Français (France / Francophone)',
                  native: 'Français',
                  flag: '🇫🇷',
                  dir: 'Mise en page GàD',
                },
                {
                  code: 'ar' as const,
                  name: 'العربية (Arabic Standard / Telecom)',
                  native: 'العربية',
                  flag: '🇩🇿',
                  dir: 'تخطيط كامل من اليمين لليسار (RTL)',
                },
              ].map((l) => {
                const active = language === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      active
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{l.flag}</span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{l.native}</div>
                          <div className="text-[10px] text-slate-400">{l.name}</div>
                        </div>
                      </div>
                      {active && <Check className="w-4 h-4 text-sky-500" />}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{l.dir}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Table & Visual Density */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Table &amp; Information Density
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Adjust row height and spacing across data grids in Alarms, Incidents, Work Orders, and Sites.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'compact' as const,
                  label: 'Compact',
                  desc: 'Dense row padding (py-1.5), maximized data per screen for desktop multi-monitors',
                },
                {
                  id: 'comfortable' as const,
                  label: 'Comfortable (Standard)',
                  desc: 'Balanced engineering view with standard padding (py-2.5) and clear readability',
                },
                {
                  id: 'spacious' as const,
                  label: 'Spacious',
                  desc: 'Generous padding (py-3.5) with larger touch targets for field tablets and laptops',
                },
              ].map((d) => {
                const active = tableDensity === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setTableDensity(d.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      active
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{d.label}</span>
                      {active && <Check className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <span className="text-[11px] text-slate-500 leading-relaxed">{d.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Regional Formatting & Timezone */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Regional Date, Time &amp; Timezone Formatting
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) =>
                    updateRegionalPreferences({
                      dateFormat: e.target.value as any,
                      timeFormat,
                      timezone: customTimezone,
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs cursor-pointer"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 06/11/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601 - e.g. 2026-11-06)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/06/2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Time Format</label>
                <select
                  value={timeFormat}
                  onChange={(e) =>
                    updateRegionalPreferences({
                      dateFormat,
                      timeFormat: e.target.value as any,
                      timezone: customTimezone,
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs cursor-pointer"
                >
                  <option value="24h">24-Hour Military / Telecom (e.g. 14:30:00)</option>
                  <option value="12h">12-Hour AM/PM (e.g. 02:30:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Operating Timezone</label>
                <select
                  value={customTimezone}
                  onChange={(e) =>
                    updateRegionalPreferences({
                      dateFormat,
                      timeFormat,
                      timezone: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs cursor-pointer"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Europe/Paris">Europe/Paris (CET / UTC+1)</option>
                  <option value="Africa/Algiers">Africa/Algiers (CET / UTC+1)</option>
                  <option value="Africa/Cairo">Africa/Cairo (EET / UTC+2)</option>
                  <option value="Europe/London">Europe/London (GMT / UTC+0)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST / UTC+4)</option>
                  <option value="America/New_York">America/New_York (EST / UTC-5)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (AST / UTC+3)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hierarchy' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(store.organizations || []).map((org) => {
              const isCurrent = org.id === activeOrgId;
              const orgProjects = (store.operatorProjects || []).filter(
                (p) => p.organizationId === org.id
              );
              const orgSitesCount = store.sites.filter(
                (s) => (s.organizationId || 'ORG-TELECOM-01') === org.id
              ).length;
              const orgIncidentsCount = store.incidents.filter(
                (i) => (i.organizationId || 'ORG-TELECOM-01') === org.id
              ).length;

              return (
                <div
                  key={org.id}
                  className={`p-5 rounded-xl bg-white dark:bg-slate-900 border ${
                    isCurrent
                      ? 'border-sky-500 dark:border-sky-500'
                      : 'border-slate-200 dark:border-slate-800'
                  } space-y-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-500" />
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {org.id} ({org.code})
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {org.name}
                      </h3>
                      <p className="text-slate-500">
                        {org.tier} · Primary Operator: {org.primaryOperatorName}
                      </p>
                    </div>

                    {isCurrent ? (
                      <span className="px-2.5 py-1 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono text-[10px] font-bold">
                        ACTIVE TENANT
                      </span>
                    ) : isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => switchActiveOrganization(org.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
                      >
                        Switch Tenant Context
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                        <Lock className="w-3 h-3" /> Isolated Tenant
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Scoped Sites</span>
                      <strong>{orgSitesCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Scoped Incidents</span>
                      <strong>{orgIncidentsCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Data Retention</span>
                      <strong>{org.dataRetentionDays}d</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Audit Retention</span>
                      <strong>{org.auditRetentionDays}d</strong>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Operator Projects ({orgProjects.length})
                    </h4>
                    <div className="space-y-2">
                      {orgProjects.map((prj) => (
                        <div
                          key={prj.id}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                              {prj.code} ({prj.id})
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {prj.name}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[10px] text-slate-500">
                            Regions: {prj.regions.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 text-amber-900 dark:text-amber-200">
            <p className="font-bold">
              Operational Transparency Notice — Vendor OSS/NMS &amp; Notification Gateways
            </p>
            <p className="mt-1">
              Until live carrier credentials are provisioned in server environment variables (
              <code className="font-mono">.env</code>), incoming alarms and notifications operate in
              clearly labeled <strong>Simulated / Development Fallback</strong> mode and are never
              presented as live carrier telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(store.integrationConnectors || []).map((conn) => (
              <div
                key={conn.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                      {conn.vendor} · {conn.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {conn.name}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {conn.mode}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                  <div>Protocol: {conn.protocol}</div>
                  <div>Endpoint / Secret: {conn.endpointHint}</div>
                  <div>
                    Deduplication Window: {conn.deduplicationWindowMinutes} mins · Events Processed:{' '}
                    {conn.eventsProcessedCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Backup & Recovery Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Database Snapshots &amp; Point-in-Time Recovery
              </h2>
            </div>
            <p className="text-slate-500">
              Create verified database snapshots before major maintenance windows or schema
              updates. Restoring a snapshot preserves the append-only security audit trail.
            </p>

            {canManageBackup ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backupLabel}
                  onChange={(e) => setBackupLabel(e.target.value)}
                  placeholder="Snapshot label..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => createDatabaseBackupSnapshot(backupLabel)}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  Create Snapshot
                </button>
              </div>
            ) : (
              <div className="p-3 rounded bg-slate-100 dark:bg-slate-950 text-slate-500">
                Requires <code className="font-mono">backup:manage</code> permission (Super
                Administrator or Organization Administrator).
              </div>
            )}

            <div className="space-y-2 pt-2">
              {(store.backupSnapshots || []).length === 0 ? (
                <p className="text-slate-500 italic">No manual snapshots recorded yet.</p>
              ) : (
                (store.backupSnapshots || []).map((bkp) => (
                  <div
                    key={bkp.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                        {bkp.id} — {bkp.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Created by {bkp.createdBy} at {formatUtcTimestamp(bkp.createdAt, tz)} (
                        {Math.round(bkp.sizeBytes / 1024)} KB)
                      </div>
                    </div>
                    {canManageBackup && (
                      <button
                        type="button"
                        onClick={() => restoreDatabaseBackupSnapshot(bkp.id)}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Safe Demo Data Migration & Factory Reset Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Safe Demo-Data Migration &amp; Seed Controls
              </h2>
            </div>
            <p className="text-slate-500">
              Validates required fields, entity relationships, and duplicate IDs before migrating
              records to the Phase 5 persistent schema. Automatically blocked when{' '}
              <code className="font-mono">production-enforced</code> mode is active.
            </p>

            <div className="flex flex-wrap gap-2">
              {canMigrate && (
                <button
                  type="button"
                  onClick={executeSafeDemoMigration}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Validated Schema v5.0.0 Migration</span>
                </button>
              )}
              {can('system:reset_demo') && (
                <button
                  type="button"
                  onClick={resetDemoDatabase}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Development Seed Database</span>
                </button>
              )}
            </div>

            <div className="space-y-2 pt-2">
              {(store.migrationReports || []).map((mig) => (
                <div
                  key={mig.migrationId}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {mig.migrationId} ({mig.status})
                    </span>
                    <span>
                      {mig.sourceSchemaVersion} → {mig.targetSchemaVersion}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Executed by {mig.executedBy} · Duplicates Skipped: {mig.duplicatesSkipped} ·
                    Validation Errors: {mig.validationErrors.length}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-sky-500" />
                <span>Append-Only Operational &amp; Security Audit Trail</span>
              </h2>
              <p className="text-slate-500 mt-0.5">
                Audit records are immutable on the server. Passwords, session tokens, and private
                keys are never logged.
              </p>
            </div>
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Filter audit log by actor, action, entity ID..."
              className="w-full sm:w-72 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            />
          </div>

          {!canViewAudit && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              Your role ({currentUser?.role}) has limited activity visibility. Full security audit
              history requires <code className="font-mono">audit:view</code> permission.
            </div>
          )}

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Actor &amp; Role</th>
                  <th className="py-2.5 px-3">Tenant</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Summary &amp; State Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAuditEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatUtcTimestamp(ev.timestamp, tz)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {ev.actorName}
                      </div>
                      <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400">
                        {ev.actorRole}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px]">
                      {ev.organizationId || 'ORG-TELECOM-01'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[11px]">
                      {ev.actionType}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {ev.entityType}: {ev.entityId}
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{ev.summary}</div>
                      {(ev.beforeValue || ev.afterValue) && (
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {ev.beforeValue || 'N/A'} → {ev.afterValue || 'N/A'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
