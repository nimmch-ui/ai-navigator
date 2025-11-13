import { CloudFavoritePlace } from "@shared/schema";

export class FavoritesCloud {
  private favorites: Map<string, CloudFavoritePlace> = new Map();

  async getAllForUser(userId: string): Promise<CloudFavoritePlace[]> {
    const userFavorites = Array.from(this.favorites.values())
      .filter(fav => fav.userId === userId && !fav.deletedAt);
    
    return userFavorites.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  async get(id: string): Promise<CloudFavoritePlace | null> {
    const favorite = this.favorites.get(id);
    if (favorite && !favorite.deletedAt) {
      return favorite;
    }
    return null;
  }

  async create(favorite: CloudFavoritePlace): Promise<CloudFavoritePlace> {
    this.favorites.set(favorite.id, favorite);
    console.log('[FavoritesCloud] Created favorite:', favorite.id);
    return favorite;
  }

  async update(id: string, updates: Partial<CloudFavoritePlace>): Promise<CloudFavoritePlace | null> {
    const existing = this.favorites.get(id);
    if (!existing || existing.deletedAt) {
      return null;
    }

    const updated: CloudFavoritePlace = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
      version: existing.version + 1,
    };

    this.favorites.set(id, updated);
    console.log('[FavoritesCloud] Updated favorite:', id);
    return updated;
  }

  async softDelete(id: string): Promise<CloudFavoritePlace | null> {
    const existing = this.favorites.get(id);
    if (!existing) {
      return null;
    }

    const deleted: CloudFavoritePlace = {
      ...existing,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      version: existing.version + 1,
    };

    this.favorites.set(id, deleted);
    console.log('[FavoritesCloud] Soft-deleted favorite:', id);
    return deleted;
  }

  async mergeVersion(favorite: CloudFavoritePlace): Promise<CloudFavoritePlace> {
    const existing = this.favorites.get(favorite.id);

    if (!existing || favorite.version > existing.version) {
      this.favorites.set(favorite.id, favorite);
      console.log('[FavoritesCloud] Merged favorite (version', favorite.version, '):', favorite.id);
      return favorite;
    }

    console.log('[FavoritesCloud] Kept existing favorite (version', existing.version, 'vs', favorite.version, ')');
    return existing;
  }

  async cleanupDeleted(userId: string, olderThan: number): Promise<number> {
    const toDelete: string[] = [];
    
    for (const [id, favorite] of Array.from(this.favorites.entries())) {
      if (favorite.userId === userId && 
          favorite.deletedAt && 
          favorite.deletedAt < olderThan) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => this.favorites.delete(id));
    
    if (toDelete.length > 0) {
      console.log('[FavoritesCloud] Cleaned up', toDelete.length, 'deleted favorites for user:', userId);
    }
    
    return toDelete.length;
  }
}
