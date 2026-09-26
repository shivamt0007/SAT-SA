import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getBatches } from './api';

import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
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

function getOperator() {
  try {
    const raw = localStorage.getItem('sat_sa_operator');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [batchId, setBatchId] = useState(() => {
    return localStorage.getItem('sat_sa_active_batch') || null;
  });
  const [operator, setOperator] = useState(getOperator);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function initBatch() {
      try {
        const res = await getBatches();
        const list = res.data || [];
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

  const handleBatchChange = (newBatchId) => {
    setBatchId(newBatchId);
    if (newBatchId) {
      localStorage.setItem('sat_sa_active_batch', newBatchId);
    } else {
      localStorage.removeItem('sat_sa_active_batch');
    }
  };

  const handleSignIn = (op) => {
    localStorage.setItem('sat_sa_operator', JSON.stringify(op));
    setOperator(op);
    navigate('/overview', { replace: true });
  };

  const handleSignOut = () => {
    localStorage.removeItem('sat_sa_operator');
    localStorage.removeItem('sat_sa_active_batch');
    setOperator(null);
    setBatchId(null);
    navigate('/login', { replace: true });
  };

  // Workspace access gate — authenticates against the frontend session only.
  // No backend endpoint is currently wired; see LoginPage for the plug-in point.
  if (!operator) {
    return <LoginPage onSignIn={handleSignIn} />;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">

      {/* Primary navigation — fixed left sidebar (drawer on mobile) */}
      <Sidebar
        batchId={batchId}
        onBatchChange={handleBatchChange}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
      />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">

        {/* Compact contextual header */}
        <TopHeader onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Main Supervisory Operational Workspace */}
        <main className="flex-1 bg-surface min-h-[calc(100vh-80px)]">
          <div key={location.pathname} className="page-enter">
            <Routes>
              {/* Sign-out landing */}
              <Route
                path="/login"
                element={<Navigate to={batchId ? '/overview' : '/'} replace />}
              />

              {/* Ingestion Gateway */}
              <Route
                path="/"
                element={<UploadPage onBatchReady={handleBatchChange} />}
              />
              <Route
                path="/upload"
                element={<UploadPage onBatchReady={handleBatchChange} />}
              />

              {/* Executive Overview */}
              <Route
                path="/overview"
                element={
                  batchId ? (
                    <OverviewPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Entity Registry */}
              <Route
                path="/entities"
                element={
                  batchId ? (
                    <EntitiesPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Backward Compatibility for /ranking */}
              <Route
                path="/ranking"
                element={<Navigate to="/entities" replace />}
              />

              {/* Individual Entity Supervisory Dossier */}
              <Route
                path="/entity/:cseId"
                element={
                  batchId ? (
                    <DrilldownPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Unified Supervisory Findings Registry & Triage */}
              <Route
                path="/findings"
                element={
                  batchId ? (
                    <FindingsPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Risk-Weighted Stratified Sample Review Queue */}
              <Route
                path="/review-queue"
                element={
                  batchId ? (
                    <ReviewQueuePage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Auto-Triage Policy Configuration */}
              <Route
                path="/triage-policies"
                element={<TriagePoliciesPage />}
              />

              {/* Negative-Space Analysis */}
              <Route
                path="/negative-space"
                element={
                  batchId ? (
                    <NegativeSpacePage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Execution Gaps Audit */}
              <Route
                path="/execution-gaps"
                element={
                  batchId ? (
                    <ExecutionGapsPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Cross-Entity Analytics & 3D Topology */}
              <Route
                path="/analytics"
                element={
                  batchId ? (
                    <AnalyticsPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Operational Evidence Explorer */}
              <Route
                path="/evidence"
                element={
                  batchId ? (
                    <EvidencePage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Official Audit Report */}
              <Route
                path="/reports"
                element={
                  batchId ? (
                    <ReportsPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Data Quality & Schema Compliance */}
              <Route
                path="/data-quality"
                element={
                  batchId ? (
                    <DataQualityPage batchId={batchId} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Catch-all Fallback */}
              <Route
                path="*"
                element={<Navigate to={batchId ? '/overview' : '/'} replace />}
              />
            </Routes>
          </div>
        </main>
      </div>

    </div>
  );
}