// Improved Queue Progress Popup Component
import React from 'react';
import { X, Clock, Send, CheckCircle, XCircle, Loader } from 'lucide-react';

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

interface QueuePopupProps {
  queueCounts: QueueCounts;
  campaignName: string;
  onClose: () => void;
  totalEmails: number;
}

function QueuePopup({ queueCounts, campaignName, onClose, totalEmails }: QueuePopupProps) {
  const total = queueCounts.waiting + queueCounts.active + queueCounts.completed + queueCounts.failed;
  const progress = total > 0 ? ((queueCounts.completed + queueCounts.failed) / total) * 100 : 0;
  
  const isComplete = queueCounts.waiting === 0 && queueCounts.active === 0;
  const hasErrors = queueCounts.failed > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <Loader className="w-6 h-6 text-purple-500 animate-spin" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isComplete ? 'Campaign Sent!' : 'Sending Campaign'}
              </h3>
              <p className="text-sm text-gray-500 truncate">{campaignName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="p-6 pb-4">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  hasErrors ? 'bg-gradient-to-r from-purple-500 to-red-500' : 'bg-gradient-to-r from-purple-500 to-purple-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Waiting */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Waiting</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{queueCounts.waiting}</div>
            </div>

            {/* Active */}
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Send className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-700">Sending</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">{queueCounts.active}</div>
            </div>

            {/* Completed */}
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">Sent</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{queueCounts.completed}</div>
            </div>

            {/* Failed */}
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Failed</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{queueCounts.failed}</div>
            </div>
          </div>

          {/* Status Message */}
          <div className="mt-4 p-3 rounded-lg bg-blue-50">
            <p className="text-sm text-blue-800">
              {isComplete ? (
                hasErrors ? 
                  `Campaign completed with ${queueCounts.failed} failed emails. ${queueCounts.completed} emails sent successfully.` :
                  `Campaign completed successfully! All ${queueCounts.completed} emails have been sent.`
              ) : (
                `Sending emails... ${queueCounts.completed + queueCounts.failed} of ${total} processed.`
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-gray-200">
          {isComplete && (
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QueuePopup;