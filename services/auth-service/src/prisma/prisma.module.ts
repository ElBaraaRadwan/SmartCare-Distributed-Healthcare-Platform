import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule

@Global()
@Module({
  imports: [ConfigModule], // Add ConfigModule to imports
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
