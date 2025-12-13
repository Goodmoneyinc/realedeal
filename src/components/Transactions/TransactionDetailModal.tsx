import { useState, useEffect } from 'react';
import { X, CheckCircle, Circle, AlertCircle, Calendar, MessageSquare, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Transaction {
  id: string;
  property_address: string;
  purchase_price: number;
  estimated_close_date: string;
  current_stage: string;
  state: string;
  status: string;
  transaction_type: string;
  brokerage: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  priority: string;
  due_date: string;
  completed_at: string;
}

interface Note {
  id: string;
  note: string;
  created_at: string;
  user_id: string;
}

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onUpdate: () => void;
}

export function TransactionDetailModal({ transaction, onClose, onUpdate }: TransactionDetailModalProps) {
  const { user } = useAuth();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChecklistItems();
    fetchNotes();
  }, [transaction.id]);

  const fetchChecklistItems = async () => {
    const { data } = await supabase
      .from('pipeline_checklist_items')
      .select('*')
      .eq('pipeline_id', transaction.id)
      .eq('stage', transaction.current_stage)
      .order('priority', { ascending: false });

    if (data) {
      setChecklistItems(data);
    }
  };

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('pipeline_notes')
      .select('*')
      .eq('pipeline_id', transaction.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNotes(data);
    }
  };

  const toggleChecklistItem = async (itemId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('pipeline_checklist_items')
      .update({
        is_completed: !currentStatus,
        completed_by: !currentStatus ? user?.id : null,
        completed_at: !currentStatus ? new Date().toISOString() : null
      })
      .eq('id', itemId);

    if (!error) {
      fetchChecklistItems();
      onUpdate();
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('pipeline_notes')
      .insert({
        pipeline_id: transaction.id,
        user_id: user?.id,
        note: newNote
      });

    if (!error) {
      setNewNote('');
      fetchNotes();
    }
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const completedItems = checklistItems.filter(item => item.is_completed).length;
  const completionPercentage = checklistItems.length > 0
    ? Math.round((completedItems / checklistItems.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{transaction.property_address}</h2>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span className="font-medium">{transaction.transaction_type}</span>
                <span>•</span>
                <span className="capitalize">{transaction.current_stage} Stage</span>
                <span>•</span>
                <span className="font-semibold text-gray-900">
                  ${transaction.purchase_price.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold text-gray-900">Compliance Progress</span>
              <span className="text-gray-600">{completionPercentage}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Compliance Checklist</h3>
              <div className="space-y-3">
                {checklistItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No checklist items for this stage</p>
                  </div>
                ) : (
                  checklistItems.map(item => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => toggleChecklistItem(item.id, item.is_completed)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {item.is_completed ? (
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                          ) : (
                            <Circle className="h-6 w-6 text-gray-400 hover:text-emerald-600 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className={`font-semibold ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {item.title}
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          {item.completed_at && (
                            <p className="text-xs text-emerald-600 mt-2">
                              Completed on {new Date(item.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">State:</span>
                  <span className="ml-2 font-semibold text-gray-900">{transaction.state}</span>
                </div>
                {transaction.brokerage && (
                  <div>
                    <span className="text-gray-600">Brokerage:</span>
                    <span className="ml-2 font-semibold text-gray-900">{transaction.brokerage}</span>
                  </div>
                )}
                {transaction.estimated_close_date && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Close Date:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {new Date(transaction.estimated_close_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Notes
              </h3>

              <form onSubmit={addNote} className="mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !newNote.trim()}
                  className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Note</span>
                </button>
              </form>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map(note => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-900">{note.note}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(note.created_at).toLocaleDateString()} at{' '}
                      {new Date(note.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
