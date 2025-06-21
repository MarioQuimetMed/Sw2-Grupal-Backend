import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

// Define un tipo para la respuesta de usuario sin contraseña
export type UserResponse = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * Valida un usuario por sus credenciales
   * @param email - Email del usuario
   * @param password - Contraseña sin hash
   * @returns Datos del usuario sin contraseña o null si no es válido
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponse | null> {
    try {
      const user = await this.usersRepository.findOne({ where: { email } });

      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return null;
      }

      // Excluye la contraseña de la respuesta
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: passwordToOmit, ...userData } = user;
      return userData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al validar usuario: ${errorMessage}`,
      );
    }
  }

  /**
   * Inicia sesión y genera un token JWT
   * @param loginDto - DTO con credenciales de inicio de sesión
   * @returns Usuario y token de acceso
   */
  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;
      const user = await this.validateUser(email, password);

      const currentDate = new Date().toISOString();
      console.log(`fecha we ${currentDate}`);

      if (!user) {
        throw new UnauthorizedException('Credenciales incorrectas');
      }

      // Asegura que el id sea numérico para el token JWT
      const payload = { email: user.email, sub: +user.id };

      return {
        user,
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al iniciar sesión');
    }
  }

  /**
   * Registra un nuevo usuario en el sistema
   * @param createUserDto - DTO con información del nuevo usuario
   * @returns Usuario creado sin contraseña
   */
  async register(createUserDto: CreateUserDto): Promise<UserResponse> {
    try {
      // Verificar si el usuario ya existe
      const userExists = await this.usersRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (userExists) {
        throw new ConflictException('Ya existe un usuario con este email');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      // Crear el nuevo usuario
      const newUser = this.usersRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });

      // Guardar en la base de datos
      const savedUser = await this.usersRepository.save(newUser);

      // Excluir la contraseña de la respuesta
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: passwordToOmit, ...userData } = savedUser;

      return userData;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al registrar usuario');
    }
  }

  /**
   * Busca un usuario por ID
   * @param id - ID del usuario
   * @returns Usuario encontrado o lanza excepción
   */
  async findOne(id: number): Promise<User> {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al buscar usuario con ID ${id}`,
      );
    }
  }
}
