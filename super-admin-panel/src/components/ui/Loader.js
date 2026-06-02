export default function Loader() {
  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="relative">
        <div className="h-16 w-16 border-4 border-indigo-100 rounded-full"></div>
        <div className="absolute top-0 left-0 h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <p className="text-indigo-600 font-bold text-sm tracking-widest animate-pulse">
            LOADING...
          </p>
        </div>
      </div>
    </div>
  );
}
