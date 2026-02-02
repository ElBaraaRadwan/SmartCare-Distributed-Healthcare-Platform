import { Global, Module } from '@nestjs/common';
import { EventEmitterService } from './event-emitter.service';
import { EventConsumerService } from './event-consumer.service';

@Global()
@Module({
  providers: [EventEmitterService, EventConsumerService],
  exports: [EventEmitterService, EventConsumerService],
})
export class EventsModule {}
