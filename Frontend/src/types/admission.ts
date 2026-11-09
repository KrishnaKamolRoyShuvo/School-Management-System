export interface SchoolClassDto {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

export interface CreateClassRequest {
  name: string;
  totalSeats: number;
}

export interface CreateClassResponse {
  id: string;
  name: string;
  totalSeats: number;
}

export interface HoldDto {
  holdId: string;
  classId: string;
  className: string;
  studentId: string;
  status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
}

export interface ConfirmHoldResponse {
  holdId: string;
  classId: string;
  className: string;
  studentId: string;
  status: string;
  confirmedAt: string;
}

export interface AdminOverview {
  totalClasses: number;
  totalSeats: number;
  totalConfirmedSeats: number;
  totalHeldSeats: number;
  totalAvailableSeats: number;
  totalActiveApplications?: number;
  totalExpiredApplications?: number;
  totalCancelledApplications?: number;
}

export interface ApiError {
  code: string;
  message: string;
  existingHoldId?: string | null;
  existingClassId?: string | null;
}
