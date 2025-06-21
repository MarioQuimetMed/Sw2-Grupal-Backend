/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt } from './debts.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { AccountsService } from '../accounts/accounts.service';
import { differenceInMonths } from 'date-fns';

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt)
    private debtRepository: Repository<Debt>,
    private accountsService: AccountsService,
  ) {}

  async create(createDebtDto: CreateDebtDto): Promise<Debt> {
    // Verificar que la cuenta existe
    await this.accountsService.findOne(createDebtDto.idAccount);

    // Verificar que la fecha de fin es posterior a la de inicio
    if (
      new Date(createDebtDto.end_date) <= new Date(createDebtDto.start_date)
    ) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Crear la deuda
    const debt = this.debtRepository.create(createDebtDto);
    return this.debtRepository.save(debt);
  }

  async findAll(): Promise<Debt[]> {
    return this.debtRepository.find({
      relations: ['account'],
      order: { end_date: 'DESC' },
    });
  }

  async findByAccount(idAccount: number): Promise<Debt[]> {
    return this.debtRepository.find({
      where: { idAccount },
      relations: ['account'],
      order: { end_date: 'DESC' },
    });
  }

  async findActive(): Promise<Debt[]> {
    return this.debtRepository.find({
      where: { status: 'activa' },
      relations: ['account'],
    });
  }

  async findOne(id: number): Promise<Debt> {
    const debt = await this.debtRepository.findOne({
      where: { id },
      relations: ['account'],
    });

    if (!debt) {
      throw new NotFoundException(`Deuda con ID ${id} no encontrada`);
    }

    return debt;
  }

  async update(id: number, updateDebtDto: UpdateDebtDto): Promise<Debt> {
    const debt = await this.findOne(id);

    // Si se actualiza la fecha final, verificar que sea posterior a la de inicio
    if (
      updateDebtDto.end_date &&
      new Date(updateDebtDto.end_date) <= new Date(debt.start_date)
    ) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Actualizar los campos proporcionados
    this.debtRepository.merge(debt, updateDebtDto);

    // Guardar los cambios
    return this.debtRepository.save(debt);
  }

  async remove(id: number): Promise<{ message: string }> {
    const debt = await this.findOne(id);
    await this.debtRepository.remove(debt);
    return { message: `Deuda con ID ${id} eliminada exitosamente` };
  }

  async calculatePaymentPlan(id: number): Promise<
    Array<{
      paymentNumber: number;
      date: Date;
      payment: number;
      principalPayment: number;
      interestPayment: number;
      remainingBalance: number;
    }>
  > {
    const debt = await this.findOne(id);

    // Calcular el número de meses entre start_date y end_date
    const totalMonths = differenceInMonths(debt.end_date, debt.start_date);

    // Preparar el plan de pagos
    const paymentPlan: Array<{
      paymentNumber: number;
      date: Date;
      payment: number;
      principalPayment: number;
      interestPayment: number;
      remainingBalance: number;
    }> = [];
    let remainingBalance = debt.principal_amount;

    for (let i = 0; i < totalMonths; i++) {
      // Calcular la fecha de pago
      const paymentDate = new Date(debt.start_date);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      // Calcular interés mensual (tasa anual dividida por 12)
      const monthlyInterestRate = debt.interest_rate / 100 / 12;
      const interestPayment = remainingBalance * monthlyInterestRate;
      const principalPayment = debt.monthly_payment - interestPayment;

      // Actualizar saldo restante
      remainingBalance = Math.max(0, remainingBalance - principalPayment);

      // Agregar cuota al plan
      paymentPlan.push({
        paymentNumber: i + 1,
        date: paymentDate,
        payment: debt.monthly_payment,
        principalPayment,
        interestPayment,
        remainingBalance,
      });

      // Si ya se pagó todo, terminar
      if (remainingBalance <= 0) break;
    }

    return paymentPlan;
  }

  async calculateDebtCapacity(
    userId: number,
    monthlyIncome: number,
  ): Promise<{
    totalDebts: number;
    monthlyDebtPayments: number;
    debtToIncomeRatio: number;
    maxRecommendedDebt: number;
    remainingCapacity: number;
    status: 'saludable' | 'precaución' | 'sobreendeudado';
  }> {
    // Obtener todas las cuentas del usuario
    const accounts = await this.accountsService.findByUser(userId);
    const accountIds = accounts.map((account) => account.id);

    // Obtener todas las deudas activas del usuario
    const debts: Debt[] = []; // Ahora TypeScript sabe que es un array de Debt
    for (const accountId of accountIds) {
      const accountDebts = await this.debtRepository.find({
        where: { idAccount: accountId, status: 'activa' },
      });
      debts.push(...accountDebts); // Ahora funciona correctamente
    }
    // Calcular pagos mensuales totales
    const monthlyDebtPayments = debts.reduce(
      (total, debt) => total + debt.monthly_payment,
      0,
    );

    // Calcular monto total de deudas
    const totalDebts = debts.reduce(
      (total, debt) => total + Number(debt.amount),
      0,
    );

    // Calcular ratio deuda/ingreso
    const debtToIncomeRatio = monthlyDebtPayments / monthlyIncome;

    // Según BBVA, no más del 35-40% de ingresos deberían ir a deudas (usaremos 35%)
    const maxRecommendedDebt = monthlyIncome * 0.35;
    const remainingCapacity = maxRecommendedDebt - monthlyDebtPayments;

    // Determinar estado de salud financiera
    let status: 'saludable' | 'precaución' | 'sobreendeudado';
    if (debtToIncomeRatio <= 0.25) {
      status = 'saludable';
    } else if (debtToIncomeRatio <= 0.35) {
      status = 'precaución';
    } else {
      status = 'sobreendeudado';
    }

    return {
      totalDebts,
      monthlyDebtPayments,
      debtToIncomeRatio,
      maxRecommendedDebt,
      remainingCapacity,
      status,
    };
  }
}
