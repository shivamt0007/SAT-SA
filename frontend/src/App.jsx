import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getBatches, getDemoScenarios } from './api';

import Sidebar from './components/sidebar';
import Header from './components/header';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/loginPage';
import OverviewPage from './pages/OverviewPage';
import EntitiesPage from './pages/EntitiesPage';
import DrilldownPage from './pages/DrilldownPage';
import FindingsPage from './pages/FindingsPage';
import NegativeSpacePage from './pages/NegativeSpacePage';
import ExecutionGapsPage from './pages/ExecutionGapsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import EvidencePage from './pages/EvidencePage';
import ReportsPage from './pages/ReportsPage';
import DataQualityPage from './pages/DataQualityPage';
import ReviewQueuePage from './pages/ReviewQueuePage';
import TriagePoliciesPage from './pages/TriagePoliciesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('sat_sa_logged_in') === 'true';
  });
  const [batchId, setBatchId] = useState(() => {
    return localStorage.getItem('sat_sa_active_batch') || null;
  });
  const [batches, setBatches] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function initBatch() {
      try {
        const res = await getBatches();
        const list = res.data || [];
        setBatches(list);
        if (list.length > 0) {
          // If current batchId is not valid or empty, pick the most recent batch
          const exists = list.some(b => b.batch_id === batchId);
          if (!batchId || !exists) {
            const defaultId = list[0].batch_id;
            setBatchId(defaultId);
            localStorage.setItem('sat_sa_active_batch', defaultId);
          }
        }
      } catch (e) {
        // Fallback gracefully
      }
    }
    initBatch();
  }, []);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [bRes, sRes] = await Promise.all([getBatches(), getDemoScenarios()]);
        setBatches(bRes.data || []);
        setScenarios(sRes.data || []);
      } catch (e) {
        // Fallback gracefully
      }
    }
    loadMetadata();
  }, [batchId]);
  const handleLogin = () => {
  setIsLoggedIn(true);
};

  const handleBatchChange = (newBatchId) => {
    setBatchId(newBatchId);
    if (newBatchId) {
      localStorage.setItem('sat_sa_active_batch', newBatchId);
    } else {
      localStorage.removeItem('sat_sa_active_batch');
    }
  };

  const handleSelectScenario = (sc) => {
    navigate(sc.target_route);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-mint-page to-mint-pageAlt font-sans text-mint-primaryText">

      {/* Primary application navigation */}
      <Sidebar
        batchId={batchId}
        batches={batches}
        onSelectBatch={handleBatchChange}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[256px]">

        {/* Compact contextual header */}
        <Header
         
  scenarios={scenarios}
  onSelectScenario={handleSelectScenario}
  onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
  onLogout={() => setIsLoggedIn(false)}
/>

        {/* Main Supervisory Operational Workspace */}
        <main className="flex-1">
         <Routes>
  {/* Login */}
  <Route
    path="/login"
    element={
      isLoggedIn ? (
        <Navigate to="/upload" replace />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )
    }
  />

  {/* Upload */}
  <Route
    path="/"
    element={
      isLoggedIn ? (
        <UploadPage onBatchReady={handleBatchChange} />
      ) : (
        <Navigate to="/login" replace />
      )
    }
  />

  <Route
    path="/upload"
    element={
      isLoggedIn ? (
        <UploadPage onBatchReady={handleBatchChange} />
      ) : (
        <Navigate to="/login" replace />
      )
    }
  />

  {/* Dashboard */}
  <Route
    path="/overview"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <OverviewPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/entities"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <EntitiesPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/ranking"
    element={<Navigate to="/entities" replace />}
  />

  <Route
    path="/entity/:cseId"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <DrilldownPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/findings"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <FindingsPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/review-queue"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <ReviewQueuePage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/triage-policies"
    element={
      isLoggedIn ? (
        <TriagePoliciesPage />
      ) : (
        <Navigate to="/login" replace />
      )
    }
  />

  <Route
    path="/negative-space"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <NegativeSpacePage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/execution-gaps"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <ExecutionGapsPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/analytics"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <AnalyticsPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/evidence"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <EvidencePage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/reports"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <ReportsPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  <Route
    path="/data-quality"
    element={
      !isLoggedIn ? (
        <Navigate to="/login" replace />
      ) : batchId ? (
        <DataQualityPage batchId={batchId} />
      ) : (
        <Navigate to="/upload" replace />
      )
    }
  />

  {/* Unknown route */}
  <Route
    path="*"
    element={
      <Navigate
        to={
          !isLoggedIn
            ? "/login"
            : batchId
              ? "/overview"
              : "/upload"
        }
        replace
      />
    }
  />
</Routes>
        </main>

        {/* Global Supervisory System Footer */}
        <footer className="border-t border-mint-border bg-white py-3 px-6 text-center text-xs text-mint-secondaryText font-mono flex flex-wrap items-center justify-between gap-2 print:hidden">
          <span>
            SAT-SA · Supervisory Analytics Tool for SOC Assessment · Version 1.2
          </span>
          <span className="text-mint-secondary text-[11px]">
            NCIIPC / NTRO Framework Compliance · Air-Gapped Verification Engine
          </span>
        </footer>

      </div>
    </div>
  );
}