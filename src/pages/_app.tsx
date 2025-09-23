import "../styles/globals.css";
import type { AppProps } from "next/app";
import React from "react";
import Sidebar from "../components/Sidebar";
import { ToastItem, useToast } from "../components/Toast";

export default function MyApp({ Component, pageProps }: AppProps & { Component: any }) {
  const { toasts, addToast, removeToast } = useToast();

  // Pass addToast to pages via pageProps
  const injectedProps = { ...(pageProps || {}), addToast };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <Sidebar />

      <main className="flex-1 p-8 overflow-auto">
        <Component {...injectedProps} />
      </main>

      {/* Toast Container */}
      <div className="fixed top-6 right-6 space-y-3 z-50">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
