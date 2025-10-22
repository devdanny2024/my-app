// src/pages/templates.tsx - Modern black glossy redesign
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Eye, EyeOff, Edit, Trash2, Plus, FileText } from "lucide-react";

type Template = { id: number; name: string; subject: string; body: string };

type DebugInfo = {
  basicTest?: any;
  supabaseTest?: any;
  lastError?: any;
  lastSuccess?: any;
  lastFetchError?: string;
};

export default function TemplatesPage({ addToast }: { addToast?: (msg: string, type?: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: Template | null }>({ open: false, template: null });

  // Test functions for debugging
  async function testBasicAPI() {
    try {
      const res = await fetch("/api/templates?test=basic");
      const data = await res.json();
      console.log('Basic API test:', data);
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, basicTest: data }));
      toast.success("Basic API test successful");
    } catch (err) {
      console.error('Basic API test failed:', err);
      toast.error("Basic API test failed");
    }
  }

  async function testSupabaseConnection() {
    try {
      const res = await fetch("/api/templates?test=supabase");
      const data = await res.json();
      console.log('Supabase test:', data);
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, supabaseTest: data }));
      toast.success("Supabase test successful");
    } catch (err) {
      console.error('Supabase test failed:', err);
      toast.error("Supabase test failed");
    }
  }

  async function fetchTemplates() {
    try {
      console.log('Fetching templates...');
      const res = await fetch("/api/templates");

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);

        try {
          const errorJson = JSON.parse(errorText);
          setDebugInfo((prev: DebugInfo | null) => ({ ...prev, lastError: errorJson }));
        } catch {
          setDebugInfo((prev: DebugInfo | null) => ({ ...prev, lastError: { rawError: errorText } }));
        }

        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      console.log('Fetched templates:', json);
      setTemplates(json || []);
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, lastSuccess: json }));

    } catch (err) {
      console.error('Fetch error:', err);
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, lastFetchError: err instanceof Error ? err.message : String(err) }));
      toast.error("Failed to fetch templates");
    }
  }

  useEffect(() => { 
    fetchTemplates(); 
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      const payload = { name, subject, body };
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/templates/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update template");
        toast.success("Template updated successfully");
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save template");
        toast.success("Template created successfully");
      }
      await fetchTemplates();
      setName(""); setSubject(""); setBody(""); setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save template");
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteDialog.template) return;
    try {
      const res = await fetch(`/api/templates/${deleteDialog.template.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchTemplates();
      toast.success(`Template "${deleteDialog.template.name}" deleted`);
      setDeleteDialog({ open: false, template: null });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete template");
    }
  }

  function editTemplate(t: Template) {
    setName(t.name); setSubject(t.subject); setBody(t.body); setEditingId(t.id);
    toast.info("Template loaded for editing");
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Email Templates</h1>
          <p className="text-gray-400 mt-1">Create and manage your email templates</p>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
        <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden">
          <div className="p-4 lg:p-6">
            <h3 className="text-base lg:text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Debug Panel
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Button onClick={testBasicAPI} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-lg shadow-blue-500/50">
                Test Basic API
              </Button>
              <Button onClick={testSupabaseConnection} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0 shadow-lg shadow-green-500/50">
                Test Supabase
              </Button>
              <Button onClick={fetchTemplates} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/50">
                Retry Fetch Templates
              </Button>
            </div>

            {debugInfo && (
              <div className="bg-black/60 border border-gray-700 rounded-xl p-4 text-xs overflow-auto max-h-40">
                <pre className="text-gray-300">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Create Template Form */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
          <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-gray-800">
              <h2 className="text-lg lg:text-xl font-semibold text-white flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingId ? "Edit Template" : "Create Template"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-4 lg:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Template Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g., Welcome Email"
                  className="bg-black/60 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="e.g., Welcome to our platform!"
                  className="bg-black/60 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">HTML Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  placeholder="Enter your HTML template here..."
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-black/60 border border-gray-700 text-white placeholder:text-gray-500 rounded-xl h-32 lg:h-40 font-mono text-xs lg:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/50">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Save'} Template
                </Button>
                <Button type="button" onClick={() => setPreview((p) => !p)} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                  {preview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {preview ? "Hide" : "Preview"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
          <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-gray-800">
              <h2 className="text-lg lg:text-xl font-semibold text-white flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </h2>
            </div>

            <div className="p-4 lg:p-6">
              {preview && body ? (
                <div className="border border-gray-700 rounded-xl overflow-hidden">
                  <iframe
                    title="Template Preview"
                    className="w-full h-60 lg:h-80 border-0 bg-white"
                    srcDoc={`<html><head><style>body{font-family:system-ui,sans-serif;padding:20px;margin:0;}</style></head><body>${body}</body></html>`}
                  />
                </div>
              ) : (
                <div className="h-60 lg:h-80 border border-gray-700 rounded-xl flex items-center justify-center bg-black/60">
                  <div className="text-center text-gray-400">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Preview will appear here</p>
                    <p className="text-sm mt-1">Add content and click Preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Saved Templates */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
        <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-semibold text-white">Saved Templates</h2>
              <Badge variant="outline" className="border-gray-700 text-gray-300">
                {templates.length} {templates.length === 1 ? 'template' : 'templates'}
              </Badge>
            </div>
          </div>

          <div className="divide-y divide-gray-800">
            {templates.length === 0 ? (
              <div className="p-8 lg:p-12 text-center text-gray-400">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No templates found</p>
                <p className="text-sm mt-2">Create your first template above</p>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="p-4 lg:p-6 hover:bg-white/5 transition flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base lg:text-lg font-semibold text-white mb-2">{t.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">Subject: {t.subject}</p>
                    <Badge variant="outline" className="border-gray-700 text-gray-300 text-xs">
                      HTML Template
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={() => editTemplate(t)} variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white hover:border-purple-600">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button onClick={() => setDeleteDialog({ open: true, template: t })} variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-red-600 hover:text-white hover:border-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, template: null })}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Template</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{deleteDialog.template?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 border-0">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}