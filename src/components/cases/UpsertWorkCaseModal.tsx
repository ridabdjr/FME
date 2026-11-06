import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  Clock,
  Layers,
  MapPin,
  Plus,
  Radio,
  Tag,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_WORK_TYPE_TAXONOMY } from '../../data/seedWorkCasesData';
import {
  CasePriority,
  CaseStatus,
  SiteType,
  WorkCase,
} from '../../types/models';

interface UpsertWorkCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCase: WorkCase | null;
  prefill?: {
    siteId?: string;
    relatedCaseId?: string;
  } | null;
}

export const UpsertWorkCaseModal: React.FC<UpsertWorkCaseModalProps> = ({
  isOpen,
  onClose,
  editingCase,
  prefill,
}) => {
  const {
    store,
    currentUser,
    createWorkCase,
    updateWorkCase,
    upsertSite,
    addCustomWorkTypeCategory,
    addCustomWorkType,
    showToast,
  } = useApp();

  const isEditing = Boolean(editingCase);
  const activeTaxonomy = store.workTypeTaxonomy || DEFAULT_WORK_TYPE_TAXONOMY;

  // Custom taxonomy creation state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatNameInput, setNewCatNameInput] = useState('');
  const [showAddWorkType, setShowAddWorkType] = useState(false);
  const [newWorkTypeNameInput, setNewWorkTypeNameInput] = useState('');

  // Form State
  const [title, setTitle] = useState(editingCase?.title || '');
  const [summary, setSummary] = useState(editingCase?.summary || '');
  const [description, setDescription] = useState(editingCase?.description || '');
  const [category, setCategory] = useState(
    editingCase?.category || activeTaxonomy[0]?.name || DEFAULT_WORK_TYPE_TAXONOMY[0].name
  );
  const [workType, setWorkType] = useState(
    editingCase?.workType || activeTaxonomy[0]?.types[0]?.name || DEFAULT_WORK_TYPE_TAXONOMY[0].types[0].name
  );
  const [priority, setPriority] = useState<CasePriority>(editingCase?.priority || 'Normal');
  const [status, setStatus] = useState<CaseStatus>(editingCase?.status || 'Draft');
  const [tagsInput, setTagsInput] = useState((editingCase?.tags || []).join(', '));
  const [responsibleEngineer, setResponsibleEngineer] = useState(
    editingCase?.responsibleEngineer || currentUser?.fullName || 'S. Lindqvist'
  );
  const [customerOrProject, setCustomerOrProject] = useState(
    editingCase?.customerOrProject || ''
  );
  const [reasonForWork, setReasonForWork] = useState(
    editingCase?.reasonForWork || ''
  );
  const [reportedProblem, setReportedProblem] = useState(
    editingCase?.reportedProblem || ''
  );
  const [initialObservations, setInitialObservations] = useState(
    editingCase?.initialObservations || ''
  );
  const [toolsInput, setToolsInput] = useState(
    (editingCase?.toolsUsed || []).join(', ')
  );
  const [plannedDate, setPlannedDate] = useState(
    editingCase?.timestamps.plannedDate
      ? editingCase.timestamps.plannedDate.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [estimatedDurationHours, setEstimatedDurationHours] = useState<number>(
    editingCase?.timestamps.estimatedDurationHours || 2.0
  );

  // Site selection vs In-Line Site Creation
  const [selectedSiteId, setSelectedSiteId] = useState(
    editingCase?.siteId || prefill?.siteId || store.sites[0]?.id || ''
  );
  const [isCreatingNewSite, setIsCreatingNewSite] = useState(false);
  const [newSiteCode, setNewSiteCode] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteType, setNewSiteType] = useState<SiteType>('Greenfield Tower');
  const [newSiteRegion, setNewSiteRegion] = useState('North Metro');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteLat, setNewSiteLat] = useState('34.0522');
  const [newSiteLng, setNewSiteLng] = useState('-118.2437');
  const [newSiteAccess, setNewSiteAccess] = useState('');

  if (!isOpen) return null;

  // Selected Category details & available work types
  const currentCategoryObj =
    activeTaxonomy.find((c) => c.name === category) ||
    activeTaxonomy[0] ||
    DEFAULT_WORK_TYPE_TAXONOMY[0];
  const availableWorkTypes = currentCategoryObj?.types || [];

  const handleCategoryChange = (newCatName: string) => {
    setCategory(newCatName);
    const cat = activeTaxonomy.find((c) => c.name === newCatName);
    if (cat && cat.types.length > 0) {
      setWorkType(cat.types[0].name);
      if (cat.types[0].suggestedTools) {
        setToolsInput(cat.types[0].suggestedTools.join(', '));
      }
    }
  };

  const handleWorkTypeChange = (newTypeName: string) => {
    setWorkType(newTypeName);
    const wt = availableWorkTypes.find((t) => t.name === newTypeName);
    if (wt?.suggestedTools && (!toolsInput || toolsInput.trim().length === 0)) {
      setToolsInput(wt.suggestedTools.join(', '));
    }
  };

  const handleCreateCustomCategory = () => {
    if (!newCatNameInput.trim()) return;
    const res = addCustomWorkTypeCategory({ name: newCatNameInput.trim() });
    if (res.ok) {
      setCategory(newCatNameInput.trim());
      setNewCatNameInput('');
      setShowAddCategory(false);
    }
  };

  const handleCreateCustomWorkType = () => {
    if (!newWorkTypeNameInput.trim()) return;
    const res = addCustomWorkType(category, { name: newWorkTypeNameInput.trim() });
    if (res.ok) {
      setWorkType(newWorkTypeNameInput.trim());
      setNewWorkTypeNameInput('');
      setShowAddWorkType(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please provide a title for the work case.', 'error');
      return;
    }

    let finalSiteId = selectedSiteId;

    // In-Line Site Creation
    if (isCreatingNewSite) {
      if (!newSiteCode.trim() || !newSiteName.trim() || !newSiteAddress.trim()) {
        showToast('Site code, name, and address are required for new sites.', 'error');
        return;
      }
      const lat = parseFloat(newSiteLat);
      const lng = parseFloat(newSiteLng);
      if (isNaN(lat) || isNaN(lng)) {
        showToast('Valid latitude and longitude are required.', 'error');
        return;
      }

      const generatedSiteId = `SITE-${Date.now().toString().slice(-4)}`;
      const res = upsertSite({
        siteIdInput: generatedSiteId,
        siteCode: newSiteCode.trim().toUpperCase(),
        siteName: newSiteName.trim(),
        siteType: newSiteType,
        operator: 'Metro Telecom Operator',
        region: newSiteRegion,
        district: newSiteRegion,
        address: newSiteAddress.trim(),
        latitude: lat,
        longitude: lng,
        technologies: ['4G LTE', '5G NR'],
        operationalStatus: 'Online',
        assignedTeamId: 'team-ran-01',
        lastMaintenanceDate: new Date().toISOString().slice(0, 10),
        powerConfiguration: 'AC Mains + -48V DC Battery Bank',
        accessInstructions: newSiteAccess.trim(),
      });

      if (!res.ok) {
        showToast(res.error || 'Failed to register site.', 'error');
        return;
      }
      finalSiteId = res.site?.id || generatedSiteId;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const toolsUsed = toolsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing && editingCase) {
      updateWorkCase(editingCase.id, {
        title: title.trim(),
        summary: summary.trim() || title.trim(),
        description: description.trim(),
        category,
        workType,
        priority,
        status,
        tags,
        responsibleEngineer,
        customerOrProject,
        reasonForWork: reasonForWork.trim() || 'Work activity recorded by field engineer.',
        reportedProblem,
        initialObservations,
        toolsUsed,
        siteId: finalSiteId,
        timestamps: {
          ...editingCase.timestamps,
          plannedDate: new Date(plannedDate).toISOString(),
          estimatedDurationHours: Number(estimatedDurationHours) || 2.0,
        },
      });
    } else {
      createWorkCase({
        title: title.trim(),
        summary: summary.trim() || title.trim(),
        description: description.trim(),
        category,
        workType,
        priority,
        status,
        tags,
        responsibleEngineer,
        customerOrProject,
        reasonForWork: reasonForWork.trim() || 'Work activity recorded by field engineer.',
        reportedProblem,
        initialObservations,
        toolsUsed,
        siteId: finalSiteId,
        relatedCaseId: prefill?.relatedCaseId,
        timestamps: {
          plannedDate: new Date(plannedDate).toISOString(),
          estimatedDurationHours: Number(estimatedDurationHours) || 2.0,
        },
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? `Edit Work Case — ${editingCase?.caseNumber}` : 'Record New Telecom Work Case'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organize field inspections, maintenance tasks, measurements, and technical documentation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Section 1: Case Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              1. Case Identification & Classification
            </h3>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Case Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 4G/5G Sector 2 Antenna Downtilt Adjustment & VSWR Verification"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Engineering Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    {showAddCategory ? 'Cancel' : '+ Custom Category'}
                  </button>
                </div>
                {showAddCategory ? (
                  <div className="flex items-center gap-1.5 mb-2">
                    <input
                      type="text"
                      placeholder="Category name..."
                      value={newCatNameInput}
                      onChange={(e) => setNewCatNameInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-sky-400 dark:border-sky-600 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCustomCategory}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {activeTaxonomy.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Work Type <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddWorkType(!showAddWorkType)}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    {showAddWorkType ? 'Cancel' : '+ Custom Work Type'}
                  </button>
                </div>
                {showAddWorkType ? (
                  <div className="flex items-center gap-1.5 mb-2">
                    <input
                      type="text"
                      placeholder="Work type name..."
                      value={newWorkTypeNameInput}
                      onChange={(e) => setNewWorkTypeNameInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-sky-400 dark:border-sky-600 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCustomWorkType}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={workType}
                    onChange={(e) => handleWorkTypeChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {availableWorkTypes.map((wt) => (
                      <option key={wt.id} value={wt.name}>
                        {wt.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CasePriority)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CaseStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Draft">Draft</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Verified">Verified</option>
                  <option value="Closed">Closed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Responsible Engineer
                </label>
                <input
                  type="text"
                  value={responsibleEngineer}
                  onChange={(e) => setResponsibleEngineer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tags &amp; Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. VSWR, Antenna Tilt, 5G-NR, OTDR"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer, Project or Operator
                </label>
                <input
                  type="text"
                  value={customerOrProject}
                  onChange={(e) => setCustomerOrProject(e.target.value)}
                  placeholder="e.g. MetroRAN Modernization 2026 / Verizon Wireless"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Site & Location Linkage */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                2. Site &amp; Location Linkage
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingNewSite(!isCreatingNewSite)}
                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isCreatingNewSite ? 'Select Existing Site Instead' : '+ Create New Site for this Case'}
              </button>
            </div>

            {!isCreatingNewSite ? (
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Site From Directory <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {store.sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.siteCode} — {site.siteName} ({site.siteType}, {site.region})
                    </option>
                  ))}
                </select>
                {store.sites.find((s) => s.id === selectedSiteId) && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {store.sites.find((s) => s.id === selectedSiteId)?.address} (
                      {store.sites.find((s) => s.id === selectedSiteId)?.latitude.toFixed(4)}°,{' '}
                      {store.sites.find((s) => s.id === selectedSiteId)?.longitude.toFixed(4)}°)
                    </span>
                  </p>
                )}
              </div>
            ) : (
              /* In-Line New Site Subform */
              <div className="p-4 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-3">
                <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                  New Site Details (Saved to permanent Site Directory):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Site Code (e.g. WST-005)
                    </label>
                    <input
                      type="text"
                      required={isCreatingNewSite}
                      value={newSiteCode}
                      onChange={(e) => setNewSiteCode(e.target.value)}
                      placeholder="e.g. WST-005"
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Site Name
                    </label>
                    <input
                      type="text"
                      required={isCreatingNewSite}
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      placeholder="e.g. West Airport Terminal Macro"
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Site Type
                    </label>
                    <select
                      value={newSiteType}
                      onChange={(e) => setNewSiteType(e.target.value as SiteType)}
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="Greenfield Tower">Greenfield Tower</option>
                      <option value="Rooftop">Rooftop</option>
                      <option value="Indoor IBS/DAS">Indoor IBS/DAS</option>
                      <option value="Core/BSC Hub">Core/BSC Hub</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Region
                    </label>
                    <input
                      type="text"
                      value={newSiteRegion}
                      onChange={(e) => setNewSiteRegion(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Address &amp; Street
                  </label>
                  <input
                    type="text"
                    required={isCreatingNewSite}
                    value={newSiteAddress}
                    onChange={(e) => setNewSiteAddress(e.target.value)}
                    placeholder="e.g. 500 Aviation Blvd, Terminal 2 Rooftop, Metropolis"
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Latitude (°N)
                    </label>
                    <input
                      type="text"
                      value={newSiteLat}
                      onChange={(e) => setNewSiteLat(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Longitude (°W)
                    </label>
                    <input
                      type="text"
                      value={newSiteLng}
                      onChange={(e) => setNewSiteLng(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Access Instructions / Gate Code
                  </label>
                  <input
                    type="text"
                    value={newSiteAccess}
                    onChange={(e) => setNewSiteAccess(e.target.value)}
                    placeholder="e.g. Lockbox #5521, call facility manager at 555-0199"
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Work Details */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              3. Work Description &amp; Technical Scope
            </h3>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for Visit or Work <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={reasonForWork}
                onChange={(e) => setReasonForWork(e.target.value)}
                placeholder="State the objective or trigger for this work (e.g. RSSI degradation, annual audit, customer trouble ticket)..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reported Problem or Task Requested
                </label>
                <textarea
                  rows={2}
                  value={reportedProblem}
                  onChange={(e) => setReportedProblem(e.target.value)}
                  placeholder="Specific symptoms reported prior to site arrival..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Initial Physical / RF Observations
                </label>
                <textarea
                  rows={2}
                  value={initialObservations}
                  onChange={(e) => setInitialObservations(e.target.value)}
                  placeholder="Condition of equipment upon arrival on site..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tools &amp; Test Equipment Used (comma-separated)
              </label>
              <input
                type="text"
                value={toolsInput}
                onChange={(e) => setToolsInput(e.target.value)}
                placeholder="e.g. Anritsu Site Master S331L, Fluke 87V, EXFO FTB-1 OTDR, Torque Wrench"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Section 4: Timestamps & Scheduling */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              4. Timeline &amp; Time Tracking
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Planned Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Duration (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={estimatedDurationHours}
                  onChange={(e) => setEstimatedDurationHours(parseFloat(e.target.value) || 2.0)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isEditing ? 'Save Changes' : 'Create Work Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
