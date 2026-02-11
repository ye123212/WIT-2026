import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUserExists(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });
  }

  async linkUsers(userId: string, linkedUserId: string) {
    if (userId === linkedUserId) {
      throw new BadRequestException('A user cannot be connected to themselves.');
    }

    await Promise.all([this.ensureUserExists(userId), this.ensureUserExists(linkedUserId)]);

    const pair = [
      { userId, linkedUserId },
      { userId: linkedUserId, linkedUserId: userId },
    ];

    await this.prisma.$transaction(
      pair.map((data) =>
        this.prisma.userConnection.upsert({
          where: { userId_linkedUserId: data },
          update: {},
          create: data,
        }),
      ),
    );

    return { success: true };
  }

  async getUserConnections(userId: string) {
    const connections = await this.prisma.userConnection.findMany({
      where: { userId },
      select: {
        linkedUserId: true,
      },
      orderBy: { linkedUserId: 'asc' },
    });

    return {
      userId,
      connections: connections.map((connection) => connection.linkedUserId),
    };
  }
}
