// Utilitário para detectar ambiente de produção
export function isProductionEnvironment(): boolean {
  // No frontend, podemos usar várias estratégias para detectar produção
  const hostname = window.location.hostname;
  
  // Verifica se está em domínio de produção do Replit
  if (hostname.includes('.replit.app')) {
    return true;
  }
  
  // Verifica se está em domínio customizado de produção
  if (hostname === 'energymatch.com' || hostname === 'www.energymatch.com') {
    return true;
  }
  
  // Verifica variáveis de build time se disponíveis
  if (import.meta.env.MODE === 'production') {
    return true;
  }
  
  // Por padrão, considera development
  return false;
}

export function getEnvironmentInfo() {
  const isProduction = isProductionEnvironment();
  return {
    isProduction,
    isDevelopment: !isProduction,
    hostname: window.location.hostname,
    mode: import.meta.env.MODE || 'development'
  };
}