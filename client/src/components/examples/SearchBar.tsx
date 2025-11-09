import { useState } from 'react';
import SearchBar from '../SearchBar';

export default function SearchBarExample() {
  const [searchResults] = useState([
    {
      id: '1',
      name: 'Golden Gate Bridge',
      address: 'Golden Gate Bridge, San Francisco, CA',
      category: 'Landmark',
      coordinates: [37.8199, -122.4783] as [number, number]
    },
    {
      id: '2',
      name: 'Golden Gate Park',
      address: 'Golden Gate Park, San Francisco, CA 94122',
      category: 'Park',
      coordinates: [37.7694, -122.4862] as [number, number]
    }
  ]);

  const recentSearches = [
    {
      id: 'r1',
      name: 'Ferry Building',
      address: '1 Ferry Building, San Francisco, CA 94111',
      category: 'Building',
      coordinates: [37.7955, -122.3937] as [number, number]
    }
  ];

  return (
    <div className="p-4">
      <SearchBar
        onSearch={(query) => console.log('Search:', query)}
        onResultSelect={(result) => console.log('Selected:', result)}
        results={searchResults}
        recentSearches={recentSearches}
      />
    </div>
  );
}
