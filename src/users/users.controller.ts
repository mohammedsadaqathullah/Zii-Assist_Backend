import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { User } from '@prisma/client';
import { GetUser } from '../auth/decorator';
import { UsersService } from './users.service';
import { EditUserDto } from './dto/edit-user.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Return current user profile.' })
    getMe(@GetUser() user: User) {
        return user;
    }

    @Patch('me')
    @ApiOperation({ summary: 'Edit current user profile' })
    @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
    editUser(@GetUser('id') userId: number, @Body() dto: EditUserDto) {
        return this.usersService.editUser(userId, dto);
    }
}
