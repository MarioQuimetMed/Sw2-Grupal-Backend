/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { Plan } from './plans.entity';
import { UserPlan } from './user-plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * Obtiene todos los planes de suscripción
   * @param active - Filtro opcional para mostrar solo planes activos
   * @returns Lista de planes
   */
  @Get()
  async findAll(@Query('active') active?: string): Promise<Plan[]> {
    // Convertir el query param string a boolean si existe
    const activeFilter = active !== undefined ? active === 'true' : undefined;

    return this.plansService.findAll(activeFilter);
  }

  /**
   * Obtiene un plan específico por su ID
   * @param id - ID del plan
   * @returns Plan encontrado
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Plan> {
    return this.plansService.findOne(id);
  }

  /**
   * Crea un nuevo plan de suscripción
   * @param createPlanDto - Datos del nuevo plan
   * @returns Plan creado
   */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() createPlanDto: CreatePlanDto): Promise<Plan> {
    return this.plansService.create(createPlanDto);
  }

  /**
   * Actualiza un plan existente
   * @param id - ID del plan a actualizar
   * @param updatePlanDto - Datos actualizados del plan
   * @returns Plan actualizado
   */
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlanDto: UpdatePlanDto,
  ): Promise<Plan> {
    return this.plansService.update(id, updatePlanDto);
  }

  /**
   * Desactiva un plan (cambiar is_active a false)
   * @param id - ID del plan a desactivar
   * @returns Mensaje de confirmación
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.plansService.remove(id);
  }

  /**
   * Asigna un plan a un usuario
   * @param assignPlanDto - Datos para asignar el plan
   * @returns Asignación de plan creada
   */
  @Post('assign')
  @UseGuards(AuthGuard('jwt'))
  async assignPlanToUser(
    @Body() assignPlanDto: AssignPlanDto,
  ): Promise<UserPlan> {
    return this.plansService.assignPlanToUser(assignPlanDto);
  }

  /**
   * Inicializa planes predefinidos (freemium, estándar, pro)
   * @returns Lista de planes creados
   */
  @Post('init')
  @UseGuards(AuthGuard('jwt'))
  async createPredefinedPlans(): Promise<Plan[]> {
    return this.plansService.createPredefinedPlans();
  }

  /**
   * Endpoint para que un usuario vea su propio plan activo
   * @param req - Solicitud con info del usuario autenticado
   * @returns Plan activo del usuario actual
   */
  @Get('my-active-plan/:id')
  @UseGuards(AuthGuard('jwt'))
  async getMyActivePlan(@Param('id') id: number) {
    // const userId = (req.user.id as { id: number }).id;
    return this.plansService.getUserActivePlan(id);
  }
}
