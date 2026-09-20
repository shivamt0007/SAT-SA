import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 60000 });

export const uploadFiles = (formData, onProgress) => 
  api.post('/ingest', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });

export const runAnalysis = (batchId) =>
  api.post('/analyse', { batch_id: batchId });

export const getBatches = () =>
  api.get('/batches');

export const getOverview = (batchId) =>
  api.get('/overview', { params: { batch_id: batchId } });

export const getEntities = (batchId, filters = {}) =>
  api.get('/entities', { params: { batch_id: batchId, ...filters } });

export const getEntity = (cseId, batchId) =>
  api.get(`/entity/${cseId}`, { params: { batch_id: batchId } });

export const getNegativeSpace = (batchId) =>
  api.get('/negative-space', { params: { batch_id: batchId } });

export const getExecutionGaps = (batchId) =>
  api.get('/execution-gaps', { params: { batch_id: batchId } });

export const getFindings = (batchId, filters = {}) =>
  api.get('/findings', { params: { batch_id: batchId, ...filters } });

export const reviewFinding = (batchId, findingId, status, reviewer = 'Supervisor', notes = '') =>
  api.post('/findings/review', { batch_id: batchId, finding_id: findingId, status, reviewer, notes });

export const addNote = (batchId, cseId, note) =>
  api.post('/notes', { batch_id: batchId, cse_id: cseId, note });

export const getAnalyticsSummary = (batchId) =>
  api.get('/analytics/summary', { params: { batch_id: batchId } });

export const getDataQuality = (batchId) =>
  api.get('/data-quality', { params: { batch_id: batchId } });

export const getDemoScenarios = () =>
  api.get('/demo/scenarios');

export const getEvidence = (batchId, filters = {}) =>
  api.get('/evidence', { params: { batch_id: batchId, ...filters } });

export const getSupervisoryReport = (batchId) =>
  api.get('/report', { params: { batch_id: batchId } });

// Systemic Patterns
export const getSystemicPatterns = (batchId) =>
  api.get('/systemic-patterns', { params: { batch_id: batchId } });

// Capability Profile
export const getCapabilityProfile = (cseId, batchId) =>
  api.get(`/entity/${cseId}/capability-profile`, { params: { batch_id: batchId } });

// Trend & Recurrence
export const getTrend = (cseId, batchId) =>
  api.get(`/entity/${cseId}/trend`, { params: { batch_id: batchId } });

// Advisory Letters
export const generateAdvisory = (cseId, batchId, supervisoryDirective = '') =>
  api.post(`/entity/${cseId}/generate-advisory`, { batch_id: batchId, supervisory_directive: supervisoryDirective });

export const getAdvisories = (batchId, cseId = null) =>
  api.get('/advisories', { params: { batch_id: batchId, cse_id: cseId } });

export const updateAdvisory = (id, data) =>
  api.patch(`/advisories/${id}`, data);

export const getAdvisoryPdfUrl = (id) => `/api/advisories/${id}/export-pdf`;

// Sampling Plan & Review Queue
export const getSamplingPlan = (batchId, totalSampleSize = 50) =>
  api.get('/sampling-plan', { params: { batch_id: batchId, total_sample_size: totalSampleSize } });

export const updateSampleReview = (batchId, evidenceId, reviewed, reviewer = 'Supervisor', notes = '') =>
  api.post('/sampling-plan/review', { batch_id: batchId, evidence_id: evidenceId, reviewed, reviewer, notes });

// Triage Policies
export const getTriagePolicies = () =>
  api.get('/triage-policies');

export const createTriagePolicy = (policy) =>
  api.post('/triage-policies', policy);

export const updateTriagePolicy = (id, data) =>
  api.patch(`/triage-policies/${id}`, data);

export const deleteTriagePolicy = (id) =>
  api.delete(`/triage-policies/${id}`);

