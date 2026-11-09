/**
 * @file MyApplicationsPage.tsx
 * @description Student Application History & Status Lookup page (`/my-applications`).
 * Fetches all visible applications for the active 17-digit Student BCN via `GET /me/holds`
 * (which automatically hides prior `EXPIRED` holds once the student has a `CONFIRMED` admission,
 * per Section 4.8 of the specification).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdmission } from '../context/AdmissionContext';
import { api } from '../services/api';
import { HoldDto } from '../types/admission';
import { StudentIdBanner } from '../components/StudentIdBanner';
import { toBengaliNumerals, isValidStudentId, maskStudentId } from '../utils/formatters';
import { ArrowLeft, RefreshCw, ArrowRight } from 'lucide-react';

/**
 * Displays the application history table for the currently entered 17-digit Student BCN.
 */
export const MyApplicationsPage: React.FC = () => {
  const { t, language, bcn, isBcnMasked } = useAdmission();
  const [holds, setHolds] = useState<HoldDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHolds = useCallback(async () => {
    if (!bcn || !isValidStudentId(bcn)) {
      setHolds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api.getMyHolds(bcn);
      setHolds(data);
    } catch {
      setHolds([]);
    } finally {
      setLoading(false);
    }
  }, [bcn]);

  useEffect(() => {
    fetchHolds();
  }, [fetchHolds]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Student BCN Input Bar */}
      <StudentIdBanner />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{t.myApplications}</h1>
          <p className="page-subtitle mt-0.5 text-xs sm:text-sm text-slate-500">
            {language === 'bn'
              ? 'আপনার জন্ম নিবন্ধন নম্বরের অধীনে থাকা সকল আবেদনের বর্তমান অবস্থা।'
              : 'Current status of all applications submitted under your birth certificate number.'}
          </p>
        </div>

        <Link to="/" className="btn btn-outline btn-sm text-xs self-start sm:self-auto">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.btnBackHome}</span>
        </Link>
      </div>

      {/* Table / List */}
      <div className="panel overflow-hidden">
        {!bcn || !isValidStudentId(bcn) ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">
              {language === 'bn'
                ? 'আবেদনের অবস্থা দেখতে অনুগ্রহ করে উপরে ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর দাখিল করুন।'
                : 'Please enter your 17-digit birth certificate number in the banner above to view your applications.'}
            </p>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand" />
            <p className="text-xs">{language === 'bn' ? 'তথ্য লোড হচ্ছে...' : 'Loading applications...'}</p>
          </div>
        ) : holds.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-3">
            <p className="text-sm">
              {language === 'bn'
                ? 'এই জন্ম নিবন্ধন নম্বরের অধীনে কোনো আবেদন পাওয়া যায়নি।'
                : 'No applications found for this birth certificate number.'}
            </p>
            <Link to="/" className="btn btn-default btn-sm text-xs inline-flex">
              {t.btnApplySeat}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>{language === 'bn' ? 'আবেদন আইডি' : 'HOLD ID'}</th>
                  <th>{t.colClassName}</th>
                  <th>{language === 'bn' ? 'শিক্ষার্থীর নম্বর' : 'STUDENT BCN'}</th>
                  <th>{language === 'bn' ? 'আবেদনের সময়' : 'CREATED AT'}</th>
                  <th>{t.colCondition}</th>
                  <th className="col-action">{t.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {holds.map((h) => {
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
                      <td className="font-mono text-xs text-slate-600">
                        {isBcnMasked
                          ? maskStudentId(h.studentId)
                          : language === 'bn'
                          ? toBengaliNumerals(h.studentId)
                          : h.studentId}
                      </td>
                      <td className="font-mono text-xs text-slate-500">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className={`status-badge ${badgeClass}`}>{badgeText}</span>
                      </td>
                      <td className="col-action">
                        <Link
                          to={`/applications/${h.holdId}`}
                          className="btn btn-outline btn-sm text-xs"
                        >
                          <span>{t.btnViewApplication}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
