import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, EditTransactionDto } from './dto/transaction.dto';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller('transactions')
export class TransactionsController {
    constructor(private transactionsService: TransactionsService) { }

    @Get()
    getTransactions(@GetUser('id') userId: number) {
        return this.transactionsService.getTransactions(userId);
    }

    @Get(':id')
    getTransactionById(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) transactionId: number,
    ) {
        return this.transactionsService.getTransactionById(userId, transactionId);
    }

    @Post()
    createTransaction(
        @GetUser('id') userId: number,
        @Body() dto: CreateTransactionDto,
    ) {
        return this.transactionsService.createTransaction(userId, dto);
    }

    @Patch(':id')
    editTransaction(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) transactionId: number,
        @Body() dto: EditTransactionDto,
    ) {
        return this.transactionsService.editTransaction(userId, transactionId, dto);
    }

    @Delete(':id')
    deleteTransaction(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) transactionId: number,
    ) {
        return this.transactionsService.deleteTransaction(userId, transactionId);
    }
}
