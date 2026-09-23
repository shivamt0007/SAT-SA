export default function LoadingSpinner({ message = "Loading operational evidence..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-700 mb-3"></div>
      <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">{message}</p>
    </div>
  );
}


