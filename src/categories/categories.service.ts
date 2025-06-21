import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './categories.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const newCategory = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(newCategory);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);
    this.categoryRepository.merge(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<{ message: string }> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
    return { message: `Categoría con ID ${id} eliminada exitosamente` };
  }

  async getDefaultCategories(): Promise<Category[]> {
    const defaultCategories = [
      'Alimentación',
      'Transporte',
      'Servicios',
      'Entretenimiento',
      'Salud',
      'Educación',
      'Vivienda',
      'Ropa',
      'Otros',
    ];

    const existingCategories = await this.categoryRepository.find();

    // Verificar qué categorías por defecto no existen aún
    const categoriesToCreate = defaultCategories
      .filter((name) => !existingCategories.some((cat) => cat.name === name))
      .map((name) => this.categoryRepository.create({ name }));

    if (categoriesToCreate.length > 0) {
      await this.categoryRepository.save(categoriesToCreate);
    }

    return this.categoryRepository.find();
  }
}
