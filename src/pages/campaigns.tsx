// my-app/src/pages/campaigns.tsx
import React, { useEffect, useState } from "react";

type Template = { id: number; name: string; subject: string; body: string };
type Campaign = {
  id: number;
  name: string;
  subject: string;
  body: string;
  status: string;
  template?: Template | null;
  subscribers?: { subscriber_id: number }[];
};

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

export default function CampaignsPage({
  addToast,
}: {
  addToast?: (msg: string, type?: string) => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);

  const [queueStatus, setQueueStatus] = useState<
    Record<string, QueueCounts>
  >({});

  // Fetch templates
  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      const json = await res.json();
      setTemplates(json || []);
    } catch (err) {
      console.error("Failed to fetch templates", err);
      addToast?.("Failed to fetch templates", "error");
    }
  }

  // Fetch campaigns
  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data || []);
    } catch (err) {
      console.error(err);
      addToast?.("Failed to fetch campaigns", "error");
    }
  }

  // Poll queue status every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/queue/status");
        const json = await res.json();
        setQueueStatus(json);
      } catch (err) {
        console.error("Failed to fetch queue status", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchCampaigns();
  }, []);

  function handleTemplateChange(id: string) {
    const t = templates.find((tpl) => tpl.id === Number(id));
    setTemplateId(t?.id || null);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      const payload = { name, subject, body, templateId };
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      await fetchCampaigns();
      setName("");
      setSubject("");
      setBody("");
      setTemplateId(null);
      addToast?.("Campaign created", "success");
    } catch (err) {
      console.error(err);
      addToast?.("Failed to create campaign", "error");
    }
  }

  async function handleSend(campaignId: number) {
    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) throw new Error("Send failed");
      addToast?.("Campaign sending started!", "success");
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      addToast?.("Failed to send campaign", "error");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">
            Create, manage and send campaigns
          </p>
        </div>
      </div>

      {/* New Campaign Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Campaign
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template
            </label>
            <select
              value={templateId || ""}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
            >
              <option value="">-- None --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl h-40 font-mono text-sm resize-none"
            />
          </div>

          <div>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl"
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>

      {/* Existing Campaigns */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">All Campaigns</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {campaigns.map((c) => {
            const cQueue = queueStatus[c.id] || {
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
            };
            return (
              <div
                key={c.id}
                className="p-6 hover:bg-gray-50 flex flex-col lg:flex-row justify-between gap-4 lg:gap-0 items-start lg:items-center"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-gray-600 text-sm">Subject: {c.subject}</p>
                  <p className="text-gray-600 text-sm">
                    Template: {c.template?.name || "None"}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Subscribers: {c.subscribers?.length || 0}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      c.status === "sent" ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    Status: {c.status}
                  </p>
                  <div className="text-sm text-gray-600 mt-2">
                    Queue: Waiting {cQueue.waiting}, Active {cQueue.active}, Completed{" "}
                    {cQueue.completed}, Failed {cQueue.failed}
                  </div>
                </div>

                <div className="flex gap-2">
                  {c.status !== "sent" && (
                    <button
                      onClick={() => handleSend(c.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl"
                    >
                      Send Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
