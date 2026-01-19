import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigService
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { JwtModule } from '@nestjs/jwt'; // Import JwtModule
import { PassportModule } from '@nestjs/passport'; // Import PassportModule

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventsModule,
    AppointmentsModule,
    PassportModule.register({ session: false }), // Register Passport module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
