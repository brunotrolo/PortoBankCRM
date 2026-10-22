import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown) {
    const dto = loginSchema.parse(body);
    return this.authService.login(dto.email, dto.password);
  }

  @Post("logout")
  async logout() {
    return { success: true };
  }
}
