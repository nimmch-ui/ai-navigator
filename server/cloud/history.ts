import { CloudTripRecord } from "@shared/schema";

export class HistoryCloud {
  private trips: Map<string, CloudTripRecord> = new Map();

  async getAllForUser(userId: string, limit: number = 100): Promise<CloudTripRecord[]> {
    const userTrips = Array.from(this.trips.values())
      .filter(trip => trip.userId === userId && !trip.deletedAt);
    
    return userTrips
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async get(id: string): Promise<CloudTripRecord | null> {
    const trip = this.trips.get(id);
    if (trip && !trip.deletedAt) {
      return trip;
    }
    return null;
  }

  async create(trip: CloudTripRecord): Promise<CloudTripRecord> {
    this.trips.set(trip.id, trip);
    console.log('[HistoryCloud] Created trip:', trip.id);
    return trip;
  }

  async update(id: string, updates: Partial<CloudTripRecord>): Promise<CloudTripRecord | null> {
    const existing = this.trips.get(id);
    if (!existing || existing.deletedAt) {
      return null;
    }

    const updated: CloudTripRecord = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
      version: existing.version + 1,
    };

    this.trips.set(id, updated);
    console.log('[HistoryCloud] Updated trip:', id);
    return updated;
  }

  async softDelete(id: string): Promise<CloudTripRecord | null> {
    const existing = this.trips.get(id);
    if (!existing) {
      return null;
    }

    const deleted: CloudTripRecord = {
      ...existing,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      version: existing.version + 1,
    };

    this.trips.set(id, deleted);
    console.log('[HistoryCloud] Soft-deleted trip:', id);
    return deleted;
  }

  async mergeVersion(trip: CloudTripRecord): Promise<CloudTripRecord> {
    const existing = this.trips.get(trip.id);

    if (!existing || trip.version > existing.version) {
      this.trips.set(trip.id, trip);
      console.log('[HistoryCloud] Merged trip (version', trip.version, '):', trip.id);
      return trip;
    }

    console.log('[HistoryCloud] Kept existing trip (version', existing.version, 'vs', trip.version, ')');
    return existing;
  }

  async cleanupDeleted(userId: string, olderThan: number): Promise<number> {
    const toDelete: string[] = [];
    
    for (const [id, trip] of Array.from(this.trips.entries())) {
      if (trip.userId === userId && 
          trip.deletedAt && 
          trip.deletedAt < olderThan) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => this.trips.delete(id));
    
    if (toDelete.length > 0) {
      console.log('[HistoryCloud] Cleaned up', toDelete.length, 'deleted trips for user:', userId);
    }
    
    return toDelete.length;
  }

  async getStats(userId: string): Promise<{
    totalTrips: number;
    totalDistanceKm: number;
    totalDurationSec: number;
    avgEcoScore: number;
  }> {
    const userTrips = Array.from(this.trips.values())
      .filter(trip => trip.userId === userId && !trip.deletedAt);

    const totalDistanceKm = userTrips.reduce((sum, trip) => sum + trip.distanceKm, 0);
    const totalDurationSec = userTrips.reduce((sum, trip) => sum + trip.durationSec, 0);
    
    const tripsWithEcoScore = userTrips.filter(trip => trip.ecoScore !== undefined);
    const avgEcoScore = tripsWithEcoScore.length > 0
      ? tripsWithEcoScore.reduce((sum, trip) => sum + (trip.ecoScore || 0), 0) / tripsWithEcoScore.length
      : 0;

    return {
      totalTrips: userTrips.length,
      totalDistanceKm,
      totalDurationSec,
      avgEcoScore,
    };
  }
}
