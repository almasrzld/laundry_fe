"use client";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Almas Laundry";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

  return (
    <footer className="sticky bottom-0 z-30 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 flex items-center shadow-xs transition-all duration-300">
      <div className="flex items-center justify-between w-full text-[11px] text-slate-400">
        <span>
          &copy; {currentYear}{" "}
          <span className="font-medium text-slate-500">{appName}</span> — Admin
          Management System
        </span>
        <span className="font-mono text-[10px] tracking-wide text-slate-500">
          v{appVersion}
        </span>
      </div>
    </footer>
  );
};
