import db from '../database';
import { sendExpirationNotification } from './emailService';

// Track last notification sent per task (in memory, resets on server restart)
const lastNotificationSent: Map<number, Date> = new Map();

// Track last recurring task check to prevent duplicate recreations
const lastRecurringCheck: { daily?: string; weekly?: string; monthly?: string } = {};

/**
 * Check for tasks that are about to expire (2/3 of time passed) or overdue
 * Sends DAILY email notifications until task is completed
 */
export async function checkForExpiringTasks() {
  try {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Get all tasks that have a due date and are not completed/verified
    const tasks = db
      .prepare(
        `SELECT 
          t.id, 
          t.title,
          t.due_date,
          t.status,
          t.created_at,
          r.name as restaurant_name
         FROM tasks t
         LEFT JOIN restaurants r ON t.restaurant_id = r.id
         WHERE t.due_date IS NOT NULL 
         AND t.status NOT IN ('completed', 'verified')`
      )
      .all() as any[];

    for (const task of tasks) {
      const createdAt = new Date(task.created_at);
      const dueAt = new Date(task.due_date);
      const totalTime = dueAt.getTime() - createdAt.getTime();
      const elapsedTime = now.getTime() - createdAt.getTime();
      const progressPercent = totalTime > 0 ? (elapsedTime / totalTime) * 100 : 100;
      const isOverdue = now > dueAt;

      // Check if 2/3 of the time has passed OR task is overdue
      if (progressPercent >= 66.67 || isOverdue) {
        // Get all assignees for this task
        const assignees = db
          .prepare(
            `SELECT u.id, u.email, u.name 
             FROM task_assignments ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.task_id = ?`
          )
          .all(task.id) as any[];

        if (assignees.length === 0) continue;

        // Create unique notification key for this task+date combination
        const notificationKey = task.id;
        const lastSent = lastNotificationSent.get(notificationKey);
        const shouldSend = !lastSent || (now.getTime() - lastSent.getTime()) >= oneDayMs;

        if (shouldSend) {
          // Send to all assignees
          for (const assignee of assignees) {
            try {
              await sendExpirationNotification({
                recipientEmail: assignee.email,
                taskTitle: task.title,
                taskId: task.id,
                dueDate: task.due_date,
                assignedTo: assignee.name || 'User',
                restaurantName: task.restaurant_name || 'Restaurant',
              });

              const urgency = isOverdue ? '🚨 OVERDUE' : '⚠️ 2/3 TIME PASSED';
              console.log(
                `📧 ${urgency} - Sent reminder for task "${task.title}" (ID: ${task.id}) to ${assignee.email}`
              );
            } catch (emailError: any) {
              console.error(`Failed to send email for task ${task.id} to ${assignee.email}:`, emailError.message);
            }
          }

          // Track that we sent notifications for this task
          lastNotificationSent.set(notificationKey, now);
        }
      }
    }

    // Clean up tracking for completed tasks
    const completedTaskIds = db
      .prepare(`SELECT id FROM tasks WHERE status IN ('completed', 'verified')`)
      .all() as any[];
    
    for (const task of completedTaskIds) {
      lastNotificationSent.delete(task.id);
    }

  } catch (error: any) {
    console.error('Error checking for expiring tasks:', error.message);
  }
}

/**
 * Process recurring tasks - recreate completed tasks based on their recurrence type
 * - Daily: Recreate at midnight (00:00) if completed
 * - Weekly: Recreate on Sunday if completed
 * - Monthly: Recreate on 1st of month if completed
 */
export function processRecurringTasks() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const dayOfMonth = now.getDate(); // 1-31
    const todayKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`; // YYYY-M
    const weekKey = `${now.getFullYear()}-W${Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;

    // Process DAILY recurring tasks - every day
    if (lastRecurringCheck.daily !== todayKey) {
      processRecurrenceType('daily', todayKey);
      lastRecurringCheck.daily = todayKey;
    }

    // Process WEEKLY recurring tasks - only on Sunday (day 0)
    if (dayOfWeek === 0 && lastRecurringCheck.weekly !== weekKey) {
      processRecurrenceType('weekly', weekKey);
      lastRecurringCheck.weekly = weekKey;
    }

    // Process MONTHLY recurring tasks - only on 1st of month
    if (dayOfMonth === 1 && lastRecurringCheck.monthly !== monthKey) {
      processRecurrenceType('monthly', monthKey);
      lastRecurringCheck.monthly = monthKey;
    }

  } catch (error: any) {
    console.error('Error processing recurring tasks:', error.message);
  }
}

/**
 * Process a specific recurrence type
 */
