import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Send, Calendar, Sparkles, X } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

interface EmailCoPilotModalProps {
  pipelineId?: string;
  recipientEmail?: string;
  recipientName?: string;
  onClose: () => void;
  onSent?: () => void;
}

export default function EmailCoPilotModal({
  pipelineId,
  recipientEmail = '',
  recipientName = '',
  onClose,
  onSent
}: EmailCoPilotModalProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [email, setEmail] = useState({
    to: recipientEmail,
    toName: recipientName,
    subject: '',
    body: '',
    scheduleFor: '',
  });
  const [sending, setSending] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))];
  };

  const replaceVariables = (text: string, vars: Record<string, string>): string => {
    let result = text;
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  };

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    const vars = [...new Set([
      ...extractVariables(template.subject),
      ...extractVariables(template.body)
    ])];

    const initialVars: Record<string, string> = {};
    vars.forEach(v => {
      initialVars[v] = '';
    });

    setVariables(initialVars);
    setEmail({
      ...email,
      subject: template.subject,
      body: template.body,
    });
  };

  const applyVariables = () => {
    if (!selectedTemplate) return;

    setEmail({
      ...email,
      subject: replaceVariables(selectedTemplate.subject, variables),
      body: replaceVariables(selectedTemplate.body, variables),
    });
  };

  const handleSend = async () => {
    if (!email.to || !email.subject || !email.body) {
      alert('Please fill in all required fields');
      return;
    }

    setSending(true);

    try {
      if (email.scheduleFor) {
        const { error } = await supabase
          .from('scheduled_emails')
          .insert([{
            pipeline_id: pipelineId,
            template_id: selectedTemplate?.id,
            recipient_email: email.to,
            recipient_name: email.toName,
            subject: email.subject,
            body: email.body,
            scheduled_for: email.scheduleFor,
            created_by: user?.id,
          }]);

        if (error) throw error;
        alert('Email scheduled successfully!');
      } else {
        alert('Email functionality requires integration with an email service. For now, the email has been prepared and you can copy it.');
      }

      onSent?.();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Email Co-Pilot</h2>
              <p className="text-sm text-gray-600">Draft and schedule standard emails</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Choose a Template
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Select from pre-built templates or start from scratch
            </p>

            <div className="space-y-3">
              {Object.entries(templatesByCategory).map(([category, temps]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">{category}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {temps.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => selectTemplate(template)}
                        className={`text-left p-3 rounded-lg border-2 transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <p className="font-medium text-sm">{template.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplate && Object.keys(variables).length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3">Fill in Template Variables</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {Object.keys(variables).map((varName) => (
                  <div key={varName}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {varName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </label>
                    <input
                      type="text"
                      value={variables[varName]}
                      onChange={(e) => setVariables({ ...variables, [varName]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter ${varName}`}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={applyVariables}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Apply Variables
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={email.to}
                  onChange={(e) => setEmail({ ...email, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={email.toName}
                  onChange={(e) => setEmail({ ...email, toName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={email.subject}
                onChange={(e) => setEmail({ ...email, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Email subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea
                required
                value={email.body}
                onChange={(e) => setEmail({ ...email, body: e.target.value })}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Email body"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Schedule For (Optional)
              </label>
              <input
                type="datetime-local"
                value={email.scheduleFor}
                onChange={(e) => setEmail({ ...email, scheduleFor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to send now, or schedule for a specific date and time
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !email.to || !email.subject || !email.body}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Processing...' : email.scheduleFor ? 'Schedule Email' : 'Prepare Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
