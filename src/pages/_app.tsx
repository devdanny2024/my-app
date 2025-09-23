// _app.tsx - Updated with responsive layout
import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { ToastItem, useToast } from "../components/Toast";

export default function MyApp({ Component, pageProps }: AppProps & { Component: any }) {
  const { toasts, addToast, removeToast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pass addToast to pages via pageProps
  const injectedProps = { ...(pageProps || {}), addToast };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className={`
        flex-1 p-4 lg:p-8 overflow-auto
        transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'lg:ml-0' : ''}
      `}>
        <div className="pt-16 lg:pt-0">
          <Component {...injectedProps} />
        </div>
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