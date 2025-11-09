import MapControls from '../MapControls';

export default function MapControlsExample() {
  return (
    <div className="p-4">
      <MapControls
        onZoomIn={() => console.log('Zoom in')}
        onZoomOut={() => console.log('Zoom out')}
        onLayersToggle={() => console.log('Toggle layers')}
        onCurrentLocation={() => console.log('Get current location')}
      />
    </div>
  );
}
