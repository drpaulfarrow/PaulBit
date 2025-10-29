-- Migration: Create notifications table
-- Purpose: Track publisher notifications for negotiation events

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  related_entity_type VARCHAR(50),
  related_entity_id VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  CONSTRAINT valid_notification_type CHECK (
    type IN (
      'negotiation_initiated',
      'negotiation_round',
      'negotiation_accepted',
      'negotiation_rejected',
      'negotiation_timeout',
      'license_created',
      'strategy_match'
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_notifications_publisher ON notifications(publisher_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(publisher_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

-- Comments
COMMENT ON TABLE notifications IS 'Stores notifications for publishers about negotiation and license events';
COMMENT ON COLUMN notifications.type IS 'Type of notification: negotiation_initiated, negotiation_round, negotiation_accepted, negotiation_rejected, negotiation_timeout, license_created, strategy_match';
COMMENT ON COLUMN notifications.metadata IS 'Additional data about the notification (e.g., terms, client info, prices)';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type of related entity: negotiation, license, strategy';
COMMENT ON COLUMN notifications.related_entity_id IS 'ID of related entity (UUID or integer as string)';
