import { Module } from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminController, AdminGuard } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminAnalyticsService, AdminGuard],
})
export class AdminModule {}
