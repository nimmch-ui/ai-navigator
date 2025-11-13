import type { UserDataEnvelope } from '../data/userDataModels';

export interface ISyncBackend {
  loadUserData(userId: string): Promise<UserDataEnvelope | null>;
  
  saveUserData(userId: string, data: UserDataEnvelope): Promise<void>;
  
  clearUserData(userId: string): Promise<void>;
}

export interface SyncResult {
  success: boolean;
  canonicalUserId?: string;
  conflicts?: number;
  recordsPushed?: number;
  recordsPulled?: number;
  error?: string;
}
