import { useState, useEffect } from 'react';
import { useTagStore, useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function TagManagementModal({ onClose }: any) {
  const { user, token } = useAuthStore();
  const { tags, fetchTags } = useTagStore();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTags(user.restaurant_id);
    }
  }, [user?.restaurant_id, fetchTags]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      setError('יש להכניס שם לתגיה');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${API_BASE}/tags`,
        {
          restaurantId: user?.restaurant_id,
          name: newTagName.trim(),
          color: newTagColor,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('✓ תגיה נוצרה בהצלחה!');
      setNewTagName('');
      setNewTagColor('#3b82f6');
      
      // Refresh tags list
      if (user?.restaurant_id) {
        fetchTags(user.restaurant_id);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create tag');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!window.confirm('?האם אתה בטוח שברצונך למחוק את התגיה')) return;

    try {
      await axios.delete(`${API_BASE}/tags/${tagId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('✓ התגיה נמחקה בהצלחה!');
      
      // Refresh tags list
      if (user?.restaurant_id) {
        fetchTags(user.restaurant_id);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete tag');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-yellow-400 to-orange-400">
          <h2 className="text-2xl font-bold text-white">🏷️ ניהול תגיות</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {/* Add New Tag Form */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">➕ יצירת תגיה חדשה</h3>
            <form onSubmit={handleAddTag} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="שם התגיה"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border-2 border-yellow-300"
                  title="בחר צבע לתגיה"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {loading ? '⏳ יוצר...' : '✓ צור תגיה'}
                </button>
              </div>

              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm font-semibold">
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm font-semibold">
                  {success}
                </div>
              )}
            </form>
          </div>

          {/* Existing Tags List */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">📋 תגיות קיימות</h3>
            {tags && tags.length > 0 ? (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-semibold text-gray-800">{tag.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all duration-300 transform hover:scale-110 active:scale-95"
                    >
                      ✕ מחק
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6 font-semibold">אין תגיות עדיין</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
