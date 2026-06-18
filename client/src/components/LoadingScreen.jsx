export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primer-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading Primers Store...</p>
      </div>
    </div>
  );
}
