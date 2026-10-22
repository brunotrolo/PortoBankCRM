/**
 * Serviço de IA — com Circuit Breaker para chamadas LLM
 * [Traces: UC-001, BR-01, BR-02, BR-04, BR-05]
 */

import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerService } from '../../shared/resilience/circuit-breaker.service';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  async generateResponse(prompt: string, organizationId: string): Promise<string> {
    // Circuit breaker protege chamadas ao provedor de LLM (Anthropic/OpenAI)
    return this.circuitBreaker.execute(
      'llm',
      async () => {
        // TODO: chamar provedor de IA via Vercel AI SDK
        this.logger.log(`Gerando resposta para org ${organizationId}`);
        return 'Resposta gerada pelo agente de IA';
      },
      { failureThreshold: 5, resetTimeoutMs: 30000 },
    );
  }

  async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    return this.circuitBreaker.execute(
      'llm',
      async () => {
        // TODO: chamada de análise de sentimento
        return 'neutral';
      },
      { failureThreshold: 3, resetTimeoutMs: 20000 },
    );
  }
}
