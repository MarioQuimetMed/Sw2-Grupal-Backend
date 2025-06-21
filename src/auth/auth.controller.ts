import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { User } from '../users/users.entity';

// Interfaz para el Request con usuario autenticado
interface RequestWithUser extends ExpressRequest {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Inicia sesión y devuelve token JWT
   * @param loginDto Credenciales del usuario
   * @returns Token de acceso y datos del usuario
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Registra un nuevo usuario
   * @param createUserDto Datos del nuevo usuario
   * @returns Usuario creado sin contraseña
   */
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /**
   * Obtiene el perfil del usuario autenticado
   * Ruta protegida que requiere token JWT válido
   * @returns Datos del usuario autenticado
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    // req.user contiene el usuario que devolvió JwtStrategy.validate()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...user } = req.user;
    return user;
  }
}
