// TaskCard component - displays individual task in card format
import { useRef } from 'react';

interface TaskCardProps {
  task: any;
  onClick: () => void;
  onEdit?: () => void;
  showEditButton?: boolean;
}

const statusLabels: Record<string, string> = {
  planned: 'מתוכנן',
  assigned: 'הוקצה',
  in_progress: 'בביצוע',
  waiting: 'ממתין',
  completed: 'הושלם',
  verified: 'אומת',
  overdue: 'באיחור',
};

// Priority colors for title highlighting
const priorityTitleColors: Record<string, string> = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-emerald-600 dark:text-emerald-400',
};

export default function TaskCard({ task, onClick, onEdit, showEditButton = false }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'verified'].includes(task.status);
  const touchStartY = useRef<number>(0);
  const isScrolling = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (deltaY > 10) {
      isScrolling.current = true;
    }
  };

  const handleTouchEnd = (callback: () => void) => (e: React.TouchEvent) => {
    if (!isScrolling.current) {
      e.preventDefault();
      callback();
    }
  };

  // Get assignee display
  const getAssigneeDisplay = () => {
    if (task.assignees && task.assignees.length > 0) {
      return (
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-[10px] text-white font-bold">
            {task.assignees[0].name.charAt(0)}
          </span>
          <span className="text-xs">{task.assignees.length > 1 ? `+${task.assignees.length - 1}` : task.assignees[0].name}</span>
        </div>
      );
    } else if (task.assigned_to_name) {
      return (
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-[10px] text-white font-bold">
            {task.assigned_to_name.charAt(0)}
          </span>
          <span className="text-xs">{task.assigned_to_name}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`p-3 rounded-2xl border transition-all cursor-pointer
        bg-white dark:bg-slate-800 
        hover:shadow-md dark:hover:bg-slate-750
        ${isOverdue
          ? 'border-red-300 dark:border-orange-500/50 bg-red-50/50 dark:bg-slate-800'
          : 'border-slate-200 dark:border-slate-700'
        }`}
    >
      {/* Title - highlighted with priority color */}
      <div className="mb-2" onClick={onClick}>
        <h3 className={`font-bold text-base leading-tight ${priorityTitleColors[task.priority] || 'text-slate-900 dark:text-white'}`}>
          {task.title}
        </h3>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 line-clamp-1" onClick={onClick}>{task.description}</p>
      )}

      {/* Single horizontal line: Status, Tags, Date, Assignee */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2" onClick={onClick}>
        {/* Status Badge */}
        <span className="px-2 py-1 rounded-lg font-bold bg-slate-100 dark:bg-slate-700 text-teal-600 dark:text-teal-400 shrink-0">
          {statusLabels[task.status as keyof typeof statusLabels] || task.status}
        </span>

        {/* Tags */}
        {task.tags && task.tags.map((tag: any) => (
          <span
            key={tag.id}
            className="px-2 py-1 rounded-lg font-bold text-white shrink-0"
            style={{ 
              background: tag.color2 
                ? `linear-gradient(135deg, ${tag.color} 0%, ${tag.color2} 100%)`
                : tag.color 
            }}
          >
            {tag.name}
          </span>
        ))}

        {/* Overdue badge */}
        {isOverdue && (
          <span className="px-2 py-1 rounded-lg font-bold bg-red-100 dark:bg-orange-500/20 text-red-600 dark:text-orange-400 shrink-0">
            ⚠️ באיחור
          </span>
        )}

        {/* Recurrence badge */}
        {task.recurrence && task.recurrence !== 'once' && (
          <span className="px-2 py-1 rounded-lg font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
            🔄 {task.recurrence === 'daily' ? 'יומי' : task.recurrence === 'weekly' ? 'שבועי' : 'חודשי'}
          </span>
        )}

        {/* Due date */}
        {task.due_date && (
          <span className={`shrink-0 ${isOverdue ? 'text-red-500 dark:text-orange-400 font-medium' : ''}`}>
            📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
          </span>
        )}

        {/* Assignee */}
        {getAssigneeDisplay()}
      </div>

      {/* Action Buttons - reduced height */}
      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={onClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd(onClick)}
          className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-teal-600 dark:text-teal-400 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500 transition-colors active:scale-95 touch-manipulation"
          style={{ minHeight: '36px', WebkitTapHighlightColor: 'transparent' }}
        >
          צפייה בפרטים
        </button>
        {showEditButton && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd(onEdit)}
            className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-500 active:bg-teal-700 transition-colors active:scale-95 touch-manipulation"
            style={{ minHeight: '36px', WebkitTapHighlightColor: 'transparent' }}
          >
            עריכה
          </button>
        )}
      </div>
    </div>
  );
}
