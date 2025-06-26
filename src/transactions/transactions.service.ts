/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionType } from '../enums/transaction-type.enum';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    private accountsService: AccountsService,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    // Verificar que la cuenta existe
    const account = await this.accountsService.findOne(
      createTransactionDto.idAccount,
    );

    // Crear la transacción
    const transaction =
      this.transactionsRepository.create(createTransactionDto);

    // Calcular el impacto en el balance
    let amountImpact = createTransactionDto.amount;
    if (createTransactionDto.type === TransactionType.EXPENSE) {
      amountImpact = -amountImpact; // Convertir a negativo para gastos
    }

    // Actualizar el balance de la cuenta
    await this.accountsService.updateBalance(account.id, amountImpact);

    // Guardar la transacción
    return this.transactionsRepository.save(transaction);
  }

  async findAll(options?: {
    idAccount?: number;
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
    idCategory?: number;
  }): Promise<Transaction[]> {
    const where: FindOptionsWhere<Transaction> = {};

    if (options) {
      if (options.idAccount !== undefined) {
        where.idAccount = options.idAccount;
      }

      if (options.type !== undefined) {
        where.type = options.type;
      }

      if (options.idCategory !== undefined) {
        where.idCategory = options.idCategory;
      }

      if (options.startDate && options.endDate) {
        where.date = Between(options.startDate, options.endDate);
      }
    }

    return this.transactionsRepository.find({
      where,
      relations: ['account', 'category'],
      order: { date: 'DESC' },
    });
  }
  async findAllByMonth(options?: {
    idAccount?: number;
    month?: string;
    year?: string;
  }): Promise<Transaction[]> {
    const where: FindOptionsWhere<Transaction> = {};

    if (options) {
      if (options.idAccount !== undefined) {
        where.idAccount = options.idAccount;
      }
    }

    // Filtrar por mes y año si se proporcionan
    let dateFilter: { date: any } | undefined = undefined;
    if (options?.month && options?.year) {
      const year = parseInt(options.year, 10);
      const month = parseInt(options.month, 10);

      // Primer día del mes
      const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      // Último día del mes
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      dateFilter = {
        date: Between(startDate, endDate),
      };
    }

    return this.transactionsRepository.find({
      where: {
        ...where,
        ...(dateFilter || {}),
      },
      relations: ['category'],
      order: { date: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
      relations: ['account', 'category'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción con ID ${id} no encontrada`);
    }

    return transaction;
  }

  async update(
    id: number,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    // Obtener la transacción original
    const originalTransaction = await this.findOne(id);

    // Si se está actualizando el monto o el tipo, debemos ajustar el balance
    if (
      updateTransactionDto.amount !== undefined ||
      updateTransactionDto.type !== undefined
    ) {
      // Revertir el impacto original en el balance
      let originalImpact = originalTransaction.amount;
      if (originalTransaction.type === TransactionType.EXPENSE) {
        originalImpact = -originalImpact; // El impacto original fue negativo
      }

      // Calcular el nuevo impacto
      const newAmount =
        updateTransactionDto.amount ?? originalTransaction.amount;
      const newType = updateTransactionDto.type ?? originalTransaction.type;

      let newImpact = newAmount;
      if (newType === TransactionType.EXPENSE) {
        newImpact = -newImpact; // El nuevo impacto es negativo
      }

      // Ajustar el balance: revertir el original y aplicar el nuevo
      await this.accountsService.updateBalance(
        originalTransaction.idAccount,
        -originalImpact + newImpact,
      );
    }

    // Actualizar la transacción
    await this.transactionsRepository.update(id, updateTransactionDto);

    // Devolver la transacción actualizada
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const transaction = await this.findOne(id);

    // Revertir el impacto en el balance
    let amountImpact = transaction.amount;
    if (transaction.type === TransactionType.EXPENSE) {
      amountImpact = -amountImpact; // El impacto original fue negativo
    }

    // Actualizar el balance de la cuenta (revertir el impacto)
    await this.accountsService.updateBalance(
      transaction.idAccount,
      -amountImpact,
    );

    // Eliminar la transacción
    await this.transactionsRepository.remove(transaction);

    return { message: `Transacción con ID ${id} eliminada exitosamente` };
  }

  // Método para obtener resumen de transacciones por período
  async getSummary(
    idAccount: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalIncome: number;
    totalExpense: number;
    netTotal: number;
    categorySummary: Array<{
      categoryId: number;
      categoryName: string;
      total: number;
      percentage: number;
    }>;
  }> {
    // Obtener todas las transacciones en el período
    const transactions = await this.findAll({
      idAccount,
      startDate,
      endDate,
    });

    // Calcular totales
    let totalIncome = 0;
    let totalExpense = 0;

    // Mapa para agrupar por categoría
    const categoryMap = new Map();

    // Procesar transacciones
    transactions.forEach((transaction) => {
      if (transaction.type === TransactionType.INCOME) {
        totalIncome += transaction.amount;
      } else {
        totalExpense += transaction.amount;

        // Agrupar gastos por categoría
        const categoryKey = transaction.idCategory;
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            categoryId: transaction.idCategory,
            categoryName: transaction.category?.name || 'Desconocido',
            total: 0,
          });
        }

        categoryMap.get(categoryKey).total += transaction.amount;
      }
    });

    // Calcular porcentajes para cada categoría
    const categorySummary = Array.from(categoryMap.values()).map(
      (category) => ({
        ...category,
        percentage:
          totalExpense > 0 ? (category.total / totalExpense) * 100 : 0,
      }),
    );

    // Ordenar de mayor a menor
    categorySummary.sort((a, b) => b.total - a.total);

    return {
      totalIncome,
      totalExpense,
      netTotal: totalIncome - totalExpense,
      categorySummary,
    };
  }

  async getSumByTypeAndAccounts(
    accountIds: number[],
    type: TransactionType,
    fromDate: Date,
  ): Promise<number> {
    const result = await this.transactionsRepository
      .createQueryBuilder('t')
      .where('t.idAccount IN (:...accountIds)', { accountIds })
      .andWhere('t.type = :type', { type })
      .andWhere('t.date >= :fromDate', { fromDate })
      .select('SUM(t.amount)', 'sum')
      .getRawOne<{ sum: string }>();

    return Number(result?.sum) || 0;
  }
}
