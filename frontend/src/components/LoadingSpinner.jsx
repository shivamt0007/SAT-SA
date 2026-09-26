export default function LoadingSpinner({ message = "Loading operational evidence..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="animate-spin rounded-full h-7 w-7 border-2 border-mint-200 border-t-brand-600 mb-2.5"></div>
      <p className="text-xs font-medium text-faint tracking-wide uppercase">{message}</p>
    </div>
  );
}

