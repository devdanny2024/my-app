// src/pages/subscribers.tsx - Enhanced with list, search, and unsubscribe
import React, { useState, useEffect } from "react";
import * as Papa from "papaparse";

type CSVRow = { email: string; name?: string };
type Subscriber = { id: number; email: string; name?: string; created_at: string };

export default function SubscribersPage({ addToast }: { addToast?: (msg: string, type?: string) => void }) {
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const CHUNK_SIZE = 100;
  const LIMIT = 50;

  useEffect(() => {
    fetchSubscribers();
  }, [currentPage, searchQuery]);

  async function fetchSubscribers() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: LIMIT.toString(),
        ...(searchQuery && { search: searchQuery }),
      });

      const res = await fetch(`/api/subscribers?${params}`);
      const data = await res.json();

      if (res.ok) {
        setSubscribers(data.subscribers || []);
        setTotalCount(data.total || 0);
      } else {
        addToast?.("Failed to fetch subscribers", "error");
      }
    } catch (err) {
      console.error("Fetch subscribers error:", err);
      addToast?.("Error loading subscribers", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnsubscribe(id: number, email: string) {
    if (!confirm(`Remove ${email} from subscribers?`)) return;

    try {
      const res = await fetch(`/api/subscribers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast?.(`${email} removed successfully`, "success");
        fetchSubscribers();
      } else {
        addToast?.("Failed to remove subscriber", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      addToast?.("Error removing subscriber", "error");
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setCurrentPage(1);
    fetchSubscribers();
  }

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
      fetchSubscribers(); // Refresh list after upload
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
        setPreview((prev) => [...prev, ...data].slice(0, 5));
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

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-gray-600 mt-1">Manage your email subscriber list</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center sm:text-left">
          <div className="text-xl lg:text-2xl font-bold text-purple-600">{totalCount.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Subscribers</div>
        </div>
      </div>

      {/* Subscribers List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">All Subscribers</h2>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email or name..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading subscribers...</div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {searchQuery ? "No subscribers found matching your search." : "No subscribers yet. Upload a CSV to get started!"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-semibold text-gray-700">Subscribed</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900 break-all">{sub.email}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900">{sub.name || "-"}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-600">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-right">
                        <button
                          onClick={() => handleUnsubscribe(sub.id, sub.email)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Unsubscribe
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 lg:p-6 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} ({totalCount} total)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center gap-2">
            Upload Subscribers
          </h2>
        </div>

        <div className="p-4 lg:p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-8 lg:p-12 text-center transition-all duration-200 ${isDragOver ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
          >
            <div className="mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 lg:w-12 lg:h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-base lg:text-lg font-medium text-gray-700 mb-2">Drag & drop your CSV file here</p>
            <p className="text-gray-500 text-sm">Format: email, name (optional) • Chunked upload to server</p>
            <div className="mt-4">
              <label className="inline-block">
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}/>
                <span className="inline-block cursor-pointer mt-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 lg:px-6 py-2 rounded-lg text-sm lg:text-base">Choose File</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Upload Preview</h2>
            <button onClick={resetProgress} className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm lg:text-base">
              Reset Progress
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900 break-all">{row.email}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900">{row.name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 lg:p-6 bg-green-50 border-t border-gray-100">
            <div className="flex items-center gap-2 text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span className="font-medium text-sm lg:text-base">Successfully uploaded {uploadedCount.toLocaleString()} subscribers</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
