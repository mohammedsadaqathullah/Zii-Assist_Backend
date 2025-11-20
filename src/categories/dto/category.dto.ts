import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Groceries', description: 'The name of the category' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: TransactionType, example: 'EXPENSE', description: 'The type of category' })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({ example: 'cart-outline', description: 'The icon name for the category' })
  @IsString()
  @IsOptional()
  icon?: string;
}

export class EditCategoryDto {
  @ApiPropertyOptional({ example: 'Groceries', description: 'The name of the category' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: TransactionType, example: 'EXPENSE', description: 'The type of category' })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({ example: 'cart-outline', description: 'The icon name for the category' })
  @IsString()
  @IsOptional()
  icon?: string;
}
