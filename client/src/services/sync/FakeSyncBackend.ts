import { get, set, del } from 'idb-keyval';
import type { UserDataEnvelope } from '../data/userDataModels';
import type { ISyncBackend } from './ISyncBackend';

const CLOUD_NAMESPACE = 'cloud-sync';
const CANONICAL_USER_KEY = `${CLOUD_NAMESPACE}:canonical-user`;

function getCloudKey(userId: string): string {
  return `${CLOUD_NAMESPACE}:${userId}`;
}

export class FakeSyncBackend implements ISyncBackend {
  async getCanonicalUserId(): Promise<string | null> {
    try {
      const canonicalUserId = await get<string>(CANONICAL_USER_KEY);
      return canonicalUserId || null;
    } catch (error) {
      console.error('[FakeSyncBackend] Failed to get canonical user ID:', error);
      return null;
    }
  }

  async setCanonicalUserId(userId: string): Promise<void> {
    try {
      await set(CANONICAL_USER_KEY, userId);
      console.log('[FakeSyncBackend] Set canonical user ID:', userId);
    } catch (error) {
      console.error('[FakeSyncBackend] Failed to set canonical user ID:', error);
    }
  }

  async deleteStaleRecord(userId: string): Promise<void> {
    try {
      const key = getCloudKey(userId);
      await del(key);
      console.log('[FakeSyncBackend] Deleted stale record:', userId);
    } catch (error) {
      console.error('[FakeSyncBackend] Failed to delete stale record:', error);
    }
  }

  async loadUserData(userId: string): Promise<UserDataEnvelope | null> {
    try {
      const key = getCloudKey(userId);
      const data = await get<UserDataEnvelope>(key);
      
      if (data) {
        console.log('[FakeSyncBackend] Loaded cloud data for user:', userId);
      }
      
      return data || null;
    } catch (error) {
      console.error('[FakeSyncBackend] Failed to load cloud data:', error);
      throw error;
    }
  }

  async saveUserData(userId: string, data: UserDataEnvelope): Promise<void> {
    try {
      const key = getCloudKey(userId);
      data.metadata.lastSyncedAt = Date.now();
      
      await set(key, data);
      
      console.log('[FakeSyncBackend] Saved cloud data for user:', userId);
    } catch (error) {
      console.error('[FakeSyncBackend] Failed to save cloud data:', error);
      throw error;
    }
  }

  async clearUserData(userId: string): Promise<void> {
    try {
      const key = getCloudKey(userId);
      await del(key);
      
      const canonicalUserId = await this.getCanonicalUserId();
      if (canonicalUserId === userId) {
        await del(CANONICAL_USER_KEY);
        console.log('[FakeSyncBackend] Cleared canonical user ID');
      }
      
      console.log('[FakeSyncBackend] Cleared cloud data for user:', userId);
    } catch (error) {
      console.error('[FakeSyncBackend] Failed to clear cloud data:', error);
      throw error;
    }
  }
}
