import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Send } from 'lucide-react';

interface Comment {
  id: number;
  contenu: string;
  created_at: string;
  client_prenom: string;
  client_nom: string;
  photo_profil?: string;
}

interface CommentsModalProps {
  publicationId: number;
  onClose: () => void;
  onCommentAdded: () => void;
}

export default function CommentsModal({ publicationId, onClose, onCommentAdded }: CommentsModalProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await api.publications.getComments(publicationId);
        setComments(data);
      } catch (error) {
        console.error('Erreur de chargement des commentaires', error);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [publicationId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const addedComment = await api.publications.addComment(publicationId, newComment);
      setComments(prev => [...prev, addedComment]);
      setNewComment('');
      onCommentAdded();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}j`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Commentaires</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500">Chargement...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500">Aucun commentaire. Soyez le premier !</div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {comment.photo_profil ? (
                    <img src={comment.photo_profil} alt={`${comment.client_prenom} ${comment.client_nom}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-semibold">
                      {comment.client_prenom?.[0]}{comment.client_nom?.[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{comment.client_prenom} {comment.client_nom}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{comment.contenu}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Ajouter un commentaire..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
