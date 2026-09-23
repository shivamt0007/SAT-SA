import { AlertCircle, X } from 'lucide-react';

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-md flex items-start justify-between gap-3 mb-6">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <div className="text-xs">
          <span className="font-semibold text-red-800 uppercase tracking-wide mr-1">System Error:</span>
          <span className="text-red-700">{message}</span>
        </div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-700 p-0.5 rounded">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}


