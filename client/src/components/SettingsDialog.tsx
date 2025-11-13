import { useState, useEffect } from 'react';
import { Settings, LogIn, LogOut, RefreshCw, User, Cloud } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { syncService } from '@/services/sync/SyncService';
import { authProvider } from '@/services/auth/AuthProvider';
import { Card } from '@/components/ui/card';

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [authState, setAuthState] = useState(authProvider.getState());
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(syncService.getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = authProvider.subscribe((state) => {
      setAuthState(state);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSyncTime(syncService.getLastSyncTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignIn = async (method: 'email' | 'google' | 'apple') => {
    if (method === 'email') {
      if (!email || !password) {
        toast({
          title: 'Missing credentials',
          description: 'Please enter both email and password',
          variant: 'destructive',
        });
        return;
      }

      setIsLoggingIn(true);
      try {
        await authProvider.login(email, password);
        setShowSignIn(false);
        setEmail('');
        setPassword('');
        toast({
          title: 'Signed in successfully',
          description: 'Your data is now syncing across devices',
        });
      } catch (error) {
        toast({
          title: 'Sign in failed',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setIsLoggingIn(false);
      }
    } else if (method === 'google') {
      try {
        await authProvider.loginWithGoogle();
        toast({
          title: 'Signed in with Google',
          description: 'Your data is now syncing across devices',
        });
      } catch (error) {
        toast({
          title: 'Google sign in failed',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      }
    } else if (method === 'apple') {
      try {
        await authProvider.loginWithApple();
        toast({
          title: 'Signed in with Apple',
          description: 'Your data is now syncing across devices',
        });
      } catch (error) {
        toast({
          title: 'Apple sign in failed',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await authProvider.logout();
      setShowSignIn(false);
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully',
      });
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleSyncNow = async () => {
    if (!authState.isAuthenticated) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to sync your data',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncService.syncAll();
      if (result.success) {
        setLastSyncTime(syncService.getLastSyncTime());
        toast({
          title: 'Sync completed',
          description: `${result.recordsPushed || 0} records uploaded, ${result.recordsPulled || 0} downloaded`,
        });
      } else {
        toast({
          title: 'Sync failed',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Sync error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          data-testid="button-settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </h3>

            {authState.isAuthenticated ? (
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Signed in as</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-username">
                      {authState.session?.username || 'Unknown User'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    data-testid="button-signout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last sync:</span>
                    <span className="font-medium" data-testid="text-lastsync">
                      {formatLastSync(lastSyncTime)}
                    </span>
                  </div>

                  <Button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="w-full"
                    data-testid="button-syncnow"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 space-y-4">
                {!showSignIn ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sign in to sync your favorites, routes, and preferences across all your devices.
                    </p>
                    <Button
                      onClick={() => setShowSignIn(true)}
                      className="w-full"
                      data-testid="button-signin"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="input-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSignIn('email');
                          }
                        }}
                        data-testid="input-password"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSignIn('email')}
                        disabled={isLoggingIn}
                        className="flex-1"
                        data-testid="button-signin-email"
                      >
                        {isLoggingIn ? 'Signing in...' : 'Sign In'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowSignIn(false);
                          setEmail('');
                          setPassword('');
                        }}
                        disabled={isLoggingIn}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => handleSignIn('google')}
                        className="w-full"
                        data-testid="button-signin-google"
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleSignIn('apple')}
                        className="w-full"
                        data-testid="button-signin-apple"
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                        Continue with Apple
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      No account? One will be created automatically when you sign in with email.
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
