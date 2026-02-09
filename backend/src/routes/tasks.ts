import express, { Response } from 'express';
import db from '../database';
import { AuthRequest, authenticateToken, authorize } from '../middleware';

const router = express.Router();

// Get all team members for a restaurant (for assignment dropdown)
router.get('/team/members', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const users = db
      .prepare('SELECT id, name, email, role FROM users WHERE restaurant_id = ? ORDER BY name ASC')
      .all(restaurantId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get all tasks for a restaurant
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const status = req.query.status as string;
    const assigned = req.query.assigned_to as string;

    let query = `
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.restaurant_id = ?
    `;
    const params: any[] = [restaurantId];

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (assigned) {
      query += ` AND t.assigned_to = ?`;
      params.push(parseInt(assigned));
    }

    query += ` ORDER BY t.due_date ASC`;

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task with checklists and comments
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const task = db.prepare(`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = ? AND t.restaurant_id = ?
    `).get(req.params.id, req.user?.restaurantId) as any;

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const checklists = db.prepare('SELECT * FROM task_checklists WHERE task_id = ?').all(task.id);
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at DESC
    `).all(task.id);

    const photos = db.prepare('SELECT * FROM photos WHERE task_id = ? ORDER BY uploaded_at DESC').all(task.id);

    res.json({ ...task, checklists, comments, photos });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authenticateToken, authorize(['admin', 'maintainer']), (req: AuthRequest, res: Response) => {
  try {
    const { title, description, assigned_to, priority, due_date, recurrence } = req.body;

    const stmt = db.prepare(`
      INSERT INTO tasks (
        title, description, assigned_to, restaurant_id, priority, 
        status, due_date, recurrence, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      description || null,
      assigned_to || null,
      req.user?.restaurantId,
      priority || 'medium',
      assigned_to ? 'assigned' : 'planned',
      due_date || null,
      recurrence || 'once',
      req.user?.id
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { title, description, assigned_to, priority, status, due_date, estimated_time, tags } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND restaurant_id = ?')
      .get(req.params.id, req.user?.restaurantId) as any;

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check authorization: admin/maintainer can do anything, workers can only update their own assignments
    const isManager = ['admin', 'maintainer'].includes(req.user?.role || '');
    const isAssignedToTask = task.assigned_to === req.user?.id;

    if (!isManager && !isAssignedToTask) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const newStatus = status || task.status;
    const oldStatus = task.status;

    // Track status change
    if (newStatus !== oldStatus) {
      db.prepare(
        `INSERT INTO task_status_history (task_id, old_status, new_status, changed_by)
         VALUES (?, ?, ?, ?)`
      ).run(req.params.id, oldStatus, newStatus, req.user?.id);
    }

    // Get assigned user info for email notification
    let assignedUser: any = null;
    if (assigned_to && assigned_to !== task.assigned_to) {
      assignedUser = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(assigned_to) as any;
    }

    const updateStmt = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, assigned_to = ?, priority = ?, status = ?, due_date = ?, estimated_time = ?
      WHERE id = ?
    `);

    updateStmt.run(
      title || task.title,
      description !== undefined ? description : task.description,
      assigned_to !== undefined ? assigned_to : task.assigned_to,
      priority || task.priority,
      newStatus,
      due_date || task.due_date,
      estimated_time !== undefined ? estimated_time : task.estimated_time,
      req.params.id
    );

    // Send email notification if assignment changed
    if (assignedUser && assignedUser.email) {
      const { sendAssignmentNotification } = require('../services/emailService');
      const restaurant = db.prepare('SELECT name FROM restaurants WHERE id = ?').get(req.user?.restaurantId) as any;
      const createdBy = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user?.id) as any;
      sendAssignmentNotification(
        assignedUser.email,
        title || task.title,
        createdBy?.name || 'Unknown',
        restaurant?.name || 'Restaurant'
      ).catch((err: any) => console.error('Failed to send email:', err));
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Remove existing tags
      db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(req.params.id);
      // Add new tags
      tags.forEach((tagId: number) => {
        db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)')
          .run(req.params.id, tagId);
      });
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Mark task as completed
router.put('/:id/complete', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND assigned_to = ?')
      .get(req.params.id, req.user?.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateStmt = db.prepare(`
      UPDATE tasks
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(req.params.id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Verify task completion
router.put('/:id/verify', authenticateToken, authorize(['manager', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const { comment } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND restaurant_id = ?')
      .get(req.params.id, req.user?.restaurantId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateStmt = db.prepare(`
      UPDATE tasks
      SET status = 'verified', verified_at = CURRENT_TIMESTAMP, verified_by = ?
      WHERE id = ?
    `);

    updateStmt.run(req.user?.id, req.params.id);

    if (comment) {
      const commentStmt = db.prepare(`
        INSERT INTO comments (task_id, user_id, content)
        VALUES (?, ?, ?)
      `);
      commentStmt.run(req.params.id, req.user?.id, comment);
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, authorize(['admin', 'manager']), (req: AuthRequest, res: Response) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND restaurant_id = ?')
      .get(req.params.id, req.user?.restaurantId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
