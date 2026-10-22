# Porto Bank CRM — To-Be AWS

Sistema Operacional de Vendas com IA — Arquitetura AWS FSI (BACEN 4893 / LGPD / Zero Trust)

## Estrutura do Repositório

```
aws-crm-platform/
├── terraform/                    # 7 camadas de infraestrutura AWS
│   ├── terraform.tf              # Backend remoto S3 + DynamoDB
│   ├── variables.tf
│   ├── terraform.tfvars.example
│   ├── 00-networking-vpc/       # VPC, subnets, NAT, IGW, VPC Endpoints, Terraform State
│   ├── 01-security-kms-iam/     # KMS, IAM, Secrets Manager, ECR
│   ├── 02-data-aurora-dynamo-redis/  # Aurora, DynamoDB, ElastiCache, OpenSearch
│   ├── 03-messaging-eventbridge-sqs/ # EventBridge, SQS, DLQ
│   ├── 04-compute-ecs-lambda/   # ECS Fargate, Auto Scaling
│   ├── 05-edge-waf-apigw/       # ALB, WAF, CloudFront
│   └── 06-observability-cloudwatch-xray/ # CloudWatch, Alarms, X-Ray
├── packages/
│   ├── backend/                  # NestJS + Fastify (TypeScript 5.x)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── infrastructure/database/  # Drizzle ORM schema + client + repositories
│   │   │   ├── modules/          # leads, organizations, auth, ai-agent, automation, conversations, messages, webhooks, lgpd, health
│   │   │   ├── shared/           # guards, cache, resilience, idempotency, utils
│   │   │   └── worker/           # Worker de processamento assíncrono (SQS consumer)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── drizzle.config.ts
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── Dockerfile            # API
│   │   └── Dockerfile.worker     # Worker
│   └── frontend/                 # Next.js 16 + React 19
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/ui/button.tsx
│       ├── lib/utils.ts
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       ├── .env.example
│       └── next-env.d.ts
├── docker-compose.yml            # Stack local completa (Postgres + Redis + LocalStack + API + Worker + Frontend)
├── scripts/
│   └── init-db.sql               # Extensões PostgreSQL (uuid-ossp, pgcrypto, citext, pg_trgm)
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # CI/CD: testes, build imagens ECR, terraform apply, ECS deploy
├── CONSTRAINTS.md                # Regras de arquitetura (formato Addy Osmani)
└── AGENTS.md                     # Guia para agentes de código
```

## Como Rodar Localmente

### 1. Pré-requisitos
- Docker Desktop (Windows/Mac/Linux)
- Node.js 22+
- pnpm 9+

### 2. Subir a Infraestrutura Local

```bash
cd C:\Users\bruno\Documents\PortoBankCRM\reengineering-output\aws-crm-platform

# Subir PostgreSQL, Redis, LocalStack (S3/DynamoDB/SQS/SecretsManager/KMS)
docker-compose up -d postgres redis localstack

# Aguardar ficar saudável (cerca de 30s)
docker-compose ps
```

### 3. Backend (API)

```bash
cd packages/backend

# Instalar dependências
pnpm install

# Gerar e aplicar migrations do Drizzle
pnpm migrations:generate
pnpm migrations:push

# Rodar em desenvolvimento
pnpm start:dev
```

A API fica disponível em: `http://localhost:3000/api/v1`
Health check: `http://localhost:3000/api/v1/health`

### 4. Worker (processamento SQS)

```bash
cd packages/backend

# Em um terminal separado
pnpm start:dev  # Ou: node dist/worker/main.js após build
```

O worker consome mensagens da fila SQS `porto-bank-crm-event-log-drain` via LocalStack.

### 5. Frontend

```bash
cd packages/frontend

# Instalar dependências
pnpm install

# Rodar em desenvolvimento
pnpm dev
```

O frontend fica disponível em: `http://localhost:3001`

### 6. Stack Completa com Docker Compose

```bash
cd C:\Users\bruno\Documents\PortoBankCRM\reengineering-output\aws-crm-platform

docker-compose up -d
```

Isso sobe: PostgreSQL, Redis, LocalStack, API, Worker e Frontend.

## Endpoints da API

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/login` | Login (Cognito em produção, dev-token em dev) |
| POST | `/api/v1/leads` | Criar lead (com idempotência) |
| GET | `/api/v1/leads` | Listar leads com paginação |
| GET | `/api/v1/leads/:id` | Obter lead por ID |
| GET | `/api/v1/organizations` | Listar organizações |
| POST | `/api/v1/organizations` | Criar organização |
| POST | `/api/v1/messages` | Enviar mensagem (via SQS) |
| GET | `/api/v1/messages` | Listar mensagens de uma conversa |
| POST | `/api/v1/ai/respond` | Gerar resposta com IA (circuit breaker) |
| POST | `/api/v1/ai/sentiment` | Análise de sentimento |
| POST | `/api/v1/webhooks/in/:token` | Webhook de captação (WAHA/Nuvemshop) |
| POST | `/api/v1/lgpd/requests` | Solicitação LGPD (título do titular) |
| GET | `/api/v1/lgpd/requests` | Listar solicitações LGPD |

## Implantação na AWS (Produção)

### 1. Pré-requisitos
- Conta AWS com credenciais configuradas
- Região `sa-east-1`
- Certificado ACM para o domínio
- Terraform >= 1.9.0
- AWS CLI configurado

### 2. Implantação da Infraestrutura

```bash
cd aws-crm-platform/terraform

