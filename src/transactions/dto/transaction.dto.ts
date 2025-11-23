import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ example: 100.50, description: 'The amount of the transaction' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: TransactionType, example: 'EXPENSE', description: 'The type of transaction (INCOME or EXPENSE)' })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ example: '2023-10-27T10:00:00Z', description: 'The date of the transaction' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ example: 'Grocery shopping', description: 'Optional note for the transaction' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ example: 1, description: 'The ID of the voucher' })
  @IsNumber()
  @IsNotEmpty()
  voucherId: number;
}

export class EditTransactionDto {
  @ApiPropertyOptional({ example: 100.50, description: 'The amount of the transaction' })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ enum: TransactionType, example: 'EXPENSE', description: 'The type of transaction' })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({ example: '2023-10-27T10:00:00Z', description: 'The date of the transaction' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'Grocery shopping', description: 'Optional note' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ example: 1, description: 'The ID of the voucher' })
  @IsNumber()
  @IsOptional()
  voucherId?: number;
}
