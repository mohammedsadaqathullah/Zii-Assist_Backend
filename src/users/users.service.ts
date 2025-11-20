import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EditUserDto } from './dto/edit-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async editUser(userId: number, dto: EditUserDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        // If updating password, validate old password
        if (dto.password) {
            if (!dto.oldPassword) {
                throw new BadRequestException('Old password is required to set a new password');
            }

            const pwMatches = await bcrypt.compare(dto.oldPassword, user.password);
            if (!pwMatches) {
                throw new BadRequestException('Invalid old password');
            }

            const hash = await bcrypt.hash(dto.password, 10);
            user.password = hash;
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                email: dto.email,
                name: dto.name,
                password: user.password,
            },
        });

        const { password: _, hashedRefreshToken: __, ...result } = updatedUser;
        return result;
    }
}
