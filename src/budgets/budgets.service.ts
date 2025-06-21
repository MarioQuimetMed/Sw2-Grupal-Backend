/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Budget } from './budgets.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { differenceInMonths } from 'date-fns';
import { TransactionType } from '../enums/transaction-type.enum';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private budgetRepository: Repository<Budget>,
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
  ) {}

  async create(createBudgetDto: CreateBudgetDto): Promise<Budget> {
    // Verificar que la cuenta existe
    await this.accountsService.findOne(createBudgetDto.idAccount);

    // Verificar que la fecha de fin es posterior a la de inicio
    if (
      new Date(createBudgetDto.end_date) <= new Date(createBudgetDto.start_date)
    ) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Crear el presupuesto
    const budget = this.budgetRepository.create(createBudgetDto);
    return this.budgetRepository.save(budget);
  }

  async findAll(): Promise<Budget[]> {
    return this.budgetRepository.find({
      relations: ['account'],
      order: { end_date: 'DESC' },
    });
  }

  async findByAccount(idAccount: number): Promise<Budget[]> {
    return this.budgetRepository.find({
      where: { idAccount },
      relations: ['account'],
      order: { end_date: 'DESC' },
    });
  }

  async findActive(): Promise<Budget[]> {
    const today = new Date();

    return this.budgetRepository.find({
      where: {
        start_date: LessThanOrEqual(today),
        end_date: MoreThanOrEqual(today),
      },
      relations: ['account'],
    });
  }

  async findOne(id: number): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id },
      relations: ['account'],
    });

    if (!budget) {
      throw new NotFoundException(`Presupuesto con ID ${id} no encontrado`);
    }

    return budget;
  }

  async update(id: number, updateBudgetDto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(id);

    // Si se actualiza la fecha final, verificar que sea posterior a la de inicio
    if (
      updateBudgetDto.end_date &&
      new Date(updateBudgetDto.end_date) <=
        new Date(updateBudgetDto.start_date || budget.start_date)
    ) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Actualizar los campos proporcionados
    this.budgetRepository.merge(budget, updateBudgetDto);

    // Guardar los cambios
    return this.budgetRepository.save(budget);
  }

  async remove(id: number): Promise<{ message: string }> {
    const budget = await this.findOne(id);
    await this.budgetRepository.remove(budget);
    return { message: `Presupuesto con ID ${id} eliminado exitosamente` };
  }

  async getBudgetProgress(id: number): Promise<{
    budget: Budget;
    spent: number;
    remaining: number;
    progressPercentage: number;
    isLongTerm: boolean;
    daysRemaining: number;
    status: 'En progreso' | 'Completado' | 'Excedido';
  }> {
    const budget = await this.findOne(id);
    const today = new Date();

    // Construir fechas que incluyan todo el día
    const startDateWithTime = new Date(budget.start_date);
    startDateWithTime.setHours(0, 0, 0, 0);

    let endDateWithTime;
    if (today < budget.end_date) {
      endDateWithTime = new Date(today);
    } else {
      endDateWithTime = new Date(budget.end_date);
    }
    endDateWithTime.setHours(23, 59, 59, 999);

    // Obtener gastos con fechas ajustadas
    const transactions = await this.transactionsService.findAll({
      idAccount: budget.idAccount,
      startDate: startDateWithTime,
      endDate: endDateWithTime,
      type: TransactionType.EXPENSE,
    });

    // Verificamos los resultados para depuración
    console.log(
      `Presupuesto ID: ${id}, Fecha inicio: ${startDateWithTime.toISOString()}, Fecha fin: ${endDateWithTime.toISOString()}`,
    );
    console.log(`Transacciones encontradas: ${transactions.length}`);

    // Calcular el total gastado
    const spent = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );

    // Calcular días restantes
    const daysRemaining = Math.max(
      0,
      Math.floor(
        (budget.end_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    // Determinar si es presupuesto a largo plazo (más de un año)
    const isLongTerm =
      differenceInMonths(budget.end_date, budget.start_date) >= 12;

    // Calcular el resto del presupuesto y el porcentaje de progreso
    const remaining = Math.max(0, Number(budget.amount) - spent);
    const progressPercentage = Math.min(
      100,
      (spent / Number(budget.amount)) * 100,
    );

    // Determinar estado
    let status: 'En progreso' | 'Completado' | 'Excedido' = 'En progreso';
    if (today > budget.end_date) {
      status = spent <= Number(budget.amount) ? 'Completado' : 'Excedido';
    } else if (spent >= Number(budget.amount)) {
      status = 'Excedido';
    }

    return {
      budget,
      spent,
      remaining,
      progressPercentage,
      isLongTerm,
      daysRemaining,
      status,
    };
  }
}
