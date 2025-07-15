#!/bin/bash

# Database Management Helper Script
# This script provides convenient shortcuts for common D1 database operations

set -e

DB_NAME="prisma-demo-db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to show usage
show_usage() {
    echo "Database Management Script for $DB_NAME"
    echo ""
    echo "Usage: $0 [command] [environment]"
    echo ""
    echo "Commands:"
    echo "  setup           - Generate Prisma client and apply migrations locally"
    echo "  migrate         - Apply migrations to specified environment"
    echo "  seed            - Seed database with sample data"
    echo "  reset           - Reset database (drops all tables)"
    echo "  fresh           - Reset, migrate, and seed database"
    echo "  query           - Execute a SQL query"
    echo "  tables          - List all tables in the database"
    echo "  export          - Export database to SQL file"
    echo "  backup          - Create a backup (remote only)"
    echo "  info            - Show database information"
    echo ""
    echo "Environment (optional, defaults to 'local'):"
    echo "  local           - Local development database"
    echo "  remote          - Remote production database"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 migrate local"
    echo "  $0 migrate remote"
    echo "  $0 seed local"
    echo "  $0 query local \"SELECT * FROM User LIMIT 5\""
    echo "  $0 export remote"
}

# Parse arguments
COMMAND=${1:-}
ENVIRONMENT=${2:-local}

if [[ -z "$COMMAND" ]]; then
    show_usage
    exit 0
fi

# Validate environment
if [[ "$ENVIRONMENT" != "local" && "$ENVIRONMENT" != "remote" ]]; then
    log_error "Invalid environment. Use 'local' or 'remote'"
    exit 1
fi

# Set flags based on environment
if [[ "$ENVIRONMENT" == "remote" ]]; then
    ENV_FLAG="--remote"
    log_warning "Operating on REMOTE database. This affects production data!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled"
        exit 0
    fi
else
    ENV_FLAG="--local"
fi

# Execute commands
case "$COMMAND" in
    "setup")
        log_info "Setting up development environment..."
        cd "$PROJECT_ROOT"
        
        log_info "Generating Prisma client..."
        npm run db:generate
        
        log_info "Applying migrations to local database..."
        npm run db:migrate:apply:local
        
        log_success "Development environment setup complete!"
        ;;
        
    "migrate")
        log_info "Applying migrations to $ENVIRONMENT database..."
        cd "$PROJECT_ROOT"
        npx wrangler d1 migrations apply "$DB_NAME" $ENV_FLAG
        log_success "Migrations applied successfully!"
        ;;
        
    "seed")
        log_info "Seeding $ENVIRONMENT database..."
        cd "$PROJECT_ROOT"
        if [[ -f "./scripts/seed.sql" ]]; then
            npx wrangler d1 execute "$DB_NAME" $ENV_FLAG --file "./scripts/seed.sql"
            log_success "Database seeded successfully!"
        else
            log_error "Seed file not found at ./scripts/seed.sql"
            exit 1
        fi
        ;;
        
    "reset")
        log_warning "This will DROP ALL TABLES in the $ENVIRONMENT database!"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Resetting $ENVIRONMENT database..."
            cd "$PROJECT_ROOT"
            
            # Drop all tables
            DROP_SQL="DROP TABLE IF EXISTS User; DROP TABLE IF EXISTS Session; DROP TABLE IF EXISTS Thread; DROP TABLE IF EXISTS Message; DROP TABLE IF EXISTS File; DROP TABLE IF EXISTS Artifact; DROP TABLE IF EXISTS Reaction; DROP TABLE IF EXISTS MessageFile; DROP TABLE IF EXISTS ArtifactFile; DROP TABLE IF EXISTS _prisma_migrations;"
            
            npx wrangler d1 execute "$DB_NAME" $ENV_FLAG --command "$DROP_SQL"
            log_success "Database reset successfully!"
        else
            log_info "Reset cancelled"
        fi
        ;;
        
    "fresh")
        log_warning "This will completely rebuild the $ENVIRONMENT database!"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Performing fresh database setup..."
            
            # Reset
            $0 reset $ENVIRONMENT
            
            # Migrate
            $0 migrate $ENVIRONMENT
            
            # Seed
            $0 seed $ENVIRONMENT
            
            log_success "Fresh database setup complete!"
        else
            log_info "Fresh setup cancelled"
        fi
        ;;
        
    "query")
        if [[ -z "$3" ]]; then
            log_error "Please provide a SQL query as the third argument"
            echo "Example: $0 query local \"SELECT * FROM User LIMIT 5\""
            exit 1
        fi
        
        SQL_QUERY="$3"
        log_info "Executing query on $ENVIRONMENT database..."
        cd "$PROJECT_ROOT"
        npx wrangler d1 execute "$DB_NAME" $ENV_FLAG --command "$SQL_QUERY"
        ;;
        
    "tables")
        log_info "Listing tables in $ENVIRONMENT database..."
        cd "$PROJECT_ROOT"
        npx wrangler d1 execute "$DB_NAME" $ENV_FLAG --command "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;"
        ;;
        
    "export")
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="./backups/${ENVIRONMENT}_backup_${TIMESTAMP}.sql"
        
        log_info "Exporting $ENVIRONMENT database to $BACKUP_FILE..."
        cd "$PROJECT_ROOT"
        
        # Create backups directory if it doesn't exist
        mkdir -p backups
        
        npx wrangler d1 export "$DB_NAME" $ENV_FLAG --output "$BACKUP_FILE"
        log_success "Database exported to $BACKUP_FILE"
        ;;
        
    "backup")
        if [[ "$ENVIRONMENT" == "local" ]]; then
            log_error "Backups are only available for remote databases"
            exit 1
        fi
        
        log_info "Creating backup of remote database..."
        cd "$PROJECT_ROOT"
        npx wrangler d1 backup create "$DB_NAME"
        log_success "Backup created successfully!"
        ;;
        
    "info")
        log_info "Database information for $DB_NAME:"
        cd "$PROJECT_ROOT"
        npx wrangler d1 info "$DB_NAME"
        ;;
        
    *)
        log_error "Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac
