import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, EditCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async getCategories(userId: number) {
        return this.prisma.category.findMany({
            where: { userId },
        });
    }

    async createCategory(userId: number, dto: CreateCategoryDto) {
        return this.prisma.category.create({
            data: {
                userId,
                ...dto,
            },
        });
    }

    async editCategory(userId: number, categoryId: number, dto: EditCategoryDto) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category || category.userId !== userId)
            throw new ForbiddenException('Access to resources denied');

        return this.prisma.category.update({
            where: { id: categoryId },
            data: { ...dto },
        });
    }

    async deleteCategory(userId: number, categoryId: number) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category || category.userId !== userId)
            throw new ForbiddenException('Access to resources denied');

        return this.prisma.category.delete({
            where: { id: categoryId },
        });
    }
}
