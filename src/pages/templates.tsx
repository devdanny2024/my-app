import React, { useEffect, useState } from "react";

type Template = { id: number; name: string; subject: string; body: string };

export default function TemplatesPage({ addToast }: { addToast?: (msg: string, type?: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      const json = await res.json();
      setTemplates(json || []);
    } catch (err) {
      console.error(err);
      addToast?.("Failed to fetch templates", "error");
    }
  }

  useEffect(() => { fetchTemplates(); }, []);

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage your email templates</p>
        </div>
      </div>

      {/* Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Create Template</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HTML Body</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl h-40 font-mono text-sm resize-none" />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl">
                Save Template
              </button>
              <button type="button" onClick={() => setPreview((p) => !p)} className="px-6 py-3 border rounded-xl">
                {preview ? "Hide" : "Preview"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Live Preview</h2>
          </div>

          <div className="p-6">
            {preview && body ? (
              <div className="border rounded-xl overflow-hidden">
                <iframe
                  title="Template Preview"
                  className="w-full h-80 border-0"
                  srcDoc={`<html><head><style>body{font-family:system-ui,sans-serif;padding:20px;margin:0;}</style></head><body>${body}</body></html>`}
                />
              </div>
            ) : (
              <div className="h-80 border rounded-xl flex items-center justify-center bg-gray-50">
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
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Saved Templates</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {templates.map((t) => (
            <div key={t.id} className="p-6 hover:bg-gray-50 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.name}</h3>
                <p className="text-gray-600 text-sm mb-2">Subject: {t.subject}</p>
                <div className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 inline-block">HTML Template</div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => editTemplate(t)} className="p-2 text-gray-600 hover:text-purple-600 rounded-lg">Edit</button>
                <button onClick={() => deleteTemplate(t.id)} className="p-2 text-gray-600 hover:text-red-600 rounded-lg">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
