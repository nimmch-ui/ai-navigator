import { CloudUserProfile } from "@shared/schema";

export class UserProfilesCloud {
  private profiles: Map<string, CloudUserProfile> = new Map();

  async get(userId: string): Promise<CloudUserProfile | null> {
    const profile = this.profiles.get(userId);
    return profile || null;
  }

  async create(profile: CloudUserProfile): Promise<CloudUserProfile> {
    this.profiles.set(profile.userId, profile);
    console.log('[UserProfilesCloud] Created profile:', profile.userId);
    return profile;
  }

  async update(userId: string, updates: Partial<CloudUserProfile>): Promise<CloudUserProfile | null> {
    const existing = this.profiles.get(userId);
    if (!existing) {
      return null;
    }

    const updated: CloudUserProfile = {
      ...existing,
      ...updates,
      userId,
      updatedAt: Date.now(),
      version: existing.version + 1,
    };

    this.profiles.set(userId, updated);
    console.log('[UserProfilesCloud] Updated profile:', userId);
    return updated;
  }

  async delete(userId: string): Promise<boolean> {
    const deleted = this.profiles.delete(userId);
    if (deleted) {
      console.log('[UserProfilesCloud] Deleted profile:', userId);
    }
    return deleted;
  }

  async mergeVersion(profile: CloudUserProfile): Promise<CloudUserProfile> {
    const existing = this.profiles.get(profile.userId);

    if (!existing) {
      this.profiles.set(profile.userId, profile);
      console.log('[UserProfilesCloud] Merged profile (new, version', profile.version, '):', profile.userId);
      return profile;
    }

    if (profile.version > existing.version || 
        (profile.version === existing.version && profile.updatedAt > existing.updatedAt)) {
      this.profiles.set(profile.userId, profile);
      console.log('[UserProfilesCloud] Merged profile (version', profile.version, 'updatedAt', profile.updatedAt, '):', profile.userId);
      return profile;
    }

    console.log('[UserProfilesCloud] Kept existing profile (version', existing.version, 'updatedAt', existing.updatedAt, ')');
    return existing;
  }
}
