/**
 * @file formatters.test.ts
 * @description Unit tests for 17-digit Student BCN validation, privacy masking,
 * Bengali numeral conversion, and remaining countdown calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidStudentId,
  maskStudentId,
  toBengaliNumerals,
  formatRemainingTime,
} from './formatters';

describe('Formatters & Validators', () => {
  describe('isValidStudentId', () => {
    it('accepts exact 17-digit numeric string', () => {
      expect(isValidStudentId('20151234567890123')).toBe(true);
      expect(isValidStudentId('00000000000000000')).toBe(true);
    });

    it('rejects strings that are too short or too long', () => {
      expect(isValidStudentId('12345')).toBe(false);
      expect(isValidStudentId('2015123456789012')).toBe(false); // 16 digits
      expect(isValidStudentId('201512345678901234')).toBe(false); // 18 digits
    });

    it('rejects strings containing letters or special characters', () => {
      expect(isValidStudentId('2015123456789012a')).toBe(false);
      expect(isValidStudentId('2015-1234-5678-90')).toBe(false);
      expect(isValidStudentId('                 ')).toBe(false);
      expect(isValidStudentId('')).toBe(false);
    });

    it('trims whitespace before checking', () => {
      expect(isValidStudentId('  20151234567890123  ')).toBe(true);
    });
  });

  describe('maskStudentId', () => {
    it('masks 17-digit student IDs showing first 4 and last 4 digits', () => {
      const masked = maskStudentId('20151234567890123');
      expect(masked).toBe('2015*********0123');
      expect(masked.length).toBe(17);
    });

    it('returns original input if not exactly 17 digits', () => {
      expect(maskStudentId('12345')).toBe('12345');
    });
  });

  describe('toBengaliNumerals', () => {
    it('converts ASCII digits to Bengali digits', () => {
      expect(toBengaliNumerals('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
      expect(toBengaliNumerals(25)).toBe('২৫');
      expect(toBengaliNumerals('Class 6')).toBe('Class ৬');
    });
  });

  describe('formatRemainingTime', () => {
    it('calculates remaining seconds and formatted string for future ISO timestamp', () => {
      const futureDate = new Date(Date.now() + 125 * 1000).toISOString(); // 2m 5s
      const result = formatRemainingTime(futureDate);
      expect(result.remainingSeconds).toBeGreaterThanOrEqual(124);
      expect(result.remainingSeconds).toBeLessThanOrEqual(126);
      expect(result.isExpired).toBe(false);
      expect(result.formatted).toMatch(/02:0[456]/);
    });

    it('reports expired for past ISO timestamp', () => {
      const pastDate = new Date(Date.now() - 5000).toISOString();
      const result = formatRemainingTime(pastDate);
      expect(result.remainingSeconds).toBe(0);
      expect(result.formatted).toBe('00:00');
      expect(result.isExpired).toBe(true);
    });
  });
});
