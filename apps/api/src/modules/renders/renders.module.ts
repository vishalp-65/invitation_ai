import { Global, Module } from '@nestjs/common';
import { RendersController } from './renders.controller.js';
import { RendersService } from './renders.service.js';

@Global()
@Module({
  controllers: [RendersController],
  providers: [RendersService],
  exports: [RendersService],
})
export class RendersModule {}
