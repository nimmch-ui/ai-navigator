import { get, set, keys, del } from 'idb-keyval';

export interface TTSCacheEntry {
  audioBlob: Blob;
  createdAt: number;
  language: string;
  voiceStyle: string;
  text: string;
}

interface TTSCacheStats {
  count: number;
  totalSize: number;
}

const CACHE_KEY_PREFIX = 'ai_navigator_tts_';
const MAX_CACHE_SIZE_MB = 50;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_ENTRIES = 200;

const STANDARD_PHRASES: Record<string, string[]> = {
  en: [
    'In 100 meters, turn left',
    'In 100 meters, turn right',
    'Turn left',
    'Turn right',
    'Continue straight',
    'Speed camera ahead',
    'Speed limit changed',
    'Route recalculated',
    'You have arrived at your destination',
    'Make a U-turn',
    'Take the exit',
    'Keep left',
    'Keep right',
    'Entering roundabout',
    'Exit roundabout',
  ],
};

export class TTSCacheService {
  private static instance: TTSCacheService;
  private synthesis: SpeechSynthesis | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isRecording = false;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  static getInstance(): TTSCacheService {
    if (!TTSCacheService.instance) {
      TTSCacheService.instance = new TTSCacheService();
    }
    return TTSCacheService.instance;
  }

