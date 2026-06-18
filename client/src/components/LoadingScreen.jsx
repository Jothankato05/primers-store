export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <img src="/primers-logo.svg" alt="Primers" className="h-12 mx-auto mb-6 opacity-80" />
        <div className="w-8 h-8 border-[3px] border-primer-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
