import { Module } from '@nestjs/common';
import { PrintController } from './print.controller.js';
import { PrintService } from './print.service.js';

@Module({
  controllers: [PrintController],
  providers: [PrintService],
})
export class PrintModule {}
