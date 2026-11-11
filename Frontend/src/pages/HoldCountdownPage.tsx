/**
 * @file HoldCountdownPage.tsx
 * @description Application detail and live seat reservation countdown page (`/applications/:holdId`).
 *
 * Key responsibilities:
 * - Reconstructs the live `MM:SS` countdown from the backend's authoritative `expiresAt` UTC timestamp,
 *   ensuring browser refreshes never reset or corrupt the timer.
 * - Allows the student to permanently confirm the reservation (`POST /holds/:holdId/confirm`) or
 *   explicitly cancel it (`DELETE /holds/:holdId`) before expiration.
 * - Displays contextual status headers and timestamps for `HELD`, `CONFIRMED`, `EXPIRED`, and `CANCELLED` states.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdmission } from '../context/AdmissionContext';
import { api, ApiException } from '../services/api';
import { HoldDto } from '../types/admission';
import {
  formatRemainingTime,
  maskStudentId,
  toBengaliNumerals,
} from '../utils/formatters';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  User,
  School,
  Calendar,
} from 'lucide-react';

/**
 * Live countdown and application management view for a specific seat hold (`/applications/:holdId`).
 */
export const HoldCountdownPage: React.FC = () => {
  const { holdId } = useParams<{ holdId: string }>();
  const { t, language, bcn, isBcnMasked, refreshActiveHold, broadcastSync } = useAdmission();

  const [hold, setHold] = useState<HoldDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isServerError, setIsServerError] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Time state
  const [timerState, setTimerState] = useState<{
    remainingSeconds: number;
    formatted: string;
    isExpired: boolean;
  }>({ remainingSeconds: 0, formatted: '00:00', isExpired: false });

  const fetchHold = useCallback(async () => {
    if (!holdId) return;
    try {
      setIsServerError(false);
      const data = await api.getHold(holdId, bcn);
      setHold(data);
      if (data.status === 'HELD') {
        const timeInfo = formatRemainingTime(data.expiresAt);
        setTimerState(timeInfo);
      }
    } catch (err: any) {
      if (err instanceof ApiException) {
        if (err.statusCode >= 500 || err.statusCode === 0) {
          setIsServerError(true);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setIsServerError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [holdId, bcn]);

  useEffect(() => {
    fetchHold();
  }, [fetchHold]);

  // Timer interval
  useEffect(() => {
    if (!hold || hold.status !== 'HELD') return;

    const interval = setInterval(() => {
      const info = formatRemainingTime(hold.expiresAt);
      setTimerState(info);
      if (info.isExpired) {
        setHold((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
        refreshActiveHold();
        broadcastSync();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hold, refreshActiveHold, broadcastSync]);

  /**
   * Confirms the active seat hold (`POST /holds/:holdId/confirm`).
   */
  const handleConfirm = async () => {
    const studentIdToUse = bcn || hold?.studentId;
    if (!hold || !studentIdToUse) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.confirmHold(hold.holdId, studentIdToUse);
      setHold((prev) =>
        prev
          ? {
              ...prev,
              status: 'CONFIRMED',
              confirmedAt: res.confirmedAt || new Date().toISOString(),
            }
          : null
      );
      broadcastSync();
      await refreshActiveHold();
    } catch (err: any) {
      if (err instanceof ApiException) {
        if (err.errorPayload?.code === 'HOLD_EXPIRED') {
          setHold((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
          setErrorMsg(t.holdExpiredAlert);
        } else if (err.errorPayload?.code === 'WRONG_STUDENT' || err.statusCode === 403) {
          setErrorMsg(
            language === 'bn'
              ? 'এই আবেদনটি অন্য একজন শিক্ষার্থীর জন্ম নিবন্ধন নম্বরের মাধ্যমে সংরক্ষিত হয়েছে।'
              : 'This application belongs to a different student birth certificate number.'
          );
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(
          language === 'bn'
            ? 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
            : 'Could not connect to the server. Please try again.'
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Cancels the active seat hold (`DELETE /holds/:holdId`) and immediately releases the seat.
   */
  const handleCancel = async () => {
    const studentIdToUse = bcn || hold?.studentId;
    if (!hold || !studentIdToUse) return;

    setActionLoading(true);
    setErrorMsg(null);

    try {
      await api.cancelHold(hold.holdId, studentIdToUse);
      setHold((prev) =>
        prev
          ? {
              ...prev,
              status: 'CANCELLED',
              cancelledAt: new Date().toISOString(),
            }
          : null
      );
      broadcastSync();
      await refreshActiveHold();
    } catch (err: any) {
      if (err instanceof ApiException) {
        if (err.errorPayload?.code === 'HOLD_EXPIRED') {
          setHold((prev) => (prev ? { ...prev, status: 'EXPIRED' } : null));
          setErrorMsg(t.holdExpiredAlert);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(
          language === 'bn'
            ? 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।'
            : 'Could not connect to the server.'
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-brand" />
        <p>{language === 'bn' ? 'আবেদনের তথ্য লোড হচ্ছে...' : 'Loading application...'}</p>
      </div>
    );
  }

  if (isServerError && !hold) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {t.serverDownTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-700 max-w-lg mx-auto leading-relaxed">
            {t.serverDownDesc}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                fetchHold();
              }}
              className="btn btn-default btn-md text-sm font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.retryConnection}</span>
            </button>
            <Link to="/" className="btn btn-outline btn-md text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>{t.btnBackHome}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg && !hold) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="panel p-6 border-red-200 bg-red-50 text-red-900 rounded-sm">
          <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
          <h2 className="text-lg font-bold">
            {language === 'bn' ? 'আবেদন খুঁজে পাওয়া যায়নি' : 'Application Not Found'}
          </h2>
          <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
          <div className="mt-4">
            <Link to="/" className="btn btn-default btn-sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.btnBackHome}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hold) return null;

  const isHeld = hold.status === 'HELD' && !timerState.isExpired;
  const isConfirmed = hold.status === 'CONFIRMED';
  const isExpired = hold.status === 'EXPIRED' || (hold.status === 'HELD' && timerState.isExpired);
  const isCancelled = hold.status === 'CANCELLED';

  const timerColor =
    timerState.remainingSeconds <= 120 ? 'text-red-600' : 'text-brand';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.btnBackHome}</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="panel p-6 sm:p-8 space-y-6">
        {/* Status Header */}
        {isHeld && (
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-brand flex items-center justify-center mx-auto mb-3 border border-blue-200">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t.reservationActiveTitle}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t.reservationDesc}</p>

            {/* Large Countdown Clock */}
            <div className="mt-6 inline-flex flex-col items-center bg-slate-50 border border-slate-200 rounded-sm px-8 py-4">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 mb-1">
                {t.timeRemaining}
              </span>
              <span
                className={`font-mono text-4xl sm:text-5xl font-extrabold tabular-nums tracking-wider ${timerColor}`}
              >
                {language === 'bn'
                  ? toBengaliNumerals(timerState.formatted)
                  : timerState.formatted}
              </span>
            </div>
          </div>
        )}

        {isConfirmed && (
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t.confirmSuccessTitle}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t.confirmSuccessDesc}</p>
            <div className="mt-3">
              <span className="status-badge status-confirmed text-xs px-3 py-1">
                {t.statusConfirmed}
              </span>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t.holdExpiredTitle}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t.holdExpiredDesc}</p>
            <div className="mt-3">
              <span className="status-badge status-expired text-xs px-3 py-1">
                {t.statusExpired}
              </span>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <XCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t.holdCancelledTitle}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t.holdCancelledDesc}</p>
            <div className="mt-3">
              <span className="status-badge status-cancelled text-xs px-3 py-1">
                {t.statusCancelled}
              </span>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-3.5 bg-slate-50 rounded-sm border border-slate-100 flex items-start gap-3">
            <School className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500 font-semibold">{t.holdClass}</div>
              <div className="font-bold text-slate-900 mt-0.5">{hold.className}</div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-sm border border-slate-100 flex items-start gap-3">
            <User className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500 font-semibold">{t.holdStudentId}</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {isBcnMasked
                  ? maskStudentId(hold.studentId)
                  : language === 'bn'
                  ? toBengaliNumerals(hold.studentId)
                  : hold.studentId}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-sm border border-slate-100 flex items-start gap-3">
            <Calendar className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500 font-semibold">{t.holdCreated}</div>
              <div className="font-mono text-slate-700 mt-0.5">
                {new Date(hold.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-sm border border-slate-100 flex items-start gap-3">
            <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500 font-semibold">
                {isConfirmed
                  ? language === 'bn'
                    ? 'নিশ্চিতকরণের সময়:'
                    : 'Confirmed at:'
                  : isCancelled
                  ? language === 'bn'
                    ? 'বাতিলের সময়:'
                    : 'Cancelled at:'
                  : t.holdExpiresAt}
              </div>
              <div className="font-mono text-slate-700 mt-0.5">
                {isConfirmed
                  ? new Date(hold.confirmedAt || hold.createdAt).toLocaleTimeString()
                  : isCancelled
                  ? new Date(hold.cancelledAt || hold.createdAt).toLocaleTimeString()
                  : new Date(hold.expiresAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100">
          {isHeld && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="btn btn-outline btn-sm text-xs text-red-700 border-red-200 hover:bg-red-50"
              >
                {t.btnCancelReservation}
              </button>

              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="btn btn-default btn-lg text-sm font-bold px-6 shadow-sm flex items-center gap-2"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.btnConfirmSeat}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {isExpired && (
            <div className="w-full space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-sm">
                <button
                  disabled
                  className="btn btn-outline btn-sm text-xs text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                >
                  {t.btnCancelReservation}
                </button>

                <button
                  disabled
                  aria-disabled="true"
                  title={
                    language === 'bn'
                      ? 'মেয়াদ শেষ হওয়ায় ভর্তি ফি দেওয়া যাবে না'
                      : 'Payment disabled because hold expired'
                  }
                  className="btn btn-default btn-lg text-sm font-bold px-6 bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60 shadow-none flex items-center gap-2 select-none"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  <span>{t.btnConfirmSeat}</span>
                </button>
              </div>

              <div className="p-3.5 bg-red-50 border border-red-200 rounded-sm text-center">
                <p className="text-xs sm:text-sm font-bold text-red-700">
                  {t.expiredFeeDisabledNotice}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Link to="/" className="btn btn-default btn-sm text-xs">
                  {t.btnBackHome}
                </Link>
                <Link to="/my-applications" className="btn btn-outline btn-sm text-xs">
                  {t.myApplications}
                </Link>
              </div>
            </div>
          )}

          {(isConfirmed || isCancelled) && (
            <div className="w-full flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="btn btn-default btn-sm text-xs">
                {t.btnBackHome}
              </Link>
              <Link to="/my-applications" className="btn btn-outline btn-sm text-xs">
                {t.myApplications}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
