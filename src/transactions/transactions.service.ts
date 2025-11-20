import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, EditTransactionDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    async getTransactions(userId: number) {
        return this.prisma.transaction.findMany({
            where: { userId },
            include: { category: true },
            orderBy: { date: 'desc' },
        });
    }

    async getTransactionById(userId: number, transactionId: number) {
        return this.prisma.transaction.findFirst({
            where: { id: transactionId, userId },
            include: { category: true },
        });
    }

    async createTransaction(userId: number, dto: CreateTransactionDto) {
        return this.prisma.transaction.create({
            data: {
                userId,
                ...dto,
            },
        });
    }

    async editTransaction(userId: number, transactionId: number, dto: EditTransactionDto) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction || transaction.userId !== userId)
            throw new ForbiddenException('Access to resources denied');

        return this.prisma.transaction.update({
            where: { id: transactionId },
            data: { ...dto },
        });
    }

    async deleteTransaction(userId: number, transactionId: number) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction || transaction.userId !== userId)
            throw new ForbiddenException('Access to resources denied');

        return this.prisma.transaction.delete({
            where: { id: transactionId },
        });
    }
}
