import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, EditCategoryDto } from './dto/category.dto';
import { GetUser } from '../auth/decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('categories')
export class CategoriesController {
    constructor(private categoriesService: CategoriesService) { }

    @ApiOperation({ summary: 'Get all categories for the current user' })
    @ApiResponse({ status: 200, description: 'Return all categories' })
    @Get()
    getCategories(@GetUser('id') userId: number) {
        return this.categoriesService.getCategories(userId);
    }

    @ApiOperation({ summary: 'Create a new category' })
    @ApiResponse({ status: 201, description: 'The category has been successfully created' })
    @Post()
    createCategory(
        @GetUser('id') userId: number,
        @Body() dto: CreateCategoryDto,
    ) {
        return this.categoriesService.createCategory(userId, dto);
    }

    @ApiOperation({ summary: 'Update a category' })
    @ApiResponse({ status: 200, description: 'The category has been successfully updated' })
    @Patch(':id')
    editCategory(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) categoryId: number,
        @Body() dto: EditCategoryDto,
    ) {
        return this.categoriesService.editCategory(userId, categoryId, dto);
    }

    @ApiOperation({ summary: 'Delete a category' })
    @ApiResponse({ status: 200, description: 'The category has been successfully deleted' })
    @Delete(':id')
    deleteCategory(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) categoryId: number,
    ) {
        return this.categoriesService.deleteCategory(userId, categoryId);
    }
}
