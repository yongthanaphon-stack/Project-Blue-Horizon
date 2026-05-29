import { Injectable } from '@nestjs/common';

export type PresenceUser = {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar?: string | null;
};

export type SwotActivityMode = 'typing' | 'editing';

export type SwotActivity = {
  userId: number;
  name: string;
  email: string;
  avatar?: string | null;
  quadrant: string;
  mode: SwotActivityMode;
  itemIndex: number | null;
  updatedAt: number;
};

type RoomUser = {
  user: PresenceUser;
  socketIds: Set<string>;
};

type RoomPresence = Map<number, RoomUser>;

type SocketRooms = {
  workshopIds: Set<number>;
  swotScenarioIds: Set<number>;
};

@Injectable()
export class PresenceService {
  private readonly socketsByUserId = new Map<number, Set<string>>();
  private readonly workshopRooms = new Map<number, RoomPresence>();
  private readonly swotRooms = new Map<number, RoomPresence>();
  private readonly socketRooms = new Map<string, SocketRooms>();
  private readonly swotActivities = new Map<
    number,
    Map<number, SwotActivity>
  >();
  private readonly swotActivityTtlMs = 10000;

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

  joinWorkshop(workshopId: number, user: PresenceUser, socketId: string) {
    this.joinRoom(this.workshopRooms, workshopId, user, socketId);
    this.addSocketRoom(socketId, 'workshopIds', workshopId);
  }

  leaveWorkshop(workshopId: number, userId: number, socketId: string) {
    this.leaveRoom(this.workshopRooms, workshopId, userId, socketId);
    this.removeSocketRoom(socketId, 'workshopIds', workshopId);
  }

  getWorkshopUsers(workshopId: number) {
    return this.getRoomUsers(this.workshopRooms, workshopId);
  }

  joinSwotScenario(scenarioId: number, user: PresenceUser, socketId: string) {
    this.joinRoom(this.swotRooms, scenarioId, user, socketId);
    this.addSocketRoom(socketId, 'swotScenarioIds', scenarioId);
  }

  leaveSwotScenario(scenarioId: number, userId: number, socketId: string) {
    this.leaveRoom(this.swotRooms, scenarioId, userId, socketId);
    this.removeSocketRoom(socketId, 'swotScenarioIds', scenarioId);

    if (!this.isUserInSwotScenario(scenarioId, userId)) {
      this.clearSwotActivity(scenarioId, userId);
    }
  }

  getSwotUsers(scenarioId: number) {
    return this.getRoomUsers(this.swotRooms, scenarioId);
  }

  isUserInSwotScenario(scenarioId: number, userId: number) {
    return Boolean(this.swotRooms.get(scenarioId)?.has(userId));
  }

  setSwotActivity(scenarioId: number, activity: SwotActivity) {
    const activities =
      this.swotActivities.get(scenarioId) || new Map<number, SwotActivity>();
    activities.set(activity.userId, activity);
    this.swotActivities.set(scenarioId, activities);
  }

  clearSwotActivity(scenarioId: number, userId: number) {
    const activities = this.swotActivities.get(scenarioId);
    if (!activities) return;

    activities.delete(userId);
    if (activities.size === 0) {
      this.swotActivities.delete(scenarioId);
    }
  }

  getSwotActivities(scenarioId: number) {
    const activities = this.swotActivities.get(scenarioId);
    if (!activities) return [];

    const now = Date.now();
    const activeActivities = Array.from(activities.values()).filter(
      (activity) => now - activity.updatedAt <= this.swotActivityTtlMs,
    );

    if (activeActivities.length !== activities.size) {
      const nextActivities = new Map<number, SwotActivity>();
      activeActivities.forEach((activity) =>
        nextActivities.set(activity.userId, activity),
      );

      if (nextActivities.size) {
        this.swotActivities.set(scenarioId, nextActivities);
      } else {
        this.swotActivities.delete(scenarioId);
      }
    }

    return activeActivities;
  }

  leaveCollaborativeRooms(socketId: string, userId: number) {
    const rooms = this.socketRooms.get(socketId);
    const affected = {
      workshopIds: [] as number[],
      swotScenarioIds: [] as number[],
    };

    if (!rooms) return affected;

    Array.from(rooms.workshopIds).forEach((workshopId) => {
      this.leaveWorkshop(workshopId, userId, socketId);
      affected.workshopIds.push(workshopId);
    });

    Array.from(rooms.swotScenarioIds).forEach((scenarioId) => {
      this.leaveSwotScenario(scenarioId, userId, socketId);
      affected.swotScenarioIds.push(scenarioId);
    });

    this.socketRooms.delete(socketId);
    return affected;
  }

  private joinRoom(
    rooms: Map<number, RoomPresence>,
    roomId: number,
    user: PresenceUser,
    socketId: string,
  ) {
    const room = rooms.get(roomId) || new Map<number, RoomUser>();
    const roomUser = room.get(user.id) || {
      user,
      socketIds: new Set<string>(),
    };

    roomUser.user = user;
    roomUser.socketIds.add(socketId);
    room.set(user.id, roomUser);
    rooms.set(roomId, room);
  }

  private leaveRoom(
    rooms: Map<number, RoomPresence>,
    roomId: number,
    userId: number,
    socketId: string,
  ) {
    const room = rooms.get(roomId);
    if (!room) return;

    const roomUser = room.get(userId);
    if (!roomUser) return;

    roomUser.socketIds.delete(socketId);
    if (roomUser.socketIds.size === 0) {
      room.delete(userId);
    }

    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }

  private getRoomUsers(rooms: Map<number, RoomPresence>, roomId: number) {
    const room = rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.values()).map((roomUser) => roomUser.user);
  }

  private addSocketRoom(
    socketId: string,
    key: keyof SocketRooms,
    roomId: number,
  ) {
    const rooms = this.socketRooms.get(socketId) || {
      workshopIds: new Set<number>(),
      swotScenarioIds: new Set<number>(),
    };

    rooms[key].add(roomId);
    this.socketRooms.set(socketId, rooms);
  }

  private removeSocketRoom(
    socketId: string,
    key: keyof SocketRooms,
    roomId: number,
  ) {
    const rooms = this.socketRooms.get(socketId);
    if (!rooms) return;

    rooms[key].delete(roomId);
    if (rooms.workshopIds.size === 0 && rooms.swotScenarioIds.size === 0) {
      this.socketRooms.delete(socketId);
    }
  }
}
