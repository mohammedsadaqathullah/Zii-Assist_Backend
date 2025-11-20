import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDailyReport(userId: number, date: string) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: { category: true },
        });

        return this.aggregateTransactions(transactions);
    }

    async getWeeklyReport(userId: number, startDate: string) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: start,
                    lt: end,
                },
            },
            include: { category: true },
        });

        return this.aggregateTransactions(transactions);
    }

    async getMonthlyReport(userId: number, month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: { category: true },
        });

        return this.aggregateTransactions(transactions);
    }

    async getCustomReport(userId: number, startDate: string, endDate: string) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            include: { category: true },
        });

        return this.aggregateTransactions(transactions);
    }

    async generateReportPdf(userId: number, startDate: string, endDate: string): Promise<Buffer> {
        const report = await this.getCustomReport(userId, startDate, endDate);
        const PDFDocument = require('pdfkit');

        return new Promise((resolve) => {
            const doc = new PDFDocument();
            const buffers: any[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Title
            doc.fontSize(25).text('Financial Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
            doc.moveDown();

            // Summary
            doc.fontSize(16).text('Summary');
            doc.fontSize(12).text(`Total Income: $${report.totalIncome}`);
            doc.text(`Total Expense: $${report.totalExpense}`);
            doc.text(`Balance: $${report.balance}`);
            doc.moveDown();

            // Category Breakdown
            doc.fontSize(16).text('Category Breakdown');
            Object.entries(report.categoryBreakdown).forEach(([category, data]: [string, any]) => {
                doc.fontSize(12).text(`${category}: $${data.total} (${data.count} transactions)`);
            });
            doc.moveDown();

            // Transactions
            doc.fontSize(16).text('Transactions');
            report.transactions.forEach((t: any) => {
                const date = new Date(t.date).toLocaleDateString();
                const amount = t.type === 'INCOME' ? `+$${t.amount}` : `-$${t.amount}`;
                doc.fontSize(10).text(`${date} - ${t.category.name} - ${t.note || ''} : ${amount}`);
            });

            doc.end();
        });
    }

    private aggregateTransactions(transactions: any[]) {
        const totalIncome = transactions
            .filter((t) => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter((t) => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        const categoryBreakdown = transactions.reduce((acc, t) => {
            const categoryName = t.category.name;
            if (!acc[categoryName]) {
                acc[categoryName] = { total: 0, count: 0, type: t.type };
            }
            acc[categoryName].total += t.amount;
            acc[categoryName].count += 1;
            return acc;
        }, {});

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            categoryBreakdown,
            transactions,
        };
    }
}
