import { Request, Response, NextFunction } from 'express';
import { config } from '../config/database';

/**
 * Middleware para adicionar informações do banco de dados às requisições
 */
export function databaseInfoMiddleware(req: Request, res: Response, next: NextFunction) {
  // Adicionar informações do banco ao objeto de requisição
  (req as any).dbConfig = {
    environment: config.environment,
    isProduction: config.environment === 'production',
    isDevelopment: config.environment === 'development'
  };

  // Adicionar header para identificar o ambiente do banco
  res.setHeader('X-Database-Environment', config.environment);

  next();
}

/**
 * Middleware para logs de queries em desenvolvimento
 */
export function developmentQueryLogger(req: Request, res: Response, next: NextFunction) {
  if (config.environment === 'development') {
    const originalJson = res.json;
    
    res.json = function(data) {
      console.log(`🔍 [${req.method}] ${req.path} - Database: ${config.environment}`);
      return originalJson.call(this, data);
    };
  }

  next();
}