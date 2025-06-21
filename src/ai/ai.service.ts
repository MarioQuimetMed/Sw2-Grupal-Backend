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

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private transactionsService: TransactionsService,
    private categoriesService: CategoriesService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey!);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-8b',
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
}
