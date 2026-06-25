export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <p className="text-8xl font-extrabold text-neutral-200">404</p>
      <h1 className="text-xl font-bold text-neutral-800">This page doesn’t exist.</h1>
      <a href="/" className="px-6 py-3 bg-[#6c47ff] text-white font-bold rounded-2xl hover:bg-[#5a35e0] transition">
        ← Go Home
      </a>
    </div>
  );
}
