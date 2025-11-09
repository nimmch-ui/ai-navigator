import RoutePanel from '../RoutePanel';

export default function RoutePanelExample() {
  const routes = [
    {
      id: 'fastest',
      name: 'Fastest',
      distance: '3.5 mi',
      duration: '15 min',
      steps: [
        { instruction: 'Head north on Market St toward 10th St', distance: '0.2 mi', icon: 'straight' as const },
        { instruction: 'Turn left onto Hayes St', distance: '0.5 mi', icon: 'left' as const },
        { instruction: 'Turn right onto Franklin St', distance: '1.2 mi', icon: 'right' as const },
        { instruction: 'Continue onto US-101 N', distance: '1.6 mi', icon: 'straight' as const }
      ]
    },
    {
      id: 'shortest',
      name: 'Shortest',
      distance: '3.2 mi',
      duration: '18 min',
      steps: [
        { instruction: 'Head west on Market St', distance: '0.3 mi', icon: 'straight' as const },
        { instruction: 'Turn right onto Van Ness Ave', distance: '0.8 mi', icon: 'right' as const },
        { instruction: 'Continue onto Lombard St', distance: '2.1 mi', icon: 'straight' as const }
      ]
    }
  ];

  return (
    <div className="p-4">
      <RoutePanel
        origin="Ferry Building, San Francisco"
        destination="Golden Gate Bridge"
        routes={routes}
        onStartNavigation={(routeId) => console.log('Start navigation:', routeId)}
      />
    </div>
  );
}
