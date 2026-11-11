/**
 * @file ClassListPage.tsx
 * @description Public Student Admission Portal (`/`) displaying real-time seat inventory across all classes.
 *
 * Key features:
 * - Live 3-second silent polling of `/classes` to reflect concurrent seat holds, confirmations, and expirations.
 * - Zero-click instant filtering by search query, class number (exact word-boundary match), shift, and seat condition.
 * - Direct seat reservation (`POST /classes/:classId/holds`) with automatic redirect to `/applications/:holdId`
 *   or conflict notification if the student already holds an active/confirmed application.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmission } from '../context/AdmissionContext';
import { api, ApiException } from '../services/api';
import { SchoolClassDto } from '../types/admission';
import { StudentIdBanner } from '../components/StudentIdBanner';
import { toBengaliNumerals, isValidStudentId } from '../utils/formatters';
import { Search, RotateCcw, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

/**
 * Main student-facing class directory and seat reservation page (`/`).
 */
export const ClassListPage: React.FC = () => {
  const { t, language, bcn, refreshActiveHold, broadcastSync } = useAdmission();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<SchoolClassDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [serverError, setServerError] = useState<boolean>(false);
  const [applyingClassId, setApplyingClassId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{
    code: string;
    message: string;
    existingHoldId?: string | null;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'AVAILABLE' | 'ALMOST_FULL' | 'EMPTY' | 'FULL'>('ALL');

  const fetchClasses = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await api.getClasses();
      setClasses(data);
      setServerError(false);
    } catch {
      setServerError(true);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    // 3s live polling
    const interval = setInterval(() => {
      fetchClasses(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchClasses]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setClassFilter('ALL');
    setShiftFilter('ALL');
    setConditionFilter('ALL');
    setActiveTab('ALL');
  };

  /**
   * Computes the occupancy condition of a class (`FULL`, `EMPTY`, `ALMOST_FULL`, or `AVAILABLE`).
   */
  const getClassCondition = (c: SchoolClassDto) => {
    const occupied = c.confirmedSeats + c.heldSeats;
    if (c.availableSeats === 0 || occupied >= c.totalSeats) return 'FULL';
    if (occupied === 0) return 'EMPTY';
    if (c.availableSeats <= Math.max(2, Math.ceil(c.totalSeats * 0.15))) return 'ALMOST_FULL';
    return 'AVAILABLE';
  };

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const condition = getClassCondition(c);

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesId = c.id.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      // Class dropdown filter
      if (classFilter !== 'ALL') {
        // e.g. "Class 6" (word boundary prevents "Class 1" from matching "Class 10")
        if (!new RegExp(`\\b${classFilter}\\b`, 'i').test(c.name)) return false;
      }

      // Shift dropdown filter
      if (shiftFilter !== 'ALL') {
        const isMorning =
          c.shift?.toLowerCase() === 'morning' ||
          c.name.toLowerCase().includes('morning') ||
          c.name.includes('প্রভাত');
        const isDay =
          c.shift?.toLowerCase() === 'day' ||
          c.name.toLowerCase().includes('day') ||
          c.name.includes('দিবা');
        if (shiftFilter === 'Morning' && !isMorning) return false;
        if (shiftFilter === 'Day' && !isDay) return false;
      }

      // Condition dropdown filter
      if (conditionFilter !== 'ALL') {
        if (conditionFilter === 'AVAILABLE' && condition !== 'AVAILABLE' && condition !== 'EMPTY' && condition !== 'ALMOST_FULL') return false;
        if (conditionFilter === 'ALMOST_FULL' && condition !== 'ALMOST_FULL') return false;
        if (conditionFilter === 'EMPTY' && condition !== 'EMPTY') return false;
        if (conditionFilter === 'FULL' && condition !== 'FULL') return false;
      }

      // Tab pills filter
      if (activeTab === 'AVAILABLE') {
        if (c.availableSeats === 0) return false;
      } else if (activeTab === 'ALMOST_FULL') {
        if (condition !== 'ALMOST_FULL') return false;
      } else if (activeTab === 'EMPTY') {
        if (condition !== 'EMPTY') return false;
      } else if (activeTab === 'FULL') {
        if (condition !== 'FULL') return false;
      }

      return true;
    });
  }, [classes, searchQuery, classFilter, shiftFilter, conditionFilter, activeTab]);

  // Tab counts
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

  /**
   * Reserves a temporary seat in the selected class for the active 17-digit Student BCN.
   */
  const handleApply = async (schoolClass: SchoolClassDto) => {
    if (!bcn || !isValidStudentId(bcn)) {
      setApiError({
        code: 'BCN_REQUIRED',
        message: !bcn ? t.bcnRequiredAlert : t.bcnInvalidAlert,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setApplyingClassId(schoolClass.id);
    setApiError(null);

    try {
      const hold = await api.createHold(schoolClass.id, bcn);
      broadcastSync();
      await refreshActiveHold();
      navigate(`/applications/${hold.holdId}`);
    } catch (err: any) {
      if (err instanceof ApiException && err.errorPayload) {
        let msg = err.errorPayload.message;
        if (err.errorPayload.code === 'EXISTING_HELD_APPLICATION') {
          msg = t.existingHeldApp;
        } else if (err.errorPayload.code === 'EXISTING_CONFIRMED_ADMISSION') {
          msg = t.existingConfirmedApp;
        } else if (err.errorPayload.code === 'CLASS_FULL') {
          msg = t.noSeatsAvailable;
        }
        setApiError({
          code: err.errorPayload.code,
          message: msg,
          existingHoldId: err.errorPayload.existingHoldId,
        });
      } else {
        setApiError({
          code: 'ERROR',
          message: language === 'bn' ? t.networkError : 'Could not complete seat reservation. Please try again.',
        });
      }
    } finally {
      setApplyingClassId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Student BCN Input Bar */}
      <StudentIdBanner />

      {/* Portal Header */}
      <div className="mb-6">
        <h1 className="page-title">{t.portalTitle}</h1>
        <p className="page-subtitle mt-1 text-slate-600 text-sm sm:text-base">
          {language === 'bn' ? (
            <>
              আবেদন নিশ্চিত করার জন্য যেকোনো খালি শ্রেণিতে{' '}
              <strong className="font-bold text-slate-900">১০ মিনিটের</strong> জন্য সাময়িক আসন
              সংরক্ষণ করুন।
            </>
          ) : (
            <>
              Select an open class to reserve a temporary seat for{' '}
              <strong className="font-bold text-slate-900">10 minutes</strong> while you confirm your
              application.
            </>
          )}
        </p>
      </div>

      {/* Friendly Server Down Banner */}
      {serverError && classes.length === 0 ? (
        <div className="mb-8 p-6 sm:p-8 bg-amber-50 border border-amber-200 rounded-sm text-center space-y-3 shadow-none">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
            {t.serverDownTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-700 max-w-xl mx-auto leading-relaxed">
            {t.serverDownDesc}
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setLoading(true);
                fetchClasses();
              }}
              className="btn btn-default btn-md text-sm font-bold inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.retryConnection}</span>
            </button>
          </div>
        </div>
      ) : (
        <>

      {/* Conflict / Error Banner Modal */}
      {apiError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-sm p-4 text-red-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm sm:text-base">
                {language === 'bn' ? 'আবেদন সম্পর্কিত নোটিশ' : 'Application Notice'}
              </h3>
              <p className="text-xs sm:text-sm text-red-700 mt-1">{apiError.message}</p>

              {apiError.existingHoldId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/applications/${apiError.existingHoldId}`)}
                    className="btn btn-default btn-sm text-xs bg-red-600 hover:bg-red-700"
                  >
                    <span>{t.btnViewApplication}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setApiError(null)}
                    className="btn btn-outline btn-sm text-xs border-red-300 text-red-800"
                  >
                    {language === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search & Dynamic Zero-Click Filters Panel */}
      <div className="panel p-4 mb-6 space-y-4">
        {/* Row 1: Search, Class, Shift, Condition, Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search text */}
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

          {/* Class Select */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="input text-xs sm:text-sm"
            >
              <option value="ALL">{t.filterClassAll}</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={`Class ${num}`}>
                  {language === 'bn'
                    ? `শ্রেণি ${toBengaliNumerals(num)}`
                    : `Class ${num}`}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Select */}
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

          {/* Condition / Reset */}
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

        {/* Row 2: Pills / Status Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.filterTabAll} ({language === 'bn' ? toBengaliNumerals(tabCounts.all) : tabCounts.all})
            </button>
            <button
              onClick={() => setActiveTab('AVAILABLE')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                activeTab === 'AVAILABLE'
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
              onClick={() => setActiveTab('ALMOST_FULL')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                activeTab === 'ALMOST_FULL'
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
              onClick={() => setActiveTab('EMPTY')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                activeTab === 'EMPTY'
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.filterTabEmpty} (
              {language === 'bn' ? toBengaliNumerals(tabCounts.empty) : tabCounts.empty})
            </button>
            <button
              onClick={() => setActiveTab('FULL')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors ${
                activeTab === 'FULL'
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.filterTabFull} ({language === 'bn' ? toBengaliNumerals(tabCounts.full) : tabCounts.full})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {t.showingClasses
              .replace('{count}', language === 'bn' ? toBengaliNumerals(filteredClasses.length) : String(filteredClasses.length))
              .replace('{total}', language === 'bn' ? toBengaliNumerals(classes.length) : String(classes.length))}
          </div>
        </div>
      </div>

      {/* Class Table */}
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
                <th className="col-action">{t.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand" />
                    <span>{language === 'bn' ? 'তথ্য লোড হচ্ছে...' : 'Loading classes...'}</span>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-500">
                    {language === 'bn'
                      ? 'কোনো শ্রেণি খুঁজে পাওয়া যায়নি।'
                      : 'No classes found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                filteredClasses.map((c) => {
                  const condition = getClassCondition(c);
                  const isMorning =
                    c.shift?.toLowerCase() === 'morning' ||
                    c.name.toLowerCase().includes('morning') ||
                    c.name.includes('প্রভাত');
                  const isDay =
                    c.shift?.toLowerCase() === 'day' ||
                    c.name.toLowerCase().includes('day') ||
                    c.name.includes('দিবা');
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

                  const isApplyingThis = applyingClassId === c.id;

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
                      <td className="col-action">
                        <button
                          onClick={() => handleApply(c)}
                          disabled={c.availableSeats <= 0 || isApplyingThis}
                          className="btn btn-default btn-sm text-xs"
                        >
                          {isApplyingThis ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>{t.btnApplySeat}</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
