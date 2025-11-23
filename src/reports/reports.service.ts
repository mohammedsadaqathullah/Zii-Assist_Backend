import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDailyReport(userId: number, date: string, timezone?: number) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Apply timezone offset if provided (minutes offset from UTC)
        if (timezone !== undefined) {
            startDate.setMinutes(startDate.getMinutes() + timezone);
            endDate.setMinutes(endDate.getMinutes() + timezone);
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

    async generateReportPdf(
        userId: number,
        startDate: string,
        endDate: string,
        timezoneOffset: number = 0,
        type: 'transactions' | 'categories' = 'transactions'
    ): Promise<Buffer> {
        const report = await this.getCustomReport(userId, startDate, endDate);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const PDFDocument = require('pdfkit');

        // Sort transactions by Category Name ascending
        if (report.transactions) {
            report.transactions.sort((a: any, b: any) => a.category.name.localeCompare(b.category.name));
        }

        return new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 30 });
            const buffers: any[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Helper to format date with timezone adjustment
            const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                d.setMinutes(d.getMinutes() - timezoneOffset);
                return d.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            };

            // Helper to format time with timezone adjustment
            const formatTime = (dateStr: string) => {
                const d = new Date(dateStr);
                d.setMinutes(d.getMinutes() - timezoneOffset);
                return d.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            };

            // Header / Branding
            const primaryColor = '#2c3e50';
            const secondaryColor = '#7f8c8d';
            const accentColor = '#3498db';
            const tableHeaderColor = '#f4f6f7';
            const borderColor = '#ecf0f1';

            // Company Name
            doc.fontSize(24)
                .font('Helvetica-Bold')
                .fillColor(primaryColor)
                .text('UNIVERSAL BUILDING SOLUTION', { align: 'center' });

            doc.moveDown(0.5);

            // Report Title
            doc.fontSize(14)
                .font('Helvetica')
                .fillColor(secondaryColor)
                .text('FINANCIAL REPORT', { align: 'center', letterSpacing: 2 });

            doc.moveDown(1);

            // Divider Line
            doc.moveTo(30, doc.y)
                .lineTo(580, doc.y)
                .strokeColor(borderColor)
                .lineWidth(1)
                .stroke();

            doc.moveDown(1);

            // Report Details
            const leftColX = 30;
            const rightColX = 400;
            const startY = doc.y;

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(primaryColor)
                .text('Report Period:', leftColX, startY);

            doc.font('Helvetica')
                .fillColor(secondaryColor)
                .text(`${formatDate(startDate)} - ${formatDate(endDate)}`, leftColX + 80, startY);

            doc.font('Helvetica-Bold')
                .fillColor(primaryColor)
                .text('Generated By:', rightColX, startY);

            doc.font('Helvetica')
                .fillColor(secondaryColor)
                .text(user?.name || user?.email || 'User', rightColX + 80, startY);

            doc.moveDown(2);

            let tableTop = doc.y + 10;
            const padding = 8;

            if (type === 'transactions') {
                // Table Configuration for Transactions
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

                // Draw Header
                const drawHeader = (y: number) => {
                    // Header Background
                    doc.rect(30, y, 550, 30).fill(tableHeaderColor);

                    // Header Text
                    doc.fontSize(9)
                        .font('Helvetica-Bold')
                        .fillColor(primaryColor);

                    doc.text('S.NO', colX.sno + padding, y + 10);
                    doc.text('DATE', colX.date + padding, y + 10);
                    doc.text('TIME', colX.time + padding, y + 10);
                    doc.text('CATEGORY', colX.category + padding, y + 10);
                    doc.text('NOTES', colX.note + padding, y + 10);
                    doc.text('AMOUNT', colX.amount + padding, y + 10);

                    // Header Border
                    doc.rect(30, y, 550, 30).strokeColor(borderColor).stroke();
                };

                drawHeader(tableTop);
                let y = tableTop + 30;
                doc.font('Helvetica').fontSize(9);

                report.transactions.forEach((t: any, index: number) => {
                    const date = formatDate(t.date);
                    const time = formatTime(t.date);
                    const amount = `$${t.amount.toFixed(2)}`;
                    const typeSymbol = t.type === 'INCOME' ? '+' : '-';
                    const color = t.type === 'INCOME' ? '#27ae60' : '#c0392b';
                    const note = t.note || '-';

                    const noteHeight = doc.heightOfString(note, { width: colWidth.note - (padding * 2) });
                    const rowHeight = Math.max(noteHeight + 16, 35);

                    if (y + rowHeight > 700) {
                        doc.addPage();
                        y = 50;
                        drawHeader(y);
                        y += 30;
                        doc.font('Helvetica').fontSize(9);
                    }

                    // Zebra Striping (Optional - kept clean white for now)
                    // if (index % 2 === 1) doc.rect(30, y, 550, rowHeight).fill('#fafafa');

                    // Row Border (Bottom only for cleaner look)
                    doc.moveTo(30, y + rowHeight)
                        .lineTo(580, y + rowHeight)
                        .strokeColor(borderColor)
                        .stroke();

                    // Vertical Lines
                    doc.moveTo(30, y).lineTo(30, y + rowHeight).stroke();
                    doc.moveTo(580, y).lineTo(580, y + rowHeight).stroke();

                    // Column Dividers
                    Object.values(colX).forEach(x => {
                        if (x !== 30) doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
                    });

                    const textY = y + 10;
                    doc.fillColor(secondaryColor).text((index + 1).toString(), colX.sno + padding, textY);
                    doc.text(date, colX.date + padding, textY, { width: colWidth.date - (padding * 2) });
                    doc.text(time, colX.time + padding, textY, { width: colWidth.time - (padding * 2) });
                    doc.fillColor(primaryColor).text(t.category.name, colX.category + padding, textY, { width: colWidth.category - (padding * 2) });
                    doc.fillColor(secondaryColor).text(note, colX.note + padding, textY, { width: colWidth.note - (padding * 2) });
                    doc.font('Helvetica-Bold').fillColor(color).text(`${typeSymbol}${amount}`, colX.amount + padding, textY);
                    doc.font('Helvetica'); // Reset font

                    y += rowHeight;
                });

                // Closing line for table
                doc.moveTo(30, y).lineTo(580, y).strokeColor(borderColor).stroke();

            } else {
                // Table Configuration for Categories
                const colX = {
                    sno: 30,
                    category: 80,
                    type: 230,
                    count: 330,
                    amount: 430
                };

                // Draw Header
                const drawHeader = (y: number) => {
                    doc.rect(30, y, 550, 30).fill(tableHeaderColor);

                    doc.fontSize(9)
                        .font('Helvetica-Bold')
                        .fillColor(primaryColor);

                    doc.text('S.NO', colX.sno + padding, y + 10);
                    doc.text('CATEGORY NAME', colX.category + padding, y + 10);
                    doc.text('TYPE', colX.type + padding, y + 10);
                    doc.text('TRANSACTIONS', colX.count + padding, y + 10);
                    doc.text('TOTAL AMOUNT', colX.amount + padding, y + 10);

                    doc.rect(30, y, 550, 30).strokeColor(borderColor).stroke();
                };

                drawHeader(tableTop);
                let y = tableTop + 30;
                doc.font('Helvetica').fontSize(9);

                const categories = Object.entries(report.categoryBreakdown).map(([name, data]: [string, any]) => ({
                    name,
                    ...data
                })).sort((a: any, b: any) => a.name.localeCompare(b.name));

                categories.forEach((cat: any, index: number) => {
                    const amount = `$${cat.total.toFixed(2)}`;
                    const color = cat.type === 'INCOME' ? '#27ae60' : '#c0392b';
                    const rowHeight = 35;

                    if (y + rowHeight > 700) {
                        doc.addPage();
                        y = 50;
                        drawHeader(y);
                        y += 30;
                        doc.font('Helvetica').fontSize(9);
                    }

                    // Row Border
                    doc.moveTo(30, y + rowHeight)
                        .lineTo(580, y + rowHeight)
                        .strokeColor(borderColor)
                        .stroke();

                    // Vertical borders
                    doc.moveTo(30, y).lineTo(30, y + rowHeight).stroke();
                    doc.moveTo(580, y).lineTo(580, y + rowHeight).stroke();

                    // Column Dividers
                    Object.values(colX).forEach(x => {
                        if (x !== 30) doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
                    });

                    const textY = y + 10;
                    doc.fillColor(secondaryColor).text((index + 1).toString(), colX.sno + padding, textY);
                    doc.fillColor(primaryColor).text(cat.name, colX.category + padding, textY);

                    const typeColor = cat.type === 'INCOME' ? '#27ae60' : '#c0392b';
                    const typeLabel = cat.type === 'INCOME' ? 'Income' : 'Expense';

                    // Type Badge
                    // doc.roundedRect(colX.type + padding, textY - 2, 60, 14, 7).fill(typeColor + '20'); // Light background
                    doc.fillColor(typeColor).text(typeLabel, colX.type + padding, textY);

                    doc.fillColor(secondaryColor).text(cat.count.toString(), colX.count + padding, textY);
                    doc.font('Helvetica-Bold').fillColor(color).text(amount, colX.amount + padding, textY);
                    doc.font('Helvetica');

                    y += rowHeight;
                });

                // Closing line
                doc.moveTo(30, y).lineTo(580, y).strokeColor(borderColor).stroke();
            }

            // Summary Box (Moved to Bottom)
            if (doc.y + 120 > 750) {
                doc.addPage();
                doc.y = 50;
            } else {
                doc.moveDown(3);
            }

            const summaryTop = doc.y;
            const summaryHeight = 80;

            // Summary Background
            doc.roundedRect(30, summaryTop, 550, summaryHeight, 4)
                .fill('#f8f9fa')
                .strokeColor(borderColor)
                .stroke();

            const summaryColWidth = 550 / 3;

            // Helper for summary items
            const drawSummaryItem = (label: string, value: string, color: string, x: number) => {
                const centerX = x + (summaryColWidth / 2);
                doc.fontSize(10)
                    .font('Helvetica')
                    .fillColor(secondaryColor)
                    .text(label, x, summaryTop + 20, { width: summaryColWidth, align: 'center' });

                doc.fontSize(18)
                    .font('Helvetica-Bold')
                    .fillColor(color)
                    .text(value, x, summaryTop + 40, { width: summaryColWidth, align: 'center' });
            };

            // Total Income
            drawSummaryItem('TOTAL INCOME', `$${report.totalIncome.toFixed(2)}`, '#27ae60', 30);

            // Vertical Divider 1
            doc.moveTo(30 + summaryColWidth, summaryTop + 15)
                .lineTo(30 + summaryColWidth, summaryTop + summaryHeight - 15)
                .strokeColor('#e0e0e0')
                .stroke();

            // Total Expense
            drawSummaryItem('TOTAL EXPENSE', `$${report.totalExpense.toFixed(2)}`, '#c0392b', 30 + summaryColWidth);

            // Vertical Divider 2
            doc.moveTo(30 + (summaryColWidth * 2), summaryTop + 15)
                .lineTo(30 + (summaryColWidth * 2), summaryTop + summaryHeight - 15)
                .strokeColor('#e0e0e0')
                .stroke();

            // Net Balance
            const balanceColor = report.balance >= 0 ? '#27ae60' : '#c0392b';
            drawSummaryItem('NET BALANCE', `$${report.balance.toFixed(2)}`, balanceColor, 30 + (summaryColWidth * 2));

            // Footer
            const bottomY = 750;
            doc.fontSize(8)
                .font('Helvetica')
                .fillColor('#95a5a6')
                .text('Generated by Zii Assist', 30, bottomY, { align: 'left' })
                .text(new Date().toLocaleString(), 30, bottomY, { align: 'right' });

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
