import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import {
  candidateFormSchema,
  CandidateFormValues,
} from '../schemas/candidate.schema';
import {
  createCandidate,
  isApiErrorResponse,
} from '../services/candidate.api';
import type { CandidateCreatePayload } from '../types/candidate';
import { FormFieldError } from '../components/FormFieldError';
import { Toast } from '../components/Toast';

const MAX_CV_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

const defaultValues: CandidateFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: { street: '', city: '', postalCode: '', country: '' },
  educations: [],
  experiences: [],
};

interface CvState {
  file: File | null;
  error: string | null;
}

function validateCvClientSide(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt || !ALLOWED_MIME.includes(file.type)) {
    return 'Solo se permiten ficheros PDF o DOCX';
  }
  if (file.size > MAX_CV_BYTES) {
    return 'El fichero no puede superar 5 MB';
  }
  return null;
}

export const CandidateFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [cv, setCv] = useState<CvState>({ file: null, error: null });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues,
    mode: 'onSubmit',
  });

  const educations = useFieldArray({ control, name: 'educations' });
  const experiences = useFieldArray({ control, name: 'experiences' });

  const onSubmit = async (values: CandidateFormValues) => {
    setSubmitError(null);

    if (cv.error) return;

    const payload: CandidateCreatePayload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone?.trim() || undefined,
      address: values.address && {
        street: values.address.street?.trim() || undefined,
        city: values.address.city?.trim() || undefined,
        postalCode: values.address.postalCode?.trim() || undefined,
        country: values.address.country?.trim()?.toUpperCase() || undefined,
      },
      educations: (values.educations ?? []).map((edu) => ({
        institution: edu.institution.trim(),
        degree: edu.degree.trim(),
        fieldOfStudy: edu.fieldOfStudy?.trim() || undefined,
        startDate: edu.startDate,
        endDate: edu.endDate || null,
      })),
      experiences: (values.experiences ?? []).map((exp) => ({
        company: exp.company.trim(),
        position: exp.position.trim(),
        description: exp.description?.trim() || undefined,
        startDate: exp.startDate,
        endDate: exp.endDate || null,
      })),
    };

    try {
      const created = await createCandidate(payload, cv.file);
      setSuccessToast('Candidato añadido correctamente');
      // Brief delay so the toast is announced before navigation.
      window.setTimeout(() => {
        navigate(`/candidates/${created.id}`);
      }, 400);
    } catch (err) {
      const axiosErr = err as AxiosError<unknown>;
      const data = axiosErr.response?.data;
      const status = axiosErr.response?.status;

      if (status === 409 && isApiErrorResponse(data) && data.error === 'EMAIL_ALREADY_EXISTS') {
        setError('email', {
          type: 'server',
          message: 'Ya existe un candidato con ese email',
        });
        setFocus('email');
        return;
      }

      if (status === 400 && isApiErrorResponse(data) && data.error === 'VALIDATION_ERROR') {
        const details = data.details ?? [];
        for (const detail of details) {
          // `FieldPath` supports nested/array paths (e.g. `educations.0.endDate`),
          // which `keyof CandidateFormValues` did not.
          setError(detail.field as FieldPath<CandidateFormValues>, {
            type: 'server',
            message: detail.message,
          });
        }
        setSubmitError('Revisa los campos marcados.');
        return;
      }

      if (status === 400 && isApiErrorResponse(data) && data.error === 'INVALID_FILE') {
        setCv((prev) => ({
          ...prev,
          error: data.message ?? 'Fichero de CV inválido',
        }));
        return;
      }

      setSubmitError('No se pudo guardar el candidato. Inténtalo de nuevo.');
    }
  };

  const onInvalid = () => {
    const firstErrorField = findFirstErrorField(errors);
    if (!firstErrorField) return;

    // RHF's `setFocus` only works for fields registered with `ref` and may not
    // resolve dotted paths (`educations.0.institution`) consistently. Fall
    // back to a direct DOM lookup by id — every input in the form uses the
    // RHF path as its `id`, so this keeps focus management deterministic.
    let focused = false;
    try {
      setFocus(firstErrorField as FieldPath<CandidateFormValues>);
      focused = document.activeElement?.id === firstErrorField;
    } catch {
      focused = false;
    }
    if (!focused) {
      const el = document.getElementById(firstErrorField);
      if (el && typeof (el as HTMLElement).focus === 'function') {
        (el as HTMLElement).focus();
      }
    }
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setCv({ file: null, error: null });
      return;
    }
    const error = validateCvClientSide(file);
    setCv({ file: error ? null : file, error });
    if (error && cvInputRef.current) {
      cvInputRef.current.value = '';
    }
  };

  useEffect(() => {
    document.title = 'Añadir candidato - LTI ATS';
  }, []);

  return (
    <main className="page">
      <h1>Añadir candidato</h1>

      {submitError && (
        <div role="alert" className="banner banner-error">
          {submitError}
        </div>
      )}
      {successToast && (
        <Toast
          message={successToast}
          severity="success"
          onDismiss={() => setSuccessToast(null)}
        />
      )}

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        noValidate
        aria-busy={isSubmitting}
      >
        <fieldset disabled={isSubmitting}>
          <legend>Datos personales</legend>

          <div className="form-row">
            <label htmlFor="firstName">
              Nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              aria-invalid={errors.firstName ? 'true' : 'false'}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              aria-required="true"
              {...register('firstName')}
            />
            <FormFieldError id="firstName-error" message={errors.firstName?.message} />
          </div>

          <div className="form-row">
            <label htmlFor="lastName">
              Apellidos <span aria-hidden="true">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              aria-invalid={errors.lastName ? 'true' : 'false'}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              aria-required="true"
              {...register('lastName')}
            />
            <FormFieldError id="lastName-error" message={errors.lastName?.message} />
          </div>

          <div className="form-row">
            <label htmlFor="email">
              Email <span aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-required="true"
              {...register('email')}
            />
            <FormFieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="form-row">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={errors.phone ? 'true' : 'false'}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              {...register('phone')}
            />
            <FormFieldError id="phone-error" message={errors.phone?.message} />
          </div>
        </fieldset>

        <fieldset disabled={isSubmitting}>
          <legend>Dirección</legend>

          <div className="form-row">
            <label htmlFor="address.street">Calle</label>
            <input id="address.street" type="text" {...register('address.street')} />
          </div>
          <div className="form-row">
            <label htmlFor="address.city">Ciudad</label>
            <input id="address.city" type="text" {...register('address.city')} />
          </div>
          <div className="form-row">
            <label htmlFor="address.postalCode">Código postal</label>
            <input
              id="address.postalCode"
              type="text"
              {...register('address.postalCode')}
            />
          </div>
          <div className="form-row">
            <label htmlFor="address.country">País (ISO 3166-1 alpha-2)</label>
            <input
              id="address.country"
              type="text"
              maxLength={2}
              placeholder="ES"
              aria-invalid={errors.address?.country ? 'true' : 'false'}
              aria-describedby={
                errors.address?.country ? 'country-error' : undefined
              }
              {...register('address.country')}
            />
            <FormFieldError
              id="country-error"
              message={errors.address?.country?.message}
            />
          </div>
        </fieldset>

        <fieldset disabled={isSubmitting}>
          <legend>Educación</legend>

          {educations.fields.map((field, index) => (
            <div key={field.id} className="repeatable-item">
              <h3>Formación {index + 1}</h3>

              <div className="form-row">
                <label htmlFor={`educations.${index}.institution`}>
                  Institución <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`educations.${index}.institution`}
                  type="text"
                  aria-invalid={
                    errors.educations?.[index]?.institution ? 'true' : 'false'
                  }
                  aria-describedby={
                    errors.educations?.[index]?.institution
                      ? `educations.${index}.institution-error`
                      : undefined
                  }
                  {...register(`educations.${index}.institution` as const)}
                />
                <FormFieldError
                  id={`educations.${index}.institution-error`}
                  message={errors.educations?.[index]?.institution?.message}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`educations.${index}.degree`}>
                  Título <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`educations.${index}.degree`}
                  type="text"
                  aria-invalid={errors.educations?.[index]?.degree ? 'true' : 'false'}
                  aria-describedby={
                    errors.educations?.[index]?.degree
                      ? `educations.${index}.degree-error`
                      : undefined
                  }
                  {...register(`educations.${index}.degree` as const)}
                />
                <FormFieldError
                  id={`educations.${index}.degree-error`}
                  message={errors.educations?.[index]?.degree?.message}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`educations.${index}.fieldOfStudy`}>
                  Campo de estudio
                </label>
                <input
                  id={`educations.${index}.fieldOfStudy`}
                  type="text"
                  {...register(`educations.${index}.fieldOfStudy` as const)}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`educations.${index}.startDate`}>
                  Fecha inicio <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`educations.${index}.startDate`}
                  type="date"
                  aria-invalid={
                    errors.educations?.[index]?.startDate ? 'true' : 'false'
                  }
                  aria-describedby={
                    errors.educations?.[index]?.startDate
                      ? `educations.${index}.startDate-error`
                      : undefined
                  }
                  {...register(`educations.${index}.startDate` as const)}
                />
                <FormFieldError
                  id={`educations.${index}.startDate-error`}
                  message={errors.educations?.[index]?.startDate?.message}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`educations.${index}.endDate`}>
                  Fecha fin (dejar vacío si está en curso)
                </label>
                <input
                  id={`educations.${index}.endDate`}
                  type="date"
                  aria-invalid={errors.educations?.[index]?.endDate ? 'true' : 'false'}
                  aria-describedby={
                    errors.educations?.[index]?.endDate
                      ? `educations.${index}.endDate-error`
                      : undefined
                  }
                  {...register(`educations.${index}.endDate` as const)}
                />
                <FormFieldError
                  id={`educations.${index}.endDate-error`}
                  message={errors.educations?.[index]?.endDate?.message}
                />
              </div>

              <button
                type="button"
                className="btn-remove"
                onClick={() => educations.remove(index)}
                aria-label={`Eliminar formación ${index + 1}`}
              >
                Eliminar formación
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn-add"
            onClick={() =>
              educations.append({
                institution: '',
                degree: '',
                fieldOfStudy: '',
                startDate: '',
                endDate: '',
              })
            }
          >
            Añadir formación
          </button>
        </fieldset>

        <fieldset disabled={isSubmitting}>
          <legend>Experiencia laboral</legend>

          {experiences.fields.map((field, index) => (
            <div key={field.id} className="repeatable-item">
              <h3>Experiencia {index + 1}</h3>

              <div className="form-row">
                <label htmlFor={`experiences.${index}.company`}>
                  Empresa <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`experiences.${index}.company`}
                  type="text"
                  aria-invalid={
                    errors.experiences?.[index]?.company ? 'true' : 'false'
                  }
                  aria-describedby={
                    errors.experiences?.[index]?.company
                      ? `experiences.${index}.company-error`
                      : undefined
                  }
                  {...register(`experiences.${index}.company` as const)}
                />
                <FormFieldError
                  id={`experiences.${index}.company-error`}
                  message={errors.experiences?.[index]?.company?.message}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`experiences.${index}.position`}>
                  Puesto <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`experiences.${index}.position`}
                  type="text"
                  aria-invalid={
                    errors.experiences?.[index]?.position ? 'true' : 'false'
                  }
                  aria-describedby={
                    errors.experiences?.[index]?.position
                      ? `experiences.${index}.position-error`
                      : undefined
                  }
                  {...register(`experiences.${index}.position` as const)}
                />
                <FormFieldError
                  id={`experiences.${index}.position-error`}
                  message={errors.experiences?.[index]?.position?.message}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`experiences.${index}.description`}>
                  Descripción
                </label>
                <textarea
                  id={`experiences.${index}.description`}
                  rows={3}
                  {...register(`experiences.${index}.description` as const)}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`experiences.${index}.startDate`}>
                  Fecha inicio <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`experiences.${index}.startDate`}
                  type="date"
                  aria-invalid={
                    errors.experiences?.[index]?.startDate ? 'true' : 'false'
                  }
                  aria-describedby={
                    errors.experiences?.[index]?.startDate
                      ? `experiences.${index}.startDate-error`
                      : undefined
                  }
                  {...register(`experiences.${index}.startDate` as const)}
                />
                <FormFieldError
                  id={`experiences.${index}.startDate-error`}
                  message={errors.experiences?.[index]?.startDate?.message}
                />
              </div>

              <div className="form-row">
                <label htmlFor={`experiences.${index}.endDate`}>
                  Fecha fin (dejar vacío si es actual)
                </label>
                <input
                  id={`experiences.${index}.endDate`}
                  type="date"
                  aria-invalid={
                    errors.experiences?.[index]?.endDate ? 'true' : 'false'
                  }
                  aria-describedby={
                    errors.experiences?.[index]?.endDate
                      ? `experiences.${index}.endDate-error`
                      : undefined
                  }
                  {...register(`experiences.${index}.endDate` as const)}
                />
                <FormFieldError
                  id={`experiences.${index}.endDate-error`}
                  message={errors.experiences?.[index]?.endDate?.message}
                />
              </div>

              <button
                type="button"
                className="btn-remove"
                onClick={() => experiences.remove(index)}
                aria-label={`Eliminar experiencia ${index + 1}`}
              >
                Eliminar experiencia
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn-add"
            onClick={() =>
              experiences.append({
                company: '',
                position: '',
                description: '',
                startDate: '',
                endDate: '',
              })
            }
          >
            Añadir experiencia
          </button>
        </fieldset>

        <fieldset disabled={isSubmitting}>
          <legend>Currículum (CV)</legend>
          <div className="form-row">
            <label htmlFor="cv">CV (PDF o DOCX, máx. 5 MB)</label>
            <input
              id="cv"
              ref={cvInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleCvChange}
              aria-invalid={cv.error ? 'true' : 'false'}
              aria-describedby={cv.error ? 'cv-error' : undefined}
            />
            <FormFieldError id="cv-error" message={cv.error ?? undefined} />
            {cv.file && !cv.error && (
              <p className="field-info">Seleccionado: {cv.file.name}</p>
            )}
          </div>
        </fieldset>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || Boolean(cv.error)}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>

    </main>
  );
};

type ErrorTree = Record<string, unknown>;

function findFirstErrorField(errors: ErrorTree, prefix = ''): string | null {
  for (const key of Object.keys(errors)) {
    const value = errors[key];
    if (!value) continue;
    if (typeof value === 'object' && 'ref' in (value as Record<string, unknown>)) {
      return prefix ? `${prefix}.${key}` : key;
    }
    if (typeof value === 'object') {
      const nested = findFirstErrorField(value as ErrorTree, prefix ? `${prefix}.${key}` : key);
      if (nested) return nested;
    }
  }
  return null;
}

export default CandidateFormPage;
