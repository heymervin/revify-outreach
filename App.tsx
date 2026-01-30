import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { SettingsProvider } from './context/SettingsContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import EmailPage from './pages/EmailPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import BulkResearchPage from './pages/BulkResearchPage';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header />
        <main className="w-full flex-grow p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <SettingsProvider>
      <AppProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/research" replace />} />
              <Route path="/research" element={<Dashboard />} />
              <Route path="/bulk" element={<BulkResearchPage />} />
              <Route path="/email" element={<EmailPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AppProvider>
    </SettingsProvider>
  );
};

export default App;