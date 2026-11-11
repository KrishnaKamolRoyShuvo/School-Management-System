/**
 * @file AddClassModal.tsx
 * @description Modal dialog used in the Admin Portal (`/admin`) to create a new academic class (Class 1–10)
 * and shift (`Morning` / `Day`) with configurable total seat capacity (1–120) and initial available seats.
 * Includes a confirmation warning step if the administrator sets initial `availableSeats` to `0`.
 */

import React, { useState } from 'react';
import { useAdmission } from '../context/AdmissionContext';
import { api, ApiException } from '../services/api';
import { toBengaliNumerals } from '../utils/formatters';
import { X, AlertTriangle, Plus, RefreshCw } from 'lucide-react';

interface AddClassModalProps {
  /** Controls whether the modal is visible. */
  isOpen: boolean;
  /** Callback invoked when the modal is dismissed. */
  onClose: () => void;
  /** Callback invoked after a class is successfully created so the parent table can refresh. */
  onSuccess: () => void;
}

/**
 * Modal dialog for creating a new school class with seat capacity validation.
 */
export const AddClassModal: React.FC<AddClassModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, language, broadcastSync } = useAdmission();

  const [selectedClassNum, setSelectedClassNum] = useState<number>(6);
  const [selectedShift, setSelectedShift] = useState<'Morning' | 'Day'>('Morning');
  const [totalSeats, setTotalSeats] = useState<number>(60);
  const [availableSeats, setAvailableSeats] = useState<number>(60);
  const [showZeroSeatsWarning, setShowZeroSeatsWarning] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (totalSeats < 1 || totalSeats > 120) {
      setErrorMsg(
        language === 'bn'
          ? 'আসন সংখ্যা অবশ্যই ১ থেকে ১২০ এর মধ্যে হতে হবে।'
          : 'Total seats must be between 1 and 120.'
      );
      return;
    }

    if (availableSeats < 0 || availableSeats > totalSeats) {
      setErrorMsg(
        language === 'bn'
          ? 'খালি আসন সংখ্যা ০ থেকে মোট আসনের সমান হতে হবে।'
          : 'Available seats must be between 0 and total seats.'
      );
      return;
    }

    // Zero-available seats confirmation check
    if (availableSeats === 0 && !showZeroSeatsWarning) {
      setShowZeroSeatsWarning(true);
      return;
    }

    setSubmitting(true);
    try {
      const classNameStr = `Class ${selectedClassNum} - ${selectedShift}`;
      await api.createClass({
        name: classNameStr,
        shift: selectedShift,
        totalSeats: Number(totalSeats),
        availableSeats: Number(availableSeats),
      });

      broadcastSync();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiException) {
        if (err.errorPayload?.code === 'DUPLICATE_CLASS') {
          setErrorMsg(
            language === 'bn'
              ? 'এই শ্রেণি ও শিফট ইতিমধ্যে সিস্টেমে যোগ করা হয়েছে। একই নামে একাধিক শ্রেণি তৈরি করা যাবে না।'
              : 'A class with this exact name and shift already exists in the system.'
          );
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(
          language === 'bn'
            ? 'সার্ভারের সাথে যোগাযোগ করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
            : 'Could not connect to the server. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
      setShowZeroSeatsWarning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="panel bg-white max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" />
            <span>{t.modalAddClassTitle}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-sm">
            {errorMsg}
          </div>
        )}

        {/* Zero Available Seats Warning Dialog */}
        {showZeroSeatsWarning ? (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-sm space-y-3 text-amber-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold">{t.warningZeroSeatsTitle}</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {t.warningZeroSeatsBody}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowZeroSeatsWarning(false)}
                className="btn btn-outline btn-sm text-xs"
              >
                {t.modalCancel}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit()}
                className="btn btn-default btn-sm text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>{t.btnConfirmAddClassAnyway}</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Class selection */}
            <div>
              <label className="field-label mb-1">{t.modalSelectClass}</label>
              <select
                value={selectedClassNum}
                onChange={(e) => setSelectedClassNum(Number(e.target.value))}
                className="input text-xs sm:text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {language === 'bn'
                      ? `শ্রেণি ${toBengaliNumerals(n)}`
                      : `Class ${n}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift selection */}
            <div>
              <label className="field-label mb-1">{t.modalSelectShift}</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as any)}
                className="input text-xs sm:text-sm"
              >
                <option value="Morning">
                  {language === 'bn' ? 'প্রভাত (Morning)' : 'Morning'}
                </option>
                <option value="Day">
                  {language === 'bn' ? 'দিবা (Day)' : 'Day'}
                </option>
              </select>
            </div>

            {/* Total Seats */}
            <div>
              <label className="field-label mb-1">{t.modalTotalSeats}</label>
              <input
                type="number"
                min={1}
                max={120}
                value={totalSeats}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalSeats(val);
                  if (availableSeats > val) setAvailableSeats(val);
                }}
                placeholder={t.modalTotalSeatsPlaceholder}
                className="input text-xs sm:text-sm font-mono"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {t.modalTotalSeatsPlaceholder}
              </span>
            </div>

            {/* Available Seats */}
            <div>
              <label className="field-label mb-1">{t.modalAvailableSeats}</label>
              <input
                type="number"
                min={0}
                max={totalSeats}
                value={availableSeats}
                onChange={(e) => setAvailableSeats(Number(e.target.value))}
                placeholder={t.modalAvailableSeatsPlaceholder}
                className="input text-xs sm:text-sm font-mono"
                required
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline btn-sm text-xs"
              >
                {t.modalCancel}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-default btn-sm text-xs"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>{t.modalSubmit}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
