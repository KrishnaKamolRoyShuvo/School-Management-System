/**
 * @file HoldCountdownPage.test.tsx
 * @description Unit tests for `HoldCountdownPage`, verifying the disabled state of the
 * 'Pay Admission Fee' button after hold expiration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdmissionProvider } from '../context/AdmissionContext';
import { HoldCountdownPage } from './HoldCountdownPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getHold: vi.fn(),
    confirmHold: vi.fn(),
    cancelHold: vi.fn(),
    getMyHolds: vi.fn().mockResolvedValue([]),
  },
  ApiException: class extends Error {
    statusCode: number;
    errorPayload?: any;
    constructor(statusCode: number, message: string, errorPayload?: any) {
      super(message);
      this.statusCode = statusCode;
      this.errorPayload = errorPayload;
    }
  },
}));

describe('HoldCountdownPage Expired State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders disabled Pay Admission Fee button and expiration warning when hold is expired', async () => {
    const expiredHold = {
      holdId: 'test-expired-hold',
      classId: 'class-1',
      className: 'Class 6 - Morning',
      shift: 'Morning',
      studentId: '20151234567890123',
      status: 'EXPIRED' as const,
      expiresAt: new Date(Date.now() - 60000).toISOString(),
      createdAt: new Date(Date.now() - 660000).toISOString(),
    };

    (api.getHold as any).mockResolvedValueOnce(expiredHold);

    render(
      <MemoryRouter initialEntries={['/applications/test-expired-hold']}>
        <AdmissionProvider>
          <Routes>
            <Route path="/applications/:holdId" element={<HoldCountdownPage />} />
          </Routes>
        </AdmissionProvider>
      </MemoryRouter>
    );

    // Wait for the expired status title to appear
    expect(await screen.findByText(/আবেদনের মেয়াদ শেষ হয়ে গেছে|Reservation Expired/i)).toBeInTheDocument();

    // Verify the "Pay Admission Fee" / "ভর্তি ফি দিন" button is present
    const payFeeBtn = screen.getByRole('button', { name: /ভর্তি ফি দিন|Pay Admission Fee/i });
    expect(payFeeBtn).toBeInTheDocument();

    // The button MUST be disabled
    expect(payFeeBtn).toBeDisabled();

    // Clear expiration notice must also be visible
    expect(
      screen.getByText(/ভর্তি ফি পরিশোধের বাটনটি নিষ্ক্রিয় করা হয়েছে|admission fee payment button is disabled/i)
    ).toBeInTheDocument();
  });
});
