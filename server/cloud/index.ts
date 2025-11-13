import { randomUUID } from "crypto";
import { CloudUserDataEnvelope, CloudUserProfile } from "@shared/schema";
import { UserProfilesCloud } from "./userProfiles";
import { FavoritesCloud } from "./favorites";
import { HistoryCloud } from "./history";
import { SyncQueueCloud } from "./syncQueue";

export interface SessionToken {
  token: string;
  userId: string;
  expiresAt: number;
}

export class CloudStorage {
  public profiles: UserProfilesCloud;
  public favorites: FavoritesCloud;
  public history: HistoryCloud;
  public syncQueue: SyncQueueCloud;
  private sessions: Map<string, SessionToken> = new Map();
  private readonly SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.profiles = new UserProfilesCloud();
    this.favorites = new FavoritesCloud();
    this.history = new HistoryCloud();
    this.syncQueue = new SyncQueueCloud();
    
    this.startSessionCleanup();
  }

  async getUserEnvelope(userId: string): Promise<CloudUserDataEnvelope | null> {
    const profile = await this.profiles.get(userId);
    if (!profile) {
      return null;
    }

    const favorites = await this.favorites.getAllForUser(userId);
    const trips = await this.history.getAllForUser(userId);

    const envelope: CloudUserDataEnvelope = {
      userId,
      profile,
      favorites,
      trips,
      metadata: {
        lastSyncedAt: Date.now(),
        version: profile.version,
        updatedAt: profile.updatedAt,
      },
    };

    return envelope;
  }

  async saveUserEnvelope(envelope: CloudUserDataEnvelope): Promise<void> {
    await this.profiles.mergeVersion(envelope.profile);

    for (const favorite of envelope.favorites) {
      await this.favorites.mergeVersion(favorite);
    }

    for (const trip of envelope.trips) {
      await this.history.mergeVersion(trip);
    }

    console.log('[CloudStorage] Saved envelope for user:', envelope.userId);
  }

  createSession(userId: string): SessionToken {
    const token = randomUUID();
    const session: SessionToken = {
      token,
      userId,
      expiresAt: Date.now() + this.SESSION_DURATION_MS,
    };

    this.sessions.set(token, session);
    console.log('[CloudStorage] Created session for user:', userId);
    
    return session;
  }

  validateSession(token: string): string | null {
    const session = this.sessions.get(token);
    
    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      this.sessions.delete(token);
      console.log('[CloudStorage] Session expired:', token);
      return null;
    }

    return session.userId;
  }

  revokeSession(token: string): void {
    this.sessions.delete(token);
    console.log('[CloudStorage] Revoked session:', token);
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];

      for (const [token, session] of Array.from(this.sessions.entries())) {
        if (session.expiresAt < now) {
          expired.push(token);
        }
      }

      expired.forEach(token => this.sessions.delete(token));

      if (expired.length > 0) {
        console.log('[CloudStorage] Cleaned up', expired.length, 'expired sessions');
      }
    }, 60 * 60 * 1000); // Every hour
  }

  async cleanupOldData(userId: string): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    await this.favorites.cleanupDeleted(userId, thirtyDaysAgo);
    await this.history.cleanupDeleted(userId, thirtyDaysAgo);
    await this.syncQueue.cleanupCompleted(userId, thirtyDaysAgo);
    
    console.log('[CloudStorage] Cleaned up old data for user:', userId);
  }
}

export const cloudStorage = new CloudStorage();
