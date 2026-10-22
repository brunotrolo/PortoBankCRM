import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { headers } from "next/headers";

export interface CedarAuthRequest {
  user?: {
    sub: string;
    email: string;
    roles: string[];
    organizationId?: string;
  };
  organizationId?: string;
}

@Injectable()
export class CedarAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extrair token do header Authorization
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de autenticação não fornecido");
    }

    const token = authHeader.substring(7);

    // Extrair organizationId do header customizado
    const organizationId = request.headers["x-organization-id"] as string;

    // Em desenvolvimento local, validar token simplificado
    // Em produção, validar JWT do Cognito e consultar Amazon Verified Permissions (Cedar)
    const user = await this.validateToken(token, organizationId);

    if (!user) {
      throw new UnauthorizedException("Token inválido ou expirado");
    }

    request.user = user;
    request.organizationId = user.organizationId || organizationId;

    return true;
  }

  private async validateToken(
    token: string,
    organizationId?: string
  ): Promise<any> {
    // Desenvolvimento local: aceitar token de teste
    if (token === "dev-token" || process.env.NODE_ENV === "development") {
      return {
        sub: "dev-user-001",
        email: "dev@portobankcrm.com",
        roles: ["admin"],
        organizationId: organizationId || "dev-org-001",
      };
    }

    // Produção: validar com Cognito + Cedar
    // TODO: Implementar chamada real ao Amazon Cognito e Verified Permissions
    return null;
  }
}
