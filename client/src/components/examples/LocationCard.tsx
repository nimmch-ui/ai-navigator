import LocationCard from '../LocationCard';

export default function LocationCardExample() {
  return (
    <div className="p-4 max-w-md">
      <LocationCard
        name="Blue Bottle Coffee"
        category="Coffee Shop"
        address="66 Mint St, San Francisco, CA 94103"
        rating={4.5}
        reviewCount={1250}
        distance="0.3 mi"
        imageUrl="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop"
        onGetDirections={() => console.log('Get directions')}
        onSave={() => console.log('Save location')}
        onShare={() => console.log('Share location')}
      />
    </div>
  );
}
