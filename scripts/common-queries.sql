-- Common SQL queries for database management and debugging

-- ================================
-- USER MANAGEMENT QUERIES
-- ================================

-- Get all users with their basic info
-- SELECT id, email, name, nick, role, createdAt FROM "User" ORDER BY createdAt DESC;

-- Find user by email
-- SELECT * FROM "User" WHERE email = 'user@example.com';

-- Count users by role
-- SELECT role, COUNT(*) as count FROM "User" GROUP BY role;

-- Users created in the last 7 days
-- SELECT id, email, name, createdAt FROM "User" WHERE createdAt >= datetime('now', '-7 days');

-- ================================
-- THREAD MANAGEMENT QUERIES
-- ================================

-- Get all threads with user information
-- SELECT 
--   t.id, t.title, t.status, t.createdAt,
--   u.email as user_email, u.name as user_name
-- FROM "Thread" t
-- JOIN "User" u ON t.userId = u.id
-- ORDER BY t.createdAt DESC;

-- Count threads by status
-- SELECT status, COUNT(*) as count FROM "Thread" GROUP BY status;

-- Active threads with message count
-- SELECT 
--   t.id, t.title, t.status,
--   COUNT(m.id) as message_count
-- FROM "Thread" t
-- LEFT JOIN "Message" m ON t.id = m.threadId
-- WHERE t.status = 'ACTIVE'
-- GROUP BY t.id, t.title, t.status
-- ORDER BY message_count DESC;

-- ================================
-- MESSAGE QUERIES
-- ================================

-- Recent messages with user and thread info
-- SELECT 
--   m.id, m.content, m.role, m.createdAt,
--   u.name as user_name, u.email as user_email,
--   t.title as thread_title
-- FROM "Message" m
-- JOIN "User" u ON m.userId = u.id
-- JOIN "Thread" t ON m.threadId = t.id
-- ORDER BY m.createdAt DESC
-- LIMIT 10;

-- Messages by role distribution
-- SELECT role, COUNT(*) as count FROM "Message" GROUP BY role;

-- Average messages per thread
-- SELECT 
--   AVG(message_count) as avg_messages_per_thread
-- FROM (
--   SELECT threadId, COUNT(*) as message_count 
--   FROM "Message" 
--   GROUP BY threadId
-- );

-- ================================
-- FILE MANAGEMENT QUERIES
-- ================================

-- File statistics
-- SELECT 
--   COUNT(*) as total_files,
--   SUM(size) as total_size_bytes,
--   AVG(size) as avg_file_size,
--   COUNT(DISTINCT mimeType) as unique_mime_types
-- FROM "File";

-- Files by mime type
-- SELECT mimeType, COUNT(*) as count, SUM(size) as total_size 
-- FROM "File" 
-- GROUP BY mimeType 
-- ORDER BY count DESC;

-- Large files (> 1MB)
-- SELECT id, filename, originalName, size, mimeType, createdAt 
-- FROM "File" 
-- WHERE size > 1048576 
-- ORDER BY size DESC;

-- ================================
-- ARTIFACT QUERIES
-- ================================

-- Artifacts by type
-- SELECT type, COUNT(*) as count FROM "Artifact" GROUP BY type;

-- Recent artifacts with user info
-- SELECT 
--   a.id, a.type, a.title, a.createdAt,
--   u.name as user_name, u.email as user_email,
--   t.title as thread_title
-- FROM "Artifact" a
-- JOIN "User" u ON a.userId = u.id
-- JOIN "Thread" t ON a.threadId = t.id
-- ORDER BY a.createdAt DESC
-- LIMIT 10;

-- ================================
-- REACTION QUERIES
-- ================================

-- Most popular emojis
-- SELECT emoji, COUNT(*) as count FROM "Reaction" GROUP BY emoji ORDER BY count DESC;

-- Messages with reaction counts
-- SELECT 
--   m.id, m.content, m.createdAt,
--   COUNT(r.id) as reaction_count,
--   GROUP_CONCAT(r.emoji) as emojis
-- FROM "Message" m
-- LEFT JOIN "Reaction" r ON m.id = r.messageId
-- GROUP BY m.id, m.content, m.createdAt
-- HAVING reaction_count > 0
-- ORDER BY reaction_count DESC;

-- ================================
-- RELATIONSHIP QUERIES
-- ================================

-- Messages with attached files
-- SELECT 
--   m.id as message_id, m.content,
--   f.id as file_id, f.filename, f.mimeType, f.size
-- FROM "Message" m
-- JOIN "MessageFile" mf ON m.id = mf.messageId
-- JOIN "File" f ON mf.fileId = f.id
-- ORDER BY m.createdAt DESC;

-- Artifacts with attached files
-- SELECT 
--   a.id as artifact_id, a.title, a.type,
--   f.id as file_id, f.filename, f.mimeType
-- FROM "Artifact" a
-- JOIN "ArtifactFile" af ON a.id = af.artifactId
-- JOIN "File" f ON af.fileId = f.id
-- ORDER BY a.createdAt DESC;

-- ================================
-- CLEANUP QUERIES
-- ================================

-- Find orphaned files (not linked to messages or artifacts)
-- SELECT f.id, f.filename, f.createdAt
-- FROM "File" f
-- LEFT JOIN "MessageFile" mf ON f.id = mf.fileId
-- LEFT JOIN "ArtifactFile" af ON f.id = af.fileId
-- WHERE mf.fileId IS NULL AND af.fileId IS NULL;

-- Old sessions (older than 30 days)
-- SELECT id, userId, createdAt FROM "Session" 
-- WHERE createdAt < datetime('now', '-30 days');

-- ================================
-- ANALYTICS QUERIES
-- ================================

-- Daily activity summary
-- SELECT 
--   DATE(createdAt) as activity_date,
--   COUNT(*) as total_messages,
--   COUNT(DISTINCT userId) as active_users,
--   COUNT(DISTINCT threadId) as active_threads
-- FROM "Message"
-- WHERE createdAt >= datetime('now', '-7 days')
-- GROUP BY DATE(createdAt)
-- ORDER BY activity_date DESC;

-- User engagement metrics
-- SELECT 
--   u.id, u.email, u.name,
--   COUNT(DISTINCT t.id) as threads_created,
--   COUNT(DISTINCT m.id) as messages_sent,
--   COUNT(DISTINCT r.id) as reactions_given,
--   MAX(m.createdAt) as last_message_at
-- FROM "User" u
-- LEFT JOIN "Thread" t ON u.id = t.userId
-- LEFT JOIN "Message" m ON u.id = m.userId
-- LEFT JOIN "Reaction" r ON u.id = r.userId
-- GROUP BY u.id, u.email, u.name
-- ORDER BY messages_sent DESC;
