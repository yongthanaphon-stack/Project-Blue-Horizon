import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private readonly socketsByUserId = new Map<number, Set<string>>();

  connect(userId: number, socketId: string) {
    const socketIds = this.socketsByUserId.get(userId) || new Set<string>();
    socketIds.add(socketId);
    this.socketsByUserId.set(userId, socketIds);
  }

  disconnect(userId: number, socketId: string) {
    const socketIds = this.socketsByUserId.get(userId);
    if (!socketIds) return;

    socketIds.delete(socketId);
    if (socketIds.size === 0) {
      this.socketsByUserId.delete(userId);
    }
  }

  isOnline(userId: number) {
    return this.socketsByUserId.has(userId);
  }

  getOnlineUserIds() {
    return Array.from(this.socketsByUserId.keys());
  }
}
