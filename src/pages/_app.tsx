// _app.tsx - Updated with responsive layout and shadcn
import "../styles/globals.css";
import type { AppProps } from "next/app";
import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function MyApp({ Component, pageProps }: AppProps & { Component: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
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
          <Component {...pageProps} />
        </div>
      </main>

      <Toaster />
    </div>
  );
}