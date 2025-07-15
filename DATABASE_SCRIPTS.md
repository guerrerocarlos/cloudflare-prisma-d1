# Database Management Scripts Guide

## Overview

This project now includes comprehensive database management scripts for your Cloudflare D1 database. You can manage your database through either **NPM scripts** or the **interactive shell script**.

## 🚀 Quick Start

### 1. Initial Setup
```bash
npm run setup
# This will:
# - Install dependencies
# - Generate Prisma client
# - Apply migrations to local database
```

### 2. Seed with Sample Data
```bash
npm run db:seed:local
# Adds sample users, threads, messages, files, and artifacts
```

### 3. Check Your Database
```bash
npm run db:tables:local
# Lists all tables in your local database
```

## 📋 Available NPM Scripts

### Core Database Operations
```bash
npm run db:generate                    # Generate Prisma client
npm run db:setup                       # Generate + apply migrations locally
npm run setup                          # Full project setup (install + db:setup)
```

### Migration Management
```bash
npm run db:migrate:create              # Create new migration file
npm run db:migrate:apply:local         # Apply migrations to local database
npm run db:migrate:apply:remote        # Apply migrations to production
npm run db:migrate:status              # Check migration status
npm run db:deploy                      # Apply migrations to production (alias)
```

### Data Management
```bash
npm run db:seed:local                  # Seed local database with sample data
npm run db:seed:remote                 # Seed production database
npm run db:reset:local                 # Drop all tables (LOCAL ONLY)
npm run db:fresh:local                 # Reset + migrate + seed locally
```

### Querying & Inspection
```bash
npm run db:tables:local                # List all tables (local)
npm run db:tables:remote               # List all tables (production)
npm run db:query:local                 # Execute SQL query (local)
npm run db:query:remote                # Execute SQL query (production)
```

### Backup & Export
```bash
npm run db:export:local                # Export local database to SQL file
npm run db:export:remote               # Export production database
npm run db:export:schema               # Export schema only (no data)
npm run db:export:data                 # Export data only (no schema)
npm run db:backup:create               # Create production backup
npm run db:backup:list                 # List available backups
npm run db:backup:restore              # Restore from backup
```

### Information & Utilities
```bash
npm run db:info                        # Show database information
npm run clean                          # Clean install (removes node_modules, etc.)
```

## 🛠️ Interactive Database Manager

For more advanced operations, use the interactive database manager:

```bash
npm run db [command] [environment]
# or
./scripts/db-manager.sh [command] [environment]
```

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `setup` | Generate Prisma client and apply migrations locally | `npm run db setup` |
| `migrate` | Apply migrations to specified environment | `npm run db migrate local` |
| `seed` | Seed database with sample data | `npm run db seed local` |
| `reset` | Reset database (drops all tables) | `npm run db reset local` |
| `fresh` | Reset, migrate, and seed database | `npm run db fresh local` |
| `query` | Execute a SQL query | `npm run db query local "SELECT * FROM User"` |
| `tables` | List all tables in the database | `npm run db tables local` |
| `export` | Export database to SQL file | `npm run db export remote` |
| `backup` | Create a backup (remote only) | `npm run db backup` |
| `info` | Show database information | `npm run db info` |

### Environment Options
- `local` - Local development database (default)
- `remote` - Production database on Cloudflare

## 📁 File Structure

```
scripts/
├── README.md              # This documentation
├── db-manager.sh          # Interactive database management script
├── seed.sql               # Sample data for development/testing
└── common-queries.sql     # Collection of useful SQL queries

backups/                   # Auto-generated backup files (gitignored)
├── local_backup_*.sql
└── remote_backup_*.sql
```

## 🔍 Common Use Cases

### Daily Development
```bash
npm run dev                            # Start development server
npm run db:tables:local               # Check database state
npm run db query local "SELECT COUNT(*) FROM User" # Quick queries
```

### Schema Changes
```bash
# 1. Update prisma/schema.prisma
# 2. Create migration
npm run db:migrate:create
# 3. Apply locally
npm run db:migrate:apply:local
# 4. Test changes
npm test
# 5. Apply to production
npm run db:migrate:apply:remote
```

### Fresh Development Environment
```bash
npm run db:fresh:local                 # Clean slate
npm run dev                            # Start developing
```

### Production Deployment
```bash
npm run db:backup:create               # Safety first!
npm run db:deploy                      # Apply migrations
npm run deploy                         # Deploy application
```

### Data Analysis & Debugging
```bash
# Use the common queries file
npm run db query local "$(cat scripts/common-queries.sql | grep -A 5 'Recent messages')"

# Or run specific queries
npm run db query local "
  SELECT u.email, COUNT(m.id) as message_count 
  FROM User u 
  LEFT JOIN Message m ON u.id = m.userId 
  GROUP BY u.id, u.email 
  ORDER BY message_count DESC
"
```

## 🚨 Safety Features

- **Environment Validation**: Scripts clearly distinguish between local and remote operations
- **Confirmation Prompts**: Destructive operations require explicit confirmation
- **Automatic Backups**: Export commands include timestamps to prevent overwrites
- **Error Handling**: Scripts exit on errors to prevent data corruption
- **Dry Run Support**: View what operations will be performed

## 🔧 Advanced Operations

### Custom Queries
Use the `common-queries.sql` file for inspiration, or run your own:

```bash
npm run db query local "
  SELECT 
    DATE(createdAt) as date,
    COUNT(*) as messages,
    COUNT(DISTINCT userId) as active_users
  FROM Message 
  WHERE createdAt >= datetime('now', '-7 days')
  GROUP BY DATE(createdAt)
  ORDER BY date DESC
"
```

### Backup Management
```bash
# Create manual backup
npm run db:backup:create

# List all backups
npm run db:backup:list

# Export to specific file
npm run db export remote ./my-backup.sql
```

### Migration Troubleshooting
```bash
# Check current migration status
npm run db:migrate:status

# If you have conflicts, reset and reapply
npm run db:fresh:local
```

## 🐛 Troubleshooting

### Common Issues

1. **"Database not found" errors**:
   ```bash
   npm run db:info  # Check if database exists
   npm run db:migrate:apply:local  # Apply migrations
   ```

2. **Schema drift between environments**:
   ```bash
   npm run db:export:schema  # Export production schema
   # Compare with local schema
   ```

3. **Migration conflicts**:
   ```bash
   npm run db:fresh:local  # Reset local database
   npm run db:migrate:apply:local  # Reapply all migrations
   ```

4. **Permission errors**:
   ```bash
   chmod +x ./scripts/db-manager.sh  # Make script executable
   ```

### Getting Help

- Check the logs for specific error messages
- Use `npm run db info` to verify database configuration
- Review the `wrangler.jsonc` configuration
- Ensure you're logged into Cloudflare: `npx wrangler auth login`

## 📚 Next Steps

1. **Set up your development environment**: `npm run setup`
2. **Add sample data**: `npm run db:seed:local`
3. **Start developing**: `npm run dev`
4. **Explore the data**: Check out `scripts/common-queries.sql` for useful queries
5. **Deploy safely**: Always backup before production deployments

## 🔗 Related Documentation

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Prisma with D1 Guide](https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Project README](../README.md) - Main project documentation
