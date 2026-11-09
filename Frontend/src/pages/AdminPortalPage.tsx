import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdmission } from '../context/AdmissionContext';
import { api } from '../services/api';
import { SchoolClassDto, HoldDto, AdminOverview } from '../types/admission';
import { AddClassModal } from '../components/AddClassModal';
import { toBengaliNumerals, maskStudentId } from '../utils/formatters';
import {
  Plus,
  Search,
  RotateCcw,
  RefreshCw,
  Eye,
  EyeOff,
  Users,
  Layers,
} from 'lucide-react';

export const AdminPortalPage: React.FC = () => {
  const { t, language } = useAdmission();

  const [classes, setClasses] = useState<SchoolClassDto[]>([]);
  const [holds, setHolds] = useState<HoldDto[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'CLASSES' | 'APPLICATIONS'>('CLASSES');
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState<boolean>(false);
  const [maskStudentIds, setMaskStudentIds] = useState<boolean>(true);

  // Filters for Classes
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [classTabPill, setClassTabPill] = useState<
    'ALL' | 'AVAILABLE' | 'ALMOST_FULL' | 'EMPTY' | 'FULL'
  >('ALL');

  // Filters for Applications
  const [appStatusFilter, setAppStatusFilter] = useState<string>('ALL');

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [classesData, overviewData, holdsData] = await Promise.all([
        api.getClasses(),
        api.getAdminOverview(),
        api.getAdminHolds(),
      ]);
      setClasses(classesData);
      setOverview(overviewData);
      setHolds(holdsData);
    } catch {
      // ignore transient polling error
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setClassFilter('ALL');
    setShiftFilter('ALL');
    setConditionFilter('ALL');
    setClassTabPill('ALL');
  };

  const getClassCondition = (c: SchoolClassDto) => {
    const occupied = c.confirmedSeats + c.heldSeats;
    if (c.availableSeats === 0 || occupied >= c.totalSeats) return 'FULL';
    if (occupied === 0) return 'EMPTY';
    if (c.availableSeats <= Math.max(2, Math.ceil(c.totalSeats * 0.15))) return 'ALMOST_FULL';
    return 'AVAILABLE';
  };

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const condition = getClassCondition(c);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesId = c.id.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      if (classFilter !== 'ALL') {
        if (!c.name.toLowerCase().includes(classFilter.toLowerCase())) return false;
      }

      if (shiftFilter !== 'ALL') {
        const isMorning = c.name.toLowerCase().includes('morning') || c.name.includes('প্রভাত');
        const isDay = c.name.toLowerCase().includes('day') || c.name.includes('দিবা');
        if (shiftFilter === 'Morning' && !isMorning) return false;
        if (shiftFilter === 'Day' && !isDay) return false;
      }

      if (conditionFilter !== 'ALL') {
        if (conditionFilter === 'AVAILABLE' && condition !== 'AVAILABLE' && condition !== 'EMPTY' && condition !== 'ALMOST_FULL') return false;
        if (conditionFilter === 'ALMOST_FULL' && condition !== 'ALMOST_FULL') return false;
        if (conditionFilter === 'EMPTY' && condition !== 'EMPTY') return false;
        if (conditionFilter === 'FULL' && condition !== 'FULL') return false;
      }

      if (classTabPill === 'AVAILABLE' && c.availableSeats === 0) return false;
      if (classTabPill === 'ALMOST_FULL' && condition !== 'ALMOST_FULL') return false;
      if (classTabPill === 'EMPTY' && condition !== 'EMPTY') return false;
      if (classTabPill === 'FULL' && condition !== 'FULL') return false;

      return true;
    });
  }, [classes, searchQuery, classFilter, shiftFilter, conditionFilter, classTabPill]);

  const tabCounts = useMemo(() => {
    let available = 0;
    let almostFull = 0;
    let empty = 0;
    let full = 0;
    classes.forEach((c) => {
      const cond = getClassCondition(c);
      if (c.availableSeats > 0) available++;
      if (cond === 'ALMOST_FULL') almostFull++;
      if (cond === 'EMPTY') empty++;
      if (cond === 'FULL') full++;
    });
    return { all: classes.length, available, almostFull, empty, full };
  }, [classes]);

  const filteredHolds = useMemo(() => {
    if (appStatusFilter === 'ALL') return holds;
    return holds.filter((h) => h.status === appStatusFilter);
  }, [holds, appStatusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Admin Title & Add Class Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">{t.adminTitle}</h1>
          <p className="page-subtitle mt-0.5 text-xs sm:text-sm text-slate-500">
            {t.adminSubtitle}
          </p>
        </div>

        <button
          onClick={() => setIsAddClassModalOpen(true)}
          className="btn btn-default text-xs font-semibold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.btnAddClass}</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="panel p-4">
          <div className="eyebrow">{t.statClasses}</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {overview
              ? language === 'bn'
                ? toBengaliNumerals(overview.totalClasses)
                : overview.totalClasses
              : '-'}
          </div>
        </div>

        <div className="panel p-4">
          <div className="eyebrow">{t.statTotalSeats}</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {overview
              ? language === 'bn'
                ? toBengaliNumerals(overview.totalSeats)
                : overview.totalSeats
              : '-'}
          </div>
        </div>

        <div className="panel p-4">
          <div className="eyebrow">{t.statConfirmed}</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {overview
              ? language === 'bn'
                ? toBengaliNumerals(overview.confirmedSeats)
                : overview.confirmedSeats
              : '-'}
          </div>
        </div>

        <div className="panel p-4">
          <div className="eyebrow">{t.statHeld}</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {overview
              ? language === 'bn'
                ? toBengaliNumerals(overview.heldSeats)
                : overview.heldSeats
              : '-'}
          </div>
        </div>

        <div className="panel p-4 col-span-2 sm:col-span-1">
          <div className="eyebrow">{t.statAvailable}</div>
          <div className="text-2xl font-bold font-mono text-brand mt-1">
            {overview
              ? language === 'bn'
                ? toBengaliNumerals(overview.availableSeats)
                : overview.availableSeats
              : '-'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('CLASSES')}
          className={`tab pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'CLASSES'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>
            {t.tabClassesCapacity} (
            {language === 'bn' ? toBengaliNumerals(classes.length) : classes.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('APPLICATIONS')}
          className={`tab pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'APPLICATIONS'
              ? 'border-brand text-brand font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>
            {t.tabApplications} (
            {language === 'bn' ? toBengaliNumerals(holds.length) : holds.length})
          </span>
        </button>
      </div>

      {/* TAB 1: Classes & Capacity */}
      {activeTab === 'CLASSES' && (
        <div className="space-y-4">
          {/* Filters Panel */}
          <div className="panel p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.filterSearchPlaceholder}
                  className="input pl-8 text-xs sm:text-sm"
                />
              </div>

              <div>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="input text-xs sm:text-sm"
                >
                  <option value="ALL">{t.filterClassAll}</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={`Class ${n}`}>
                      {language === 'bn'
                        ? `শ্রেণি ${toBengaliNumerals(n)}`
                        : `Class ${n}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="input text-xs sm:text-sm"
                >
                  <option value="ALL">{t.filterShiftAll}</option>
                  <option value="Morning">{t.shiftMorning}</option>
                  <option value="Day">{t.shiftDay}</option>
                </select>
              </div>

              <div className="flex gap-2">
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="input text-xs sm:text-sm flex-1"
                >
                  <option value="ALL">{t.filterConditionAll}</option>
                  <option value="AVAILABLE">{t.statusOpen}</option>
                  <option value="ALMOST_FULL">{t.statusAlmostFull}</option>
                  <option value="EMPTY">{t.statusEmpty}</option>
                  <option value="FULL">{t.statusFull}</option>
                </select>

                <button
                  onClick={handleResetFilters}
                  className="btn btn-outline btn-sm text-xs px-2.5"
                  title={t.filterReset}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setClassTabPill('ALL')}
                  className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                    classTabPill === 'ALL'
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.filterTabAll} ({language === 'bn' ? toBengaliNumerals(tabCounts.all) : tabCounts.all})
                </button>
                <button
                  onClick={() => setClassTabPill('AVAILABLE')}
                  className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                    classTabPill === 'AVAILABLE'
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.filterTabAvailable} (
                  {language === 'bn'
                    ? toBengaliNumerals(tabCounts.available)
                    : tabCounts.available}
                  )
                </button>
                <button
                  onClick={() => setClassTabPill('ALMOST_FULL')}
                  className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                    classTabPill === 'ALMOST_FULL'
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.filterTabAlmostFull} (
                  {language === 'bn'
                    ? toBengaliNumerals(tabCounts.almostFull)
                    : tabCounts.almostFull}
                  )
                </button>
                <button
                  onClick={() => setClassTabPill('EMPTY')}
                  className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                    classTabPill === 'EMPTY'
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.filterTabEmpty} (
                  {language === 'bn'
                    ? toBengaliNumerals(tabCounts.empty)
                    : tabCounts.empty}
                  )
                </button>
                <button
                  onClick={() => setClassTabPill('FULL')}
                  className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                    classTabPill === 'FULL'
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.filterTabFull} (
                  {language === 'bn' ? toBengaliNumerals(tabCounts.full) : tabCounts.full})
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {t.showingClasses
                  .replace('{count}', language === 'bn' ? toBengaliNumerals(filteredClasses.length) : String(filteredClasses.length))
                  .replace('{total}', language === 'bn' ? toBengaliNumerals(classes.length) : String(classes.length))}
              </div>
            </div>
          </div>

          {/* Classes Table */}
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t.colCode}</th>
                    <th>{t.colClassName}</th>
                    <th>{t.colShift}</th>
                    <th className="col-num">{t.colTotalSeats}</th>
                    <th className="col-num">{t.colConfirmed}</th>
                    <th className="col-num">{t.colHeld}</th>
                    <th className="col-num">{t.colAvailable}</th>
                    <th className="w-32">{t.colOccupancy}</th>
                    <th>{t.colCondition}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand" />
                        <span>{language === 'bn' ? 'তথ্য লোড হচ্ছে...' : 'Loading classes...'}</span>
                      </td>
                    </tr>
                  ) : filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-500">
                        {language === 'bn'
                          ? 'কোনো শ্রেণি খুঁজে পাওয়া যায়নি।'
                          : 'No classes found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((c) => {
                      const condition = getClassCondition(c);
                      const isMorning =
                        c.name.toLowerCase().includes('morning') || c.name.includes('প্রভাত');
                      const isDay =
                        c.name.toLowerCase().includes('day') || c.name.includes('দিবা');
                      const shiftDisplay = isMorning
                        ? t.shiftMorning
                        : isDay
                        ? t.shiftDay
                        : '-';

                      const occupied = c.confirmedSeats + c.heldSeats;
                      const pct = Math.min(100, Math.round((occupied / (c.totalSeats || 1)) * 100));

                      let badgeClass = 'status-open';
                      let badgeText = t.statusOpen;
                      if (condition === 'ALMOST_FULL') {
                        badgeClass = 'status-almost-full';
                        badgeText = t.statusAlmostFull;
                      } else if (condition === 'EMPTY') {
                        badgeClass = 'status-empty';
                        badgeText = t.statusEmpty;
                      } else if (condition === 'FULL') {
                        badgeClass = 'status-full';
                        badgeText = t.statusFull;
                      }

                      return (
                        <tr key={c.id}>
                          <td>
                            <span className="id-chip uppercase">{c.id}</span>
                          </td>
                          <td className="font-bold text-slate-900">{c.name}</td>
                          <td>{shiftDisplay}</td>
                          <td className="col-num font-mono font-semibold">
                            {language === 'bn' ? toBengaliNumerals(c.totalSeats) : c.totalSeats}
                          </td>
                          <td className="col-num font-mono text-emerald-600 font-semibold">
                            {language === 'bn'
                              ? toBengaliNumerals(c.confirmedSeats)
                              : c.confirmedSeats}
                          </td>
                          <td className="col-num font-mono text-amber-600 font-semibold">
                            {language === 'bn' ? toBengaliNumerals(c.heldSeats) : c.heldSeats}
                          </td>
                          <td className="col-num font-mono text-brand font-bold text-sm">
                            {language === 'bn'
                              ? toBengaliNumerals(c.availableSeats)
                              : c.availableSeats}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    pct >= 100
                                      ? 'bg-slate-500'
                                      : pct >= 80
                                      ? 'bg-amber-500'
                                      : 'bg-brand'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono text-slate-500 w-8 text-right">
                                {language === 'bn' ? toBengaliNumerals(pct) : pct}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${badgeClass}`}>{badgeText}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Applications */}
      {activeTab === 'APPLICATIONS' && (
        <div className="space-y-4">
          <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'অবস্থা ফিল্টার:' : 'Filter Status:'}
              </label>
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="input text-xs h-8 w-auto"
              >
                <option value="ALL">{language === 'bn' ? 'সকল' : 'All'}</option>
                <option value="HELD">{t.statusHeld}</option>
                <option value="CONFIRMED">{t.statusConfirmed}</option>
                <option value="EXPIRED">{t.statusExpired}</option>
                <option value="CANCELLED">{t.statusCancelled}</option>
              </select>
            </div>

            <button
              onClick={() => setMaskStudentIds(!maskStudentIds)}
              className="btn btn-outline btn-sm text-xs flex items-center gap-1.5"
            >
              {maskStudentIds ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-brand" />}
              <span>
                {maskStudentIds
                  ? language === 'bn'
                    ? 'শিক্ষার্থীর পূর্ণ নম্বর দেখুন'
                    : 'Show Full Student ID'
                  : language === 'bn'
                  ? 'নম্বর লুকান'
                  : 'Mask Student ID'}
              </span>
            </button>
          </div>

          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>{language === 'bn' ? 'আবেদন আইডি' : 'HOLD ID'}</th>
                    <th>{t.colClassName}</th>
                    <th>{language === 'bn' ? 'শিক্ষার্থীর নম্বর' : 'STUDENT BCN'}</th>
                    <th>{t.colCondition}</th>
                    <th>{language === 'bn' ? 'আবেদনের তারিখ' : 'CREATED AT'}</th>
                    <th>{language === 'bn' ? 'মেয়াদ / নিশ্চিতকরণ' : 'EXPIRES / CONFIRMED'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand" />
                        <span>{language === 'bn' ? 'তথ্য লোড হচ্ছে...' : 'Loading applications...'}</span>
                      </td>
                    </tr>
                  ) : filteredHolds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        {language === 'bn'
                          ? 'কোনো আবেদন পাওয়া যায়নি।'
                          : 'No applications found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHolds.map((h) => {
                      let badgeClass = 'status-held';
                      let badgeText = t.statusHeld;
                      if (h.status === 'CONFIRMED') {
                        badgeClass = 'status-confirmed';
                        badgeText = t.statusConfirmed;
                      } else if (h.status === 'EXPIRED') {
                        badgeClass = 'status-expired';
                        badgeText = t.statusExpired;
                      } else if (h.status === 'CANCELLED') {
                        badgeClass = 'status-cancelled';
                        badgeText = t.statusCancelled;
                      }

                      return (
                        <tr key={h.holdId}>
                          <td>
                            <span className="id-chip uppercase">{h.holdId}</span>
                          </td>
                          <td className="font-bold text-slate-900">{h.className}</td>
                          <td className="font-mono text-xs text-slate-700">
                            {maskStudentIds
                              ? maskStudentId(h.studentId)
                              : language === 'bn'
                              ? toBengaliNumerals(h.studentId)
                              : h.studentId}
                          </td>
                          <td>
                            <span className={`status-badge ${badgeClass}`}>{badgeText}</span>
                          </td>
                          <td className="font-mono text-xs text-slate-500">
                            {new Date(h.createdAt).toLocaleString()}
                          </td>
                          <td className="font-mono text-xs text-slate-500">
                            {h.confirmedAt
                              ? new Date(h.confirmedAt).toLocaleString()
                              : h.cancelledAt
                              ? new Date(h.cancelledAt).toLocaleString()
                              : new Date(h.expiresAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      <AddClassModal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
};
