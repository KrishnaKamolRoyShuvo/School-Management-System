import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdmissionProvider } from './context/AdmissionContext';
import { Navbar } from './components/Navbar';
import { ClassListPage } from './pages/ClassListPage';
import { HoldCountdownPage } from './pages/HoldCountdownPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { AdminPortalPage } from './pages/AdminPortalPage';

export const App: React.FC = () => {
  return (
    <AdmissionProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<ClassListPage />} />
              <Route path="/applications/:holdId" element={<HoldCountdownPage />} />
              <Route path="/my-applications" element={<MyApplicationsPage />} />
              <Route path="/admin" element={<AdminPortalPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
            <div>Onnorokom Ideal School · Admission Management System</div>
          </footer>
        </div>
      </BrowserRouter>
    </AdmissionProvider>
  );
};

export default App;
