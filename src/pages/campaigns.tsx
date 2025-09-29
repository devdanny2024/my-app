import React, { useEffect, useState } from "react";
import QueuePopup from "../components/QueuePopup";
import { Zap, AlertCircle } from "lucide-react";

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
  const [queueStatus, setQueueStatus] = useState<Record<string, QueueCounts>>({});
  const [sendingCampaigns, setSendingCampaigns] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State persistence for popup across page refreshes
  const [showQueuePopup, setShowQueuePopup] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const savedPopup = localStorage.getItem('showQueuePopup');
      return savedPopup ? parseInt(savedPopup) : null;
    }
    return null;
  });

  // --- NEW STATE TO PREVENT RE-OPENING ---
  const [hasManuallyClosed, setHasManuallyClosed] = useState(false);


  // Save popup state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showQueuePopup !== null) {
        localStorage.setItem('showQueuePopup', showQueuePopup.toString());
      } else {
        localStorage.removeItem('showQueuePopup');
      }
    }
  }, [showQueuePopup]);

  
  // --- MODIFIED useEffect HOOK ---
  useEffect(() => {
    const activeCampaigns = Object.entries(queueStatus).filter(([campaignId, status]) => 
      status.waiting > 0 || status.active > 0
    );
    
    // Auto-show popup ONLY if it hasn't been manually closed
    if (activeCampaigns.length > 0 && showQueuePopup === null && !hasManuallyClosed) {
      const firstActiveCampaignId = parseInt(activeCampaigns[0][0]);
      setShowQueuePopup(firstActiveCampaignId);
    }
    
    // Hide popup if the campaign is complete
    if (showQueuePopup !== null) {
      const currentStatus = queueStatus[showQueuePopup];
      if (currentStatus && currentStatus.waiting === 0 && currentStatus.active === 0) {
        // Keep popup for 5 seconds after completion then auto-hide
        setTimeout(() => {
          setShowQueuePopup(null);
          setHasManuallyClosed(false); // Reset for the next campaign
        }, 5000);
      }
    }
  }, [queueStatus, showQueuePopup, hasManuallyClosed]);


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

  // Poll queue status every 3 seconds
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
      addToast?.("Campaign created", "success");
    } catch (err) {
      console.error(err);
      addToast?.("Failed to create campaign", "error");
    }
  }

  async function handleSend(campaignId: number) {
    if (sendingCampaigns[campaignId]) return;

    setHasManuallyClosed(false); // Reset manual close state for new send
    setSendingCampaigns(prev => ({ ...prev, [campaignId]: true }));
    setShowQueuePopup(campaignId);

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

      addToast?.(queueResult.message || `Queued ${queueResult.queued} emails`, 'success');
      await fetchCampaigns();

    } catch (err) {
      console.error('Send campaign error:', err);
      addToast?.('Failed to send campaign: ' + (err as Error).message, 'error');
      setSendingCampaigns(prev => ({ ...prev, [campaignId]: false }));
      setShowQueuePopup(null);
    }
  }

  // Manual queue processing function
  async function handleProcessQueue() {
    if (isProcessing) return;
    
    setIsProcessing(true);
    addToast?.("Processing queue...", "info");

    try {
      const res = await fetch('/api/queue/process-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Failed to process queue');
      }

      addToast?.(result.message || `Processed ${result.processed} emails`, 'success');
      
      // Refresh campaigns to update status
      await fetchCampaigns();

    } catch (err) {
      console.error('Process queue error:', err);
      addToast?.('Failed to process queue: ' + (err as Error).message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }

  // --- MODIFIED CLOSE HANDLER ---
  const handleClosePopup = () => {
    setShowQueuePopup(null);
    setHasManuallyClosed(true); // Set flag to true when user closes
    if (typeof window !== 'undefined') {
      localStorage.removeItem('showQueuePopup');
    }
  };

  // Calculate total stuck jobs
  const totalStuckJobs = Object.values(queueStatus).reduce((sum, counts) => 
    sum + counts.waiting + counts.active, 0
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header with Queue Processing Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Create, manage and send campaigns</p>
        </div>

        {/* Manual Process Queue Button */}
        {totalStuckJobs > 0 && (
          <button
            onClick={handleProcessQueue}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-sm lg:text-base font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Process {totalStuckJobs} Stuck Jobs
              </>
            )}
          </button>
        )}
      </div>

      {/* Stuck Jobs Alert */}
      {totalStuckJobs > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-800">Queue Processing Required</h3>
              <p className="text-sm text-orange-700 mt-1">
                You have {totalStuckJobs} email(s) waiting to be sent. Click "Process Stuck Jobs" to send them now.
                For automatic processing, ensure your cron job is configured in Vercel.
              </p>
            </div>
          </div>
        </div>
      )}

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
            const isCurrentlySending = sendingCampaigns[c.id];
            
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
                    <p className={`font-medium ${
                      c.status === "sent" ? "text-green-600" : 
                      c.status === "sending" ? "text-orange-600" :
                      "text-gray-500"
                    }`}>
                      Status: {c.status}
                      {isCurrentlySending && " (Processing...)"}
                    </p>
                    {(cQueue.waiting > 0 || cQueue.active > 0 || cQueue.completed > 0 || cQueue.failed > 0) && (
                      <div className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2">
                        <div className="font-medium mb-1">Queue Status:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span>Waiting: {cQueue.waiting}</span>
                          <span>Active: {cQueue.active}</span>
                          <span>Completed: {cQueue.completed}</span>
                          <span>Failed: {cQueue.failed}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {c.status !== "sent" && (
                    <button
                      onClick={() => handleSend(c.id)}
                      disabled={isCurrentlySending}
                      className={`px-3 lg:px-4 py-2 rounded-xl text-sm lg:text-base whitespace-nowrap transition-colors ${
                        isCurrentlySending 
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {isCurrentlySending ? "Sending..." : "Send Now"}
                    </button>
                  )}
                  
                  {/* Show queue progress button */}
                  {(cQueue.waiting > 0 || cQueue.active > 0 || cQueue.completed > 0 || cQueue.failed > 0) && (
                    <button
                      onClick={() => setShowQueuePopup(c.id)}
                      className="px-3 lg:px-4 py-2 border border-purple-600 text-purple-600 hover:bg-purple-50 rounded-xl text-sm lg:text-base whitespace-nowrap"
                    >
                      View Progress
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Queue Progress Popup */}
      {showQueuePopup !== null && (
        <QueuePopup
          queueCounts={queueStatus[showQueuePopup] || { waiting: 0, active: 0, completed: 0, failed: 0 }}
          campaignName={campaigns.find(c => c.id === showQueuePopup)?.name || "Campaign"}
          onClose={handleClosePopup}
          totalEmails={campaigns.find(c => c.id === showQueuePopup)?.subscribers?.length || 0}
        />
      )}
    </div>
  );
}