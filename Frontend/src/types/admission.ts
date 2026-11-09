/**
 * @file admission.ts
 * @description Shared TypeScript data transfer object (DTO) interfaces matching the ASP.NET Core backend API contracts.
 */

/**
 * Real-time seat inventory and capacity status for a single academic class (`GET /classes`).
 * Invariant: `heldSeats + confirmedSeats + availableSeats === totalSeats`.
 */
export interface SchoolClassDto {
  id: string;
  name: string;
  shift?: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

/**
 * Payload sent when an administrator creates a new class (`POST /classes`).
 */
export interface CreateClassRequest {
  name: string;
  shift?: string;
  totalSeats: number;
  availableSeats?: number;
}

/**
 * Response returned after creating a new class (`POST /classes`).
 */
export interface CreateClassResponse {
  id: string;
  name: string;
  totalSeats: number;
}

/**
 * Represents a student's seat reservation (hold) or admission application (`GET /holds/:holdId`, `GET /me/holds`).
 */
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

/**
 * Response returned when a student confirms an active seat hold (`POST /holds/:holdId/confirm`).
 */
export interface ConfirmHoldResponse {
  holdId: string;
  classId: string;
  className: string;
  studentId: string;
  status: string;
  confirmedAt: string;
}

/**
 * Aggregate school-wide seat and application statistics for the Admin Portal (`GET /admin/overview`).
 */
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

/**
 * Standardized error payload returned by the backend API on 4xx/5xx responses.
 */
export interface ApiError {
  code: string;
  message: string;
  existingHoldId?: string | null;
  existingClassId?: string | null;
}
