# 🏭 Configuração do Banco de Dados de Produção

## ✅ Status Atual
- ✅ Sistema configurado para separação automática de ambientes
- ✅ Desenvolvimento: Usando schema `development`
- ✅ Produção: Usará schema `production` automaticamente
- ✅ Ambos schemas criados e prontos para uso

## 🎉 Configuração Concluída!

O sistema agora está configurado para:
1. **Desenvolvimento**: Usa automaticamente o schema `development`
2. **Produção**: Usará automaticamente o schema `production` quando deployado

### Como Funciona:
- O sistema detecta automaticamente o ambiente (dev vs produção)
- Usa schemas PostgreSQL separados no mesmo banco físico
- Isola completamente os dados entre ambientes
- Não há risco de misturar dados de produção com desenvolvimento

### 🚀 Deploy para Produção
Quando você fizer o deploy:
1. O sistema detectará automaticamente o ambiente de produção
2. Usará o schema `production` ao invés de `development`
3. Os dados serão completamente isolados

### 📊 Verificação do Ambiente
Acesse o painel "Sincronização" como admin para ver:
- Ambiente atual (DEVELOPMENT ou PRODUCTION)
- Schema sendo usado (development ou production)
- Status da conexão

## 🔧 Comandos Úteis

### Verificar ambiente atual:
```bash
curl https://energymatch.replit.app/api/admin/database-info
```

### Exportar dados de desenvolvimento:
```bash
# No painel admin > Sincronização > Exportar Dados
```

### Sincronizar dados para produção:
```bash
# 1. Exportar dados do desenvolvimento
# 2. Colar no campo de importação
# 3. Clicar em "Sincronizar"
```

## 🚨 Importante
- **NUNCA** use a mesma string de conexão para desenvolvimento e produção
- **SEMPRE** faça backup antes de sincronizar dados
- **TESTE** a configuração em ambiente de staging primeiro

## 📊 Monitoramento
- O painel de sincronização mostra o ambiente atual
- Logs do servidor indicam qual banco está sendo usado
- Headers HTTP incluem `X-Database-Environment`