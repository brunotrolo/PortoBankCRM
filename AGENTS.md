# aws-crm-platform — AGENTS.md

DeskcommCRM To-Be — Scaffold de produção (AWS FSI / Clean Room).

## Arquitetura

- Camadas: `modules/` (aplicação), `domain/` (domínio puro), `infrastructure/` (adaptadores de saída), `shared/` (kernel comum).
- Hexagonal/Clean: domínio não depende de infraestrutura; adaptadores implementam portas.
- Testes: Vitest + Testcontainers; todo UC tem `describe('UC-…')` / `it('BR-…')`.
- Rastreabilidade: todo arquivo referencia IDs do As-Is via `// Traces: <ID> — <regra>`.

## Comandos

- `pnpm build` — build NestJS
- `pnpm test` — vitest run
- `pnpm migrations:generate` — drizzle-kit generate
- `pnpm migrations:push` — drizzle-kit push

## Regras de ouro

- Nenhum segredo em código ou query string; use Secrets Manager + SSM.
- IAM least privilege sem `*`.
- Zod `.strict()` em todo input externo.
- `@AuditAction` em toda leitura de PII e mudança de negócio.
- Zero cópia literal do legado (shingles de 6 linhas).
- Toda migration: `drizzle-kit generate` + apêndice idempotente.
