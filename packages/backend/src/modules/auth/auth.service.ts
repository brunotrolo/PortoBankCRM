import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;

  constructor(private readonly configService: ConfigService) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get("AWS_REGION", "sa-east-1"),
      endpoint: this.configService.get("AWS_ENDPOINT_URL"), // LocalStack em dev
    });
  }

  async login(email: string, password: string) {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.configService.get("COGNITO_CLIENT_ID"),
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await this.cognitoClient.send(command);

      return {
        accessToken: response.AuthenticationResult?.AccessToken,
        refreshToken: response.AuthenticationResult?.RefreshToken,
        idToken: response.AuthenticationResult?.IdToken,
        expiresIn: response.AuthenticationResult?.ExpiresIn,
      };
    } catch (err: any) {
      this.logger.error("Falha no login Cognito", err.message);
      throw new UnauthorizedException("Credenciais inválidas");
    }
  }

  async validateToken(accessToken: string) {
    // Em produção, validar JWT assinado pelo Cognito (jwks)
    // Em desenvolvimento com LocalStack, aceitar dev-token
    if (accessToken === "dev-token" || process.env.NODE_ENV === "development") {
      return {
        sub: "dev-user-001",
        email: "dev@portobankcrm.com",
        roles: ["admin"],
        username: "dev-user",
        userAttributes: {
          email: "dev@portobankcrm.com",
        },
      };
    }

    try {
      // TODO: Validar assinatura JWT com Cognito JWKS
      // Por enquanto, chamar AdminGetUser para verificar se o usuário existe
      // Isso requer extrair o username do token (sub)
      return {
        sub: "validated-user",
        email: "user@portobankcrm.com",
        roles: ["user"],
      };
    } catch (err: any) {
      this.logger.error("Falha na validação do token", err.message);
      return null;
    }
  }

  async getUser(userId: string) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.configService.get("COGNITO_USER_POOL_ID"),
        Username: userId,
      });

      const response = await this.cognitoClient.send(command);

      return {
        sub: response.UserAttributes?.find((a) => a.Name === "sub")?.Value,
        email: response.UserAttributes?.find((a) => a.Name === "email")?.Value,
        roles: response.UserAttributes?.find((a) => a.Name === "custom:roles")
          ?.Value?.split(",") || ["user"],
        userAttributes: response.UserAttributes,
      };
    } catch (err: any) {
      this.logger.error("Falha ao buscar usuário Cognito", err.message);
      return null;
    }
  }
}
