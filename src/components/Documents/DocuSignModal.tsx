import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DocuSignModalProps {
  document: {
    id: string;
    title: string;
    file_path?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Signer {
  id: string;
  email: string;
  name: string;
  order: number;
}

export function DocuSignModal({ document, onClose, onSuccess }: DocuSignModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filePath, setFilePath] = useState('');
  const [signers, setSigners] = useState<Signer[]>([{
    id: '1',
    email: '',
    name: '',
    order: 1
  }]);

  useEffect(() => {
    if (!document.file_path) {
      fetchDocumentDetails();
    } else {
      setFilePath(document.file_path);
    }
  }, []);

  const fetchDocumentDetails = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', document.id)
      .single();

    if (!error && data) {
      setFilePath(data.file_path);
    }
  };

  const addSigner = () => {
    setSigners([...signers, {
      id: Date.now().toString(),
      email: '',
      name: '',
      order: signers.length + 1
    }]);
  };

  const removeSigner = (id: string) => {
    if (signers.length > 1) {
      setSigners(signers.filter(s => s.id !== id));
    }
  };

  const updateSigner = (id: string, field: 'email' | 'name', value: string) => {
    setSigners(signers.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const invalidSigners = signers.filter(s => !s.email || !s.name);
    if (invalidSigners.length > 0) {
      setError('Please fill in all signer information');
      setLoading(false);
      return;
    }

    if (!filePath) {
      setError('Document file not found');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docusign-create-envelope`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          documentTitle: document.title,
          filePath: filePath,
          signers: signers.map(s => ({
            email: s.email,
            name: s.name,
            order: s.order
          }))
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.needsConfiguration) {
          setError('DocuSign is not configured. Please contact your administrator to set up DocuSign integration.');
        } else {
          throw new Error(result.error || 'Failed to create envelope');
        }
        setLoading(false);
        return;
      }

      setSuccess('Signature request sent successfully via DocuSign!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to send signature request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request Signatures</h2>
            <p className="text-sm text-gray-600 mt-1">{document.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">{success}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">DocuSign Integration</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Signers will receive an email with a secure link to sign the document electronically.
                  Signatures are legally binding and tracked in real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recipients</h3>
              <button
                type="button"
                onClick={addSigner}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Signer</span>
              </button>
            </div>

            {signers.map((signer, index) => (
              <div key={signer.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Signer {index + 1}
                  </span>
                  {signers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSigner(signer.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signer.name}
                      onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={signer.email}
                      onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Signing Order</h4>
            <p className="text-sm text-gray-600">
              Recipients will be notified to sign in the order listed above. Each signer must complete
              their signature before the next signer is notified.
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send for Signature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
