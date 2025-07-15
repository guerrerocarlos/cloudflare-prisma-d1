# Database Management Scripts

This directory contains scripts and utilities for managing your Cloudflare D1 database.

## Files Overview

### `seed.sql`
Sample data for development and testing. Contains:
- Sample users with different roles (ADMIN, USER)
- Sample threads with various statuses
- Sample messages between users and assistants
- Sample files and artifacts
- Sample reactions and relationships

### `db-manager.sh`
Comprehensive shell script for database operations. Provides an interactive interface for:
- Setting up development environment
- Applying migrations
- Seeding databases
- Resetting databases
- Executing queries
- Creating backups
- Exporting data

Usage: `./scripts/db-manager.sh [command] [environment]`

### `common-queries.sql`
Collection of useful SQL queries for:
- User management
- Thread analysis
- Message statistics
- File management
- Artifact tracking
- Reaction analytics
- Data cleanup
- Performance monitoring

## Quick Start

1. **Initial Setup:**
   ```bash
   npm run setup
   # or
   ./scripts/db-manager.sh setup
   ```

2. **Seed with Sample Data:**
   ```bash
   npm run db:seed:local
   # or
   ./scripts/db-manager.sh seed local
   ```

3. **View Tables:**
   ```bash
   npm run db:tables:local
   # or
   ./scripts/db-manager.sh tables local
   ```

## Common Commands

### NPM Scripts (from package.json)

```bash
# Database setup and generation
npm run db:generate                    # Generate Prisma client
npm run db:setup                       # Generate + migrate locally
npm run setup                          # Full project setup

# Migrations
npm run db:migrate:apply:local         # Apply migrations locally
npm run db:migrate:apply:remote        # Apply migrations to production
npm run db:migrate:status              # Check migration status

# Data management
npm run db:seed:local                  # Seed local database
npm run db:seed:remote                 # Seed production database
npm run db:fresh:local                 # Reset + migrate + seed locally

# Querying
npm run db:query:local                 # Execute query locally
npm run db:query:remote                # Execute query on production
npm run db:tables:local                # List tables locally
npm run db:tables:remote               # List tables on production

# Backup and export
npm run db:export:local                # Export local database
npm run db:export:remote               # Export production database
npm run db:export:schema               # Export schema only
npm run db:export:data                 # Export data only
npm run db:backup:create               # Create production backup
npm run db:backup:list                 # List available backups

# Information
npm run db:info                        # Database information
```

### Shell Script Commands

```bash
# Basic operations
./scripts/db-manager.sh setup
./scripts/db-manager.sh migrate local
./scripts/db-manager.sh migrate remote
./scripts/db-manager.sh seed local

# Database reset and fresh setup
./scripts/db-manager.sh reset local
./scripts/db-manager.sh fresh local

# Querying
./scripts/db-manager.sh query local "SELECT * FROM User LIMIT 5"
./scripts/db-manager.sh tables local

# Backup and export
./scripts/db-manager.sh export local
./scripts/db-manager.sh export remote
./scripts/db-manager.sh backup         # Remote only

# Information
./scripts/db-manager.sh info
```

## Safety Features

- **Environment Validation:** Scripts validate local vs remote operations
- **Confirmation Prompts:** Destructive operations require confirmation
- **Backup Creation:** Automatic timestamping for backup files
- **Error Handling:** Scripts exit on errors to prevent data corruption

## Development Workflow

1. **Daily Development:**
   ```bash
   npm run dev                         # Start development server
   npm run db:tables:local            # Check database state
   ```

2. **Schema Changes:**
   ```bash
   # 1. Update prisma/schema.prisma
   # 2. Generate migration
   npm run db:migrate:create
   # 3. Apply locally
   npm run db:migrate:apply:local
   # 4. Test changes
   # 5. Apply to production
   npm run db:migrate:apply:remote
   ```

3. **Testing:**
   ```bash
   npm run db:fresh:local             # Clean slate for testing
   npm test                           # Run test suite
   ```

4. **Production Deployment:**
   ```bash
   npm run db:backup:create           # Create backup first
   npm run db:deploy                  # Apply migrations to production
   npm run deploy                     # Deploy application
   ```

## Troubleshooting

### Common Issues

1. **Migration Conflicts:**
   ```bash
   npm run db:migrate:status          # Check current state
   ./scripts/db-manager.sh fresh local # Reset if needed
   ```

2. **Schema Drift:**
   ```bash
   npm run db:export:schema           # Export current schema
   # Compare with expected schema
   ```

3. **Data Corruption:**
   ```bash
   npm run db:backup:list             # Find latest backup
   ./scripts/db-manager.sh reset remote  # If needed
   # Restore from backup
   ```

### Useful Debugging Queries

```sql
-- Check table structure
SELECT sql FROM sqlite_schema WHERE type='table' AND name='User';

-- Check indexes
SELECT name, sql FROM sqlite_schema WHERE type='index';

-- Check foreign keys
PRAGMA foreign_key_list('Message');

-- Check table info
PRAGMA table_info('User');
```

## Environment Variables

Make sure these are set in your Cloudflare Worker:

```bash
# Required for JWT authentication
JWT_SECRET=your-jwt-secret-key

# Optional: Allowed domains (defaults to rpotential.ai,globant.com)
ALLOWED_DOMAINS=rpotential.ai,globant.com
```

## Database Configuration

Your D1 database configuration in `wrangler.jsonc`:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "prisma-demo-db",
      "database_id": "your-database-id"
    }
  ]
}
```
