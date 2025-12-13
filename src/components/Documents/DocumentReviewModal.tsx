import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  FileText,
  MessageSquare,
  Star,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Annotation {
  id: string;
  page_number: number;
  note: string;
  ai_summary?: string;
  is_important: boolean;
  created_by: string;
  created_at: string;
}

interface DocumentReviewModalProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

export default function DocumentReviewModal({
  documentId,
  documentTitle,
  onClose
}: DocumentReviewModalProps) {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(10);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    fetchAnnotations();
  }, [documentId]);

  const fetchAnnotations = async () => {
    try {
      const { data, error } = await supabase
        .from('document_annotations')
        .select('*')
        .eq('document_id', documentId)
        .order('page_number')
        .order('created_at');

      if (error) throw error;
      setAnnotations(data || []);
    } catch (error) {
      console.error('Error fetching annotations:', error);
    }
  };

  const addAnnotation = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('document_annotations')
        .insert([{
          document_id: documentId,
          created_by: user?.id,
          page_number: currentPage,
          note: newNote,
          is_important: isImportant
        }]);

      if (error) throw error;

      setNewNote('');
      setIsImportant(false);
      setShowAddNote(false);
      fetchAnnotations();
    } catch (error) {
      console.error('Error adding annotation:', error);
      alert('Failed to add annotation');
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    setGeneratingAI(true);
    try {
      const mockSummary = `This document outlines the terms and conditions for the property transaction. Key points include:\n\n• Purchase price and payment terms\n• Property inspection contingencies\n• Closing date and conditions\n• Seller disclosures and warranties\n\nPlease review all sections carefully before signing.`;

      await new Promise(resolve => setTimeout(resolve, 1500));

      const { error } = await supabase
        .from('document_annotations')
        .insert([{
          document_id: documentId,
          created_by: user?.id,
          page_number: 1,
          ai_summary: mockSummary,
          is_important: true,
          note: 'AI-Generated Summary'
        }]);

      if (error) throw error;
      fetchAnnotations();
    } catch (error) {
      console.error('Error generating AI summary:', error);
      alert('Failed to generate AI summary');
    } finally {
      setGeneratingAI(false);
    }
  };

  const currentPageAnnotations = annotations.filter(a => a.page_number === currentPage);
  const hasAISummary = annotations.some(a => a.ai_summary);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{documentTitle}</h2>
              <p className="text-sm text-gray-600">Review and annotate this document</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg min-h-full p-12">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{documentTitle}</h3>
                  <p className="text-gray-600">Page {currentPage} of {totalPages}</p>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    [Document content would be displayed here. This is a placeholder representing
                    the actual PDF or document content that would be rendered using a PDF viewer
                    library or similar document rendering solution.]
                  </p>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center my-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      PDF Document Preview
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Integration with PDF rendering library required for full document display
                    </p>
                  </div>

                  {currentPageAnnotations.length > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        Notes on this page:
                      </p>
                      {currentPageAnnotations.map((annotation) => (
                        <div key={annotation.id} className="text-sm text-blue-800 mb-1">
                          • {annotation.note}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Document Insights</h3>

              {!hasAISummary && (
                <button
                  onClick={generateAISummary}
                  disabled={generatingAI}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 mb-4"
                >
                  <Sparkles className="w-5 h-5" />
                  {generatingAI ? 'Generating...' : 'Generate AI Summary'}
                </button>
              )}

              <button
                onClick={() => setShowAddNote(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-5 h-5" />
                Add Note
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={`border rounded-lg p-4 ${
                    annotation.is_important
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {annotation.is_important && (
                      <Star className="w-4 h-4 text-amber-500 fill-current flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          Page {annotation.page_number}
                        </span>
                        {annotation.ai_summary && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{annotation.note}</p>
                      {annotation.ai_summary && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">AI Summary:</p>
                          <p className="text-xs text-gray-600 whitespace-pre-line">{annotation.ai_summary}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(annotation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {annotations.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No notes yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add notes to highlight important sections
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add Note to Page {currentPage}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                  placeholder="Add your note or comment about this section..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="important"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                />
                <label htmlFor="important" className="text-sm text-gray-700 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  Mark as Important
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddNote(false);
                    setNewNote('');
                    setIsImportant(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addAnnotation}
                  disabled={loading || !newNote.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
