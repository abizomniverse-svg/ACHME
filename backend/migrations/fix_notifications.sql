-- Fix notifications table issues
ALTER TABLE notifications MODIFY task_id INT DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) DEFAULT 0 AFTER is_read;
ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) DEFAULT 0 AFTER is_read;
