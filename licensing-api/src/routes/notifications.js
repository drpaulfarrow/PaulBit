const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications for a publisher
 */
router.get('/', async (req, res) => {
  try {
    const { publisher_id, is_read, type, limit = 50, offset = 0 } = req.query;

    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    let query = `
      SELECT * FROM notifications
      WHERE publisher_id = $1
    `;
    const params = [publisher_id];

    if (is_read !== undefined) {
      query += ` AND is_read = $${params.length + 1}`;
      params.push(is_read === 'true');
    }

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get unread count
    const unreadResult = await db.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE publisher_id = $1 AND is_read = FALSE',
      [publisher_id]
    );

    res.json({
      notifications: result.rows,
      count: result.rows.length,
      unread_count: parseInt(unreadResult.rows[0].unread_count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for a publisher
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { publisher_id } = req.query;

    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const result = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE publisher_id = $1 AND is_read = FALSE',
      [publisher_id]
    );

    res.json({ unread_count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for a publisher
 */
router.put('/mark-all-read', async (req, res) => {
  try {
    const { publisher_id } = req.body;

    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const result = await db.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE publisher_id = $1 AND is_read = FALSE
       RETURNING id`,
      [publisher_id]
    );

    res.json({ 
      success: true, 
      marked_count: result.rows.length 
    });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM notifications WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete notification:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
