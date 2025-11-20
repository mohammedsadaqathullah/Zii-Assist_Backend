import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, EditCategoryDto } from './dto/category.dto';
import { GetUser } from '../auth/decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('categories')
export class CategoriesController {
    constructor(private categoriesService: CategoriesService) { }

    @Get()
    getCategories(@GetUser('id') userId: number) {
        return this.categoriesService.getCategories(userId);
    }

    @Post()
    createCategory(
        @GetUser('id') userId: number,
        @Body() dto: CreateCategoryDto,
    ) {
        return this.categoriesService.createCategory(userId, dto);
    }

    @Patch(':id')
    editCategory(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) categoryId: number,
        @Body() dto: EditCategoryDto,
    ) {
        return this.categoriesService.editCategory(userId, categoryId, dto);
    }

    @Delete(':id')
    deleteCategory(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) categoryId: number,
    ) {
        return this.categoriesService.deleteCategory(userId, categoryId);
    }
}
