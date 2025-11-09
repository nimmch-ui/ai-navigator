import { useState } from 'react';
import { Search, X, MapPin, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: [number, number];
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  onResultSelect: (result: SearchResult) => void;
  results?: SearchResult[];
  recentSearches?: SearchResult[];
}

export default function SearchBar({
  onSearch,
  onResultSelect,
  results = [],
  recentSearches = []
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const showDropdown = isFocused && (results.length > 0 || (query === '' && recentSearches.length > 0));

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for places, addresses, or landmarks..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="h-12 pl-12 pr-12 text-base"
          data-testid="input-search"
        />
        {query && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-popover-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
          {query === '' && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Searches
              </div>
              {recentSearches.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onResultSelect(result);
                    setQuery(result.name);
                  }}
                  className="w-full px-4 py-3 text-left hover-elevate active-elevate-2 flex items-start gap-3 border-t border-border"
                  data-testid={`result-${result.id}`}
                >
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{result.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{result.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div>
              <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                Results
              </div>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onResultSelect(result);
                    setQuery(result.name);
                  }}
                  className={`w-full px-4 py-3 text-left hover-elevate active-elevate-2 flex items-start gap-3 ${index > 0 ? 'border-t border-border' : ''}`}
                  data-testid={`result-${result.id}`}
                >
                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{result.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{result.address}</div>
                    <div className="text-xs text-muted-foreground mt-1">{result.category}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
