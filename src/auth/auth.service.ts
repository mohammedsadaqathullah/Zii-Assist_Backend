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
            const tokens = await this.getTokens(user.id, user.email);
            await this.updateRefreshToken(user.id, tokens.refresh_token);
            return tokens;
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

        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRefreshToken(user.id, tokens.refresh_token);
        return tokens;
    }

    async logout(userId: number) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken: null },
        });
    }

    async refreshTokens(userId: number, rt: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.hashedRefreshToken)
            throw new UnauthorizedException('Access Denied');

        const rtMatches = await bcrypt.compare(rt, user.hashedRefreshToken);
        if (!rtMatches) throw new UnauthorizedException('Access Denied');

        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRefreshToken(user.id, tokens.refresh_token);
        return tokens;
    }

    async updateRefreshToken(userId: number, rt: string) {
        const hash = await bcrypt.hash(rt, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken: hash },
        });
    }

    async getTokens(userId: number, email: string) {
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email },
                { secret: process.env.JWT_SECRET || 'supersecretkey', expiresIn: '15m' },
            ),
            this.jwtService.signAsync(
                { sub: userId, email },
                { secret: process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey', expiresIn: '7d' },
            ),
        ]);

        return {
            access_token: at,
            refresh_token: rt,
        };
    }
}
