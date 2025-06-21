/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  ParseIntPipe,
  Query,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
@UseGuards(AuthGuard('jwt'))
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    // Verificar que el usuario autenticado solo cree cuentas para sí mismo
    if (req.user.id !== createAccountDto.usuarioId) {
      console.log(req.user.userId, createAccountDto.usuarioId);
      throw new ForbiddenException(
        'No puedes crear cuentas para otros usuarios',
      );
    }

    return this.accountsService.create(createAccountDto);
  }

  @Get()
  findAll(@Request() req, @Query('usuarioId') usuarioId?: number) {
    // Si se proporciona un ID de usuario y es diferente al usuario autenticado,
    // verificar permisos (por ahora solo permitimos ver las propias)
    if (usuarioId && req.user.userId !== Number(usuarioId)) {
      throw new ForbiddenException('Solo puedes ver tus propias cuentas');
    }

    // Si no se proporciona usuarioId, filtrar por el usuario autenticado
    return this.accountsService.findByUser(usuarioId || req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const account = await this.accountsService.findOne(id);

    // Verificar que la cuenta pertenece al usuario autenticado
    if (account.usuarioId !== req.user.userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a esta cuenta',
      );
    }

    return account;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAccountDto: UpdateAccountDto,
    @Request() req,
  ) {
    const account = await this.accountsService.findOne(id);

    // Verificar que la cuenta pertenece al usuario autenticado
    if (account.usuarioId !== req.user.userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta cuenta',
      );
    }

    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const account = await this.accountsService.findOne(id);

    // Verificar que la cuenta pertenece al usuario autenticado
    if (account.usuarioId !== req.user.userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta cuenta',
      );
    }

    return this.accountsService.remove(id);
  }
}
