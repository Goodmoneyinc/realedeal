import { FileText, Download, Share2, Clock, CheckCircle, AlertCircle, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    document_type: string;
    file_size: number;
    status: string;
    created_at: string;
    requires_signature: boolean;
    file_type: string;
  };
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  onRequestSignature: () => void;
}

export function DocumentCard({ document, onDownload, onShare, onDelete, onRequestSignature }: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getDocumentIcon = () => {
    if (document.file_type?.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-500" />;
    } else if (document.file_type?.includes('word')) {
      return <FileText className="h-10 w-10 text-blue-500" />;
    } else if (document.file_type?.includes('image')) {
      return <FileText className="h-10 w-10 text-emerald-500" />;
    }
    return <FileText className="h-10 w-10 text-gray-500" />;
  };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
      pending_signature: { color: 'bg-amber-100 text-amber-700 border-amber-300', icon: <AlertCircle className="h-3 w-3" />, label: 'Pending Signature' },
      signed: { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: <CheckCircle className="h-3 w-3" />, label: 'Signed' },
      completed: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed' },
      voided: { color: 'bg-red-100 text-red-700 border-red-300', icon: <AlertCircle className="h-3 w-3" />, label: 'Voided' }
    };

    const config = statusConfig[document.status] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all group">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {getDocumentIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                {document.title}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500 capitalize">
                  {document.document_type.replace('_', ' ')}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">
                  {formatFileSize(document.file_size)}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">
                  {formatDate(document.created_at)}
                </span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreVertical className="h-5 w-5 text-gray-400" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        onDownload();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => {
                        onShare();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </button>
                    {document.requires_signature && document.status === 'draft' && (
                      <button
                        onClick={() => {
                          onRequestSignature();
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Request Signature</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            {getStatusBadge()}
            {document.requires_signature && (
              <span className="text-xs text-amber-600 font-medium">
                Signature Required
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