  private buildKey(language: string, voiceStyle: string, text: string): string {
    const hash = this.simpleHash(`${language}_${voiceStyle}_${text}`);
    return `${CACHE_KEY_PREFIX}${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async getOrGenerate(
    text: string,
    language: string = 'en',
    voiceStyle: string = 'neutral'
  ): Promise<HTMLAudioElement | null> {
    const key = this.buildKey(language, voiceStyle, text);

    try {
      const cached = await get<TTSCacheEntry>(key);

      if (cached) {
        const age = Date.now() - cached.createdAt;
        if (age < MAX_CACHE_AGE_MS) {
          console.log('[TTSCache] Cache hit for:', text.substring(0, 30));
          const audio = new Audio(URL.createObjectURL(cached.audioBlob));
          return audio;
        } else {
          await del(key);
        }
      }
    } catch (error) {
      console.warn('[TTSCache] Failed to retrieve from cache:', error);
    }

    console.log('[TTSCache] Cache miss, generating:', text.substring(0, 30));
    return await this.generateAndCache(text, language, voiceStyle);
  }

  private async generateAndCache(
    text: string,
    language: string,
    voiceStyle: string
  ): Promise<HTMLAudioElement | null> {
    if (!this.synthesis) {
      console.warn('[TTSCache] SpeechSynthesis not supported');
      return null;
    }

    try {
      const audioBlob = await this.synthesizeToBlob(text, language, voiceStyle);
      if (!audioBlob) {
        return null;
      }

      const key = this.buildKey(language, voiceStyle, text);
      const entry: TTSCacheEntry = {
        audioBlob,
        createdAt: Date.now(),
        language,
        voiceStyle,
        text,
      };

      await set(key, entry);
      await this.enforceLimit();

      const audio = new Audio(URL.createObjectURL(audioBlob));
      return audio;
    } catch (error) {
      console.error('[TTSCache] Failed to generate and cache:', error);
      return null;
    }
  }

  private async synthesizeToBlob(
    text: string,
    language: string,
    voiceStyle: string
  ): Promise<Blob | null> {
    if (!this.synthesis) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const destination = audioContext.createMediaStreamDestination();
        
        const mediaRecorder = new MediaRecorder(destination.stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        };

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = this.getVoiceRate(voiceStyle);
        utterance.pitch = this.getVoicePitch(voiceStyle);

        mediaRecorder.start();

        utterance.onend = () => {
          setTimeout(() => {
            mediaRecorder.stop();
            audioContext.close();
          }, 100);
        };

        utterance.onerror = (error) => {
          console.error('[TTSCache] Speech synthesis error:', error);
          mediaRecorder.stop();
          audioContext.close();
          resolve(null);
        };

        this.synthesis!.speak(utterance);
      } catch (error) {
        console.error('[TTSCache] Synthesis failed:', error);
        resolve(null);
      }
    });
  }

  private getVoiceRate(voiceStyle: string): number {
    switch (voiceStyle) {
      case 'energetic':
        return 1.1;
      case 'warm':
        return 0.95;
      default:
        return 1.0;
    }
  }

  private getVoicePitch(voiceStyle: string): number {
    switch (voiceStyle) {
      case 'energetic':
        return 1.1;
      case 'warm':
        return 0.95;
      default:
        return 1.0;
    }
  }

  async preloadStandardPhrases(language: string = 'en', voiceStyle: string = 'neutral'): Promise<void> {
    const phrases = STANDARD_PHRASES[language] || STANDARD_PHRASES.en;
    
    console.log(`[TTSCache] Preloading ${phrases.length} standard phrases for ${language}`);

    for (const phrase of phrases) {
      try {
        await this.getOrGenerate(phrase, language, voiceStyle);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`[TTSCache] Failed to preload phrase: ${phrase}`, error);
      }
    }

    console.log('[TTSCache] Preload complete');
  }

  async getCacheStats(): Promise<TTSCacheStats> {
    try {
      const allKeys = await keys();
      const cacheKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
      );

      let totalSize = 0;
      for (const key of cacheKeys) {
        const entry = await get<TTSCacheEntry>(key);
        if (entry) {
          totalSize += entry.audioBlob.size;
        }
      }

      return {
        count: cacheKeys.length,
        totalSize,
      };
    } catch (error) {
      console.error('[TTSCache] Failed to get cache stats:', error);
      return { count: 0, totalSize: 0 };
    }
  }

  async clearOldEntries(): Promise<void> {
    try {
      const allKeys = await keys();
      const cacheKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
      );

      const now = Date.now();
      let deletedCount = 0;

      for (const key of cacheKeys) {
        const entry = await get<TTSCacheEntry>(key);
        if (entry) {
          const age = now - entry.createdAt;
          if (age > MAX_CACHE_AGE_MS) {
            await del(key);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`[TTSCache] Cleared ${deletedCount} old entries`);
      }

      await this.enforceLimit();
    } catch (error) {
      console.error('[TTSCache] Failed to clear old entries:', error);
    }
  }

  private async enforceLimit(): Promise<void> {
    try {
      const stats = await this.getCacheStats();

      if (stats.count <= MAX_CACHE_ENTRIES && stats.totalSize <= MAX_CACHE_SIZE_MB * 1024 * 1024) {
        return;
      }

      const allKeys = await keys();
      const cacheKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
      );

      const entries: Array<{ key: IDBValidKey; entry: TTSCacheEntry }> = [];
      for (const key of cacheKeys) {
        const entry = await get<TTSCacheEntry>(key);
        if (entry) {
          entries.push({ key, entry });
        }
      }

      entries.sort((a, b) => a.entry.createdAt - b.entry.createdAt);

      let currentSize = stats.totalSize;
      let currentCount = stats.count;

      for (const { key, entry } of entries) {
        if (currentCount <= MAX_CACHE_ENTRIES && currentSize <= MAX_CACHE_SIZE_MB * 1024 * 1024) {
          break;
        }

        await del(key);
        currentSize -= entry.audioBlob.size;
        currentCount--;
      }

      console.log(`[TTSCache] Enforced limits: ${currentCount} entries, ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('[TTSCache] Failed to enforce limits:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const allKeys = await keys();
      const cacheKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
      );

      for (const key of cacheKeys) {
        await del(key);
      }

      console.log('[TTSCache] Cleared all cache entries');
    } catch (error) {
      console.error('[TTSCache] Failed to clear all entries:', error);
    }
  }
}

export const ttsCacheService = TTSCacheService.getInstance();
