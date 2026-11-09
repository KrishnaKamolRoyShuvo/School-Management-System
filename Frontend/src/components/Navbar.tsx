import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmission } from '../context/AdmissionContext';
import { ShieldCheck, Search, Globe, Menu, X, School } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useAdmission();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  const isActive = (path: string) => location.pathname === path;
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 min-w-0 group" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-9 h-9 rounded-sm bg-brand flex items-center justify-center text-white shrink-0 group-hover:bg-brand-dark transition-colors">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 leading-tight truncate sm:text-base text-sm">
              {t.schoolName}
            </div>
            <div className="text-xs text-slate-500 leading-none truncate hidden sm:block mt-0.5">
              {t.tagline}
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
              isActive('/')
                ? 'bg-brand-light text-brand font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.admissionPortal}
          </Link>

          <Link
            to="/my-applications"
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/my-applications')
                ? 'bg-brand-light text-brand font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t.checkStatus}</span>
          </Link>

          {isAdminRoute && (
            <span className="px-3 py-1.5 rounded-sm text-xs font-bold bg-amber-50 text-amber-850 border border-amber-300 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-amber-600" />
              <span>{t.administration}</span>
            </span>
          )}

          {/* Language Switcher */}
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <button
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            title="Switch Language / ভাষা পরিবর্তন"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className={language === 'en' ? 'font-bold text-brand' : 'text-slate-500'}>EN</span>
            <span className="text-slate-300">|</span>
            <span className={language === 'bn' ? 'font-bold text-brand' : 'text-slate-500'}>বাংলা</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 rounded-sm border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            {language === 'en' ? 'বাংলা' : 'EN'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-sm hover:bg-slate-100"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-sm text-sm font-semibold ${
              isActive('/') ? 'bg-brand-light text-brand' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.admissionPortal}
          </Link>

          <Link
            to="/my-applications"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-sm text-sm font-semibold ${
              isActive('/my-applications') ? 'bg-brand-light text-brand' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.checkStatus}
          </Link>

          {isAdminRoute && (
            <div className="px-3 py-2 rounded-sm text-sm font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-2">
              <School className="w-4 h-4 text-amber-600" />
              <span>{t.administration}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
