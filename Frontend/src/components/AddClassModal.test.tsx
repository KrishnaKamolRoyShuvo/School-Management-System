import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdmissionProvider } from '../context/AdmissionContext';
import { AddClassModal } from './AddClassModal';

const renderModal = (props = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };
  return render(
    <AdmissionProvider>
      <AddClassModal {...defaultProps} {...props} />
    </AdmissionProvider>
  );
};

describe('AddClassModal Component', () => {
  it('renders Class 1 to 10 options only', () => {
    renderModal();
    const select = screen.getByDisplayValue(/শ্রেণি ৬/i);
    expect(select).toBeInTheDocument();

    // Check options
    expect(screen.getByRole('option', { name: /^শ্রেণি ১$/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^শ্রেণি ১০$/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /শ্রেণি ১১/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Class 99/i })).not.toBeInTheDocument();
  });

  it('triggers Zero Available Seats warning dialog when available seats is 0', () => {
    renderModal();
    const availableSeatsInput = screen.getByPlaceholderText(/প্রাথমিক খালি আসন/i);

    // Set available seats to 0
    fireEvent.change(availableSeatsInput, { target: { value: '0' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /শ্রেণি তৈরি করুন/i });
    fireEvent.click(submitBtn);

    // Confirmation warning must appear
    expect(screen.getByText(/কোনো আসন খালি নেই সতর্কবার্তা/i)).toBeInTheDocument();
    expect(
      screen.getByText(/এই শ্রেণিতে আবেদনের জন্য কোনো আসন খালি রাখা হয়নি/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /হ্যাঁ, তবুও যোগ করুন/i })
    ).toBeInTheDocument();
  });
});
