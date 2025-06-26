/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('process-transaction')
  async processTransaction(
    @Body() data: { text: string; accountId: number },
    @Request() req,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.aiService.processTransactionFromText(
      data.text,
      userId,
      data.accountId,
    );
  }
  //Metodo para obtener 3 sugerencias en base a los datos del usuario
  @Get('suggestions')
  async getSuggestions(@Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.aiService.getSuggestions(userId);
  }
}
