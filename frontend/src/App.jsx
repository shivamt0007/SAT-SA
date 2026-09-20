import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getBatches } from './api';

import Navbar from './components/Navbar';
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
  const [batchId, setBatchId] = useState(() => {
    return localStorage.getItem('sat_sa_active_batch') || null;
  });

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

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        
        {/* Global Government/Enterprise Supervisory Header */}
        <Navbar batchId={batchId} onBatchChange={handleBatchChange} />

        {/* Main Supervisory Operational Workspace */}
        <main className="flex-1 min-h-[calc(100vh-80px)]">
          <Routes>

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
              element={<Navigate to={batchId ? "/overview" : "/"} replace />}
            />

          </Routes>
        </main>

        {/* Global Supervisory System Footer */}
        <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-500 font-mono flex flex-wrap items-center justify-between gap-2 print:hidden">
          <span>
            SAT-SA · Supervisory Analytics Tool for SOC Assessment · Version 1.2
          </span>
          <span className="text-slate-400 text-[11px]">
            NCIIPC / NTRO Framework Compliance · Air-Gapped Verification Engine
          </span>
        </footer>

      </div>
    </BrowserRouter>
  );
}