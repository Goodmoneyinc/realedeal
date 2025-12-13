import { useState, useEffect } from 'react';
import { Plus, FileText, FileCheck, Search, Home, CheckSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PipelineStage } from './PipelineStage';
import { NewTransactionModal } from './NewTransactionModal';
import { TransactionDetailModal } from './TransactionDetailModal';

const STAGES = [
  { id: 'listing', name: 'Listing', color: 'text-blue-600', icon: <Home className="h-5 w-5 text-blue-600" /> },
  { id: 'contract', name: 'Contract', color: 'text-purple-600', icon: <FileText className="h-5 w-5 text-purple-600" /> },
  { id: 'inspection', name: 'Inspection', color: 'text-amber-600', icon: <Search className="h-5 w-5 text-amber-600" /> },
  { id: 'appraisal', name: 'Appraisal', color: 'text-orange-600', icon: <CheckSquare className="h-5 w-5 text-orange-600" /> },
  { id: 'close', name: 'Close', color: 'text-emerald-600', icon: <FileCheck className="h-5 w-5 text-emerald-600" /> },
];

interface Transaction {
  id: string;
  property_address: string;
  purchase_price: number;
  estimated_close_date: string;
  current_stage: string;
  state: string;
  status: string;
  deal_id: string;
  transaction_type: string;
  brokerage: string;
}

interface ChecklistItem {
  id: string;
  is_completed: boolean;
  stage: string;
  pipeline_id: string;
}

export function TransactionPipelinePage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTransaction, setDraggedTransaction] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchChecklistItems();
    }
  }, [user]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transaction_pipeline')
      .select('*')
      .or(`agent_id.eq.${user?.id},investor_id.eq.${user?.id},lender_id.eq.${user?.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const fetchChecklistItems = async () => {
    const { data } = await supabase
      .from('pipeline_checklist_items')
      .select('id, is_completed, stage, pipeline_id');

    if (data) {
      setChecklistItems(data);
    }
  };

  const handleDragStart = (e: React.DragEvent, transactionId: string) => {
    setDraggedTransaction(transactionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();

    if (!draggedTransaction) return;

    const { error } = await supabase
      .from('transaction_pipeline')
      .update({
        current_stage: newStage,
        updated_at: new Date().toISOString()
      })
      .eq('id', draggedTransaction);

    if (!error) {
      await fetchTransactions();
      await generateChecklistForStage(draggedTransaction, newStage);
    }

    setDraggedTransaction(null);
  };

  const generateChecklistForStage = async (pipelineId: string, stage: string) => {
    const transaction = transactions.find(t => t.id === pipelineId);
    if (!transaction) return;

    const { data: complianceRules } = await supabase
      .from('compliance_checklists')
      .select('*')
      .eq('state', transaction.state)
      .eq('stage', stage);

    if (complianceRules && complianceRules.length > 0) {
      const checklistPromises = complianceRules.map(rule =>
        supabase
          .from('pipeline_checklist_items')
          .upsert({
            pipeline_id: pipelineId,
            compliance_checklist_id: rule.id,
            title: rule.checklist_name,
            description: rule.description,
            stage: stage,
            priority: rule.is_required ? 'high' : 'medium'
          }, {
            onConflict: 'pipeline_id,compliance_checklist_id',
            ignoreDuplicates: true
          })
      );

      await Promise.all(checklistPromises);
      await fetchChecklistItems();
    }
  };

  const getTransactionsByStage = (stage: string) => {
    return transactions
      .filter(t => t.current_stage === stage && t.status === 'active')
      .map(t => {
        const items = checklistItems.filter(i => i.pipeline_id === t.id && i.stage === t.current_stage);
        const completedItems = items.filter(i => i.is_completed).length;
        return {
          ...t,
          completedItems,
          totalItems: items.length
        };
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Pipeline</h1>
          <p className="text-gray-600 mt-1">Manage property transactions with AI-driven compliance checklists</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>New Transaction</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 grid grid-cols-5 gap-2 text-center">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <div className="flex-1">
                  <div className={`font-semibold ${stage.color}`}>{stage.name}</div>
                  <div className="text-sm text-gray-500">
                    {getTransactionsByStage(stage.id).length}
                  </div>
                </div>
                {index < STAGES.length - 1 && (
                  <div className="w-8 h-0.5 bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <PipelineStage
              key={stage.id}
              stage={stage}
              transactions={getTransactionsByStage(stage.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onTransactionClick={(transaction) => {
                const originalTransaction = transactions.find(t => t.id === transaction.id);
                if (originalTransaction) {
                  setSelectedTransaction(originalTransaction);
                }
              }}
            />
          ))}
        </div>
      </div>

      {showNewModal && (
        <NewTransactionModal
          onClose={() => setShowNewModal(false)}
          onSuccess={() => {
            setShowNewModal(false);
            fetchTransactions();
          }}
        />
      )}

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onUpdate={() => {
            fetchTransactions();
            fetchChecklistItems();
          }}
        />
      )}
    </div>
  );
}
