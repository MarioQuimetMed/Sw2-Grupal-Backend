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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AccountsService } from '../accounts/accounts.service';

@Controller('budgets')
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly accountsService: AccountsService,
  ) {}

  @Post()
  async create(@Body() createBudgetDto: CreateBudgetDto, @Request() req) {
    // Verificar que la cuenta pertenece al usuario autenticado
    const account = await this.accountsService.findOne(
      createBudgetDto.idAccount,
    );
    const userId = req.user.id || req.user.sub;

    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No puedes crear presupuestos para cuentas que no te pertenecen',
      );
    }

    return this.budgetsService.create(createBudgetDto);
  }

  @Get()
  async findAll(@Request() req, @Query('idAccount') idAccount?: number) {
    const userId = req.user.id || req.user.sub;

    if (idAccount) {
      // Verificar que la cuenta pertenece al usuario
      const account = await this.accountsService.findOne(idAccount);
      if (account.usuarioId !== userId) {
        throw new ForbiddenException(
          'No puedes ver presupuestos de cuentas que no te pertenecen',
        );
      }
      return this.budgetsService.findByAccount(idAccount);
    }

    // Si no se especifica una cuenta, devolver todos los presupuestos del usuario
    const accounts = await this.accountsService.findByUser(userId);
    const accountIds = accounts.map((account) => account.id);

    // Filtrar presupuestos por las cuentas del usuario
    const allBudgets = await this.budgetsService.findAll();
    return allBudgets.filter((budget) => accountIds.includes(budget.idAccount));
  }

  @Get('active')
  async findActive(@Request() req) {
    const userId = req.user.id || req.user.sub;

    // Obtener cuentas del usuario
    const accounts = await this.accountsService.findByUser(userId);
    const accountIds = accounts.map((account) => account.id);

    // Filtrar presupuestos activos por las cuentas del usuario
    const activeBudgets = await this.budgetsService.findActive();
    return activeBudgets.filter((budget) =>
      accountIds.includes(budget.idAccount),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const budget = await this.budgetsService.findOne(id);
    const account = await this.accountsService.findOne(budget.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que el presupuesto pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este presupuesto',
      );
    }

    return budget;
  }

  @Get(':id/progress')
  async getBudgetProgress(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const budget = await this.budgetsService.findOne(id);
    const account = await this.accountsService.findOne(budget.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que el presupuesto pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este presupuesto',
      );
    }

    return this.budgetsService.getBudgetProgress(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBudgetDto: UpdateBudgetDto,
    @Request() req,
  ) {
    const budget = await this.budgetsService.findOne(id);
    const account = await this.accountsService.findOne(budget.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que el presupuesto pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este presupuesto',
      );
    }

    return this.budgetsService.update(id, updateBudgetDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const budget = await this.budgetsService.findOne(id);
    const account = await this.accountsService.findOne(budget.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que el presupuesto pertenece a una cuenta del usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este presupuesto',
      );
    }

    return this.budgetsService.remove(id);
  }
}
