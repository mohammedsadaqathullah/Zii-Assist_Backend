import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
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
    ) {
        return this.reportsService.getDailyReport(userId, date);
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
}
