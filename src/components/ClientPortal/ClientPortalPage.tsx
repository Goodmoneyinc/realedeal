import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  FileSignature,
  FileText,
  HelpCircle,
  Home,
  ListTodo,
  Mail,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ClientTaskStatus, MilestoneStatus, TaskPriority } from '../../lib/supabase';

type TrafficLight = 'green' | 'yellow' | 'red';

interface Transaction {
  id: string;
  property_address: string;
  transaction_type: string;
  purchase_price: number;
  current_stage: string;
  estimated_close_date: string | null;
  status: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  progress_percentage: number;
  order_index: number;
  due_date: string | null;
  completed_at: string | null;
}

interface ClientTask {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: ClientTaskStatus;
  due_date: string | null;
  completed_at: string | null;
}

interface Document {
  id: string;
  title: string;
  description?: string | null;
  document_type: string;
  status: string;
  requires_signature: boolean;
  created_at: string;
}

const statusLabels: Record<MilestoneStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled yet';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(task: ClientTask) {
  return task.status === 'pending' && Boolean(task.due_date) && new Date(task.due_date as string) < new Date();
}

function dedupeTransactions(transactions: Transaction[]) {
  return Array.from(new Map(transactions.map((transaction) => [transaction.id, transaction])).values());
}

export default function ClientPortalPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [taskUpdatingId, setTaskUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTransaction = transactions.find((transaction) => transaction.id === selectedTransactionId) ?? null;

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.id) {
        setTransactions([]);
        setSelectedTransactionId('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('transaction_pipeline')
          .select('*')
          .or(`investor_id.eq.${user.id},lender_id.eq.${user.id}`)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const uniqueTransactions = dedupeTransactions((data ?? []) as Transaction[]);
        setTransactions(uniqueTransactions);
        setSelectedTransactionId(uniqueTransactions[0]?.id ?? '');
      } catch (fetchError) {
        console.error('Error fetching client portal transactions:', fetchError);
        setError('We could not load your transactions. Please try again.');
        setTransactions([]);
        setSelectedTransactionId('');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.id]);

  useEffect(() => {
    const fetchSelectedTransactionDetails = async () => {
      if (!selectedTransactionId) {
        setMilestones([]);
        setTasks([]);
        setDocuments([]);
        return;
      }

      setDetailsLoading(true);
      setError(null);

      try {
        const [milestonesResponse, tasksResponse, documentsResponse] = await Promise.all([
          supabase
            .from('transaction_milestones')
            .select('*')
            .eq('pipeline_id', selectedTransactionId)
            .order('order_index'),
          supabase
            .from('client_tasks')
            .select('*')
            .eq('pipeline_id', selectedTransactionId)
            .order('due_date', { ascending: true, nullsFirst: false }),
          supabase
            .from('documents')
            .select('*')
            .eq('pipeline_id', selectedTransactionId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false }),
        ]);

        if (milestonesResponse.error) throw milestonesResponse.error;
        if (tasksResponse.error) throw tasksResponse.error;
        if (documentsResponse.error) throw documentsResponse.error;

        setMilestones((milestonesResponse.data ?? []) as Milestone[]);
        setTasks((tasksResponse.data ?? []) as ClientTask[]);
        setDocuments((documentsResponse.data ?? []) as Document[]);
      } catch (fetchError) {
        console.error('Error fetching client portal details:', fetchError);
        setError('We could not load the selected transaction details.');
        setMilestones([]);
        setTasks([]);
        setDocuments([]);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchSelectedTransactionDetails();
  }, [selectedTransactionId]);

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === 'pending'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'completed'), [tasks]);
  const signatureDocuments = useMemo(
    () => documents.filter((document) => document.requires_signature),
    [documents],
  );

  const progress = useMemo(() => {
    if (milestones.length === 0) return 0;
    const totalProgress = milestones.reduce((total, milestone) => total + milestone.progress_percentage, 0);
    return Math.round(totalProgress / milestones.length);
  }, [milestones]);

  const trafficLight = useMemo<TrafficLight>(() => {
    const hasBlockedMilestones = milestones.some((milestone) => milestone.status === 'blocked');
    const hasOverdueTasks = pendingTasks.some(isOverdue);

    if (hasBlockedMilestones || hasOverdueTasks) return 'red';
    if (pendingTasks.length > 0 || milestones.some((milestone) => milestone.status === 'in_progress')) return 'yellow';
    return 'green';
  }, [milestones, pendingTasks]);

  const trafficLightCopy = {
    green: {
      label: 'On track',
      description: 'No immediate action is needed right now.',
      classes: 'bg-emerald-500 text-white',
      softClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    yellow: {
      label: 'In progress',
      description: 'A few items are still moving through the process.',
      classes: 'bg-amber-400 text-amber-950',
      softClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    red: {
      label: 'Action needed',
      description: 'A blocked milestone or overdue task needs attention.',
      classes: 'bg-red-500 text-white',
      softClasses: 'bg-red-50 text-red-700 border-red-200',
    },
  }[trafficLight];

  const completeTask = async (taskId: string) => {
    setTaskUpdatingId(taskId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('client_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: 'completed', completed_at: new Date().toISOString() }
            : task,
        ),
      );
    } catch (updateError) {
      console.error('Error completing client task:', updateError);
      setError('We could not mark that task complete. Please try again.');
    } finally {
      setTaskUpdatingId(null);
    }
  };

  const milestoneIcon = (status: MilestoneStatus) => {
    if (status === 'completed') return <CheckCircle className="h-5 w-5" />;
    if (status === 'blocked') return <AlertCircle className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-r-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading your transaction portal...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
            <Home className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">No active transactions found</h2>
          <p className="mt-3 text-slate-600">
            When your agent shares an active transaction with you, its milestones, tasks, and documents will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Client portal</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">My Transaction Portal</h1>
          <p className="mt-1 text-slate-600">Track your closing milestones, documents, and action items.</p>
        </div>

        {transactions.length > 1 && (
          <select
            value={selectedTransactionId}
            onChange={(event) => setSelectedTransactionId(event.target.value)}
            className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            {transactions.map((transaction) => (
              <option key={transaction.id} value={transaction.id}>
                {transaction.property_address}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {selectedTransaction && (
        <>
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                  {selectedTransaction.transaction_type.replace('_', ' ')} transaction
                </div>
                <h2 className="mt-4 text-3xl font-bold">{selectedTransaction.property_address}</h2>
                <p className="mt-2 text-emerald-50">
                  {formatCurrency(selectedTransaction.purchase_price)} purchase price
                </p>
              </div>

              <div className={`rounded-2xl border px-4 py-3 shadow-lg ${trafficLightCopy.softClasses}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${trafficLightCopy.classes}`}>
                    {trafficLight === 'green' ? <CheckCircle className="h-6 w-6" /> : trafficLight === 'yellow' ? <Clock className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                  </span>
                  <div>
                    <p className="font-bold">{trafficLightCopy.label}</p>
                    <p className="text-xs">{trafficLightCopy.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-emerald-50">
                  <span>Overall progress</span>
                  <span>{progress}% complete</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-emerald-100" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-100">Estimated close</p>
                    <p className="font-semibold">{formatDate(selectedTransaction.estimated_close_date)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {detailsLoading ? (
            <div className="rounded-2xl border border-emerald-100 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
              <p className="mt-4 text-sm font-medium text-slate-600">Loading transaction details...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <TrendingUp className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">Milestone timeline</h3>
                      <p className="text-sm text-slate-500">Follow each step from contract to close.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {milestones.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">No milestones have been added yet.</p>
                    ) : (
                      milestones.map((milestone, index) => (
                        <div key={milestone.id} className="relative flex gap-4">
                          {index < milestones.length - 1 && <div className="absolute bottom-0 left-5 top-12 w-px bg-emerald-100" />}
                          <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${milestone.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : milestone.status === 'blocked' ? 'bg-red-100 text-red-600' : milestone.status === 'in_progress' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                            {milestoneIcon(milestone.status)}
                          </div>
                          <div className="min-w-0 flex-1 pb-6">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h4 className="font-semibold text-slate-900">{milestone.name}</h4>
                                {milestone.description && <p className="mt-1 text-sm text-slate-600">{milestone.description}</p>}
                              </div>
                              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${milestone.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : milestone.status === 'blocked' ? 'bg-red-100 text-red-700' : milestone.status === 'in_progress' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                                {statusLabels[milestone.status]}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${milestone.progress_percentage}%` }} />
                              </div>
                              <span className="text-sm font-semibold text-slate-600">{milestone.progress_percentage}%</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Due: {formatDate(milestone.due_date)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-teal-100 p-2 text-teal-700">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-slate-950">Documents</h3>
                        <p className="text-sm text-slate-500">Review transaction documents shared with you.</p>
                      </div>
                    </div>
                    {signatureDocuments.length > 0 && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                        {signatureDocuments.length} signature required
                      </span>
                    )}
                  </div>

                  {signatureDocuments.length > 0 && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="flex gap-3">
                        <FileSignature className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>Some documents require your signature. Please review them promptly to keep closing on track.</p>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {documents.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">No documents have been shared yet.</p>
                    ) : (
                      documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between gap-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                              {document.requires_signature ? <FileSignature className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{document.title}</p>
                              <p className="text-xs text-slate-500">
                                {document.document_type.replace('_', ' ')} • {document.status.replace('_', ' ')} • {formatDate(document.created_at)}
                              </p>
                            </div>
                          </div>
                          {document.requires_signature && (
                            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">Sign</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <ListTodo className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">Tasks</h3>
                      <p className="text-sm text-slate-500">Items waiting on your action.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pendingTasks.length === 0 ? (
                      <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                        You're caught up. No pending tasks right now.
                      </div>
                    ) : (
                      pendingTasks.map((task) => (
                        <label key={task.id} className="flex gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/40">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled={taskUpdatingId === task.id}
                            onChange={() => completeTask(task.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-slate-900">{task.title}</span>
                            {task.description && <span className="mt-1 block text-sm text-slate-600">{task.description}</span>}
                            <span className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                              <span className={`rounded-full px-2.5 py-1 font-semibold ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {priorityLabels[task.priority]}
                              </span>
                              <span className={isOverdue(task) ? 'font-semibold text-red-600' : 'text-slate-500'}>
                                Due {formatDate(task.due_date)}
                              </span>
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  {completedTasks.length > 0 && (
                    <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-700">
                        Completed tasks ({completedTasks.length})
                        <ChevronDown className="h-4 w-4" />
                      </summary>
                      <div className="mt-3 space-y-2">
                        {completedTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm text-slate-500">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="line-through">{task.title}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </section>

                <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">Contact Escrow Agent</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Have questions about documents, deadlines, or closing funds? Your escrow team can help clarify next steps.
                  </p>
                  <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-700">
                    <Mail className="h-4 w-4" />
                    Contact Escrow Agent
                  </button>
                </section>

                <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-950">Secure portal</h3>
                      <p className="mt-1 text-sm text-slate-600">Your portal only shows transactions where you are listed as the investor or lender.</p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
