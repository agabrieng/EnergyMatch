#!/usr/bin/env tsx

/**
 * Script para criar schemas separados para produção e desenvolvimento
 * Isso permite usar o mesmo banco de dados físico mas com isolação lógica
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function setupDatabaseSchemas() {
  console.log('🚀 Configurando schemas do banco de dados...\n');

  try {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error("DATABASE_URL não está configurada");
    }

    // Conexão direta sem schema específico
    const pool = new Pool({ connectionString: dbUrl });
    const db = drizzle({ client: pool });

    // 1. Criar schema de desenvolvimento se não existir
    console.log('📋 Criando schema de desenvolvimento...');
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS development`);
    console.log('✅ Schema "development" criado/verificado');

    // 2. Criar schema de produção se não existir
    console.log('📋 Criando schema de produção...');
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS production`);
    console.log('✅ Schema "production" criado/verificado');

    // 3. Verificar schemas existentes
    const schemas = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('development', 'production', 'public')
      ORDER BY schema_name
    `);

    console.log('\n📊 Schemas disponíveis:');
    if (Array.isArray(schemas)) {
      schemas.forEach((s: any) => {
        console.log(`   - ${s.schema_name}`);
      });
    }

    // 4. Criar tabelas em cada schema executando as migrações
    console.log('\n🔨 Próximos passos:');
    console.log('1. Execute "npm run db:push" para criar as tabelas no schema atual');
    console.log('2. Para mudar de ambiente, defina NODE_ENV=production ou NODE_ENV=development');
    console.log('3. O sistema usará automaticamente o schema correto baseado no ambiente');

    console.log('\n🎉 Configuração de schemas concluída com sucesso!');
    
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao configurar schemas:', error);
    process.exit(1);
  }
}

// Executar diretamente
setupDatabaseSchemas();