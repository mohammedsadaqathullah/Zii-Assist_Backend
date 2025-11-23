import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, EditTransactionDto } from './dto/transaction.dto';
import { PaginationDto, PaginatedResponse } from './dto/pagination.dto';
import { Transaction } from '@prisma/client';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    async getTransactions(
        userId: number,
        paginationDto: PaginationDto,
    ): Promise<PaginatedResponse<Transaction>> {
        const { page = 1, limit = 20, startDate, endDate } = paginationDto;
        const skip = (page - 1) * limit;

        // Build where clause with optional date filtering
        const where: any = { userId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        // Get total count and paginated data in parallel
        const [total, data] = await Promise.all([
            this.prisma.transaction.count({ where }),
            this.prisma.transaction.findMany({
                where,
                include: { voucher: true },
                orderBy: { date: 'desc' },
                skip,
                take: limit,
            }),
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasMore = page < totalPages;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasMore,
            },
        };
    }

    async getTransactionById(userId: number, transactionId: number) {
        return this.prisma.transaction.findFirst({
            where: { id: transactionId, userId },
            include: { voucher: true },
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
