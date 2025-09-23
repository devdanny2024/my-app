import React, { useState } from "react";
import { X, Check, AlertCircle, Info } from "lucide-react";

/**
 * Toast component and hook.
 *
 * Use `useToast()` in _app and pass addToast to pages via props,
 * or export/use the hook where needed.
 */

export type ToastType = "success" | "error" | "warning" | "info";
export type ToastShape = { id: number; message: string; type: ToastType };

export function ToastItem({ toast, onClose }: { toast: ToastShape; onClose: (id: number) => void }) {
  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <X className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  } as const;

  const colors = {
    success: "bg-emerald-500 border-emerald-400",
    error: "bg-red-500 border-red-400",
    warning: "bg-amber-500 border-amber-400",
    info: "bg-blue-500 border-blue-400"
  } as const;

  return (
    <div className={`${colors[toast.type]} text-white px-6 py-4 rounded-xl shadow-2xl border-2 flex items-center gap-3`}>
      {icons[toast.type]}
      <span className="font-medium">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="ml-auto hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastShape[]>([]);

  function addToast(message: string, type: ToastType = "info") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
    return id;
  }

  function removeToast(id: number) {
    setToasts((s) => s.filter((t) => t.id !== id));
  }

  return { toasts, addToast, removeToast };
}
