// src/pages/subscribers.tsx - Redesigned with shadcn/ui
import React, { useState, useEffect } from "react";
import * as Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Search, Trash2, UserCheck } from "lucide-react";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-muted-foreground mt-1">Manage your email subscriber list</p>
        </div>
        <Card className="sm:w-auto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalCount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Subscribers</CardTitle>
              <CardDescription>View and manage your subscriber list</CardDescription>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email or name..."
                className="w-64"
              />
              <Button type="submit" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading subscribers...
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {searchQuery ? "No subscribers found matching your search." : "No subscribers yet. Upload a CSV to get started!"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>{sub.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, subscriber: sub })}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Unsubscribe
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({totalCount} total)
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        {totalPages > 5 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Subscribers
          </CardTitle>
          <CardDescription>Import subscribers from a CSV file</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${isDragOver ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-gray-400"}
            `}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">Drag & drop your CSV file here</p>
            <p className="text-sm text-muted-foreground mb-4">Format: email, name (optional)</p>
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button asChild>
                <span>Choose File</span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Preview</CardTitle>
                <CardDescription>First 5 rows from your CSV</CardDescription>
              </div>
              <Button variant="destructive" onClick={resetProgress}>
                Reset Progress
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell>{row.name || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <UserCheck className="h-5 w-5" />
                <span className="font-medium">Successfully uploaded {uploadedCount.toLocaleString()} subscribers</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteDialog.subscriber?.email}</strong> from your subscriber list.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsubscribe} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Subscriber
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
