import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Determine database schema based on environment
export function getDatabaseSchema() {
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.REPLIT_DEPLOYMENT === 'true' ||
                       process.env.REPLIT_DEV_DOMAIN === undefined;
  
  // Use different schemas for production and development
  const schemaName = isProduction ? 'production' : 'development';
  
  return {
    schema: schemaName,
    isProduction,
    environment: isProduction ? 'production' : 'development'
  };
}

// Initialize database connection with schema isolation
export function createDatabaseConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  const schemaConfig = getDatabaseSchema();
  
  // Log environment info
  console.log(`🏭 Database Environment: ${schemaConfig.environment.toUpperCase()}`);
  console.log(`📊 Using schema: ${schemaConfig.schema}`);
  
  // Create connection pool
  const pool = new Pool({ 
    connectionString: dbUrl,
    // Set schema search path based on environment
    options: `-c search_path=${schemaConfig.schema},public`
  });
  
  const db = drizzle({ client: pool, schema });
  
  return { 
    pool, 
    db, 
    config: {
      environment: schemaConfig.environment,
      schema: schemaConfig.schema,
      connectionString: dbUrl,
      isProduction: schemaConfig.isProduction
    }
  };
}

// Export the database instance
const { pool, db, config } = createDatabaseConnection();

export { pool, db, config };
export default db;