import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto, EditVoucherDto } from './dto/voucher.dto';

@Injectable()
export class VouchersService {
    constructor(private prisma: PrismaService) { }

    async getVouchers(userId: number) {
        return this.prisma.voucher.findMany({
            where: { userId },
        });
    }

    async createVoucher(userId: number, dto: CreateVoucherDto) {
        return this.prisma.voucher.create({
            data: {
                userId,
                ...dto,
            },
        });
    }

    async editVoucher(userId: number, voucherId: number, dto: EditVoucherDto) {
        const voucher = await this.prisma.voucher.findUnique({
            where: { id: voucherId },
        });

        if (!voucher || voucher.userId !== userId)
            throw new ForbiddenException('Access to resources denied');

        return this.prisma.voucher.update({
            where: { id: voucherId },
            data: { ...dto },
        });
    }

    async deleteVoucher(userId: number, voucherId: number) {
        const voucher = await this.prisma.voucher.findUnique({
            where: { id: voucherId },
        });

        if (!voucher || voucher.userId !== userId)
            throw new ForbiddenException('Access to resources denied');

        return this.prisma.voucher.delete({
            where: { id: voucherId },
        });
    }
}
