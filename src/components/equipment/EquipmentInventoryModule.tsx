import React, { useMemo, useState } from 'react';
import {
  Cpu,
  ExternalLink,
  Plus,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Equipment, EquipmentCategory, UserRole } from '../../types/models';

const CATEGORIES: EquipmentCategory[] = [
  'BSC / Core Node',
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
];

export const EquipmentInventoryModule: React.FC = () => {
  const {
    store,
    currentUser,
    can,
    openSiteById,
    upsertEquipmentItem,
  } = useApp();

  const canManageEquipment = can('equipment:manage');
  const activeOrgId = store.activeOrganizationId || currentUser?.organizationId || 'ORG-TELECOM-01';
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  const [siteId, setSiteId] = useState(store.sites[0]?.id || 'SITE-1001');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('RRU / RRH (Remote Radio)');
  const [vendor, setVendor] = useState('Nokia');
  const [model, setModel] = useState('AirScale RRU 5G');
  const [serialNumber, setSerialNumber] = useState('');
  const [firmware, setFirmware] = useState('v25.04');
  const [slotOrSector, setSlotOrSector] = useState('Sector 1');
  const [operationalState, setOperationalState] =
    useState<Equipment['operationalState']>('Operational');

  const scopedEquipment = useMemo(
    () =>
      store.equipment.filter(
        (eq) => isSuperAdmin || (eq.organizationId || 'ORG-TELECOM-01') === activeOrgId
      ),
    [store.equipment, isSuperAdmin, activeOrgId]
  );

  const filteredEquipment = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedEquipment.filter((eq) => {
      if (categoryFilter !== 'ALL' && eq.category !== categoryFilter) return false;
      if (stateFilter !== 'ALL' && eq.operationalState !== stateFilter) return false;
      if (q) {
        const hay = [
          eq.id,
          eq.siteCode,
          eq.name,
          eq.category,
          eq.vendor,
          eq.model,
          eq.serialNumber,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedEquipment, searchQuery, categoryFilter, stateFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = upsertEquipmentItem({
      siteId,
      name,
      category,
      vendor,
      model,
      serialNumber,
      firmwareOrVersion: firmware,
      slotOrSector,
      operationalState,
    });
    if (res.ok) {
      setName('');
      setSerialNumber('');
      setModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>PHASE 5 PERSISTENT TELECOM EQUIPMENT INVENTORY &amp; HARDWARE LIFECYCLE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Site Equipment Inventory &amp; Replaced Hardware ({filteredEquipment.length} Units)
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Track RAN, BSC, Microwave, DWDM Optical, DC Rectifier, Battery Bank, and Diesel
            Generator assets scoped to your organization ({activeOrgId}).
          </p>
        </div>

        {canManageEquipment && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Site Equipment</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Serial Number, Vendor, Model, Site Code..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
          />
        </div>
        <select
          aria-label="Filter by Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
        >
          <option value="ALL">All Equipment Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by Operational State"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
        >
          <option value="ALL">All Operational States</option>
          <option value="Operational">Operational</option>
          <option value="Faulty">Faulty</option>
          <option value="Warning">Warning</option>
          <option value="Standby">Standby</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>
      </div>

      {/* Mobile Equipment Cards (< md) */}
      <div className="md:hidden space-y-3">
        {filteredEquipment.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
            No equipment items found matching criteria.
          </div>
        ) : (
          filteredEquipment.map((eq) => (
            <div
              key={eq.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{eq.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {eq.operationalState}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{eq.name}</h4>
                <p className="text-[11px] text-slate-500">{eq.vendor} {eq.model} · {eq.category}</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <span>Site: <strong className="font-mono text-slate-900 dark:text-white">{eq.siteCode}</strong></span>
                <span>S/N: <strong className="font-mono">{eq.serialNumber}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Equipment Table (>= md) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[11px] text-slate-500">
                <th className="py-3 px-4">Equipment ID</th>
                <th className="py-3 px-4">Site Code</th>
                <th className="py-3 px-4">Equipment Name &amp; Category</th>
                <th className="py-3 px-4">Vendor / Model</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Firmware / Sector</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Last Inspected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEquipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {eq.id}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => openSiteById(eq.siteId)}
                      className="font-mono font-semibold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{eq.siteCode}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{eq.name}</div>
                    <div className="text-[11px] text-slate-500">{eq.category}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">{eq.vendor}</div>
                    <div className="font-mono text-[11px] text-slate-500">{eq.model}</div>
                  </td>
                  <td className="py-3 px-4 font-mono">{eq.serialNumber}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {eq.firmwareOrVersion || 'N/A'} · {eq.slotOrSector || 'Main'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        eq.operationalState === 'Operational'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : eq.operationalState === 'Faulty'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {eq.operationalState}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{eq.lastInspectedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-500" />
                <span>Register Telecom Hardware Asset</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Telecom Site</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  {store.sites
                    .filter(
                      (s) =>
                        isSuperAdmin || (s.organizationId || 'ORG-TELECOM-01') === activeOrgId
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteCode} — {s.siteName}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Equipment Name / Identifier</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sector 2 5G NR 3.5GHz Remote Radio Unit"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Operational State</label>
                  <select
                    value={operationalState}
                    onChange={(e) =>
                      setOperationalState(e.target.value as Equipment['operationalState'])
                    }
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Warning">Warning</option>
                    <option value="Faulty">Faulty</option>
                    <option value="Standby">Standby</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Vendor</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-..."
                    className="w-full px-3 py-2 rounded-lg font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Firmware</label>
                  <input
                    type="text"
                    value={firmware}
                    onChange={(e) => setFirmware(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Slot / Sector</label>
                  <input
                    type="text"
                    value={slotOrSector}
                    onChange={(e) => setSlotOrSector(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  Save Equipment Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
