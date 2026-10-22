# =============================================================================
# Porto Bank CRM To-Be — Dockerfile (Backend NestJS + Fastify)
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Dependências do sistema (para compilação de módulos nativos se necessário)
RUN apk add --no-cache python3 make g++ curl

# Copiar arquivos de dependência
COPY package.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npx tsc

# Expor porta da aplicação
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Comando de inicialização
CMD ["node", "dist/main.js"]
