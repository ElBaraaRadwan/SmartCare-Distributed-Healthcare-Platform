import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<Omit<User, 'password'>> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const { password, ...user } = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const userWithPassword = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!userWithPassword) {
      return null;
    }

    // Destructure password out after ensuring user is not null
    const { password, ...userWithoutPassword } = userWithPassword;
    return userWithoutPassword;
  }
}
