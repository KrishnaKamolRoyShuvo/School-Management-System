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

export const api = {
  // Classes
  async getClasses(): Promise<SchoolClassDto[]> {
    return request<SchoolClassDto[]>('/classes');
  },

  async getClassById(classId: string): Promise<SchoolClassDto> {
    return request<SchoolClassDto>(`/classes/${classId}`);
  },

  async createClass(req: CreateClassRequest): Promise<CreateClassResponse> {
    return request<CreateClassResponse>('/classes', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  // Holds
  async createHold(classId: string, studentId: string): Promise<HoldDto> {
    return request<HoldDto>(
      `/classes/${classId}/holds`,
      { method: 'POST' },
      studentId
    );
  },

  async getHold(holdId: string, studentId?: string | null): Promise<HoldDto> {
    return request<HoldDto>(`/holds/${holdId}`, {}, studentId);
  },

  async confirmHold(holdId: string, studentId: string): Promise<ConfirmHoldResponse> {
    return request<ConfirmHoldResponse>(
      `/holds/${holdId}/confirm`,
      { method: 'POST' },
      studentId
    );
  },

  async cancelHold(holdId: string, studentId: string): Promise<void> {
    return request<void>(
      `/holds/${holdId}`,
      { method: 'DELETE' },
      studentId
    );
  },

  async getMyHolds(studentId: string): Promise<HoldDto[]> {
    return request<HoldDto[]>('/me/holds', {}, studentId);
  },

  // Admin
  async getAdminOverview(): Promise<AdminOverview> {
    return request<AdminOverview>('/admin/overview');
  },

  async getAdminHolds(status?: string): Promise<HoldDto[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<HoldDto[]>(`/admin/holds${query}`);
  },
};
