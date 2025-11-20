import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { GetUser } from '../auth/decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
    @Get('me')
    getMe(@GetUser() user: User) {
        return user;
    }
}
