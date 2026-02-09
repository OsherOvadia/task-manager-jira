import db from './database';
import bcrypt from 'bcryptjs';

export function seedDatabase() {
  // Create restaurants
  const restaurant1 = db.prepare(`
    INSERT INTO restaurants (name, location) VALUES (?, ?)
  `).run('פיצריה דאונטאון', 'רחוב הראשי 123');

  const restaurant2 = db.prepare(`
    INSERT INTO restaurants (name, location) VALUES (?, ?)
  `).run('ביסטרו עלית', 'שדרות האלון 456');

  // Create default statuses for restaurants
  const defaultStatuses = [
    { name: 'planned', displayName: 'מתוכנן', color: '#9ca3af', order: 0 },
    { name: 'assigned', displayName: 'הוקצה', color: '#3b82f6', order: 1 },
    { name: 'in_progress', displayName: 'בתהליך', color: '#8b5cf6', order: 2 },
    { name: 'waiting', displayName: 'בהמתנה', color: '#f59e0b', order: 3 },
    { name: 'completed', displayName: 'הושלם', color: '#10b981', order: 4 },
    { name: 'verified', displayName: 'אומת', color: '#059669', order: 5 }
  ];

  defaultStatuses.forEach((status) => {
    db.prepare(`
      INSERT INTO statuses (restaurant_id, name, display_name, color, order_index, is_default)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(restaurant1.lastInsertRowid, status.name, status.displayName, status.color, status.order);

    db.prepare(`
      INSERT INTO statuses (restaurant_id, name, display_name, color, order_index, is_default)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(restaurant2.lastInsertRowid, status.name, status.displayName, status.color, status.order);
  });

  // Create users
  const admin = db.prepare(`
    INSERT INTO users (email, name, password, role, status, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'admin@restaurant.com',
    'אלכס - Admin',
    bcrypt.hashSync('password123', 10),
    'admin',
    'approved',
    1
  );

  const maintainer = db.prepare(`
    INSERT INTO users (email, name, password, role, status, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'manager@downtown.com',
    'מריה - Maintainer',
    bcrypt.hashSync('password123', 10),
    'maintainer',
    'approved',
    1
  );

  const worker = db.prepare(`
    INSERT INTO users (email, name, password, role, status, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'john@restaurant.com',
    'יוחנן - Worker',
    bcrypt.hashSync('password123', 10),
    'worker',
    'approved',
    1
  );

  // Create sample tasks
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'רשימת בדיקת פתיחה',
    'בצע את כל הליכי הפתיחה: בדוק ציוד, תחנות הכנה, אמת מלאי',
    worker.lastInsertRowid,
    1,
    'high',
    'assigned',
    tomorrow.toISOString(),
    'daily',
    admin.lastInsertRowid
  );

  db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ניקוי תחנות המטבח',
    'ניקוי עמוק של כל תחנות המטבח והציוד',
    worker.lastInsertRowid,
    1,
    'high',
    'in_progress',
    tomorrow.toISOString(),
    'daily',
    maintainer.lastInsertRowid
  );

  db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ספירת מלאי',
    'ספור ורשום את כל פריטי המלאי של המזון',
    worker.lastInsertRowid,
    1,
    'medium',
    'planned',
    tomorrow.toISOString(),
    'weekly',
    maintainer.lastInsertRowid
  );

  db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'רשימת בדיקת בריאות וביטחון',
    'אמת שכל דרישות הבריאות והביטחון מתקיימות',
    worker.lastInsertRowid,
    1,
    'critical',
    'planned',
    tomorrow.toISOString(),
    'daily',
    admin.lastInsertRowid
  );

  // Create default tags for restaurants
  const defaultTags = [
    { name: 'דחוף', color: '#ef4444' },
    { name: 'שגרה', color: '#3b82f6' },
    { name: 'תחזוקה', color: '#f59e0b' },
    { name: 'ניהול', color: '#8b5cf6' },
    { name: 'לקוחות', color: '#ec4899' },
    { name: 'בדיקה', color: '#10b981' }
  ];

  defaultTags.forEach((tag) => {
    db.prepare(`
      INSERT INTO tags (restaurant_id, name, color, created_by)
      VALUES (?, ?, ?, ?)
    `).run(restaurant1.lastInsertRowid, tag.name, tag.color, admin.lastInsertRowid);

    db.prepare(`
      INSERT INTO tags (restaurant_id, name, color, created_by)
      VALUES (?, ?, ?, ?)
    `).run(restaurant2.lastInsertRowid, tag.name, tag.color, admin.lastInsertRowid);
  });

  console.log('✅ בסיס הנתונים זורע עם נתונים לדוגמה');
  console.log('');
  console.log('שם משתמש ופסוח לדוגמה:');
  console.log('Admin: admin@restaurant.com / password123');
  console.log('Maintainer: manager@downtown.com / password123');
  console.log('Worker: john@restaurant.com / password123');
}
