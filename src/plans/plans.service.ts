/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plans.entity';
import { UserPlan } from './user-plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(UserPlan)
    private userPlanRepository: Repository<UserPlan>,
  ) {}

  /**
   * Obtiene todos los planes de suscripción
   * @param active - Filtro opcional para mostrar solo planes activos
   * @returns Lista de planes
   */
  async findAll(active?: boolean): Promise<Plan[]> {
    try {
      const query = this.planRepository.createQueryBuilder('plan');

      if (active !== undefined) {
        query.where('plan.is_active = :active', { active });
      }

      return query.orderBy('plan.price_monthly', 'ASC').getMany();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al obtener planes: ${errorMessage}`,
      );
    }
  }

  /**
   * Obtiene un plan específico por su ID
   * @param id - ID del plan
   * @returns Plan encontrado
   */
  async findOne(id: number): Promise<Plan> {
    try {
      const plan = await this.planRepository.findOne({ where: { id } });

      if (!plan) {
        throw new NotFoundException(`Plan con ID ${id} no encontrado`);
      }

      return plan;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al obtener plan con ID ${id}: ${errorMessage}`,
      );
    }
  }

  /**
   * Crea un nuevo plan de suscripción
   * @param createPlanDto - Datos del nuevo plan
   * @returns Plan creado
   */
  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    try {
      // Verificar si ya existe un plan con el mismo nombre
      const existingPlan = await this.planRepository.findOne({
        where: { name: createPlanDto.name },
      });

      if (existingPlan) {
        throw new ConflictException(
          `Ya existe un plan con el nombre ${createPlanDto.name}`,
        );
      }

      const newPlan = this.planRepository.create(createPlanDto);
      return this.planRepository.save(newPlan);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al crear plan: ${errorMessage}`,
      );
    }
  }

  /**
   * Actualiza un plan existente
   * @param id - ID del plan a actualizar
   * @param updatePlanDto - Datos actualizados del plan
   * @returns Plan actualizado
   */
  async update(id: number, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    try {
      // Verificar si el plan existe
      const plan = await this.findOne(id);

      // Verificar si hay otro plan con el mismo nombre (si se está actualizando el nombre)
      if (updatePlanDto.name && updatePlanDto.name !== plan.name) {
        const existingPlan = await this.planRepository.findOne({
          where: { name: updatePlanDto.name },
        });

        if (existingPlan) {
          throw new ConflictException(
            `Ya existe un plan con el nombre ${updatePlanDto.name}`,
          );
        }
      }

      // Actualizar el plan
      await this.planRepository.update(id, updatePlanDto);
      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al actualizar plan con ID ${id}: ${errorMessage}`,
      );
    }
  }

  /**
   * Elimina un plan (cambiar is_active a false)
   * @param id - ID del plan a desactivar
   * @returns Mensaje de confirmación
   */
  async remove(id: number): Promise<{ message: string }> {
    try {
      // Verificar si el plan existe
      await this.findOne(id);

      // Desactivar el plan en lugar de eliminarlo físicamente
      await this.planRepository.update(id, { is_active: false });

      return { message: `Plan con ID ${id} ha sido desactivado correctamente` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al desactivar plan con ID ${id}: ${errorMessage}`,
      );
    }
  }

  /**
   * Asigna un plan a un usuario
   * @param assignPlanDto - Datos para asignar el plan
   * @returns Asignación de plan creada
   */
  async assignPlanToUser(assignPlanDto: AssignPlanDto): Promise<UserPlan> {
    try {
      // Verificar si el plan existe
      await this.findOne(assignPlanDto.plan_id);

      // Crear la asignación
      const userPlan = this.userPlanRepository.create({
        user_id: assignPlanDto.user_id,
        plan_id: assignPlanDto.plan_id,
        start_date: assignPlanDto.start_date || new Date(),
        end_date: assignPlanDto.end_date,
        payment_status: assignPlanDto.payment_status || 'pending',
      });

      return this.userPlanRepository.save(userPlan);
    } catch (error: unknown) {
      // Verificamos y tipamos explícitamente
      if (error instanceof NotFoundException) {
        // Crear una nueva instancia para mantener el tipo seguro
        throw new NotFoundException(error.message);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al asignar plan al usuario: ${errorMessage}`,
      );
    }
  }

  /**
   * Obtiene planes predefinidos para demo (freemium, estándar, pro)
   */
  async createPredefinedPlans(): Promise<Plan[]> {
    try {
      // Verificar si ya existen planes
      const existingPlans = await this.planRepository.find();

      if (existingPlans.length > 0) {
        return existingPlans;
      }

      // Definir planes predeterminados
      const predefinedPlans = [
        {
          name: 'Freemium',
          description: 'Plan gratuito con funciones básicas',
          price_monthly: 0,
          price_annual: 0,
          is_active: true,
        },
        {
          name: 'Estándar',
          description: 'Plan con funciones avanzadas para usuarios regulares',
          price_monthly: 9.99,
          price_annual: 99.99,
          is_active: true,
        },
        {
          name: 'Pro',
          description:
            'Plan completo con todas las funcionalidades para profesionales',
          price_monthly: 19.99,
          price_annual: 199.99,
          is_active: true,
        },
      ];

      // Crear los planes
      const createdPlans = this.planRepository.create(predefinedPlans);
      return this.planRepository.save(createdPlans);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al crear planes predefinidos: ${errorMessage}`,
      );
    }
  }
}
