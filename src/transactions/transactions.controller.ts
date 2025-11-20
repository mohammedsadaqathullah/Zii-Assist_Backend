import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, EditTransactionDto } from './dto/transaction.dto';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('transactions')
export class TransactionsController {
    constructor(private transactionsService: TransactionsService) { }

    @ApiOperation({ summary: 'Get all transactions for the current user' })
    @ApiResponse({ status: 200, description: 'Return all transactions' })
    @Get()
    getTransactions(@GetUser('id') userId: number) {
        return this.transactionsService.getTransactions(userId);
    }

    @ApiOperation({ summary: 'Get a transaction by ID' })
    @ApiResponse({ status: 200, description: 'Return the transaction' })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    @Get(':id')
    getTransactionById(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) transactionId: number,
    ) {
        return this.transactionsService.getTransactionById(userId, transactionId);
    }

    @ApiOperation({ summary: 'Create a new transaction' })
    @ApiResponse({ status: 201, description: 'The transaction has been successfully created' })
    @Post()
    createTransaction(
        @GetUser('id') userId: number,
        @Body() dto: CreateTransactionDto,
    ) {
        return this.transactionsService.createTransaction(userId, dto);
    }

    @ApiOperation({ summary: 'Update a transaction' })
    @ApiResponse({ status: 200, description: 'The transaction has been successfully updated' })
    @Patch(':id')
    editTransaction(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) transactionId: number,
        @Body() dto: EditTransactionDto,
    ) {
        return this.transactionsService.editTransaction(userId, transactionId, dto);
    }

    @ApiOperation({ summary: 'Delete a transaction' })
    @ApiResponse({ status: 200, description: 'The transaction has been successfully deleted' })
    @Delete(':id')
    deleteTransaction(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) transactionId: number,
    ) {
        return this.transactionsService.deleteTransaction(userId, transactionId);
    }
}