function processRecurrenceType(recurrenceType: string, periodKey: string) {
  try {
    // Find completed recurring tasks of this type
    const completedTasks = db
      .prepare(
        `SELECT * FROM tasks 
         WHERE recurrence = ? 
         AND status IN ('completed', 'verified')`
      )
      .all(recurrenceType) as any[];

    if (completedTasks.length === 0) return;

    console.log(`🔄 Processing ${completedTasks.length} ${recurrenceType} recurring tasks...`);

    for (const task of completedTasks) {
      try {
        // Calculate new due date based on recurrence type
        const newDueDate = calculateNewDueDate(recurrenceType, task.due_date);

        // Create new task with same properties but reset status
        const result = db.prepare(`
          INSERT INTO tasks (
            title, description, priority, restaurant_id, created_by,
            status, due_date, recurrence, estimated_time
          ) VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?)
        `).run(
          task.title,
          task.description,
          task.priority,
          task.restaurant_id,
          task.created_by,
          newDueDate,
          task.recurrence,
          task.estimated_time
        );

        const newTaskId = result.lastInsertRowid;

        // Copy task assignments (assignees)
        const assignees = db.prepare('SELECT user_id FROM task_assignments WHERE task_id = ?').all(task.id) as any[];
        for (const assignee of assignees) {
          db.prepare('INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)').run(newTaskId, assignee.user_id);
        }

        // Copy task tags
        const tags = db.prepare('SELECT tag_id FROM task_tags WHERE task_id = ?').all(task.id) as any[];
        for (const tag of tags) {
          db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(newTaskId, tag.tag_id);
        }

        // Update old task status to indicate it was recreated (optional: or delete it)
        // We'll mark it as 'archived' by changing recurrence to 'once' so it gets cleaned up
        db.prepare('UPDATE tasks SET recurrence = ? WHERE id = ?').run('once', task.id);

        console.log(`  ✅ Recreated ${recurrenceType} task: "${task.title}" (old ID: ${task.id} → new ID: ${newTaskId})`);

      } catch (taskError: any) {
        console.error(`  ❌ Failed to recreate task ${task.id}:`, taskError.message);
      }
    }

    console.log(`🔄 Finished processing ${recurrenceType} recurring tasks`);

  } catch (error: any) {
    console.error(`Error processing ${recurrenceType} recurring tasks:`, error.message);
  }
}

/**
 * Calculate new due date based on recurrence type
 */
function calculateNewDueDate(recurrenceType: string, oldDueDate: string | null): string {
  const now = new Date();
  let newDate = new Date();

  switch (recurrenceType) {
    case 'daily':
      // Due at end of today
      newDate.setHours(23, 59, 59, 0);
      break;
    case 'weekly':
      // Due at end of Saturday (6 days from Sunday)
      newDate.setDate(newDate.getDate() + 6);
      newDate.setHours(23, 59, 59, 0);
      break;
    case 'monthly':
      // Due at end of current month
      newDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    default:
      // Default to end of today
      newDate.setHours(23, 59, 59, 0);
  }

  return newDate.toISOString();
}

/**
 * Clean up old completed tasks
 * Removes tasks that are completed/verified AND 1 week past their due date
 * Does NOT delete recurring tasks (recurrence != 'once')
 */
export function cleanupOldCompletedTasks() {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    // Find tasks to delete (only non-recurring tasks)
    const tasksToDelete = db
      .prepare(
        `SELECT id, title FROM tasks 
         WHERE status IN ('completed', 'verified')
         AND due_date IS NOT NULL
         AND due_date < ?
         AND recurrence = 'once'`
      )
      .all(oneWeekAgoStr) as any[];

    if (tasksToDelete.length > 0) {
      // Delete related records first
      for (const task of tasksToDelete) {
        db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM task_checklists WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM comments WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM photos WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM task_status_history WHERE task_id = ?').run(task.id);
      }

      // Delete the tasks (only non-recurring)
      const result = db
        .prepare(
          `DELETE FROM tasks 
           WHERE status IN ('completed', 'verified')
           AND due_date IS NOT NULL
           AND due_date < ?
           AND recurrence = 'once'`
        )
        .run(oneWeekAgoStr);

      console.log(`🗑️ Cleaned up ${result.changes} old completed tasks`);
    }
  } catch (error: any) {
    console.error('Error cleaning up old tasks:', error.message);
  }
}

/**
 * Start the background notification service
 * Runs every hour to check for expiring tasks, recurring tasks, and cleanup old tasks
 */
export function startNotificationService() {
  // Check immediately on startup
  checkForExpiringTasks();
  processRecurringTasks();
  cleanupOldCompletedTasks();

  // Run every hour (3600000 milliseconds)
  const intervalId = setInterval(() => {
    checkForExpiringTasks();
    processRecurringTasks();
    cleanupOldCompletedTasks();
  }, 3600000);

  console.log('🔔 Notification service started - checking every hour');
  console.log('🔄 Recurring tasks service started - daily/weekly/monthly');
  console.log('🗑️ Cleanup service started - removing old completed tasks');
  return intervalId;
}

/**
 * Stop the notification service
 */
export function stopNotificationService(intervalId: NodeJS.Timeout) {
  clearInterval(intervalId);
  console.log('🔔 Notification service stopped');
}
