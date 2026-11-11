/**
 * @file StudentIdBanner.tsx
 * @description Interactive banner component for entering, validating, privacy-masking, and changing
 * the student's 17-digit Birth Certificate Number (BCN). Also surfaces a quick-access alert bar
 * whenever the active student has an ongoing temporary seat hold (`HELD`).
 */

import React, { useState } from 'react';
import { useAdmission } from '../context/AdmissionContext';
import { maskStudentId, isValidStudentId, toBengaliNumerals } from '../utils/formatters';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Student BCN input and active hold notification banner displayed at the top of student portal pages.
 */
export const StudentIdBanner: React.FC = () => {
  const {
    bcn,
    setBcn,
    clearBcn,
    isBcnMasked,
    toggleBcnMask,
    t,
    language,
    activeHold,
  } = useAdmission();

  const [inputVal, setInputVal] = useState(bcn);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputVal.trim();
    if (!isValidStudentId(clean)) {
      setErrorMsg(
        !clean
          ? t.bcnRequiredAlert
          : t.bcnInvalidAlert
      );
      return;
    }
    setErrorMsg(null);
    setBcn(clean);
  };

  const handleClear = () => {
    setInputVal('');
    setErrorMsg(null);
    clearBcn();
  };

  const digitsOnly = inputVal.replace(/\D/g, '').slice(0, 17);
  const countDisplay =
    language === 'bn'
      ? `${toBengaliNumerals(digitsOnly.length)}/১৭`
      : `${digitsOnly.length}/17`;

  return (
    <div className="mb-6 space-y-3">
      {/* Active Hold Alert if available */}
      {activeHold && (
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900">
          <div className="flex items-start sm:items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">
                {language === 'bn' ? 'চলমান আবেদন:' : 'Active Application:'}
              </span>{' '}
              {activeHold.className} (
              {language === 'bn' ? 'সাময়িক আসন সংরক্ষিত' : 'Temporary Seat Reserved'}
              )
            </div>
          </div>
          <Link
            to={`/applications/${activeHold.holdId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors shrink-0"
          >
            <span>{t.btnViewApplication}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Student BCN Banner Panel */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-none">
        {bcn && isValidStudentId(bcn) ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">{t.bcnActiveLabel}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-800 tracking-wider">
                    {isBcnMasked
                      ? maskStudentId(bcn)
                      : language === 'bn'
                      ? toBengaliNumerals(bcn)
                      : bcn}
                  </span>
                  <button
                    onClick={toggleBcnMask}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-sm"
                    title={t.bcnMaskHint}
                  >
                    {isBcnMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputVal(bcn);
                  clearBcn();
                }}
                className="btn btn-outline btn-sm text-xs"
              >
                {t.changeBcn}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-secondary btn-sm text-xs text-slate-600"
              >
                {t.clearBcn}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="field-label flex items-center gap-1.5 text-slate-700">
                <AlertCircle className="w-3.5 h-3.5 text-brand" />
                <span>{t.bcnPromptLabel}</span>
              </label>
              <span className="text-xs font-mono font-medium text-slate-500">{countDisplay}</span>
            </div>

            <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={17}
                  value={inputVal}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 17);
                    setInputVal(clean);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={t.bcnPlaceholder}
                  className="input font-mono tracking-wider text-sm pr-16"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={digitsOnly.length !== 17}
                className="btn btn-default text-xs font-semibold px-4"
              >
                {t.setBcn}
              </button>
            </form>

            {errorMsg ? (
              <p className="text-xs text-red-600 font-medium mt-1.5">{errorMsg}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1.5">{t.bcnRequiredWarning}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
