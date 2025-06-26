/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TransactionsService } from '../transactions/transactions.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionType } from '../enums/transaction-type.enum';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
// import { Account } from 'src/accounts/accounts.entity';
import { HealthService } from 'src/health/health.service';
import { AccountsService } from 'src/accounts/accounts.service';
import { DebtsService } from '../debts/debts.service';
import { BudgetsService } from 'src/budgets/budgets.service';
import { Suggestion } from './suggest.entity';
import { Between, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
// import e from 'express';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private transactionsService: TransactionsService,
    private categoriesService: CategoriesService,
    private accountsService: AccountsService,
    private healthService: HealthService,
    private debtsService: DebtsService,
    private budgetsService: BudgetsService,
    @InjectRepository(Suggestion)
    private readonly suggestionRepository: Repository<Suggestion>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey!);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });
  }

  async processTransactionFromText(
    text: string,
    userId: number,
    accountId: number,
  ): Promise<any> {
    try {
      // Obtener categorías para incluir en el prompt
      const categories = await this.categoriesService.findAll();
      const categoryOptions = categories
        .map((c) => `${c.id}: ${c.name}`)
        .join(', ');

      const currentDate = new Date().toISOString();

      // Construir el prompt para la IA
      const prompt = `
        Extrae la información de una transacción financiera del siguiente texto: "${text}"
        Responde SOLO con un objeto JSON válido con estos campos:
        - amount: número (monto gastado/recibido)
        - description: texto (breve descripción de la transacción)
        - date: fecha ISO (si no se menciona fecha explícita, usa la fecha actual : ${currentDate})
        - type: "ingreso" o "egreso" (si no se especifica, inferir del contexto)
        - idCategory: número (basado en estas categorías: ${categoryOptions})
        
        Por ejemplo, si el texto es "Hoy gasté 8 bs en una empanada", la respuesta debería ser:
        {
          "amount": 8,
          "description": "Compra de empanada",
          "date": "2023-06-19T15:30:00.000Z",
          "type": "egreso",
          "idCategory": 1
        }
        IMPORTANTE: Solo responde con el JSON, sin ningún texto adicional.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      let textResponse = response.text();

      this.logger.debug(`Respuesta de IA: ${textResponse}`);

      // Limpiar la respuesta de marcadores de código markdown
      if (textResponse.includes('```')) {
        // Extraer solo el JSON dentro de los backticks
        textResponse = textResponse.replace(
          /```json\s*([\s\S]*?)\s*```/g,
          '$1',
        );
        // O también podemos intentar extraer cualquier tipo de bloque de código
        if (textResponse.includes('```')) {
          textResponse = textResponse.replace(
            /```(?:json)?\s*([\s\S]*?)\s*```/g,
            '$1',
          );
        }
      }

      // Asegurar que no hay espacios en blanco al inicio o final
      textResponse = textResponse.trim();

      this.logger.debug(`JSON limpio: ${textResponse}`);

      // Parseamos la respuesta limpia
      const parsedTransaction = JSON.parse(textResponse);

      // Crear el DTO para la transacción
      const transactionDto: CreateTransactionDto = {
        amount: parsedTransaction.amount,
        description: parsedTransaction.description,
        date: new Date(parsedTransaction.date),
        idAccount: accountId,
        type: parsedTransaction.type as TransactionType,
        idCategory: parsedTransaction.idCategory,
      };

      // Crear la transacción
      return this.transactionsService.create(transactionDto);
    } catch (error) {
      this.logger.error(`Error procesando texto: ${error.message}`);
      throw new Error(`No pudimos procesar tu texto: ${error.message}`);
    }
  }

  async getSuggestions(userId: number): Promise<{ suggestions: string[] }> {
    // Buscar si ya existen sugerencias para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const existing = await this.suggestionRepository.findOne({
      where: {
        user: { id: userId },
        createdAt: Between(today, tomorrow),
      },
    });

    console.log(existing);

    if (existing) {
      return {
        suggestions: [
          existing.suggestion1,
          existing.suggestion2,
          existing.suggestion3,
        ],
      };
    }

    // 1. Obtener cuentas activas del usuario
    const accounts = await this.accountsService.findByUser(userId);
    const accountIds = accounts.map((acc) => acc.id);

    // 2. Obtener transacciones de los últimos 3 meses
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const ingresos = await this.transactionsService.getSumByTypeAndAccounts(
      accountIds,
      TransactionType.INCOME,
      threeMonthsAgo,
    );

    const gastos = await this.transactionsService.getSumByTypeAndAccounts(
      accountIds,
      TransactionType.EXPENSE,
      threeMonthsAgo,
    );

    // 3. Obtener balance total
    const balance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // 4. Obtener deudas
    const debts = await this.debtsService.findByAccounts(accountIds);

    const deudaMensual = debts.reduce(
      (sum, d) => sum + Number(d.monthly_payment),
      0,
    );

    // 5. Obtener presupuestos
    const budgets = await this.budgetsService.findByAccounts(accountIds);

    //Obtener la salud financiera del usuario
    const health = await this.healthService.getFinancialHealthScore(userId);

    // 6. Construir el prompt para Gemini
    const prompt = `
Eres un asesor financiero personal. Analiza los siguientes datos del usuario y genera 3 sugerencias personalizadas y accionables para mejorar su salud financiera. Responde solo con un array JSON de strings, sin texto adicional.

Datos del usuario:
- Ingresos últimos 3 meses: ${ingresos}
- Egresos últimos 3 meses: ${gastos}
- Balance total en cuentas: ${balance}
- Deuda mensual total: ${deudaMensual}
- Cantidad de presupuestos activos: ${budgets.length}
- Nivel de salud financiera: ${health?.healthLevel ?? 'desconocido'}
- Puntaje de salud financiera: ${health?.totalScore ?? 'N/A'}
- Cantidad de cuentas activas: ${accounts.length}

Contexto del usuario:
• Ratio ingreso/gasto actual: 0.8  (riesgo)
• Fondo emergencia: 0.5 meses (bajo)
• DTI: 45 % (alto)
• Gastos hormiga: 9 % del total

Usa estas *reglas de oro* de las fuentes financieras:
1. 50-30-20 para asignar ingresos (BBVA).
2. Deuda total ≤ 30 % ingresos (NerdWallet).
3. Ahorrar 3-6 meses de gastos (CFPB).
4. Automatizar ahorro (“págate primero”) .
5. Eliminar gastos hormiga (BBVA). 

Genera EXACTAMENTE tres frases accionables y medibles, ejemplo:
• "Reduce tus gastos hormiga de 9 % a 5 % cancelando suscripciones…".
Devuelve solo array JSON.

Ejemplo de respuesta:
[ 
  "Sugerencia 1...",
  "Sugerencia 2...",
  "Sugerencia 3..."
]
`;

    // 7. Llamar a Gemini
    const result = await this.model.generateContent(prompt);
    const response = result.response;
    let textResponse = response.text();

    // Limpiar y parsear la respuesta
    if (textResponse.includes('```')) {
      textResponse = textResponse.replace(
        /```(?:json)?\s*([\s\S]*?)\s*```/g,
        '$1',
      );
    }
    textResponse = textResponse.trim();

    // const textResponse = prompt;

    let suggestions: string[];
    try {
      suggestions = JSON.parse(textResponse);
    } catch {
      // fallback si la IA responde con texto plano
      suggestions = textResponse
        .split('\n')
        .map((s) => s.replace(/^- /, '').trim())
        .filter(Boolean);
    }

    const newSuggestion = this.suggestionRepository.create({
      suggestion1: suggestions[0] ?? '',
      suggestion2: suggestions[1] ?? '',
      suggestion3: suggestions[2] ?? '',
      user: { id: userId },
    });
    await this.suggestionRepository.save(newSuggestion);

    return { suggestions };
  }
}
