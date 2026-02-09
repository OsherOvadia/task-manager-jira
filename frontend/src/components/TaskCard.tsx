// TaskCard component - displays individual task in card format

const priorityLabels = {
  critical: 'דחוף ביותר',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
};

const statusLabels = {
  planned: 'מתוכנן',
  assigned: 'הוקצה',
  in_progress: 'בתהליך',
  waiting: 'בהמתנה',
  completed: 'הושלם',
  verified: 'אומת',
  overdue: 'בפיגור',
};

export default function TaskCard({ task, onClick }: any) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);

  const priorityEmojis = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 md:p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 ${
        isOverdue
          ? 'border-red-400 bg-gradient-to-br from-red-50 to-pink-50 shadow-md'
          : 'border-blue-200 bg-white hover:border-blue-400 shadow-md hover:shadow-xl'
      }`}
    >
      <div className="flex justify-between items-start mb-2 md:mb-3 gap-2">
        <h3 className="font-bold text-base md:text-lg text-gray-800 flex-1 line-clamp-2 group-hover:text-blue-600">{task.title}</h3>
        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-1 md:ml-2 shadow-md ${
          task.priority === 'critical'
            ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
            : task.priority === 'high'
            ? 'bg-gradient-to-r from-orange-500 to-yellow-600 text-white'
            : task.priority === 'medium'
            ? 'bg-gradient-to-r from-yellow-500 to-green-600 text-white'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
        }`}>
          {priorityEmojis[task.priority as keyof typeof priorityEmojis]} {priorityLabels[task.priority as keyof typeof priorityLabels]}
        </span>
      </div>

      {task.description && (
        <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex flex-wrap justify-between items-start gap-1 md:gap-2 mb-2 md:mb-3">
        <div className="flex gap-1 md:gap-2 flex-wrap">
          <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold shadow-md ${
            task.status === 'planned'
              ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white'
              : task.status === 'assigned'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : task.status === 'in_progress'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
              : task.status === 'waiting'
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
              : task.status === 'completed'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : task.status === 'verified'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          }`}>
            {statusLabels[task.status as keyof typeof statusLabels]}
          </span>
          {task.recurrence !== 'once' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md">
              🔄 {task.recurrence === 'daily' ? 'יומי' : task.recurrence === 'weekly' ? 'שבועי' : task.recurrence}
            </span>
          )}
        </div>
      </div>

      {(task.due_date || task.estimated_time) && (
        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
          {task.due_date && (
            <div className="flex items-center gap-2 font-semibold">
              <span>📅</span>
              <span className="text-xs">{new Date(task.due_date).toLocaleDateString('he-IL')}</span>
            </div>
          )}
          {task.estimated_time && (
            <div className="flex items-center gap-2 font-semibold">
              <span>⏱️</span>
              <span className="text-xs">
                {task.estimated_time < 60 
                  ? `${task.estimated_time} דקות` 
                  : task.estimated_time < 1440 
                  ? `${Math.round(task.estimated_time / 60)} שעות` 
                  : `${Math.round(task.estimated_time / 1440)} ימים`}
              </span>
            </div>
          )}
          {task.assigned_to_name && (
            <div className="flex items-center gap-2 font-semibold">
              <span>👤</span>
              <span className="text-xs truncate">{task.assigned_to_name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
