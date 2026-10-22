# CONSTRAINTS.md — Scaffold aws-crm-platform (To-Be)

> Um número sem comando é aspiração, não restrição. Valor sem fonte é "não medido".

## Floor

- Terraform modular v1.9+, 7 camadas (00-networking-vpc → 06-observability-cloudwatch-xray) [ref: terraform/00-networking-vpc/main.tf; 06-observability-cloudwatch-xray/main.tf]
- Backend TypeScript 5.x strict + Node.js 22 LTS + NestJS com Fastify Adapter, monorepo Turborepo, Clean/Hexagonal [ref: packages/backend/package.json; packages/backend/src/main.ts]
- Drizzle ORM (schema TS é a fonte; RLS via pgPolicy; migrations por drizzle-kit generate) [ref: packages/backend/package.json]
- Região sa-east-1 Multi-AZ (3 AZs) [ref: terraform/00-networking-vpc/variables.tf]
- PK UUID v7 em todas as tabelas; dinheiro `numeric(19,4)`; `doublePrecision` proibido [ref: packages/backend/src/modules/leads/domain/lead.entity.ts]

## Enforced with numbers

| Restrição | Valor | Onde imposto | Checked by |
|---|---|---|---|
| Camadas Terraform | 7 (00-06) | pasta terraform/ | verify_scaffold |
| Serviços ECS | API, worker, scheduler, waha | terraform/04-compute-ecs-lambda/main.tf | verify_scaffold |
| IAM policies | sem `*` | terraform/01-security-kms-iam/main.tf | verify_scaffold |
| Cedar perfis | 3 (Gerente Regional, Consultor Interno, Corretor Parceiro) | packages/backend/src/shared/guards/ | verify_scaffold |
| @AuditAction | 4 gatilhos (leitura PII, mudança estágio, taxa, limite crédito) | packages/backend/src/shared/audit/ | verify_scaffold |
| MFA TOTP | opcional, ligado por admin | packages/backend/src/modules/auth/ | verify_scaffold |
| Janela anti-ban | 7h–22h fuso do tenant | packages/backend/src/modules/pacing/ | verify_scaffold |

## Measured, not yet enforced

- Cobertura de testes por UC (meta: 100% dos UC-001..005)
- Custo de IA por tenant abaixo do teto mensal

## Exceptions

| Exceção | Owner | Expires | Motivo |
|---|---|---|---|
| Nenhuma definida nesta versão | — | — | Scaffold inicial sem exceções aprovadas