# Copiar variáveis de exemplo
cp terraform.tfvars.example terraform.tfvars

# Editar terraform.tfvars com seus valores:
# - acm_certificate_arn
# - db_master_password
# - api_container_image
# - worker_container_image

# Passo 1: Criar bucket S3 e tabela DynamoDB para o estado remoto do Terraform
terraform init -backend-config="key=porto-bank-crm/bootstrap/terraform.tfstate"
terraform apply -target=aws_s3_bucket.terraform_state -target=aws_dynamodb_table.terraform_lock

# Passo 2: Inicializar com backend remoto (aponta para o bucket criado)
terraform init

# Passo 3: Planejar e aplicar todas as camadas
terraform plan
terraform apply
```

### 3. Ordens das Camadas (aplicação automática)

As camadas são aplicadas na ordem correta via `terraform apply`. Cada camada lê outputs da anterior via `terraform_remote_state`:

| Ordem | Camada | Recursos |
|-------|--------|----------|
| 1 | `00-bootstrap.tf` | Bucket S3 + Tabela DynamoDB para estado do Terraform |
| 2 | `00-networking-vpc/` | VPC, subnets (3 AZs), NAT Gateway, IGW, VPC Endpoints (PrivateLink) |
| 3 | `01-security-kms-iam/` | KMS CMK (rotação anual), IAM roles, Secrets Manager, ECR repositórios |
| 4 | `02-data-aurora-dynamo-redis/` | Aurora PostgreSQL Serverless v2, RDS Proxy, DynamoDB, ElastiCache, OpenSearch |
| 5 | `03-messaging-eventbridge-sqs/` | EventBridge, SQS filas, DLQ |
| 6 | `04-compute-ecs-lambda/` | ECS Fargate, Auto Scaling, CloudWatch Logs |
| 7 | `05-edge-waf-apigw/` | ALB, WAF, CloudFront |
| 8 | `06-observability-cloudwatch-xray/` | CloudWatch Logs, Alarms, X-Ray |

**Importante:** Cada camada depende da anterior. Não pule etapas.

### 4. CI/CD (GitHub Actions)

O pipeline em `.github/workflows/ci-cd.yml`:
1. Roda testes do backend
2. Constrói e push das imagens Docker para ECR (API, Worker, Frontend)
3. Aplica Terraform na AWS
4. Faz deployment do serviço ECS com nova imagem

Segredos necessários no GitHub:
- `AWS_ROLE_ARN` — Role para CI/CD
- `AWS_ACCOUNT_ID` — ID da conta AWS
- `ACM_CERTIFICATE_ARN` — Certificado SSL
- `DB_MASTER_PASSWORD` — Senha do banco Aurora
- `ECS_CLUSTER_NAME` — Nome do cluster ECS
- `ECS_SERVICE_NAME` — Nome do serviço ECS

## Padrões de Arquitetura AWS

| Padrão | Implementação |
|--------|---------------|
| Multi-tenant | RLS no PostgreSQL, isolamento por `organization_id` |
| Clean/Hexagonal | Domain → Use Cases → Controllers → Adapters |
| Resiliência | Circuit breaker, retry com backoff, idempotência, DLQ |
| Segurança | Cognito + Cedar (Verified Permissions), KMS CMK rotação anual, envelope encryption |
| PrivateLink | VPC Endpoints para S3, DynamoDB, SQS, KMS, Secrets Manager, CloudWatch, ECR, Cognito |
| Observabilidade | X-Ray tracing, CloudWatch alarms, S3 Object Lock (auditoria 5 anos) |
| Escalabilidade | Auto-scaling ECS Fargate (CPU/memória), ALB + CloudFront + WAF |

## Rótulo de Governança

> **RASCUNHO — gerado por IA. Requer revisão humana de Arquitetura, Segurança da Informação, Jurídico (licença/PI) e Compliance antes de qualquer uso externo ou decisão.**

## Próximos Passos

1. Revisão humana de arquitetura e segurança
2. Implementar lógica completa dos módulos (atualmente com stubs básicos)
3. Criar testes Vitest para todos os use cases
4. Publicar imagens Docker no ECR
5. Executar `terraform apply` na AWS
6. Configurar domínio e DNS apontando para CloudFront
