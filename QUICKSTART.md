# Porto Bank CRM — Guia Rápido

## 1. Instalação Local (Desenvolvimento)

### Pré-requisitos
- Docker Desktop
- Node.js 22+
- pnpm 9+

### 2. Subir Infraestrutura Local

```bash
cd C:\Users\bruno\Documents\PortoBankCRM\reengineering-output\aws-crm-platform

# Subir PostgreSQL, Redis, LocalStack
docker-compose up -d postgres redis localstack

# Aguardar ficar saudável
docker-compose ps
```

### 3. Backend

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

API: `http://localhost:3000/api/v1/health`

### 4. Worker (processamento assíncrono SQS)

```bash
# Em um terminal separado, na mesma pasta
pnpm start:dev  # ou: node dist/worker/main.js após build
```

### 5. Frontend

```bash
cd packages/frontend

pnpm install
pnpm dev
```

Frontend: `http://localhost:3001`

### 6. Stack Completa com Docker Compose

```bash
cd C:\Users\bruno\Documents\PortoBankCRM\reengineering-output\aws-crm-platform

docker-compose up -d
```

---

## 2. Implantação na AWS (Produção)

### Pré-requisitos
- Conta AWS com credenciais configuradas
- Região `sa-east-1`
- Certificado ACM para o domínio
- Terraform >= 1.9.0
- AWS CLI configurado

### Passos

```bash
cd terraform

cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars com acm_certificate_arn, db_master_password,
# api_container_image, worker_container_image

# Criar estado remoto
terraform init -backend-config="key=porto-bank-crm/bootstrap/terraform.tfstate"
terraform apply -target=aws_s3_bucket.terraform_state -target=aws_dynamodb_table.terraform_lock

# Inicializar backend remoto
terraform init

# Aplicar infraestrutura
terraform plan
terraform apply
```

### Ordens das Camadas

| Ordem | Camada | Recursos |
|-------|--------|----------|
| 1 | `00-bootstrap.tf` | Bucket S3 + DynamoDB para estado |
| 2 | `00-networking-vpc/` | VPC, subnets, NAT, IGW, VPC Endpoints |
| 3 | `01-security-kms-iam/` | KMS, IAM, Secrets Manager, ECR |
| 4 | `02-data-aurora-dynamo-redis/` | Aurora, DynamoDB, ElastiCache, OpenSearch |
| 5 | `03-messaging-eventbridge-sqs/` | EventBridge, SQS, DLQ |
| 6 | `04-compute-ecs-lambda/` | ECS Fargate, Auto Scaling |
| 7 | `05-edge-waf-apigw/` | ALB, WAF, CloudFront |
| 8 | `06-observability-cloudwatch-xray/` | CloudWatch, Alarms, X-Ray |

### CI/CD (GitHub Actions)

O pipeline em `.github/workflows/ci-cd.yml`:
1. Roda testes do backend
2. Constrói e push das imagens para ECR
3. Aplica Terraform na AWS
4. Faz deployment do serviço ECS

Segredos necessários no GitHub:
- `AWS_ROLE_ARN`, `AWS_ACCOUNT_ID`, `ACM_CERTIFICATE_ARN`
- `DB_MASTER_PASSWORD`, `ECS_CLUSTER_NAME`, `ECS_SERVICE_NAME`

---

## Endpoints da API

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/leads` | Criar lead |
| GET | `/api/v1/leads` | Listar leads |
| GET | `/api/v1/leads/:id` | Obter lead |
| POST | `/api/v1/organizations` | Criar organização |
| GET | `/api/v1/organizations` | Listar organizações |
| POST | `/api/v1/messages` | Enviar mensagem (SQS) |
| GET | `/api/v1/messages` | Listar mensagens |
| POST | `/api/v1/ai/respond` | IA (circuit breaker) |
| POST | `/api/v1/ai/sentiment` | Análise de sentimento |
| POST | `/api/v1/webhooks/in/:token` | Webhook de captação |
| POST | `/api/v1/lgpd/requests` | Solicitação LGPD |
| POST | `/api/v1/automation-rules` | Criar regra de automação |
| GET | `/api/v1/automation-rules` | Listar regras |

---

## Padrões de Segurança

- **Multi-tenant**: RLS no PostgreSQL, isolamento por `organization_id`
- **IAM least privilege**: Sem `*` nas policies
- **Criptografia**: KMS CMK com rotação anual, envelope encryption
- **Segredos**: AWS Secrets Manager (não commite .env)
- **PrivateLink**: VPC Endpoints para todos os serviços AWS
- **Auditoria**: S3 Object Lock (retenção 5 anos)
- **Rate limit**: Por IP e organização
- **Idempotência**: Chave `Idempotency-Key` em POSTs

---

## Rótulo de Governança

> **RASCUNHO — gerado por IA. Requer revisão humana de Arquitetura, Segurança da Informação, Jurídico (licença/PI) e Compliance antes de qualquer uso externo ou decisão.**
