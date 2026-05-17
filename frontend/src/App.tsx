import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { CandidateFormPage } from './pages/CandidateFormPage';
import { CandidateDetailPage } from './pages/CandidateDetailPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <header className="app-header">
        <Link to="/" className="app-brand">
          LTI ATS
        </Link>
      </header>
      <div id="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/candidates/new" element={<CandidateFormPage />} />
          <Route path="/candidates/:id" element={<CandidateDetailPage />} />
          <Route
            path="*"
            element={
              <main className="page">
                <h1>Página no encontrada</h1>
                <Link to="/">Volver al dashboard</Link>
              </main>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
