export interface AddressPayload {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface EducationPayload {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
}

export interface ExperiencePayload {
  company: string;
  position: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
}

export interface CandidateCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: AddressPayload;
  educations?: EducationPayload[];
  experiences?: ExperiencePayload[];
}

export interface CandidateDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: {
    street: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
  educations: Array<{
    id: number;
    institution: string;
    degree: string;
    fieldOfStudy: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  experiences: Array<{
    id: number;
    company: string;
    position: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  cv: {
    url: string;
    originalName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiValidationDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: ApiValidationDetail[];
}
