/**
 * FavoritesService - Manages user's favorite locations with localStorage persistence
 * Supports named locations like Home, Work, etc. with coordinates
 */

export interface Favorite {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [lat, lng]
  createdAt: number;
}

const FAVORITES_KEY = "ai_navigator_favorites";
const MAX_FAVORITES = 20;

export class FavoritesService {
  /**
   * Get all saved favorites
   */
  static getFavorites(): Favorite[] {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
    return [];
  }

  /**
   * Add a new favorite location
   */
  static addFavorite(favorite: Omit<Favorite, 'id' | 'createdAt'>): Favorite | null {
    try {
      const favorites = this.getFavorites();
      
      if (favorites.length >= MAX_FAVORITES) {
        console.warn("Maximum favorites limit reached");
        return null;
      }

      // Check for duplicate name
      if (favorites.some(f => f.name.toLowerCase() === favorite.name.toLowerCase())) {
        console.warn("Favorite with this name already exists");
        return null;
      }

      const newFavorite: Favorite = {
        ...favorite,
        id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      };

      favorites.push(newFavorite);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      
      return newFavorite;
    } catch (error) {
      console.error("Failed to add favorite:", error);
      return null;
    }
  }

  /**
   * Update an existing favorite
   */
  static updateFavorite(id: string, updates: Partial<Omit<Favorite, 'id' | 'createdAt'>>): boolean {
    try {
      const favorites = this.getFavorites();
      const index = favorites.findIndex(f => f.id === id);
      
      if (index === -1) {
        return false;
      }

      // Check for duplicate name if name is being updated
      if (updates.name) {
        const duplicateName = favorites.some(
          (f, i) => i !== index && f.name.toLowerCase() === updates.name!.toLowerCase()
        );
        if (duplicateName) {
          console.warn("Favorite with this name already exists");
          return false;
        }
      }

      favorites[index] = { ...favorites[index], ...updates };
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      
      return true;
    } catch (error) {
      console.error("Failed to update favorite:", error);
      return false;
    }
  }

  /**
   * Delete a favorite by ID
   */
  static deleteFavorite(id: string): boolean {
    try {
      const favorites = this.getFavorites();
      const filtered = favorites.filter(f => f.id !== id);
      
      if (filtered.length === favorites.length) {
        return false; // ID not found
      }

      localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error("Failed to delete favorite:", error);
      return false;
    }
  }

  /**
   * Get a favorite by ID
   */
  static getFavoriteById(id: string): Favorite | null {
    const favorites = this.getFavorites();
    return favorites.find(f => f.id === id) || null;
  }

  /**
   * Clear all favorites
   */
  static clearFavorites(): void {
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error("Failed to clear favorites:", error);
    }
  }

  /**
   * Search favorites by name
   */
  static searchFavorites(query: string): Favorite[] {
    const favorites = this.getFavorites();
    const lowerQuery = query.toLowerCase();
    return favorites.filter(f => 
      f.name.toLowerCase().includes(lowerQuery) ||
      f.address.toLowerCase().includes(lowerQuery)
    );
  }
}
