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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AccountsService } from '../accounts/accounts.service';
// import { TransactionType } from '../enums/transaction-type.enum';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
  ) {}

  @Post()
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req,
  ) {
    // Verificar que la cuenta pertenece al usuario autenticado
    const account = await this.accountsService.findOne(
      createTransactionDto.idAccount,
    );
    const userId = req.user.id || req.user.sub;

    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No puedes crear transacciones para cuentas que no te pertenecen',
      );
    }

    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  async findAll(
    @Query('idAccount') idAccount?: number,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Request() req?,
  ) {
    // Si se proporciona una cuenta, verificar que pertenece al usuario
    if (idAccount) {
      const account = await this.accountsService.findOne(idAccount);
      const userId = req.user.id || req.user.sub;

      if (account.usuarioId !== userId) {
        throw new ForbiddenException(
          'No puedes ver transacciones de cuentas que no te pertenecen',
        );
      }
    }

    return this.transactionsService.findAllByMonth({
      idAccount,
      month,
      year,
    });
  }

  @Get('summary')
  async getSummary(
    @Query('idAccount', ParseIntPipe) idAccount: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    // Verificar que la cuenta pertenece al usuario
    const account = await this.accountsService.findOne(idAccount);
    const userId = req.user.id || req.user.sub;

    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No puedes ver el resumen de cuentas que no te pertenecen',
      );
    }

    return this.transactionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const transaction = await this.transactionsService.findOne(id);
    const account = await this.accountsService.findOne(transaction.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que la transacción pertenece al usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a esta transacción',
      );
    }

    return transaction;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Request() req,
  ) {
    const transaction = await this.transactionsService.findOne(id);
    const account = await this.accountsService.findOne(transaction.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que la transacción pertenece al usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta transacción',
      );
    }

    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const transaction = await this.transactionsService.findOne(id);
    const account = await this.accountsService.findOne(transaction.idAccount);
    const userId = req.user.id || req.user.sub;

    // Verificar que la transacción pertenece al usuario
    if (account.usuarioId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta transacción',
      );
    }

    return this.transactionsService.remove(id);
  }
}
