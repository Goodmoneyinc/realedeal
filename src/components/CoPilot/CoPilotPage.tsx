import React, { useState } from 'react';
import EmailCoPilotModal from './EmailCoPilotModal';
import { Mail, Sparkles, Clock, CheckCircle, Calendar } from 'lucide-react';

export default function CoPilotPage() {
  const [showEmailModal, setShowEmailModal] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            Email Co-Pilot
          </h1>
          <p className="text-gray-600 mt-1">AI-powered email drafting and scheduling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="p-3 bg-blue-600 rounded-lg w-fit mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Draft New Email</h3>
          <p className="text-gray-600 text-sm mb-4">
            Use pre-built templates to quickly draft professional emails for any transaction stage
          </p>
          <button
            onClick={() => setShowEmailModal(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Drafting
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="p-3 bg-purple-600 rounded-lg w-fit mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Scheduled Emails</h3>
          <p className="text-gray-600 text-sm mb-4">
            Set it and forget it - schedule emails to send at the perfect time
          </p>
          <div className="text-3xl font-bold text-purple-600">0</div>
          <p className="text-sm text-gray-500">upcoming emails</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="p-3 bg-green-600 rounded-lg w-fit mb-4">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Templates</h3>
          <p className="text-gray-600 text-sm mb-4">
            Access pre-written templates for common scenarios
          </p>
          <div className="text-3xl font-bold text-green-600">5</div>
          <p className="text-sm text-gray-500">system templates</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Email Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Inspection Scheduled',
              description: 'Notify clients when property inspection is scheduled',
              category: 'Inspection'
            },
            {
              title: 'Appraisal Ordered',
              description: 'Update on appraisal ordering and timeline',
              category: 'Appraisal'
            },
            {
              title: 'Clear to Close',
              description: 'Congratulate clients on clearing to close',
              category: 'Closing'
            },
            {
              title: 'Task Reminder',
              description: 'Remind clients of pending tasks',
              category: 'General'
            },
            {
              title: 'Milestone Complete',
              description: 'Celebrate completed transaction milestones',
              category: 'Progress'
            }
          ].map((template, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setShowEmailModal(true)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{template.title}</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-2">AI-Powered Suggestions</h3>
            <p className="text-amber-800 text-sm mb-3">
              Co-Pilot automatically suggests the right email template based on your transaction stage and timeline.
              Simply select a transaction, and we'll recommend the perfect communication.
            </p>
            <ul className="space-y-1 text-sm text-amber-700">
              <li>• Personalized variable replacement</li>
              <li>• Smart scheduling recommendations</li>
              <li>• Template customization support</li>
            </ul>
          </div>
        </div>
      </div>

      {showEmailModal && (
        <EmailCoPilotModal
          onClose={() => setShowEmailModal(false)}
          onSent={() => {
            setShowEmailModal(false);
          }}
        />
      )}
    </div>
  );
}
