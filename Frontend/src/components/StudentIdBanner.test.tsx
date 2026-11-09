/**
 * @file StudentIdBanner.test.tsx
 * @description Component tests for `StudentIdBanner`, verifying 17-digit input counter,
 * button disabled/enabled states, and privacy masking upon submission.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdmissionProvider } from '../context/AdmissionContext';
import { StudentIdBanner } from './StudentIdBanner';

const renderWithContext = () => {
  return render(
    <AdmissionProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <StudentIdBanner />
      </BrowserRouter>
    </AdmissionProvider>
  );
};

describe('StudentIdBanner Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders input field and digit counter 0/17 initially', () => {
    renderWithContext();
    expect(screen.getByPlaceholderText(/১৭ ডিজিটের জন্ম নিবন্ধন নম্বর/i)).toBeInTheDocument();
    expect(screen.getByText(/০\/১৭/)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /দাখিল করুন/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button only when exactly 17 digits are entered', () => {
    renderWithContext();
    const input = screen.getByPlaceholderText(/১৭ ডিজিটের জন্ম নিবন্ধন নম্বর/i);
    const submitBtn = screen.getByRole('button', { name: /দাখিল করুন/i });

    // Enter 10 digits
    fireEvent.change(input, { target: { value: '2015123456' } });
    expect(submitBtn).toBeDisabled();

    // Enter 17 digits
    fireEvent.change(input, { target: { value: '20151234567890123' } });
    expect(submitBtn).toBeEnabled();
  });

  it('masks BCN and provides toggle upon submission', () => {
    renderWithContext();
    const input = screen.getByPlaceholderText(/১৭ ডিজিটের জন্ম নিবন্ধন নম্বর/i);
    fireEvent.change(input, { target: { value: '20151234567890123' } });

    const submitBtn = screen.getByRole('button', { name: /দাখিল করুন/i });
    fireEvent.click(submitBtn);

    // Should display masked ID
    expect(screen.getByText('2015*********0123')).toBeInTheDocument();
    expect(screen.getByText(/সক্রিয় নিবন্ধন নম্বর/i)).toBeInTheDocument();
  });
});
