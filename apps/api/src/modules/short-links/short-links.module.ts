import { Global, Module } from '@nestjs/common';
import { ShortLinksController } from './short-links.controller.js';
import { ShortLinksService } from './short-links.service.js';

@Global()
@Module({
  controllers: [ShortLinksController],
  providers: [ShortLinksService],
  exports: [ShortLinksService],
})
export class ShortLinksModule {}
