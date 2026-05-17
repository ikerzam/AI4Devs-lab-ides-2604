import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Dashboard - LTI ATS';
  }, []);

  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p>Bienvenido al sistema de seguimiento de talento (LTI ATS).</p>
      <Link to="/candidates/new" className="btn-primary btn-cta">
        Añadir candidato
      </Link>
    </main>
  );
};

export default DashboardPage;
