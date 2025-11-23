import { Controller, Get, Query, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { GetUser } from '../auth/decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
    constructor(private reportsService: ReportsService) { }

    @Get('daily')
    getDailyReport(
        @GetUser('id') userId: number,
        @Query('date') date: string,
        @Query('timezone') timezone?: string,
    ) {
        return this.reportsService.getDailyReport(userId, date, timezone ? parseInt(timezone) : undefined);
    }

    @Get('weekly')
    getWeeklyReport(
        @GetUser('id') userId: number,
        @Query('startDate') startDate: string,
    ) {
        return this.reportsService.getWeeklyReport(userId, startDate);
    }

    @Get('monthly')
    getMonthlyReport(
        @GetUser('id') userId: number,
        @Query('month', ParseIntPipe) month: number,
        @Query('year', ParseIntPipe) year: number,
    ) {
        return this.reportsService.getMonthlyReport(userId, month, year);
    }

    @Get('custom')
    getCustomReport(
        @GetUser('id') userId: number,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getCustomReport(userId, startDate, endDate);
    }

    @Get('pdf')
    async getReportPdf(
        @GetUser('id') userId: number,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,

        @Query('timezone') timezone: string,
        @Query('type') type: 'transactions' | 'categories' = 'transactions',
        @Res() res: Response,
    ) {
        const buffer = await this.reportsService.generateReportPdf(userId, startDate, endDate, timezone ? parseInt(timezone) : 0, type);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=report-${startDate}-${endDate}.pdf`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
}
