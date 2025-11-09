import { MapPin, Star, Navigation, Share2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LocationCardProps {
  name: string;
  category: string;
  address: string;
  rating?: number;
  reviewCount?: number;
  distance?: string;
  imageUrl?: string;
  onGetDirections?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export default function LocationCard({
  name,
  category,
  address,
  rating,
  reviewCount,
  distance,
  imageUrl,
  onGetDirections,
  onSave,
  onShare
}: LocationCardProps) {
  return (
    <Card className="overflow-hidden" data-testid="card-location">
      {imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          {distance && (
            <Badge className="absolute top-2 right-2 bg-background/90 text-foreground border-border">
              {distance}
            </Badge>
          )}
        </div>
      )}

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate" data-testid="text-location-name">
                {name}
              </h3>
              <Badge variant="secondary" className="mt-1">
                {category}
              </Badge>
            </div>
            {rating && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium text-sm">{rating}</span>
                {reviewCount && (
                  <span className="text-xs text-muted-foreground">({reviewCount})</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
        {onGetDirections && (
          <Button
            size="sm"
            onClick={onGetDirections}
            data-testid="button-get-directions"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Directions
          </Button>
        )}
        {onSave && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            data-testid="button-save"
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Save
          </Button>
        )}
        {onShare && (
          <Button
            size="sm"
            variant="outline"
            onClick={onShare}
            data-testid="button-share"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
