/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Account } from '../accounts/accounts.entity';
import { Debt } from '../debts/debts.entity';
import { Budget } from '../budgets/budgets.entity';
import { Repository, In } from 'typeorm';
import { TransactionType } from '../enums/transaction-type.enum';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
  ) {}

  async getFinancialHealthScore(userId: number) {
    // Fechas para últimos 3 meses
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const ingresosResult = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .where('a.usuarioId = :userId', { userId })
      .andWhere('t.type = :type', { type: TransactionType.INCOME })
      .andWhere('t.date >= :threeMonthsAgo', { threeMonthsAgo })
      .select('SUM(t.amount)', 'sum')
      .getRawOne();

    // 1. Gastar menos de lo que se gana (últimos 3 meses)
    const ingresos = Number(ingresosResult?.sum) || 0;

    const gastosResult = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .where('a.usuarioId = :userId', { userId })
      .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
      .andWhere('t.date >= :threeMonthsAgo', { threeMonthsAgo })
      .select('SUM(t.amount)', 'sum')
      .getRawOne();

    console.log('Gastos Result:', gastosResult);

    const gastos = Number(gastosResult?.sum) || 0;

    const score1 = ingresos > 0 ? Math.min(ingresos / gastos, 1) : 0;

    // 2. Pago de facturas a tiempo (requiere due_date en transacción)
    // Si no tienes due_date, puedes omitir o simular
    // Aquí solo calculamos % de facturas pagadas (tipo 'factura')
    // const totalFacturas = await this.transactionRepository
    //   .createQueryBuilder('t')
    //   .innerJoin('t.account', 'a')
    //   .where('a.usuarioId = :userId', { userId })
    //   .andWhere('t.type = :type', { type: 'bill' })
    //   .getCount();

    // // Suponiendo que tienes un campo 'paid_on_time' booleano (ajusta según tu modelo)
    // const facturasOnTime = await this.transactionRepository
    //   .createQueryBuilder('t')
    //   .innerJoin('t.account', 'a')
    //   .where('a.usuarioId = :userId', { userId })
    //   .andWhere('t.type = :type', { type: 'bill' })
    //   .andWhere('t.paid_on_time = true')
    //   .getCount();

    // const score2 = totalFacturas > 0 ? facturasOnTime / totalFacturas : 1;
    const score2 = 1;

    // 3. Ahorros líquidos suficientes (balance de cuentas de ahorro)
    const cuentas = await this.accountRepository.find({
      where: { usuarioId: userId },
    });
    const balance = cuentas.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const mediaGastos = gastos / 3;
    const score3 =
      mediaGastos > 0 ? Math.min(balance / (3 * mediaGastos), 1) : 1;

    // 5. Nivel de deuda sostenible
    const deudas = await this.debtRepository.find({
      where: { idAccount: In(cuentas.map((c) => c.id)) },
    });
    const deudaMensual = deudas.reduce(
      (sum, d) => sum + Number(d.monthly_payment),
      0,
    );
    const ingresoMensual = ingresos / 3;
    const score5 =
      ingresoMensual > 0
        ? Math.max(0, 1 - deudaMensual / (0.3 * ingresoMensual))
        : 1;

    // 8. Planificación (presupuesto vs gastos reales)
    const presupuestos = await this.budgetRepository.find({
      where: { idAccount: In(cuentas.map((c) => c.id)) },
    });
    let score8 = 1;
    if (presupuestos.length > 0) {
      let totalPresupuesto = 0;
      let totalGastoPresupuestado = 0;
      for (const presupuesto of presupuestos) {
        totalPresupuesto += Number(presupuesto.amount);
        // Suma de gastos en el periodo del presupuesto

        const gastoPresResult = await this.transactionRepository
          .createQueryBuilder('t')
          .where('t.idAccount = :idAccount', {
            idAccount: presupuesto.idAccount,
          })
          .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
          .andWhere('t.date BETWEEN :start AND :end', {
            start: presupuesto.start_date,
            end: presupuesto.end_date,
          })
          .select('SUM(t.amount)', 'sum')
          .getRawOne();

        const gastoPres = Number(gastoPresResult?.sum) || 0;

        totalGastoPresupuestado += gastoPres;
      }
      score8 =
        totalPresupuesto > 0
          ? Math.min(totalPresupuesto / totalGastoPresupuestado, 1)
          : 1;
    }

    // Score total (promedio)
    const scores = [score1, score2, score3, score5, score8];
    const totalScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Clasificación
    let healthLevel: 'alta' | 'media' | 'baja';
    if (totalScore >= 0.86) healthLevel = 'alta';
    else if (totalScore >= 0.6) healthLevel = 'media';
    else healthLevel = 'baja';

    return {
      scores: {
        balancePositivo: score1,
        pagoFacturasATiempo: score2,
        ahorrosLiquidos: score3,
        deudaSostenible: score5,
        planificacion: score8,
      },
      totalScore: Math.round(totalScore * 100),
      healthLevel,
    };
  }
}
