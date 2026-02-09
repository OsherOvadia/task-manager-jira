import { useState, useEffect } from 'react';
import { useTaskStore, useTagStore, useAuthStore } from '../store';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function CreateTaskModal({ onClose, onTaskCreated }: any) {
  const { user, token } = useAuthStore();
  const { createTask, fetchTasks } = useTaskStore();
  const { tags, fetchTags } = useTagStore();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
    estimated_time: '',
    recurrence: 'once',
    tags: [] as number[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTags(user.restaurant_id);
      // Fetch team members
      fetchTeamMembers();
    }
  }, [user?.restaurant_id, fetchTags]);

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/tasks/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTagToggle = (tagId: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createTask({
        ...formData,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
        recurrence: formData.recurrence as 'once' | 'daily' | 'weekly' | 'monthly',
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : undefined,
        estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : undefined,
      });
      await fetchTasks();
      onTaskCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">➕ יצירת משימה</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">כותרת משימה *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="למשל, ניקוי תחנות המטבח"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">תיאור</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="הוראות שלב אחר שלב..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">הקצה אל</label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">בחר עובד...</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">עדיפות</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">נמוך</option>
                <option value="medium">בינוני</option>
                <option value="high">גבוה</option>
                <option value="critical">דחוף ביותר</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">חזרה על</label>
              <select
                name="recurrence"
                value={formData.recurrence}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="once">פעם אחת</option>
                <option value="daily">יומי</option>
                <option value="weekly">שבועי</option>
                <option value="monthly">חודשי</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">זמן משוער (דק')</label>
              <input
                type="number"
                name="estimated_time"
                value={formData.estimated_time}
                onChange={handleChange}
                placeholder="15"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך יעד</label>
            <input
              type="datetime-local"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">תגיות</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      formData.tags.includes(tag.id)
                        ? 'ring-2 ring-offset-1 opacity-100'
                        : 'opacity-60 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: tag.color,
                      color: '#fff',
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
            >
              {loading ? 'יוצר...' : 'יצירה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
