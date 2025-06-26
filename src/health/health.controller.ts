/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('health')
@UseGuards(AuthGuard('jwt'))
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('score')
  async getScore(@Req() req) {
    const userId = req.user.id || req.user.sub;
    console.log('User ID:', userId);
    return this.healthService.getFinancialHealthScore(userId);
  }
}
