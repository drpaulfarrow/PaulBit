const db = require('./db');
const fs = require('fs');
const path = require('path');

/**
 * Run database migrations
 * This ensures the database schema is up to date before the API starts
 */
async function runMigrations() {
  console.log('🔄 Checking for pending migrations...');
  
  try {
    // Create migrations tracking table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Get list of already applied migrations
    const applied = await db.query('SELECT migration_name FROM schema_migrations ORDER BY id');
    const appliedMigrations = new Set(applied.rows.map(r => r.migration_name));
    
    // Run init.sql first if it hasn't been applied
    if (!appliedMigrations.has('000_init.sql')) {
      const initPath = path.join(__dirname, '..', 'database', 'init.sql');
      if (fs.existsSync(initPath)) {
        console.log('   📄 Running initial schema: 000_init.sql');
        try {
          const sql = fs.readFileSync(initPath, 'utf8');
          await db.query('BEGIN');
          await db.query(sql);
          await db.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', ['000_init.sql']);
          await db.query('COMMIT');
          console.log('   ✅ Applied: 000_init.sql');
          appliedMigrations.add('000_init.sql');
        } catch (error) {
          await db.query('ROLLBACK');
          console.error('❌ Failed to apply 000_init.sql:', error.message);
          throw error;
        }
      }
    }
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  Migrations directory not found, skipping migrations');
      console.log('   Looking in:', migrationsDir);
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    // Apply pending migrations
    let appliedCount = 0;
    
    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        continue; // Already applied
      }
      
      console.log(`   📄 Applying migration: ${filename}`);
      
      try {
        const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
        
        // Run migration in a transaction
        await db.query('BEGIN');
        await db.query(sql);
        await db.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [filename]);
        await db.query('COMMIT');
        
        appliedCount++;
        console.log(`   ✅ Applied: ${filename}`);
      } catch (error) {
        await db.query('ROLLBACK');
        console.error(`   ❌ Failed to apply ${filename}:`, error.message);
        throw error; // Stop on error
      }
    }
    
    if (appliedCount === 0) {
      console.log('✅ All migrations are up to date');
    } else {
      console.log(`✅ Applied ${appliedCount} new migration(s)`);
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

module.exports = { runMigrations };
