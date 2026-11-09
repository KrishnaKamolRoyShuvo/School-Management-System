/**
 * @file api.ts
 * @description Centralized HTTP client for communicating with the ASP.NET Core backend API.
 * Automatically attaches the `X-Student-Id` header when a student BCN is provided and normalizes
 * backend error responses into typed {@link ApiException} instances.
 */

import {
  SchoolClassDto,
  CreateClassRequest,
  CreateClassResponse,
  HoldDto,
  ConfirmHoldResponse,
  AdminOverview,
  ApiError,
} from '../types/admission';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Custom error class thrown when an HTTP request fails or returns a non-2xx status code.
 * Carries the HTTP `statusCode` and optional structured `errorPayload` (including redirect metadata on 409 conflicts).
 */
export class ApiException extends Error {
  statusCode: number;
  errorPayload?: ApiError;

  constructor(statusCode: number, message: string, errorPayload?: ApiError) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.errorPayload = errorPayload;
  }
}

/**
 * Internal fetch wrapper that handles JSON serialization, `X-Student-Id` header injection,
 * 204 No Content responses, and structured error extraction.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  studentId?: string | null
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (studentId) {
    headers['X-Student-Id'] = studentId;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new ApiException(0, 'We could not connect to the server. Please try again.');
  }

  if (response.status === 204) {
    return {} as T;
  }

  let body: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const errorPayload: ApiError = {
      code: body?.code || `HTTP_${response.status}`,
      message: body?.message || response.statusText || 'An error occurred.',
      existingHoldId: body?.existingHoldId || null,
      existingClassId: body?.existingClassId || null,
    };
    throw new ApiException(response.status, errorPayload.message, errorPayload);
  }

  return body as T;
}

/**
 * Public API service methods covering Class management, Student Seat Holds, and Admin Portal reporting.
 */
export const api = {
  /** Fetches all classes with real-time seat counts (`GET /classes`). */
  async getClasses(): Promise<SchoolClassDto[]> {
    return request<SchoolClassDto[]>('/classes');
  },

  /** Fetches real-time seat inventory for a single class (`GET /classes/:classId`). */
  async getClassById(classId: string): Promise<SchoolClassDto> {
    return request<SchoolClassDto>(`/classes/${classId}`);
  },

  /** Creates a new class (`POST /classes`). */
  async createClass(req: CreateClassRequest): Promise<CreateClassResponse> {
    return request<CreateClassResponse>('/classes', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** Places a temporary 10-minute seat hold in a class for the given 17-digit student BCN (`POST /classes/:classId/holds`). */
  async createHold(classId: string, studentId: string): Promise<HoldDto> {
    return request<HoldDto>(
      `/classes/${classId}/holds`,
      { method: 'POST' },
      studentId
    );
  },

  /** Fetches details of a specific seat hold (`GET /holds/:holdId`). */
  async getHold(holdId: string, studentId?: string | null): Promise<HoldDto> {
    return request<HoldDto>(`/holds/${holdId}`, {}, studentId);
  },

  /** Idempotently confirms an active seat hold (`POST /holds/:holdId/confirm`). */
  async confirmHold(holdId: string, studentId: string): Promise<ConfirmHoldResponse> {
    return request<ConfirmHoldResponse>(
      `/holds/${holdId}/confirm`,
      { method: 'POST' },
      studentId
    );
  },

  /** Cancels an active seat hold and immediately releases the seat (`DELETE /holds/:holdId`). */
  async cancelHold(holdId: string, studentId: string): Promise<void> {
    return request<void>(
      `/holds/${holdId}`,
      { method: 'DELETE' },
      studentId
    );
  },

  /** Retrieves all visible applications for the specified student BCN (`GET /me/holds`). */
  async getMyHolds(studentId: string): Promise<HoldDto[]> {
    return request<HoldDto[]>('/me/holds', {}, studentId);
  },

  /** Fetches aggregate seat and application metrics for the Admin Portal (`GET /admin/overview`). */
  async getAdminOverview(): Promise<AdminOverview> {
    return request<AdminOverview>('/admin/overview');
  },

  /** Fetches all visible applications across the school for the Admin Portal (`GET /admin/holds`). */
  async getAdminHolds(status?: string): Promise<HoldDto[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<HoldDto[]>(`/admin/holds${query}`);
  },
};
