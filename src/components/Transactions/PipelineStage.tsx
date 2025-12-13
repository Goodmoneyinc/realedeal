import { TransactionCard } from './TransactionCard';

interface Transaction {
  id: string;
  property_address: string;
  purchase_price: number;
  estimated_close_date: string;
  state: string;
  status: string;
  completedItems: number;
  totalItems: number;
}

interface PipelineStageProps {
  stage: {
    id: string;
    name: string;
    color: string;
    icon: React.ReactNode;
  };
  transactions: Transaction[];
  onDragStart: (e: React.DragEvent, transactionId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: string) => void;
  onTransactionClick: (transaction: Transaction) => void;
}

export function PipelineStage({
  stage,
  transactions,
  onDragStart,
  onDragOver,
  onDrop,
  onTransactionClick
}: PipelineStageProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
      className="flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4"
    >
      <div className="flex items-center space-x-2 mb-4 pb-3 border-b-2 border-gray-200">
        <div className={`p-2 rounded-lg ${stage.color} bg-opacity-10`}>
          {stage.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{stage.name}</h3>
          <p className="text-sm text-gray-500">{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}</p>
        </div>
      </div>

      <div className="space-y-3 min-h-[200px]">
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-sm text-gray-400">Drop transactions here</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onDragStart={onDragStart}
              onClick={() => onTransactionClick(transaction)}
            />
          ))
        )}
      </div>
    </div>
  );
}
