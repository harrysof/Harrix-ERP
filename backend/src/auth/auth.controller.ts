import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { Public } from './public.decorator.js';
import { CurrentUser, type AuthenticatedUser } from './current-user.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** The only write endpoint in the app that doesn't require a token. */
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /**
   * Who am I? Called by the frontend on every page load to turn a stored
   * token back into a session — and to find out immediately if the account
   * has since been deactivated.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getProfile(user);
  }

  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changeOwnPassword(user, dto.currentPassword, dto.newPassword);
  }
}
