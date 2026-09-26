import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileType, CheckCircle, XCircle, Info, Database, PlayCircle, ArrowRight } from 'lucide-react';
import { uploadFiles, runAnalysis, getBatches } from '../api';
import ErrorBanner from '../components/ErrorBanner';

export default function UploadPage({ onBatchReady }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [existingBatches, setExistingBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadBatches() {
      try {
        setLoadingBatches(true);
        const res = await getBatches();
        setExistingBatches(res.data || []);
      } catch (e) {
        // Silent fallback
      } finally {
        setLoadingBatches(false);
      }
    }
    loadBatches();
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await uploadFiles(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!summary?.batch_id) return;
    setAnalysing(true);
    setError(null);

    try {
      await runAnalysis(summary.batch_id);
      if (onBatchReady) {
        onBatchReady(summary.batch_id);
      }
      navigate('/overview');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Analysis pipeline failed');
      setAnalysing(false);
    }
  };

  const handleSelectExistingBatch = (b) => {
    if (onBatchReady) {
      onBatchReady(b.batch_id);
    }
    navigate('/overview');
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-5 space-y-5">

      {/* Page Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
            <Upload className="w-4 h-4" />
            Data Ingestion Gateway
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Ingest SOC Evidence Data
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Submit Critical Sector Entity (CSE) alerts, investigation cases, and asset catalogs for supervisory analysis.
          </p>
        </div>
      </div>

      {/* Ingest workflow: Upload → Validate → Analyze */}
      <div className="flex items-center gap-2" aria-label="Ingestion workflow steps">
        {[
          { n: 1, label: 'Upload' },
          { n: 2, label: 'Validate' },
          { n: 3, label: 'Analyze' },
        ].map((step, i) => {
          const state = summary === null
            ? (step.n === 1 ? 'active' : 'upcoming')
            : (analysing
                ? (step.n === 3 ? 'active' : 'done')
                : (step.n === 1 || step.n === 2 ? 'done' : 'upcoming'));
          return (
            <React.Fragment key={step.n}>
              {i > 0 && <span className="w-5 h-px bg-slate-300" aria-hidden="true"></span>}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold border ${
                state === 'active' ? 'border-blue-600 bg-blue-50 text-blue-800'
                : state === 'done' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-paper text-slate-500'
              }`}>
                <span className="font-mono text-[10px]">{String(step.n).padStart(2, '0')}</span>
                {step.label}
                {state === 'done' && <CheckCircle className="w-3 h-3" />}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Quick Launch Card for Existing / Sample Datasets */}
      {existingBatches.length > 0 && !summary && (
        <div className="bg-paper border border-line rounded-md p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Pre-Analysed Evaluation Datasets Available
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
              Ready for Instant Review
            </span>
          </div>
          
          <p className="text-xs text-slate-600 mb-4">
            A comprehensive Smart India Hackathon verification dataset has already been analyzed and is ready in your local database:
          </p>

          <div className="space-y-2">
            {existingBatches.slice(0, 3).map((b) => (
              <div
                key={b.batch_id}
                className="flex items-center justify-between bg-paper border border-line hover:border-blue-300 rounded p-3 text-xs transition-colors shadow-2xs"
              >
                <div>
                  <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                    BATCH-{b.batch_id.slice(0, 8)}
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {b.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {b.cse_count} CSE Entities · {b.alert_count} Alerts Ingested
                  </div>
                </div>

                <button
                  onClick={() => handleSelectExistingBatch(b)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-paper text-blue-800 border border-slate-300 hover:bg-blue-50 hover:border-slate-400 transition-colors"
                >
                  Load Assessment
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Upload Zone */}
      {!summary ? (
        <div className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer bg-paper ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              accept=".csv,.json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Upload className="w-9 h-9 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">
              Drop files here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              …or click to browse. CSV / JSON for alert logs, incident cases, and asset inventories.
            </p>
            <p className="mt-4 flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">CSV</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">JSON</span>
            </p>
          </div>

          {files.length > 0 && (
            <div className="bg-paper rounded-md p-3.5 border border-line">
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-3">
                Staged Evidence Files ({files.length})
              </h3>
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between bg-slate-50 p-2.5 rounded border border-line text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileType className="w-4 h-4 text-blue-700" />
                      <span className="font-medium text-slate-800">{f.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-end gap-4 pt-3 border-t border-line">
                {uploading && (
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-line">
                      <div className="bg-blue-600 h-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-10">{progress}%</span>
                  </div>
                )}
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
                >
                  {uploading ? 'Ingesting Files...' : 'Ingest Staged Files'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-paper rounded-md p-5 border border-line space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-ink">Ingestion Verified & Parsed</h2>
              <p className="text-xs font-mono text-slate-500">Batch ID: {summary.batch_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-line p-4 rounded text-center">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Alerts Parsed</span>
              <p className="text-xl font-bold text-ink mt-1">{summary.records_parsed?.alerts || 0}</p>
            </div>
            <div className="bg-slate-50 border border-line p-4 rounded text-center">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Cases Parsed</span>
              <p className="text-xl font-bold text-ink mt-1">{summary.records_parsed?.cases || 0}</p>
            </div>
            <div className="bg-slate-50 border border-line p-4 rounded text-center">
              <span className="text-[11px] font-semibold uppercase text-slate-500">Assets Parsed</span>
              <p className="text-xl font-bold text-ink mt-1">{summary.records_parsed?.assets || 0}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleRunAnalysis}
              disabled={analysing}
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-[9px] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-card"
            >
              {analysing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Executing Feature Engineering & Scoring...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Run Supervisory Assessment Pipeline
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Format Tips */}
      <div className="bg-paper border border-line rounded-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
            Mandatory Schema Fields Reference
          </h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded border border-line">
            <span className="font-bold text-slate-800 block mb-1">Alerts Stream</span>
            <ul className="list-disc list-inside text-slate-600 font-mono text-[11px] space-y-0.5">
              <li>alert_id</li>
              <li>cse_id</li>
              <li>category</li>
              <li>severity</li>
              <li>created_at</li>
              <li>closed_at</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-3 rounded border border-line">
            <span className="font-bold text-slate-800 block mb-1">Investigation Cases</span>
            <ul className="list-disc list-inside text-slate-600 font-mono text-[11px] space-y-0.5">
              <li>case_id</li>
              <li>cse_id</li>
              <li>status</li>
              <li>resolution</li>
              <li>escalated (bool)</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-3 rounded border border-line">
            <span className="font-bold text-slate-800 block mb-1">Asset Catalog</span>
            <ul className="list-disc list-inside text-slate-600 font-mono text-[11px] space-y-0.5">
              <li>asset_id</li>
              <li>cse_id</li>
              <li>criticality</li>
              <li>os_type</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
