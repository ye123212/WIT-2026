import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LinkUsersDto } from './dto/link-users.dto';
import { UserConnectionsService } from './user-connections.service';

@Controller('user-connections')
export class UserConnectionsController {
  constructor(private readonly userConnectionsService: UserConnectionsService) {}

  @Post('link')
  linkUsers(@Body() dto: LinkUsersDto) {
    return this.userConnectionsService.linkUsers(dto.userId, dto.linkedUserId);
  }

  @Get(':userId')
  getUserConnections(@Param('userId') userId: string) {
    return this.userConnectionsService.getUserConnections(userId);
  }
}
