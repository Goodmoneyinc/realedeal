import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContractSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle: string;
  onComplete?: () => void;
}

interface Contract {
  id: string;
  document_id: string;
  contract_type: string;
  status: string;
  signed_at: string | null;
  documents: {
    title: string;
    file_path: string;
  };
}

export default function ContractSigningModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  onComplete
}: ContractSigningModalProps) {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadContracts();
    }
  }, [isOpen, dealId]);

  if (!isOpen) return null;

  const loadContracts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('deal_contracts')
        .select(`
          id,
          document_id,
          contract_type,
          status,
          signed_at,
          documents:document_id (
            title,
            file_path
          )
        `)
        .eq('deal_id', dealId)
        .eq('investor_id', user.id);

      if (fetchError) throw fetchError;

      setContracts(data as any || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (contractId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('deal_contracts')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onComplete?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to sign contract');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestContract = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('deal_contracts')
        .insert({
          deal_id: dealId,
          investor_id: user.id,
          contract_type: 'purchase_agreement',
          status: 'draft'
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        loadContracts();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to request contract');
    } finally {
      setLoading(false);
    }
  };

  const contractTypeLabels = {
    purchase_agreement: 'Purchase Agreement',
    earnest_money: 'Earnest Money Agreement',
    disclosure: 'Disclosure Form',
    other: 'Other Contract'
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    pending_signature: 'bg-yellow-100 text-yellow-700',
    signed: 'bg-green-100 text-green-700',
    executed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contract Signing</h2>
            <p className="text-sm text-gray-500 mt-1">{dealTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
            <p className="text-gray-600">
              {selectedContract ? 'Contract signed successfully' : 'Contract request submitted'}
            </p>
          </div>
        ) : (
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {loading && !contracts.length ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contracts Available</h3>
                <p className="text-gray-600 mb-6">
                  Request a contract from your agent to get started
                </p>
                <button
                  onClick={handleRequestContract}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Requesting...' : 'Request Contract'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Review and sign the contracts below to proceed with your purchase
                </p>

                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {contractTypeLabels[contract.contract_type as keyof typeof contractTypeLabels] || contract.contract_type}
                        </h4>
                        {contract.documents && (
                          <p className="text-sm text-gray-600 mt-1">{contract.documents.title}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[contract.status as keyof typeof statusColors]}`}>
                        {contract.status.replace('_', ' ')}
                      </span>
                    </div>

                    {contract.signed_at && (
                      <p className="text-xs text-gray-500 mb-3">
                        Signed on {new Date(contract.signed_at).toLocaleDateString()}
                      </p>
                    )}

                    {contract.status === 'draft' || contract.status === 'pending_signature' ? (
                      <button
                        onClick={() => {
                          setSelectedContract(contract.id);
                          handleSign(contract.id);
                        }}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        {loading && selectedContract === contract.id ? 'Signing...' : 'Sign Contract'}
                      </button>
                    ) : contract.status === 'signed' ? (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Contract Signed
                      </div>
                    ) : null}
                  </div>
                ))}

                <button
                  onClick={handleRequestContract}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Request Additional Contract
                </button>
              </div>
            )}

            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> By signing these contracts, you agree to the terms and conditions outlined in each document. Please review carefully before proceeding.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
