import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCandidate } from '../services/candidate.api';
import type { CandidateDetail } from '../types/candidate';

type Status = 'loading' | 'ready' | 'not-found' | 'error';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export const CandidateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);

  useEffect(() => {
    document.title = 'Detalle del candidato - LTI ATS';
  }, []);

  useEffect(() => {
    if (!id) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    getCandidate(id)
      .then((data) => {
        if (cancelled) return;
        setCandidate(data);
        setStatus('ready');
      })
      .catch((err: { response?: { status?: number } }) => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setStatus('not-found');
        } else {
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <main className="page">
        <p role="status" aria-live="polite">Cargando candidato...</p>
      </main>
    );
  }

  if (status === 'not-found') {
    return (
      <main className="page">
        <h1>Candidato no encontrado</h1>
        <Link to="/">Volver al dashboard</Link>
      </main>
    );
  }

  if (status === 'error' || !candidate) {
    return (
      <main className="page">
        <div role="alert" className="banner banner-error">
          No se pudo cargar el candidato. Inténtalo de nuevo.
        </div>
        <Link to="/">Volver al dashboard</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <h1 tabIndex={-1}>
        {candidate.firstName} {candidate.lastName}
      </h1>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading">Contacto</h2>
        <dl>
          <dt>Email</dt>
          <dd>{candidate.email}</dd>
          <dt>Teléfono</dt>
          <dd>{candidate.phone ?? '—'}</dd>
        </dl>
      </section>

      <section aria-labelledby="educations-heading">
        <h2 id="educations-heading">Educación</h2>
        {candidate.educations.length === 0 ? (
          <p>Sin educación registrada.</p>
        ) : (
          <ul>
            {candidate.educations.map((edu) => (
              <li key={edu.id}>
                <strong>{edu.degree}</strong> en {edu.institution}
                {edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : ''} —{' '}
                {formatDate(edu.startDate)} → {edu.endDate ? formatDate(edu.endDate) : 'en curso'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="experiences-heading">
        <h2 id="experiences-heading">Experiencia laboral</h2>
        {candidate.experiences.length === 0 ? (
          <p>Sin experiencia registrada.</p>
        ) : (
          <ul>
            {candidate.experiences.map((exp) => (
              <li key={exp.id}>
                <strong>{exp.position}</strong> en {exp.company} —{' '}
                {formatDate(exp.startDate)} → {exp.endDate ? formatDate(exp.endDate) : 'actual'}
                {exp.description ? <p>{exp.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cv-heading">
        <h2 id="cv-heading">CV</h2>
        {candidate.cv ? (
          <p>
            <a href={candidate.cv.url} target="_blank" rel="noreferrer noopener">
              Descargar {candidate.cv.originalName ?? 'CV'}
            </a>
          </p>
        ) : (
          <p>Sin CV adjunto.</p>
        )}
      </section>

      <p>
        <Link to="/">Volver al dashboard</Link>
      </p>
    </main>
  );
};

export default CandidateDetailPage;
