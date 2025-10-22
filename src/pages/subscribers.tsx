// src/pages/subscribers.tsx - Modern Black Glossy Design
import React, { useState, useEffect } from "react";
import * as Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Upload, Search, Trash2, UserCheck, Users } from "lucide-react";

type CSVRow = { email: string; name?: string };
type Subscriber = { id: number; email: string; name?: string; created_at: string };

export default function SubscribersPage() {
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; subscriber?: Subscriber }>({ open: false });
  const CHUNK_SIZE = 100;
  const LIMIT = 50;

  useEffect(() => {
    fetchSubscribers();
  }, [currentPage]);

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
        toast.error("Failed to fetch subscribers");
      }
    } catch (err) {
      console.error("Fetch subscribers error:", err);
      toast.error("Error loading subscribers");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!deleteDialog.subscriber) return;

    const { id, email } = deleteDialog.subscriber;

    try {
      const res = await fetch(`/api/subscribers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`${email} removed successfully`);
        fetchSubscribers();
      } else {
        toast.error("Failed to remove subscriber");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Error removing subscriber");
    } finally {
      setDeleteDialog({ open: false });
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
      fetchSubscribers();
    } catch (err) {
      console.error("Upload chunk failed", err);
      toast.error("Upload failed for a chunk");
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
        toast.error("CSV parse error: " + (error?.message ?? String(error)));
      }
    });
    toast.info("Started processing CSV");
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
    toast.info("Upload progress has been reset");
  }

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
            Subscribers
          </h1>
          <p className="text-gray-400">Manage your email subscriber list</p>
        </div>

        {/* Stats Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
          <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                <Users className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{totalCount.toLocaleString()}</div>
                <p className="text-sm text-gray-400">Total Subscribers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribers List */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
        <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">All Subscribers</h2>
                <p className="text-gray-400 text-sm">View and manage your subscriber list</p>
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search email or name..."
                  className="w-64 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/50"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {/* Table */}
          <div className="p-6">
            {isLoading ? (
              <div className="py-20 text-center text-gray-400">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                Loading subscribers...
              </div>
            ) : subscribers.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                {searchQuery ? "No subscribers found matching your search." : "No subscribers yet. Upload a CSV to get started!"}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-400 font-semibold">Email</TableHead>
                        <TableHead className="text-gray-400 font-semibold">Name</TableHead>
                        <TableHead className="text-gray-400 font-semibold">Subscribed</TableHead>
                        <TableHead className="text-right text-gray-400 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscribers.map((sub) => (
                        <TableRow key={sub.id} className="border-gray-800 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{sub.email}</TableCell>
                          <TableCell className="text-gray-300">{sub.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-0">
                              {new Date(sub.created_at).toLocaleDateString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ open: true, subscriber: sub })}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      Page {currentPage} of {totalPages} ({totalCount} total)
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={`${
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer hover:bg-white/10 text-white"
                            } bg-gray-900/50 border-gray-700`}
                          />
                        </PaginationItem>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className={`cursor-pointer ${
                                  currentPage === page
                                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
                                    : "bg-gray-900/50 text-gray-300 hover:bg-white/10 border-gray-700"
                                }`}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={`${
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer hover:bg-white/10 text-white"
                            } bg-gray-900/50 border-gray-700`}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
        <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
              <Upload className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Upload Subscribers</h2>
              <p className="text-gray-400 text-sm">Import subscribers from a CSV file</p>
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center transition-all
              ${isDragOver
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 hover:border-gray-600 bg-gray-900/30"
              }
            `}
          >
            <Upload className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <p className="text-xl font-semibold text-white mb-2">Drag & drop your CSV file here</p>
            <p className="text-gray-400 mb-6">Format: email, name (optional)</p>
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-lg shadow-blue-500/50 text-lg px-8 py-6"
              >
                <span>Choose File</span>
              </Button>
            </label>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="mt-8 p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Upload Preview</h3>
                <Button
                  variant="destructive"
                  onClick={resetProgress}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reset Progress
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Email</TableHead>
                    <TableHead className="text-gray-400">Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i} className="border-gray-800">
                      <TableCell className="text-white">{row.email}</TableCell>
                      <TableCell className="text-gray-300">{row.name || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-3 text-green-400">
                  <UserCheck className="h-5 w-5" />
                  <span className="font-medium">Successfully uploaded {uploadedCount.toLocaleString()} subscribers</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Subscriber?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently remove <strong className="text-white">{deleteDialog.subscriber?.email}</strong> from your list.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnsubscribe}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 border-0 shadow-lg shadow-red-500/50"
            >
              Remove Subscriber
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
