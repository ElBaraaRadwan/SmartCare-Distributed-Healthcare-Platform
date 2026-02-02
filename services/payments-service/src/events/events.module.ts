import { Global, Module } from '@nestjs/common';
import { EventEmitterService } from './event-emitter.service';
import { EventConsumerService } from './event-consumer.service';
import { PaymentsModule } from '../payments/payments.module';

@Global()
@Module({
  imports: [PaymentsModule],
  providers: [EventEmitterService, EventConsumerService],
  exports: [EventEmitterService, EventConsumerService],
})
export class EventsModule {}
