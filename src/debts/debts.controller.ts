/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { AccountsService } from '../accounts/accounts.service';

@Controller('debts')
@UseGuards(AuthGuard('jwt'))
export class DebtsController {
  constructor(
    private readonly debtsService: DebtsService,
    private readonly accountsService: AccountsService,
  ) {}

  @Post()
  async create(@Body() createDebtDto: CreateDebtDto, @Request() req) {
    // Verificar que la cuenta pertenece al usuario autenticado
    const account = await this.accountsService.findOne(createDebtDto.idAccount);
    const userId = req.user.id || req.user.sub;

    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No puedes crear deudas para cuentas que no te pertenecen',
      );
    }

    return this.debtsService.create(createDebtDto);
  }

  @Get()
  async findAll(@Request() req, @Query('idAccount') idAccount?: number) {
    const userId = req.user.id || req.user.sub;

    if (idAccount) {
      // Verificar que la cuenta pertenece al usuario
      const account = await this.accountsService.findOne(idAccount);
      if (account.usuarioId !== userId) {
        throw new ForbiddenException(
          'No puedes ver deudas de cuentas que no te pertenecen',
        );
      }
      return this.debtsService.findByAccount(idAccount);
    }

    // Si no se especifica una cuenta, devolver todas las deudas del usuario
    const accounts = await this.accountsService.findByUser(userId);
    const accountIds = accounts.map((account) => account.id);

    // Filtrar deudas por las cuentas del usuario
    const allDebts = await this.debtsService.findAll();
    return allDebts.filter((debt) => accountIds.includes(debt.idAccount));
  }

  @Get('active')
  async findActive(@Request() req) {
    const userId = req.user.id || req.user.sub;

    // Obtener cuentas del usuario
    const accounts = await this.accountsService.findByUser(userId);
    const accountIds = accounts.map((account) => account.id);

    // Filtrar deudas activas por las cuentas del usuario
    const activeDebts = await this.debtsService.findActive();
    return activeDebts.filter((debt) => accountIds.includes(debt.idAccount));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const debt = await this.debtsService.findOne(id);
    const account = await this.accountsService.findOne(debt.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que la deuda pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a esta deuda',
      );
    }

    return debt;
  }

  @Get(':id/payment-plan')
  async getPaymentPlan(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const debt = await this.debtsService.findOne(id);
    const account = await this.accountsService.findOne(debt.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que la deuda pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a esta deuda',
      );
    }

    return this.debtsService.calculatePaymentPlan(id);
  }

  @Get('capacity/calculate')
  async calculateDebtCapacity(
    @Query('monthlyIncome', ParseIntPipe) monthlyIncome: number,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.debtsService.calculateDebtCapacity(userId, monthlyIncome);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDebtDto: UpdateDebtDto,
    @Request() req,
  ) {
    const debt = await this.debtsService.findOne(id);
    const account = await this.accountsService.findOne(debt.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que la deuda pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta deuda',
      );
    }

    return this.debtsService.update(id, updateDebtDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const debt = await this.debtsService.findOne(id);
    const account = await this.accountsService.findOne(debt.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que la deuda pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta deuda',
      );
    }

    return this.debtsService.remove(id);
  }
}
