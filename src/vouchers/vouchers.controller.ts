import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto, EditVoucherDto } from './dto/voucher.dto';
import { GetUser } from '../auth/decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Vouchers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('vouchers')
export class VouchersController {
    constructor(private vouchersService: VouchersService) { }

    @ApiOperation({ summary: 'Get all vouchers for the current user' })
    @ApiResponse({ status: 200, description: 'Return all vouchers' })
    @Get()
    getVouchers(@GetUser('id') userId: number) {
        return this.vouchersService.getVouchers(userId);
    }

    @ApiOperation({ summary: 'Create a new voucher' })
    @ApiResponse({ status: 201, description: 'The voucher has been successfully created' })
    @Post()
    createVoucher(
        @GetUser('id') userId: number,
        @Body() dto: CreateVoucherDto,
    ) {
        return this.vouchersService.createVoucher(userId, dto);
    }

    @ApiOperation({ summary: 'Update a voucher' })
    @ApiResponse({ status: 200, description: 'The voucher has been successfully updated' })
    @Patch(':id')
    editVoucher(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) voucherId: number,
        @Body() dto: EditVoucherDto,
    ) {
        return this.vouchersService.editVoucher(userId, voucherId, dto);
    }

    @ApiOperation({ summary: 'Delete a voucher' })
    @ApiResponse({ status: 200, description: 'The voucher has been successfully deleted' })
    @Delete(':id')
    deleteVoucher(
        @GetUser('id') userId: number,
        @Param('id', ParseIntPipe) voucherId: number,
    ) {
        return this.vouchersService.deleteVoucher(userId, voucherId);
    }
}
