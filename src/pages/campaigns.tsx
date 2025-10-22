// src/pages/campaigns.tsx - Modern Black Glossy Design
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Zap, AlertCircle, Send, Trash2, Eye, Mail, CheckCircle2 } from "lucide-react";

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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [queueStatus, setQueueStatus] = useState<Record<string, QueueCounts>>({});
  const [sendingCampaigns, setSendingCampaigns] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign?: Campaign }>({ open: false });

  // Fetch templates
  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      const json = await res.json();
      setTemplates(json || []);
    } catch (err) {
      console.error("Failed to fetch templates", err);
      toast.error("Failed to fetch templates");
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
      toast.error("Failed to fetch campaigns");
    }
  }

  // Poll queue status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/queue/status");
        const json = await res.json();
        setQueueStatus(json.details || json);
      } catch (err) {
        console.error("Failed to fetch queue status", err);
      }
    }, 3000);
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
      toast.success("Campaign created successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create campaign");
    }
  }

  async function handleSend(campaignId: number) {
    if (sendingCampaigns[campaignId]) return;

    setSendingCampaigns(prev => ({ ...prev, [campaignId]: true }));

    try {
      const queueRes = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      const queueResult = await queueRes.json();

      if (!queueRes.ok) {
        throw new Error(queueResult.error || 'Failed to queue emails');
      }

      toast.success(queueResult.message || `Queued ${queueResult.queued} emails`);
      await fetchCampaigns();

    } catch (err) {
      console.error('Send campaign error:', err);
      toast.error('Failed to send campaign: ' + (err as Error).message);
      setSendingCampaigns(prev => ({ ...prev, [campaignId]: false }));
    }
  }

  async function handleDeleteCampaign() {
    if (!deleteDialog.campaign) return;

    try {
      const res = await fetch(`/api/campaigns/${deleteDialog.campaign.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete campaign');

      toast.success(`Campaign "${deleteDialog.campaign.name}" deleted`);
      await fetchCampaigns();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete campaign');
    } finally {
      setDeleteDialog({ open: false });
    }
  }

  async function handleProcessQueue() {
    if (isProcessing) return;

    setIsProcessing(true);
    toast.info("Processing queue...");

    try {
      const res = await fetch('/api/queue/process-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to process queue');
      }

      toast.success(result.message || `Processed ${result.processed} emails`);
      await fetchCampaigns();

    } catch (err) {
      console.error('Process queue error:', err);
      toast.error('Failed to process queue: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function clearStuckJobs() {
    try {
      const res = await fetch('/api/queue/clear-failed', { method: 'POST' });
      if (res.ok) {
        toast.success('Cleared all stuck jobs');
      }
    } catch (err) {
      toast.error('Failed to clear stuck jobs');
    }
  }

  const totalStuckJobs = Object.values(queueStatus).reduce((sum, counts) =>
    sum + counts.waiting + counts.active, 0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
            Campaigns
          </h1>
          <p className="text-gray-400">Create, manage and send email campaigns</p>
        </div>

        {totalStuckJobs > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={clearStuckJobs}
              variant="ghost"
              className="bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
            >
              Clear Stuck
            </Button>
            <Button
              onClick={handleProcessQueue}
              disabled={isProcessing}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 border-0 shadow-lg shadow-orange-500/50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Process {totalStuckJobs} Jobs
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Stuck Jobs Alert */}
      {totalStuckJobs > 0 && (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur opacity-20"></div>
          <div className="relative bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-orange-300">Queue Processing Required</h3>
                <p className="text-sm text-orange-200/80 mt-1">
                  You have {totalStuckJobs} email(s) waiting. VPS workers should process these automatically.
                  Click "Process Jobs" if needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Form */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
        <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                <Mail className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Campaign</h2>
                <p className="text-gray-400 text-sm">Set up a new email campaign</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                  placeholder="Enter campaign name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Template (Optional)</label>
                <select
                  value={templateId || ""}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg focus:border-green-500 focus:outline-none"
                >
                  <option value="">-- None --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-green-500"
                placeholder="Enter email subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Body (HTML)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-40 font-mono text-sm resize-none focus:border-green-500 focus:outline-none"
                placeholder="Enter HTML email content"
              />
            </div>

            <Button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0 shadow-lg shadow-green-500/50"
            >
              <Mail className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </form>
        </div>
      </div>

      {/* Campaign List */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition"></div>
        <div className="relative bg-black/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-white">All Campaigns</h2>
            <p className="text-gray-400 text-sm mt-1">Manage your email campaigns</p>
          </div>

          <div className="divide-y divide-gray-800">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No campaigns yet. Create your first one above!
              </div>
            ) : (
              campaigns.map((c) => {
                const cQueue = queueStatus[c.id] || { waiting: 0, active: 0, completed: 0, failed: 0 };
                const isCurrentlySending = sendingCampaigns[c.id];

                return (
                  <div
                    key={c.id}
                    className="p-6 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">{c.name}</h3>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p>Subject: <span className="text-gray-300">{c.subject}</span></p>
                          <p>Template: <span className="text-gray-300">{c.template?.name || "None"}</span></p>
                          <p>Subscribers: <span className="text-gray-300">{c.subscribers?.length || 0}</span></p>
                          <div className="flex items-center gap-2 mt-2">
                            <span>Status:</span>
                            <Badge
                              variant="secondary"
                              className={`${
                                c.status === "sent" ? "bg-green-500/20 text-green-300" :
                                c.status === "sending" ? "bg-orange-500/20 text-orange-300" :
                                "bg-gray-500/20 text-gray-300"
                              } border-0`}
                            >
                              {c.status === "sent" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {c.status}
                              {isCurrentlySending && " (Processing...)"}
                            </Badge>
                          </div>

                          {(cQueue.waiting > 0 || cQueue.active > 0 || cQueue.completed > 0 || cQueue.failed > 0) && (
                            <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                              <div className="text-xs font-medium text-gray-300 mb-2">Queue Status:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                                <span>Waiting: <span className="text-yellow-400">{cQueue.waiting}</span></span>
                                <span>Active: <span className="text-blue-400">{cQueue.active}</span></span>
                                <span>Completed: <span className="text-green-400">{cQueue.completed}</span></span>
                                <span>Failed: <span className="text-red-400">{cQueue.failed}</span></span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {c.status !== "sent" && (
                          <Button
                            onClick={() => handleSend(c.id)}
                            disabled={isCurrentlySending}
                            className={`${
                              isCurrentlySending
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/50'
                            }`}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {isCurrentlySending ? "Sending..." : "Send Now"}
                          </Button>
                        )}

                        <Button
                          onClick={() => setDeleteDialog({ open: true, campaign: c })}
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete the campaign <strong className="text-white">"{deleteDialog.campaign?.name}"</strong> and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 border-0 shadow-lg shadow-red-500/50"
            >
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
