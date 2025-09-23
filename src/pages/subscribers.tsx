import React, { useState, useEffect } from "react";
import * as Papa from "papaparse";

type CSVRow = { email: string; name?: string };

export default function SubscribersPage({ addToast }: { addToast?: (msg: string, type?: string) => void }) {
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const CHUNK_SIZE = 100; // rows per chunk

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("upload-progress") : null;
    if (saved) setUploadedCount(Number(saved));
  }, []);

  async function uploadChunk(rows: CSVRow[]) {
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribers: rows }),
      });
      const json = await res.json();
      const added = json.inserted ?? json.count ?? rows.length;
      setUploadedCount((prev) => {
        const updated = prev + added;
        if (typeof window !== "undefined") localStorage.setItem("upload-progress", updated.toString());
        return updated;
      });
    } catch (err) {
      console.error("Upload chunk failed", err);
      addToast?.("Upload failed for a chunk", "error");
    }
  }

  function handleFile(selectedFile: File) {
    setPreview([]);
    setUploadedCount(0);
    if (typeof window !== "undefined") localStorage.removeItem("upload-progress");

    Papa.parse(selectedFile as any, {
      header: true,
      skipEmptyLines: true,
      chunkSize: CHUNK_SIZE,
      chunk: (results: any) => {
        const data = (results.data || []) as CSVRow[];
        if (data.length) uploadChunk(data);
        // preview first 5 rows only
        setPreview((prev) => {
          const merged = [...prev, ...data].slice(0, 5);
          return merged;
        });
      },
      error: (error: any) => {
        console.error("CSV parse error:", error);
        addToast?.("CSV parse error: " + (error?.message ?? String(error)), "error");
      }
    });
    addToast?.("Started processing CSV", "info");
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function resetProgress() {
    if (typeof window !== "undefined") localStorage.removeItem("upload-progress");
    setUploadedCount(0);
    setPreview([]);
    addToast?.("Upload progress has been reset.", "info");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-gray-600 mt-1">Manage your email subscriber list</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{uploadedCount.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Subscribers</div>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Upload Subscribers
          </h2>
        </div>

        <div className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${isDragOver ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
          >
            <div className="mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">Drag & drop your CSV file here</p>
            <p className="text-gray-500 text-sm">Format: email, name (optional) • Chunked upload to server</p>
            <div className="mt-4">
              <label className="inline-block">
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}/>
                <span className="inline-block cursor-pointer mt-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg">Choose File</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
            <button onClick={resetProgress} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
              Reset Progress
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{row.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-green-50 border-t border-gray-100">
            <div className="flex items-center gap-2 text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span className="font-medium">Successfully uploaded {uploadedCount.toLocaleString()} subscribers</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
