import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDailyReport(userId: number, date: string, timezoneOffset?: number) {
        const startDate = new Date(date);
        const endDate = new Date(date);

        if (timezoneOffset !== undefined) {
            // Adjust for user's timezone
            // UTC = Local + offset
            startDate.setUTCHours(0, 0, 0, 0);
            startDate.setMinutes(startDate.getMinutes() + timezoneOffset);

            endDate.setUTCHours(23, 59, 59, 999);
            endDate.setMinutes(endDate.getMinutes() + timezoneOffset);
        } else {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        }

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
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const PDFDocument = require('pdfkit');

        // Sort transactions by Category Name ascending
        report.transactions.sort((a: any, b: any) => a.category.name.localeCompare(b.category.name));

        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 30 });
            const buffers: any[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Helper to format date
            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            };

            // Helper to format time
            const formatTime = (dateStr: string) => {
                const d = new Date(dateStr);
                return d.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            };

            // Header / Branding
            doc.fontSize(12).font('Helvetica').text('Zii Assist', { align: 'right' });
            doc.moveDown(0.5);

            doc.fontSize(20).font('Helvetica-Bold').text('Financial Report', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, { align: 'center' });
            doc.fontSize(10).text(`Downloaded by: ${user?.name || user?.email || 'User'}`, { align: 'center' });
            doc.moveDown();

            // Summary Box
            const summaryTop = doc.y;
            doc.rect(30, summaryTop, 550, 60).fill('#f9f9f9').stroke();
            doc.fillColor('black'); // Reset fill color after rect

            doc.fontSize(10).text('Total Income', 50, summaryTop + 10);
            doc.fontSize(14).fillColor('green').text(`$${report.totalIncome.toFixed(2)}`, 50, summaryTop + 25);

            doc.fontSize(10).fillColor('black').text('Total Expense', 200, summaryTop + 10);
            doc.fontSize(14).fillColor('red').text(`$${report.totalExpense.toFixed(2)}`, 200, summaryTop + 25);

            doc.fontSize(10).fillColor('black').text('Net Balance', 350, summaryTop + 10);
            const balanceColor = report.balance >= 0 ? 'green' : 'red';
            doc.fontSize(14).fillColor(balanceColor).text(`$${report.balance.toFixed(2)}`, 350, summaryTop + 25);

            doc.fillColor('black');
            doc.moveDown(4);

            // Table Configuration
            let tableTop = doc.y;
            // Adjusted widths to prevent overlap. Total width 550 (30 to 580)
            const colX = {
                sno: 30,
                date: 65,
                time: 135,
                category: 205,
                note: 305,
                amount: 485
            };
            const colWidth = {
                sno: 35,
                date: 70,
                time: 70,
                category: 100,
                note: 180,
                amount: 95
            };
            const padding = 5;

            // Draw Header
            const drawHeader = (y: number) => {
                doc.fontSize(10).font('Helvetica-Bold');
                doc.rect(30, y, 550, 25).fill('#e0e0e0').stroke();
                doc.fillColor('black');

                // Vertically center text in header (y + 8)
                doc.text('S.No', colX.sno + padding, y + 8);
                doc.text('Date', colX.date + padding, y + 8);
                doc.text('Time', colX.time + padding, y + 8);
                doc.text('Category', colX.category + padding, y + 8);
                doc.text('Notes', colX.note + padding, y + 8);
                doc.text('Amount', colX.amount + padding, y + 8);

                // Vertical lines for header
                doc.moveTo(colX.date, y).lineTo(colX.date, y + 25).stroke();
                doc.moveTo(colX.time, y).lineTo(colX.time, y + 25).stroke();
                doc.moveTo(colX.category, y).lineTo(colX.category, y + 25).stroke();
                doc.moveTo(colX.note, y).lineTo(colX.note, y + 25).stroke();
                doc.moveTo(colX.amount, y).lineTo(colX.amount, y + 25).stroke();
            };

            drawHeader(tableTop);
            let y = tableTop + 25;
            doc.font('Helvetica').fontSize(9);

            report.transactions.forEach((t: any, index: number) => {
                const date = formatDate(t.date);
                const time = formatTime(t.date);
                const amount = `$${t.amount.toFixed(2)}`;
                const typeSymbol = t.type === 'INCOME' ? '+' : '-';
                const color = t.type === 'INCOME' ? 'green' : 'red';
                const note = t.note || '-';

                // Calculate row height based on note text wrapping
                const noteHeight = doc.heightOfString(note, { width: colWidth.note - (padding * 2) });
                const rowHeight = Math.max(noteHeight + 10, 25); // Min height 25

                // Check for page break
                if (y + rowHeight > 750) {
                    doc.addPage();
                    y = 50;
                    drawHeader(y);
                    y += 25;
                    doc.font('Helvetica').fontSize(9);
                }

                // Draw Row Border
                doc.rect(30, y, 550, rowHeight).stroke();

                // Draw Vertical Lines
                doc.moveTo(colX.date, y).lineTo(colX.date, y + rowHeight).stroke();
                doc.moveTo(colX.time, y).lineTo(colX.time, y + rowHeight).stroke();
                doc.moveTo(colX.category, y).lineTo(colX.category, y + rowHeight).stroke();
                doc.moveTo(colX.note, y).lineTo(colX.note, y + rowHeight).stroke();
                doc.moveTo(colX.amount, y).lineTo(colX.amount, y + rowHeight).stroke();

                // Fill Text with padding
                const textY = y + 5;
                doc.fillColor('black').text((index + 1).toString(), colX.sno + padding, textY);
                doc.text(date, colX.date + padding, textY, { width: colWidth.date - (padding * 2) });
                doc.text(time, colX.time + padding, textY, { width: colWidth.time - (padding * 2) });
                doc.text(t.category.name, colX.category + padding, textY, { width: colWidth.category - (padding * 2) });
                doc.text(note, colX.note + padding, textY, { width: colWidth.note - (padding * 2) });

                doc.fillColor(color).text(`${typeSymbol}${amount}`, colX.amount + padding, textY);

                y += rowHeight;
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
