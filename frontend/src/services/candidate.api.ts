import { apiClient } from './api';
import type {
  ApiErrorResponse,
  CandidateCreatePayload,
  CandidateDetail,
} from '../types/candidate';

export interface CreateCandidateResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cvUrl: string | null;
  createdAt: string;
}

export async function createCandidate(
  payload: CandidateCreatePayload,
  cvFile?: File | null,
): Promise<CreateCandidateResponse> {
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  if (cvFile) {
    formData.append('cv', cvFile);
  }

  const response = await apiClient.post<CreateCandidateResponse>(
    '/api/candidates',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export async function getCandidate(id: number | string): Promise<CandidateDetail> {
  const response = await apiClient.get<CandidateDetail>(`/api/candidates/${id}`);
  return response.data;
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
  );
}
