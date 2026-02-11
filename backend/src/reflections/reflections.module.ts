import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReflectionsController } from './reflections.controller';
import { ReflectionsService } from './reflections.service';

@Module({
  controllers: [ReflectionsController],
  providers: [ReflectionsService, PrismaService],
})
export class ReflectionsModule {}
