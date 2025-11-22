import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDailyReport(userId: number, date: string, timezone?: number) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        // Apply timezone offset if provided (minutes offset from UTC)
        if (timezone !== undefined) {
            startDate.setMinutes(startDate.getMinutes() + timezone);
            endDate.setMinutes(endDate.getMinutes() + timezone);
        }
        startDate.setHours(0, 0, 0, 0);
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
        const end = new Date(endDate);

        // Only set start/end of day if the input is just a date (YYYY-MM-DD)
        if (!startDate.includes('T')) {
            start.setHours(0, 0, 0, 0);
        }
        if (!endDate.includes('T')) {
            end.setHours(23, 59, 59, 999);
        }

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

        // Sort transactions by Date ascending for running balance
        report.transactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const buffers: any[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Colors
            const HEADER_BG_COLOR = '#2B4C7E'; // Dark Blue
            const HEADER_TEXT_COLOR = '#FFFFFF';
            const ROW_ALT_BG_COLOR = '#F5F5F5';
            const BORDER_COLOR = '#CCCCCC';

            // Helper to format date
            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: '2-digit'
                });
            };

            // Title
            doc.fontSize(18).font('Helvetica-Bold').fillColor(HEADER_BG_COLOR)
                .text('Income and Expenses', 30, 30, { align: 'left' });

            doc.fontSize(10).font('Helvetica').fillColor('black')
                .text(`${formatDate(startDate)} - ${formatDate(endDate)}`, 30, 55);

            doc.moveDown(2);

            // Table Configuration
            let tableTop = 80;
            const pageHeight = doc.page.height;
            const margin = 30;

            // Column Configuration
            const cols = [
                { id: 'account', label: 'Account', width: 60, align: 'left' },
                { id: 'date', label: 'Date', width: 50, align: 'center' },
                { id: 'desc', label: 'Description', width: 140, align: 'left' },
                { id: 'category', label: 'Category', width: 90, align: 'left' },
                { id: 'income', label: 'Income\nMoney IN', width: 70, align: 'right' },
                { id: 'expense', label: 'Expense\nMoney OUT', width: 70, align: 'right' },
                { id: 'balance', label: 'Overall\nBalance', width: 70, align: 'right' }
            ];

            let xPos = margin;
            const colX: any = {};
            cols.forEach(col => {
                colX[col.id] = xPos;
                xPos += col.width;
            });

            const drawHeader = (y: number) => {
                // Header Background
                doc.rect(margin, y, 550, 35).fill(HEADER_BG_COLOR);

                // Header Text
                doc.fillColor(HEADER_TEXT_COLOR).font('Helvetica-Bold').fontSize(9);

                cols.forEach(col => {
                    doc.text(col.label, colX[col.id] + 2, y + 5, {
                        width: col.width - 4,
                        align: col.align as any
                    });
                });

                // Reset fill
                doc.fillColor('black');
            };

            const drawRow = (y: number, t: any, balance: number, isAlt: boolean) => {
                const height = 20;

                // Alt Row Background
                // if (isAlt) {
                //     doc.rect(margin, y, 550, height).fill(ROW_ALT_BG_COLOR);
                //     doc.fillColor('black'); // Reset
                // }

                // Borders (Grid)
                doc.rect(margin, y, 550, height).strokeColor(BORDER_COLOR).stroke();
                cols.forEach((col, i) => {
                    if (i > 0) { // Vertical lines
                        doc.moveTo(colX[col.id], y).lineTo(colX[col.id], y + height).stroke();
                    }
                });

                doc.font('Helvetica').fontSize(9).fillColor('black');
                const textY = y + 6;

                // Account (Static)
                doc.text('Main', colX.account + 2, textY, { width: cols[0].width - 4, align: 'left' });

                // Date
                doc.text(formatDate(t.date), colX.date + 2, textY, { width: cols[1].width - 4, align: 'center' });

                // Description (Note)
                doc.text(t.note || '-', colX.desc + 2, textY, { width: cols[2].width - 4, align: 'left', lineBreak: false, ellipsis: true });

                // Category
                doc.text(t.category.name, colX.category + 2, textY, { width: cols[3].width - 4, align: 'left', lineBreak: false, ellipsis: true });

                // Income
                if (t.type === 'INCOME') {
                    doc.text(t.amount.toFixed(2), colX.income + 2, textY, { width: cols[4].width - 4, align: 'right' });
                }

                // Expense
                if (t.type === 'EXPENSE') {
                    doc.text(t.amount.toFixed(2), colX.expense + 2, textY, { width: cols[5].width - 4, align: 'right' });
                }

                // Balance
                doc.text(balance.toFixed(2), colX.balance + 2, textY, { width: cols[6].width - 4, align: 'right' });
            };

            drawHeader(tableTop);
            let y = tableTop + 35;
            let runningBalance = 0;

            report.transactions.forEach((t: any, index: number) => {
                if (y > pageHeight - 50) {
                    doc.addPage();
                    tableTop = 30;
                    drawHeader(tableTop);
                    y = tableTop + 35;
                }

                if (t.type === 'INCOME') runningBalance += t.amount;
                else runningBalance -= t.amount;

                drawRow(y, t, runningBalance, index % 2 === 1);
                y += 20;
            });

            // Total Row
            if (y > pageHeight - 50) {
                doc.addPage();
                y = 30;
            }

            // Total Row Background
            doc.rect(margin, y, 550, 25).fill('#D9E2F3').stroke(); // Light blueish gray
            doc.fillColor('black').font('Helvetica-Bold');

            // Total Label
            doc.text('Total', colX.account + 5, y + 8);

            // Total Income
            doc.text(report.totalIncome.toFixed(2), colX.income + 2, y + 8, { width: cols[4].width - 4, align: 'right' });

            // Total Expense
            doc.text(report.totalExpense.toFixed(2), colX.expense + 2, y + 8, { width: cols[5].width - 4, align: 'right' });

            // Final Balance
            doc.text(report.balance.toFixed(2), colX.balance + 2, y + 8, { width: cols[6].width - 4, align: 'right' });

            // Draw borders for total row
            cols.forEach((col, i) => {
                if (i > 0) {
                    doc.moveTo(colX[col.id], y).lineTo(colX[col.id], y + 25).stroke();
                }
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
