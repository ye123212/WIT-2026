import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserConnectionsController } from './user-connections.controller';
import { UserConnectionsService } from './user-connections.service';

@Module({
  controllers: [UserConnectionsController],
  providers: [UserConnectionsService, PrismaService],
})
export class UserConnectionsModule {}
