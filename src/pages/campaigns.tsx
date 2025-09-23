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

// Queue Progress Popup Component
function QueuePopup({ queueCounts }: { queueCounts: QueueCounts }) {
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 shadow-lg rounded-xl border border-gray-200 w-64 z-50">
      <h4 className="font-semibold mb-2">Queue Progress</h4>
      <div className="text-sm text-gray-700">
        <p>Waiting: {queueCounts.waiting}</p>
        <p>Active: {queueCounts.active}</p>
        <p>Completed: {queueCounts.completed}</p>
        <p>Failed: {queueCounts.failed}</p>
      </div>
    </div>
  );
}

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
  const [queueStatus, setQueueStatus] = useState<Record<string, QueueCounts>>({});
  const [sendingCampaignId, setSendingCampaignId] = useState<number | null>(null);

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

  // -------------------------------
  // Send campaign in small batches
  // -------------------------------
  async function handleSend(campaignId: number) {
    setSendingCampaignId(campaignId);
    let sentTotal = 0;

    while (true) {
      const res = await fetch("/api/worker/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const json = await res.json();

      if (!res.ok) {
        addToast?.("Error processing batch: " + (json.error || ""), "error");
        break;
      }

      sentTotal += json.sent || 0;

      // Update queueStatus for this campaign immediately
      const statusRes = await fetch("/api/queue/status");
      const statusJson = await statusRes.json();
      setQueueStatus((prev) => ({ ...prev, [campaignId]: statusJson[campaignId] }));

      if (json.sent === 0) break; // queue empty
    }

    addToast?.(`All emails sent: ${sentTotal}`, "success");
    setSendingCampaignId(null);
    fetchCampaigns(); // refresh campaign list
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Create, manage and send campaigns</p>
        </div>
      </div>

      {/* New Campaign Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Create Campaign</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-xl text-sm lg:text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <select
              value={templateId || ""}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-xl text-sm lg:text-base"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-xl text-sm lg:text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-xl h-32 lg:h-40 font-mono text-xs lg:text-sm resize-none"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-sm lg:text-base"
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>

      {/* Existing Campaigns */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">All Campaigns</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {campaigns.map((c) => {
            const cQueue = queueStatus[c.id] || { waiting: 0, active: 0, completed: 0, failed: 0 };
            return (
              <div
                key={c.id}
                className="p-4 lg:p-6 hover:bg-gray-50 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center"
              >
                <div className="flex-1">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">{c.name}</h3>
                  <div className="space-y-1 text-xs lg:text-sm text-gray-600">
                    <p>Subject: {c.subject}</p>
                    <p>Template: {c.template?.name || "None"}</p>
                    <p>Subscribers: {c.subscribers?.length || 0}</p>
                    <p className={`font-medium ${c.status === "sent" ? "text-green-600" : "text-gray-500"}`}>
                      Status: {c.status}
                    </p>
                    <div className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">
                      <div className="font-medium mb-1">Queue Status:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span>Waiting: {cQueue.waiting}</span>
                        <span>Active: {cQueue.active}</span>
                        <span>Completed: {cQueue.completed}</span>
                        <span>Failed: {cQueue.failed}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {c.status !== "sent" && (
                    <button
                      onClick={() => handleSend(c.id)}
                      className="px-3 lg:px-4 py-2 bg-purple-600 text-white rounded-xl text-sm lg:text-base whitespace-nowrap"
                    >
                      Send Now
                    </button>
                  )}
                </div>

                {sendingCampaignId === c.id && <QueuePopup queueCounts={cQueue} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
