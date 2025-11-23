import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoucherDto {
  @ApiProperty({ example: 'Groceries', description: 'The name of the voucher' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: TransactionType, example: 'EXPENSE', description: 'The type of voucher' })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({ example: 'cart-outline', description: 'The icon name for the voucher' })
  @IsString()
  @IsOptional()
  icon?: string;
}

export class EditVoucherDto {
  @ApiPropertyOptional({ example: 'Groceries', description: 'The name of the voucher' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: TransactionType, example: 'EXPENSE', description: 'The type of voucher' })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({ example: 'cart-outline', description: 'The icon name for the voucher' })
  @IsString()
  @IsOptional()
  icon?: string;
}
