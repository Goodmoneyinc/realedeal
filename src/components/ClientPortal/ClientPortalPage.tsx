import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ListTodo,
  TrendingUp,
  Calendar,
  ChevronRight
} from 'lucide-react';

interface Transaction {
  id: string;
  property_address: string;
  transaction_type: string;
  purchase_price: number;
  current_stage: string;
  estimated_close_date: string;
  status: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  progress_percentage: number;
  order_index: number;
  due_date?: string;
  completed_at?: string;
}

interface ClientTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed';
  due_date?: string;
  completed_at?: string;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  status: string;
  requires_signature: boolean;
  created_at: string;
}

export default function ClientPortalPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (selectedTransaction) {
      fetchMilestones(selectedTransaction.id);
      fetchTasks(selectedTransaction.id);
      fetchDocuments(selectedTransaction.id);
    }
  }, [selectedTransaction]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_pipeline')
        .select('*')
        .or(`investor_id.eq.${user?.id},lender_id.eq.${user?.id}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      if (data && data.length > 0) {
        setSelectedTransaction(data[0]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async (pipelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('transaction_milestones')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('order_index');

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const fetchTasks = async (pipelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_tasks')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('due_date', { nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchDocuments = async (pipelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('client_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      if (selectedTransaction) {
        fetchTasks(selectedTransaction.id);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const calculateOverallProgress = () => {
    if (milestones.length === 0) return 0;
    const totalProgress = milestones.reduce((sum, m) => sum + m.progress_percentage, 0);
    return Math.round(totalProgress / milestones.length);
  };

  const getTrafficLightStatus = () => {
    const progress = calculateOverallProgress();
    const hasBlockedMilestones = milestones.some(m => m.status === 'blocked');
    const hasOverdueTasks = tasks.some(t =>
      t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date()
    );

    if (hasBlockedMilestones || hasOverdueTasks) return 'red';
    if (progress < 50) return 'yellow';
    return 'green';
  };

  const getTrafficLightMessage = () => {
    const status = getTrafficLightStatus();
    const progress = calculateOverallProgress();

    if (status === 'green') return `On Track (${progress}% Complete)`;
    if (status === 'yellow') return `In Progress (${progress}% Complete)`;
    return 'Action Needed';
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Transactions</h2>
          <p className="text-gray-600">You don't have any active transactions at the moment.</p>
        </div>
      </div>
    );
  }

  const trafficLight = getTrafficLightStatus();
  const progress = calculateOverallProgress();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Transaction Portal</h1>
          <p className="text-gray-600 mt-1">Track your real estate transaction progress</p>
        </div>
        {transactions.length > 1 && (
          <select
            value={selectedTransaction?.id}
            onChange={(e) => {
              const tx = transactions.find(t => t.id === e.target.value);
              setSelectedTransaction(tx || null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {transactions.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.property_address}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedTransaction && (
        <>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedTransaction.property_address}</h2>
                <p className="text-blue-100">
                  {selectedTransaction.transaction_type.charAt(0).toUpperCase() + selectedTransaction.transaction_type.slice(1)}
                  {' • '}
                  ${selectedTransaction.purchase_price.toLocaleString()}
                </p>
              </div>
              <div className={`p-4 rounded-full ${
                trafficLight === 'green' ? 'bg-green-500' :
                trafficLight === 'yellow' ? 'bg-yellow-500' :
                'bg-red-500'
              } shadow-lg`}>
                {trafficLight === 'green' ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : trafficLight === 'yellow' ? (
                  <Clock className="w-8 h-8 text-white" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-white" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-100">Overall Progress</span>
                <span className="font-semibold">{getTrafficLightMessage()}</span>
              </div>
              <div className="w-full bg-blue-800 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    trafficLight === 'green' ? 'bg-green-400' :
                    trafficLight === 'yellow' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {selectedTransaction.estimated_close_date && (
                <div className="flex items-center gap-2 text-sm text-blue-100">
                  <Calendar className="w-4 h-4" />
                  Estimated Close: {new Date(selectedTransaction.estimated_close_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Transaction Milestones
                </h3>
                <div className="space-y-4">
                  {milestones.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No milestones yet</p>
                  ) : (
                    milestones.map((milestone, index) => (
                      <div key={milestone.id} className="relative">
                        {index < milestones.length - 1 && (
                          <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        <div className="flex gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                            milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                            milestone.status === 'blocked' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {milestone.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : milestone.status === 'blocked' ? (
                              <AlertCircle className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 pb-8">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                                {milestone.description && (
                                  <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                                )}
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                                milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                milestone.status === 'blocked' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {milestone.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      milestone.status === 'completed' ? 'bg-green-500' :
                                      milestone.status === 'in_progress' ? 'bg-blue-500' :
                                      milestone.status === 'blocked' ? 'bg-red-500' :
                                      'bg-gray-400'
                                    }`}
                                    style={{ width: `${milestone.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm font-medium text-gray-600">
                                {milestone.progress_percentage}%
                              </span>
                            </div>
                            {milestone.due_date && (
                              <p className="text-xs text-gray-500 mt-2">
                                Due: {new Date(milestone.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Recent Documents
                </h3>
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No documents yet</p>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{doc.title}</p>
                            <p className="text-xs text-gray-500">
                              {doc.document_type.replace('_', ' ')}
                              {doc.requires_signature && ' • Signature Required'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-blue-600" />
                  My Tasks
                  {pendingTasks.length > 0 && (
                    <span className="ml-auto text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {pendingTasks.length}
                    </span>
                  )}
                </h3>

                {tasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No tasks assigned</p>
                ) : (
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => completeTask(task.id)}
                            className="flex-shrink-0 w-5 h-5 border-2 border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {task.priority}
                              </span>
                              {task.due_date && (
                                <span className="text-xs text-gray-500">
                                  Due {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {completedTasks.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                          Completed ({completedTasks.length})
                        </p>
                        {completedTasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center gap-2 py-2 text-sm text-gray-500">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="line-through">{task.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">Need Help?</h3>
                <p className="text-sm text-green-700 mb-3">
                  Your agent is here to help guide you through every step of the process.
                </p>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Contact Your Agent
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
