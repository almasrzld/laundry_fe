import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
      <div className="max-w-3xl w-full flex flex-col items-center text-center space-y-6">
        {/* 404 Graphic Illustration (Larger & Prominent) */}
        <div className="relative w-full max-w-xl sm:max-w-2xl aspect-[780/435] flex items-center justify-center">
          <Image
            src="/images/404-graphic.png"
            alt="404 Page Not Found"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-contain pointer-events-none"
          />
        </div>

        {/* Text Content */}
        <div className="space-y-3 pt-2">
          <h1 className="text-base sm:text-lg md:text-xl font-normal text-slate-900 tracking-normal">
            We are sorry, but the page you are looking for can not be found.
          </h1>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Home size={14} />
            <span>Kembali ke Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
