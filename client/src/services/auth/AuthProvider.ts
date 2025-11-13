import { syncService } from '../sync/SyncService';
import { EventBus } from '../eventBus';
import type { AuthLoginResponse } from '@shared/schema';

export type AuthMethod = 'email' | 'google' | 'apple' | 'github';

export interface AuthSession {
  userId: string;
  username: string;
  method: AuthMethod;
  sessionToken: string;
  expiresAt: number;
}

interface StoredSession extends AuthLoginResponse {
  method: AuthMethod;
}

export interface AuthState {
  isAuthenticated: boolean;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
}

class AuthProvider {
  private state: AuthState = {
    isAuthenticated: false,
    session: null,
    isLoading: false,
    error: null,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      const restored = await this.refresh();
      
      if (restored) {
        console.log('[AuthProvider] Session restored successfully');
        EventBus.emit('auth:session_restored', { userId: this.state.session!.userId });
      }
    } catch (error) {
      console.error('[AuthProvider] Initialization failed:', error);
    } finally {
      this.setState({ isLoading: false });
    }
  }


  async login(email: string, password: string): Promise<AuthLoginResponse> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await syncService.loginCloud(email, password);
      
      const session: AuthSession = {
        userId: response.userId,
        username: response.username,
        method: 'email',
        sessionToken: response.sessionToken,
        expiresAt: response.expiresAt,
      };

      this.setState({
        isAuthenticated: true,
        session,
        isLoading: false,
        error: null,
      });

      const storedSession: StoredSession = { ...response, method: 'email' };
      localStorage.setItem('cloudSync_session', JSON.stringify(storedSession));

      EventBus.emit('auth:login', { userId: response.userId, method: 'email' });
      
      this.triggerDevicePairing();

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.setState({
        isLoading: false,
        error: errorMessage,
      });
      
      EventBus.emit('auth:login_failed', { error: errorMessage });
      throw error;
    }
  }

  async loginWithGoogle(): Promise<AuthLoginResponse> {
    this.setState({ isLoading: true, error: null });

    try {
      console.log('[AuthProvider] Google OAuth not yet implemented - using demo mode');
      
      const demoEmail = `google_${Date.now()}@demo.com`;
      const demoPassword = crypto.randomUUID();
      
      const response = await syncService.loginCloud(demoEmail, demoPassword);
      
      const session: AuthSession = {
        userId: response.userId,
        username: response.username,
        method: 'google',
        sessionToken: response.sessionToken,
        expiresAt: response.expiresAt,
      };

      this.setState({
        isAuthenticated: true,
        session,
        isLoading: false,
        error: null,
      });

      const storedSession: StoredSession = { ...response, method: 'google' };
      localStorage.setItem('cloudSync_session', JSON.stringify(storedSession));

      EventBus.emit('auth:login', { userId: response.userId, method: 'google' });
      
      this.triggerDevicePairing();

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google login failed';
      this.setState({
        isLoading: false,
        error: errorMessage,
      });
      
      EventBus.emit('auth:login_failed', { error: errorMessage });
      throw error;
    }
  }

  async loginWithApple(): Promise<AuthLoginResponse> {
    this.setState({ isLoading: true, error: null });

    try {
      console.log('[AuthProvider] Apple Sign In not yet implemented - using demo mode');
      
      const demoEmail = `apple_${Date.now()}@demo.com`;
      const demoPassword = crypto.randomUUID();
      
      const response = await syncService.loginCloud(demoEmail, demoPassword);
      
      const session: AuthSession = {
        userId: response.userId,
        username: response.username,
        method: 'apple',
        sessionToken: response.sessionToken,
        expiresAt: response.expiresAt,
      };

      this.setState({
        isAuthenticated: true,
        session,
        isLoading: false,
        error: null,
      });

      const storedSession: StoredSession = { ...response, method: 'apple' };
      localStorage.setItem('cloudSync_session', JSON.stringify(storedSession));

      EventBus.emit('auth:login', { userId: response.userId, method: 'apple' });
      
      this.triggerDevicePairing();

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Apple login failed';
      this.setState({
        isLoading: false,
        error: errorMessage,
      });
      
      EventBus.emit('auth:login_failed', { error: errorMessage });
      throw error;
    }
  }

  async refresh(): Promise<boolean> {
    const stored = localStorage.getItem('cloudSync_session');
    
    if (!stored) {
      return false;
    }

    try {
      const savedSession = JSON.parse(stored) as StoredSession;
      
      if (savedSession.expiresAt < Date.now()) {
        localStorage.removeItem('cloudSync_session');
        return false;
      }

      syncService.restoreCloudSession();
      
      const isValid = await syncService.isCloudEnabled();
      
      if (!isValid) {
        localStorage.removeItem('cloudSync_session');
        return false;
      }

      const session: AuthSession = {
        userId: savedSession.userId,
        username: savedSession.username,
        method: savedSession.method || 'email',
        sessionToken: savedSession.sessionToken,
        expiresAt: savedSession.expiresAt,
      };

      this.setState({
        isAuthenticated: true,
        session,
      });

      return true;
    } catch (error) {
      console.error('[AuthProvider] Session refresh failed:', error);
      localStorage.removeItem('cloudSync_session');
      return false;
    }
  }

  logout(): void {
    syncService.logoutCloud();
    
    const userId = this.state.session?.userId;
    
    localStorage.removeItem('cloudSync_session');
    
    this.setState({
      isAuthenticated: false,
      session: null,
      error: null,
    });

    if (userId) {
      EventBus.emit('auth:logout', { userId });
    }
    
    console.log('[AuthProvider] Logged out successfully');
  }

  private async triggerDevicePairing(): Promise<void> {
    if (!this.state.session) {
      return;
    }

    console.log('[AuthProvider] Triggering device pairing - sync all');
    
    try {
      syncService.setSyncEnabled(true);
      
      const result = await syncService.syncAll(this.state.session.userId);
      
      if (result.success) {
        console.log('[AuthProvider] Device paired successfully:', {
          canonicalUserId: result.canonicalUserId,
          recordsPushed: result.recordsPushed,
          recordsPulled: result.recordsPulled,
        });
        
        EventBus.emit('sync:device_paired', {
          userId: this.state.session.userId,
          recordsPushed: result.recordsPushed || 0,
          recordsPulled: result.recordsPulled || 0,
        });
      } else {
        console.warn('[AuthProvider] Device pairing failed:', result.error);
      }
    } catch (error) {
      console.error('[AuthProvider] Device pairing error:', error);
    }
  }

  getState(): AuthState {
    return { ...this.state };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.getState()));
  }

  getCurrentUser(): AuthSession | null {
    return this.state.session;
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  getError(): string | null {
    return this.state.error;
  }

  isLoading(): boolean {
    return this.state.isLoading;
  }
}

export const authProvider = new AuthProvider();
