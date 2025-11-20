import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        console.log('Register: Starting registration for', dto.email);
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        console.log('Register: Password hashed');
        try {
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    password: hashedPassword,
                    name: dto.name,
                },
            });
            console.log('Register: User created in DB', user.id);
            return this.signToken(user.id, user.email);
        } catch (error) {
            console.error('Register: Error creating user', error);
            throw error;
        }
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) throw new UnauthorizedException('Credentials incorrect');

        const pwMatches = await bcrypt.compare(dto.password, user.password);
        if (!pwMatches) throw new UnauthorizedException('Credentials incorrect');

        return this.signToken(user.id, user.email);
    }

    async signToken(userId: number, email: string) {
        const payload = { sub: userId, email };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }
}
