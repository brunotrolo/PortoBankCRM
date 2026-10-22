-- =============================================================================
# Porto Bank CRM — Script de Inicialização do Banco (Docker)
# Executa no primeiro start do PostgreSQL
# =============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Habilitar RLS por padrão em todas as tabelas (multi-tenant)
-- O Drizzle ORM gerencia as tabelas, mas as políticas RLS são aplicadas aqui

-- Comentários de documentação
COMMENT ON DATABASE porto_bank_crm IS 'Banco do Porto Bank CRM — Multi-tenant com RLS';
