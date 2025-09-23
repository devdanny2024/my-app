// src/pages/templates.tsx - Responsive version
import React, { useEffect, useState } from "react";

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

  // Test functions for debugging
  async function testBasicAPI() {
    try {
      const res = await fetch("/api/templates?test=basic");
      const data = await res.json();
      console.log('Basic API test:', data);
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, basicTest: data }));
      addToast?.("Basic API test successful", "success");
    } catch (err) {
      console.error('Basic API test failed:', err);
      addToast?.("Basic API test failed", "error");
    }
  }

  async function testSupabaseConnection() {
    try {
      const res = await fetch("/api/templates?test=supabase");
      const data = await res.json();
      console.log('Supabase test:', data);
      setDebugInfo((prev: DebugInfo | null) => ({ ...prev, supabaseTest: data }));
      addToast?.("Supabase test successful", "success");
    } catch (err) {
      console.error('Supabase test failed:', err);
      addToast?.("Supabase test failed", "error");
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
      addToast?.("Failed to fetch templates", "error");
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
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save template");
      }
      await fetchTemplates();
      setName(""); setSubject(""); setBody(""); setEditingId(null);
      addToast?.("Template saved", "success");
    } catch (err) {
      console.error(err);
      addToast?.("Failed to save template", "error");
    }
  }

  async function deleteTemplate(id: number) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchTemplates();
      addToast?.("Template deleted", "success");
    } catch (err) {
      console.error(err);
      addToast?.("Failed to delete template", "error");
    }
  }

  function editTemplate(t: Template) {
    setName(t.name); setSubject(t.subject); setBody(t.body); setEditingId(t.id);
    addToast?.("Template loaded for editing", "info");
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage your email templates</p>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-base lg:text-lg font-semibold text-yellow-800 mb-4">Debug Panel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <button onClick={testBasicAPI} className="bg-blue-500 text-white px-4 py-2 rounded text-sm lg:text-base">
            Test Basic API
          </button>
          <button onClick={testSupabaseConnection} className="bg-green-500 text-white px-4 py-2 rounded text-sm lg:text-base">
            Test Supabase
          </button>
          <button onClick={fetchTemplates} className="bg-purple-500 text-white px-4 py-2 rounded text-sm lg:text-base">
            Retry Fetch Templates
          </button>
        </div>
        
        {debugInfo && (
          <div className="bg-white rounded p-4 text-xs overflow-auto max-h-40">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Form + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Create Template</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-xl text-sm lg:text-base" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
              <input 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                required 
                className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-xl text-sm lg:text-base" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HTML Body</label>
              <textarea 
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
                required 
                className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-xl h-32 lg:h-40 font-mono text-xs lg:text-sm resize-none" 
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-sm lg:text-base">
                {editingId ? 'Update' : 'Save'} Template
              </button>
              <button type="button" onClick={() => setPreview((p) => !p)} className="px-4 lg:px-6 py-2 lg:py-3 border rounded-xl text-sm lg:text-base">
                {preview ? "Hide" : "Preview"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Live Preview</h2>
          </div>

          <div className="p-4 lg:p-6">
            {preview && body ? (
              <div className="border rounded-xl overflow-hidden">
                <iframe
                  title="Template Preview"
                  className="w-full h-60 lg:h-80 border-0"
                  srcDoc={`<html><head><style>body{font-family:system-ui,sans-serif;padding:20px;margin:0;}</style></head><body>${body}</body></html>`}
                />
              </div>
            ) : (
              <div className="h-60 lg:h-80 border rounded-xl flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <p>Preview will appear here</p>
                  <p className="text-sm">Add content and click Preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Templates */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Saved Templates</h2>
          <p className="text-sm text-gray-500">Found {templates.length} template(s)</p>
        </div>

        <div className="divide-y divide-gray-100">
          {templates.length === 0 ? (
            <div className="p-4 lg:p-6 text-center text-gray-500">
              <p>No templates found</p>
              <p className="text-sm">Create your first template above</p>
            </div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="p-4 lg:p-6 hover:bg-gray-50 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-1">{t.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">Subject: {t.subject}</p>
                  <div className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 inline-block">HTML Template</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => editTemplate(t)} className="px-3 lg:px-4 py-2 text-gray-600 hover:text-purple-600 rounded-lg text-sm lg:text-base">Edit</button>
                  <button onClick={() => deleteTemplate(t.id)} className="px-3 lg:px-4 py-2 text-gray-600 hover:text-red-600 rounded-lg text-sm lg:text-base">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}