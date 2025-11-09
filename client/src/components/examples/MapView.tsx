import MapView from '../MapView';

export default function MapViewExample() {
  return (
    <MapView 
      center={[37.7749, -122.4194]}
      zoom={13}
      markers={[
        { lat: 37.7749, lng: -122.4194, label: 'San Francisco' }
      ]}
    />
  );
}
