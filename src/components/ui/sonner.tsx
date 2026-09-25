"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-50 group-[.toaster]:border-slate-800 group-[.toaster]:rounded-xl text-sm font-medium",
          description: "group-[.toast]:text-slate-400 text-xs",
          actionButton:
            "group-[.toast]:bg-sky-600 group-[.toast]:text-white text-xs font-semibold rounded-lg",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-300 text-xs rounded-lg",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
