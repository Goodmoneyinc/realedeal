import { MapPin, DollarSign, Calendar, CheckCircle, Circle, AlertCircle } from 'lucide-react';

interface TransactionCardProps {
  transaction: {
    id: string;
    property_address: string;
    purchase_price: number;
    estimated_close_date: string;
    state: string;
    status: string;
    completedItems: number;
    totalItems: number;
  };
  onDragStart: (e: React.DragEvent, transactionId: string) => void;
  onClick: () => void;
}

export function TransactionCard({ transaction, onDragStart, onClick }: TransactionCardProps) {
  const completionPercentage = transaction.totalItems > 0
    ? Math.round((transaction.completedItems / transaction.totalItems) * 100)
    : 0;

  const getProgressColor = () => {
    if (completionPercentage >= 80) return 'bg-emerald-500';
    if (completionPercentage >= 50) return 'bg-blue-500';
    if (completionPercentage >= 25) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, transaction.id)}
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-move group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
            {transaction.property_address}
          </h4>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{transaction.state}</span>
          </div>
        </div>
        {transaction.status === 'active' ? (
          <Circle className="h-5 w-5 text-blue-500" />
        ) : (
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            Purchase Price
          </span>
          <span className="font-semibold text-gray-900">
            ${transaction.purchase_price.toLocaleString()}
          </span>
        </div>

        {transaction.estimated_close_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Est. Close
            </span>
            <span className="font-medium text-gray-700">
              {new Date(transaction.estimated_close_date).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Checklist Progress</span>
            <span className="font-semibold text-gray-900">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">
              {transaction.completedItems} of {transaction.totalItems} completed
            </span>
            {completionPercentage < 100 && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
