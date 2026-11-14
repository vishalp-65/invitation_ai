import { Module } from '@nestjs/common';
import { UserTemplatesController } from './user-templates.controller.js';
import { UserTemplatesService } from './user-templates.service.js';

@Module({
  controllers: [UserTemplatesController],
  providers: [UserTemplatesService],
})
export class UserTemplatesModule {}
