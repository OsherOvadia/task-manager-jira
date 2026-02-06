import express, { Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware';
import { 
  getVapidPublicKey, 
  saveSubscription, 
  removeSubscription,
  sendNotificationToAll 
} from '../services/pushService';
import db from '../database';

const router = express.Router();

// Get VAPID public key (for frontend to subscribe)
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const subscription = req.body;

  if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription data' });
  }

  const success = saveSubscription(userId, subscription);
  
  if (success) {
    res.json({ message: 'Subscription saved successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const success = removeSubscription(endpoint);
  
  if (success) {
    res.json({ message: 'Unsubscribed successfully' });
  } else {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Test notification (admin only)
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const result = await sendNotificationToAll(
      '🔔 התראת בדיקה',
      'זוהי התראת בדיקה מהמערכת'
    );
    res.json({ message: 'Test notification sent', ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Get all users with notification status (admin only)
router.get('/users-status', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const restaurantId = req.user?.restaurantId;
    
    // Get all users from this restaurant with their notification subscription count
    const users = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        (SELECT COUNT(*) FROM push_subscriptions ps WHERE ps.user_id = u.id) as subscription_count
      FROM users u
      WHERE u.restaurant_id = ?
      ORDER BY u.name
    `).all(restaurantId) as any[];

    const result = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      notificationsEnabled: user.subscription_count > 0,
      subscriptionCount: user.subscription_count
    }));

    res.json({
      total: result.length,
      withNotifications: result.filter(u => u.notificationsEnabled).length,
      withoutNotifications: result.filter(u => !u.notificationsEnabled).length,
      users: result
    });
  } catch (error) {
    console.error('Error fetching users status:', error);
    res.status(500).json({ error: 'Failed to fetch users status' });
  }
});

export default router;
