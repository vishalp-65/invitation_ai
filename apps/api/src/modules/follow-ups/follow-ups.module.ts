import { Module } from '@nestjs/common';
import { GuestsModule } from '../guests/guests.module.js';
import { FollowUpsService } from './follow-ups.service.js';

@Module({
  imports: [GuestsModule],
  providers: [FollowUpsService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
