import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './accounts.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
  ) {}

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    // Crear la nueva cuenta con estado activo por defecto
    const newAccount = this.accountsRepository.create({
      ...createAccountDto,
      is_active: true,
    });

    // Guardar la cuenta en la base de datos
    return this.accountsRepository.save(newAccount);
  }

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find({ where: { is_active: true } });
  }

  async findByUser(usuarioId: number): Promise<Account[]> {
    return this.accountsRepository.find({
      where: { usuarioId, is_active: true },
    });
  }

  async findOne(id: number): Promise<Account> {
    const account = await this.accountsRepository.findOne({
      where: { id },
      relations: ['transactions', 'budgets', 'debts'],
    });

    if (!account) {
      throw new NotFoundException(`Cuenta con ID ${id} no encontrada`);
    }

    return account;
  }

  async update(
    id: number,
    updateAccountDto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.findOne(id);

    // Actualizar los campos proporcionados
    Object.assign(account, updateAccountDto);

    return this.accountsRepository.save(account);
  }

  async remove(id: number): Promise<{ message: string }> {
    const account = await this.findOne(id);

    // Verificar si la cuenta tiene transacciones, presupuestos o deudas asociadas
    if (
      (account.transactions && account.transactions.length > 0) ||
      (account.budgets && account.budgets.length > 0) ||
      (account.debts && account.debts.length > 0)
    ) {
      // En lugar de eliminar físicamente, desactivar la cuenta
      account.is_active = false;
      await this.accountsRepository.save(account);
      return { message: 'Cuenta desactivada exitosamente' };
    }

    // Si no hay registros asociados, eliminar físicamente
    await this.accountsRepository.remove(account);
    return { message: 'Cuenta eliminada exitosamente' };
  }

  async updateBalance(id: number, amount: number): Promise<Account> {
    const account = await this.findOne(id);

    // Calcular el nuevo balance
    const newBalance = Number(account.balance) + amount;

    // Verificar que el balance no quede negativo
    if (newBalance < 0) {
      throw new BadRequestException(
        'No hay saldo suficiente para esta operación',
      );
    }

    account.balance = newBalance;
    return this.accountsRepository.save(account);
  }
}
