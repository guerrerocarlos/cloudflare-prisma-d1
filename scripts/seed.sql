-- Seed data for development and testing
-- This file contains sample data to populate your D1 database

-- Sample Users
INSERT OR IGNORE INTO "User" ("id", "email", "name", "nick", "role", "createdAt", "updatedAt") VALUES
('cuid_user_admin_001', 'admin@rpotential.ai', 'Admin User', 'admin', 'ADMIN', datetime('now'), datetime('now')),
('cuid_user_dev_002', 'developer@rpotential.ai', 'John Developer', 'john_dev', 'USER', datetime('now'), datetime('now')),
('cuid_user_test_003', 'tester@globant.com', 'Jane Tester', 'jane_test', 'USER', datetime('now'), datetime('now')),
('cuid_user_demo_004', 'demo@rpotential.ai', 'Demo User', 'demo_user', 'USER', datetime('now'), datetime('now'));

-- Sample Threads
INSERT OR IGNORE INTO "Thread" ("id", "userId", "title", "description", "status", "metadata", "createdAt", "updatedAt") VALUES
('cuid_thread_001', 'cuid_user_dev_002', 'Getting Started with Experience Layer', 'Initial conversation about setting up the Experience Layer backend', 'ACTIVE', '{"tags": ["setup", "backend"], "priority": "high"}', datetime('now'), datetime('now')),
('cuid_thread_002', 'cuid_user_test_003', 'API Testing Discussion', 'Discussion about API testing strategies and implementation', 'ACTIVE', '{"tags": ["testing", "api"], "priority": "medium"}', datetime('now'), datetime('now')),
('cuid_thread_003', 'cuid_user_demo_004', 'Feature Request: File Upload', 'Request for implementing file upload functionality', 'PENDING', '{"tags": ["feature", "files"], "priority": "low"}', datetime('now'), datetime('now'));

-- Sample Messages
INSERT OR IGNORE INTO "Message" ("id", "threadId", "userId", "role", "content", "metadata", "createdAt", "updatedAt") VALUES
('cuid_msg_001', 'cuid_thread_001', 'cuid_user_dev_002', 'USER', 'Hello, I need help setting up the Experience Layer backend.', '{"sentiment": "neutral"}', datetime('now'), datetime('now')),
('cuid_msg_002', 'cuid_thread_001', 'cuid_user_admin_001', 'ASSISTANT', 'Hi! I''d be happy to help you get started. Let me guide you through the setup process.', '{"confidence": 0.95}', datetime('now'), datetime('now')),
('cuid_msg_003', 'cuid_thread_002', 'cuid_user_test_003', 'USER', 'What''s the best approach for testing our REST API endpoints?', '{"sentiment": "curious"}', datetime('now'), datetime('now')),
('cuid_msg_004', 'cuid_thread_002', 'cuid_user_admin_001', 'ASSISTANT', 'For API testing, I recommend a combination of unit tests, integration tests, and end-to-end tests.', '{"confidence": 0.92}', datetime('now'), datetime('now'));

-- Sample Files
INSERT OR IGNORE INTO "File" ("id", "uploaderId", "filename", "originalName", "mimeType", "size", "checksum", "storageUrl", "metadata", "createdAt") VALUES
('cuid_file_001', 'cuid_user_dev_002', 'setup-guide.pdf', 'Setup Guide.pdf', 'application/pdf', 1024000, 'sha256:abc123', 'https://storage.example.com/setup-guide.pdf', '{"description": "Setup guide document"}', datetime('now')),
('cuid_file_002', 'cuid_user_test_003', 'api-tests.json', 'API Tests.json', 'application/json', 50000, 'sha256:def456', 'https://storage.example.com/api-tests.json', '{"description": "API test collection"}', datetime('now'));

-- Sample Artifacts
INSERT OR IGNORE INTO "Artifact" ("id", "threadId", "userId", "type", "title", "description", "content", "metadata", "createdAt", "updatedAt") VALUES
('cuid_artifact_001', 'cuid_thread_001', 'cuid_user_admin_001', 'INSIGHT', 'Setup Checklist', 'Comprehensive checklist for Experience Layer setup', '{"checklist": ["Install dependencies", "Configure database", "Set up authentication", "Deploy to Cloudflare"]}', '{"generated_by": "assistant", "accuracy": 0.98}', datetime('now'), datetime('now')),
('cuid_artifact_002', 'cuid_thread_002', 'cuid_user_admin_001', 'REPORT', 'Testing Strategy Report', 'Detailed report on API testing approaches', '{"sections": [{"title": "Unit Testing", "content": "..."}, {"title": "Integration Testing", "content": "..."}]}', '{"generated_by": "assistant", "accuracy": 0.94}', datetime('now'), datetime('now'));

-- Sample Reactions
INSERT OR IGNORE INTO "Reaction" ("id", "messageId", "userId", "emoji", "createdAt") VALUES
('cuid_reaction_001', 'cuid_msg_002', 'cuid_user_dev_002', '👍', datetime('now')),
('cuid_reaction_002', 'cuid_msg_004', 'cuid_user_test_003', '❤️', datetime('now')),
('cuid_reaction_003', 'cuid_msg_002', 'cuid_user_test_003', '🎉', datetime('now'));

-- Sample Message-File relationships
INSERT OR IGNORE INTO "MessageFile" ("messageId", "fileId", "createdAt") VALUES
('cuid_msg_001', 'cuid_file_001', datetime('now')),
('cuid_msg_003', 'cuid_file_002', datetime('now'));

-- Sample Artifact-File relationships
INSERT OR IGNORE INTO "ArtifactFile" ("artifactId", "fileId", "createdAt") VALUES
('cuid_artifact_001', 'cuid_file_001', datetime('now'));
