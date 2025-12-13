import { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DocumentUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  pipelineId?: string;
  dealId?: string;
}

interface Transaction {
  id: string;
  property_address: string;
}

interface Deal {
  id: string;
  title: string;
}

export function DocumentUploadModal({ onClose, onSuccess, pipelineId, dealId }: DocumentUploadModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'other',
    pipeline_id: pipelineId || '',
    deal_id: dealId || '',
    requires_signature: false
  });

  useEffect(() => {
    fetchTransactions();
    fetchDeals();
  }, []);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transaction_pipeline')
      .select('id, property_address')
      .eq('agent_id', user?.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data);
    }
  };

  const fetchDeals = async () => {
    const { data } = await supabase
      .from('deals')
      .select('id, title')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setDeals(data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setError('');
      if (!formData.title) {
        setFormData({ ...formData, title: file.name });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setUploading(true);
    setError('');

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          pipeline_id: formData.pipeline_id || null,
          deal_id: formData.deal_id || null,
          uploaded_by: user?.id,
          title: formData.title,
          description: formData.description || null,
          document_type: formData.document_type,
          file_path: fileName,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          requires_signature: formData.requires_signature,
          status: 'draft'
        });

      if (dbError) throw dbError;

      await supabase.from('document_activity').insert({
        document_id: (await supabase
          .from('documents')
          .select('id')
          .eq('file_path', fileName)
          .single()).data?.id,
        user_id: user?.id,
        action: 'uploaded',
        details: `Uploaded ${formData.title}`
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Upload Document</h2>
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

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                {selectedFile ? (
                  <>
                    <FileText className="h-12 w-12 text-emerald-600 mb-3" />
                    <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="font-semibold text-gray-900">Click to upload</p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, Word, Excel, Images (max 50MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g., Purchase Agreement"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
              placeholder="Add any notes or context..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Document Type
              </label>
              <select
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="contract">Contract</option>
                <option value="disclosure">Disclosure</option>
                <option value="inspection_report">Inspection Report</option>
                <option value="appraisal">Appraisal</option>
                <option value="title_document">Title Document</option>
                <option value="closing_statement">Closing Statement</option>
                <option value="deed">Deed</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Link to Transaction
              </label>
              <select
                value={formData.pipeline_id}
                onChange={(e) => setFormData({ ...formData, pipeline_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                <option value="">None</option>
                {transactions.map(tx => (
                  <option key={tx.id} value={tx.id}>
                    {tx.property_address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Link to Deal
            </label>
            <select
              value={formData.deal_id}
              onChange={(e) => setFormData({ ...formData, deal_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">None</option>
              {deals.map(deal => (
                <option key={deal.id} value={deal.id}>
                  {deal.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requires-signature"
              checked={formData.requires_signature}
              onChange={(e) => setFormData({ ...formData, requires_signature: e.target.checked })}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label htmlFor="requires-signature" className="ml-2 text-sm text-gray-700">
              This document requires signatures
            </label>
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
              disabled={loading || !selectedFile}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
