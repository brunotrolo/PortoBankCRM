import { Injectable, Logger, BadGatewayException } from "@nestjs/common";

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

interface CircuitConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  successThreshold: number;
}

interface CircuitInfo {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, CircuitInfo>();

  private defaultConfig: CircuitConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 3,
  };

  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitConfig>
  ): Promise<T> {
    const cfg = { ...this.defaultConfig, ...config };
    const circuit = this.getOrCreateCircuit(serviceName, cfg);

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() - circuit.lastFailureTime < cfg.resetTimeoutMs) {
        this.logger.warn(`Circuit breaker OPEN para ${serviceName}`);
        throw new BadGatewayException(
          `Serviço ${serviceName} temporariamente indisponível`
        );
      }
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess(circuit, cfg);
      return result;
    } catch (error) {
      this.onFailure(circuit, cfg);
      throw error;
    }
  }

  private getOrCreateCircuit(
    name: string,
    config: CircuitConfig
  ): CircuitInfo {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
      });
    }
    return this.circuits.get(name)!;
  }

  private onSuccess(circuit: CircuitInfo, config: CircuitConfig): void {
    circuit.failureCount = 0;
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;
      if (circuit.successCount >= config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        this.logger.log(`Circuit breaker FECHADO para ${name}`);
      }
    }
  }

  private onFailure(circuit: CircuitInfo, config: CircuitConfig): void {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    if (
      circuit.state === CircuitState.HALF_OPEN ||
      circuit.failureCount >= config.failureThreshold
    ) {
      circuit.state = CircuitState.OPEN;
      this.logger.warn(`Circuit breaker ABERTO para ${name}`);
    }
  }

  getState(serviceName: string): CircuitState | undefined {
    return this.circuits.get(serviceName)?.state;
  }
}
