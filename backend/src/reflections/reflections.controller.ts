import { Body, Controller, Post } from '@nestjs/common';
import { CreateMeetReflectionDto } from './dto/create-meet-reflection.dto';
import { ReflectionsService } from './reflections.service';

@Controller('meet_reflections')
export class ReflectionsController {
  constructor(private readonly reflectionsService: ReflectionsService) {}

  @Post()
  create(@Body() dto: CreateMeetReflectionDto) {
    return this.reflectionsService.createReflection(dto);
  }
}
