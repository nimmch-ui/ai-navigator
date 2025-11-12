import { useState } from 'react';
import { Star, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FavoritesService, type Favorite } from '@/services/favorites';
import { geocodeAddress } from '@/services/geocoding';
import { useToast } from '@/hooks/use-toast';

interface FavoritesProps {
  onSelectFavorite: (favorite: Favorite) => void;
}

export default function Favorites({ onSelectFavorite }: FavoritesProps) {
  const [favorites, setFavorites] = useState<Favorite[]>(FavoritesService.getFavorites());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState<Favorite | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { toast } = useToast();

  const refreshFavorites = () => {
    setFavorites(FavoritesService.getFavorites());
  };

  const handleAddFavorite = async () => {
    if (!newName.trim() || !newAddress.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both name and address",
        variant: "destructive"
      });
      return;
    }

    setIsGeocoding(true);
    
    // Geocode the address to get coordinates
    const geocoded = await geocodeAddress(newAddress);
    
    setIsGeocoding(false);

    if (!geocoded) {
      toast({
        title: "Address not found",
        description: "Could not find this address. Please try a different address.",
        variant: "destructive"
      });
      return;
    }

    const result = FavoritesService.addFavorite({
      name: newName,
      address: geocoded.address,
      coordinates: geocoded.coordinates
    });

    if (result) {
      toast({
        title: "Favorite added",
        description: `${newName} has been saved to your favorites`
      });
      setNewName('');
      setNewAddress('');
      setIsAddDialogOpen(false);
      refreshFavorites();
    } else {
      toast({
        title: "Failed to add favorite",
        description: "Name may already exist or favorites limit reached",
        variant: "destructive"
      });
    }
  };

  const handleEditFavorite = async () => {
    if (!editingFavorite || !newName.trim() || !newAddress.trim()) {
      return;
    }

    // If address changed, re-geocode it
    let coordinates = editingFavorite.coordinates;
    if (newAddress !== editingFavorite.address) {
      setIsGeocoding(true);
      const geocoded = await geocodeAddress(newAddress);
      setIsGeocoding(false);

      if (!geocoded) {
        toast({
          title: "Address not found",
          description: "Could not find this address. Please try a different address.",
          variant: "destructive"
        });
        return;
      }
      coordinates = geocoded.coordinates;
    }

    const success = FavoritesService.updateFavorite(editingFavorite.id, {
      name: newName,
      address: newAddress,
      coordinates
    });

    if (success) {
      toast({
        title: "Favorite updated",
        description: `${newName} has been updated`
      });
      setIsEditDialogOpen(false);
      setEditingFavorite(null);
      setNewName('');
      setNewAddress('');
      refreshFavorites();
    } else {
      toast({
        title: "Failed to update",
        description: "Name may already exist",
        variant: "destructive"
      });
    }
  };

  const handleDeleteFavorite = (id: string) => {
    const favorite = favorites.find(f => f.id === id);
    if (!favorite) return;

    const success = FavoritesService.deleteFavorite(id);
    if (success) {
      toast({
        title: "Favorite deleted",
        description: `${favorite.name} has been removed`
      });
      refreshFavorites();
    }
  };

  const startEdit = (favorite: Favorite) => {
    setEditingFavorite(favorite);
    setNewName(favorite.name);
    setNewAddress(favorite.address);
    setIsEditDialogOpen(true);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          data-testid="button-open-favorites"
        >
          <Star className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" data-testid="favorites-panel">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Favorites</h3>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" data-testid="button-add-favorite">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-add-favorite">
                <DialogHeader>
                  <DialogTitle>Add Favorite Location</DialogTitle>
                  <DialogDescription>
                    Save a location for quick access
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Home, Work, etc."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      data-testid="input-favorite-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St, City"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      data-testid="input-favorite-address"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleAddFavorite} 
                    disabled={isGeocoding}
                    data-testid="button-save-favorite"
                  >
                    {isGeocoding ? 'Finding address...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[300px]">
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No favorites yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add locations for quick access
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    className="group flex items-center justify-between p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => onSelectFavorite(favorite)}
                    data-testid={`favorite-item-${favorite.id}`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium truncate">
                        {favorite.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {favorite.address}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(favorite);
                        }}
                        data-testid={`button-edit-favorite-${favorite.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFavorite(favorite.id);
                        }}
                        data-testid={`button-delete-favorite-${favorite.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-favorite">
          <DialogHeader>
            <DialogTitle>Edit Favorite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="input-edit-favorite-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                data-testid="input-edit-favorite-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleEditFavorite} 
              disabled={isGeocoding}
              data-testid="button-update-favorite"
            >
              {isGeocoding ? 'Finding address...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
