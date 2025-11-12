/**
 * RouteRenderer - Advanced route visualization for CINEMATIC mode
 * Features: Gradient colors, animated dashes, glow effects, pulse animations
 */

import type mapboxgl from 'mapbox-gl';

export interface RouteStyle {
  mode: 'classic' | 'cinematic';
  baseColor: string;
  glowColor: string;
  gradientStops?: [number, string][];  // For cinematic gradient
  animated?: boolean;
  pulsePoint?: [number, number];       // Location for pulse animation
}

const LAYER_IDS = {
  routeGlow: 'route-glow',
  routeOutline: 'route-outline', 
  route: 'route',
  routeDash: 'route-dash',
  turnPulse: 'turn-pulse'
};

/**
 * RouteRenderer class - Manages route visualization with cinematic effects
 */
export class RouteRenderer {
  private map: mapboxgl.Map;
  private animationFrameId: number | null = null;
  private dashOffset: number = 0;
  private pulseRadius: number = 0;
  private pulseOpacity: number = 1;
  private lastFrameTime: number = 0;
  
  constructor(map: mapboxgl.Map) {
    this.map = map;
  }
  
  /**
   * Render route with specified style
   */
  renderRoute(
    route: [number, number][],
    style: RouteStyle
  ): void {
    if (route.length < 2) return;
    
    // Convert route to GeoJSON
    const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.map(([lat, lng]) => [lng, lat])
      }
    };
    
    // Remove existing layers
    this.clearRoute();
    
    // Add route source
    if (!this.map.getSource('route')) {
      this.map.addSource('route', {
        type: 'geojson',
        data: routeGeoJSON
      });
    } else {
      const source = this.map.getSource('route') as mapboxgl.GeoJSONSource;
      source.setData(routeGeoJSON);
    }
    
    if (style.mode === 'cinematic') {
      this.renderCinematicRoute(style);
    } else {
      this.renderClassicRoute(style);
    }
    
    // Add pulse animation if specified
    if (style.pulsePoint) {
      this.addTurnPulse(style.pulsePoint);
    }
  }
  
  /**
   * Render classic route style (simple blue line with glow)
   */
  private renderClassicRoute(style: RouteStyle): void {
    // Glow layer
    this.map.addLayer({
      id: LAYER_IDS.routeGlow,
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': style.glowColor || style.baseColor,
        'line-width': 12,
        'line-opacity': 0.4,
        'line-blur': 4
      }
    });
    
    // Main route layer
    this.map.addLayer({
      id: LAYER_IDS.route,
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': style.baseColor,
        'line-width': 6,
        'line-opacity': 0.9
      }
    });
  }
  
  /**
   * Render cinematic route style with gradients and enhanced glow
   */
  private renderCinematicRoute(style: RouteStyle): void {
    // Outer glow (widest, most subtle)
    this.map.addLayer({
      id: LAYER_IDS.routeGlow,
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': style.glowColor || 'hsl(200, 100%, 70%)',
        'line-width': 20,
        'line-opacity': 0.3,
        'line-blur': 8
      }
    });
    
    // Dark outline for contrast
    this.map.addLayer({
      id: LAYER_IDS.routeOutline,
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': 'hsl(220, 20%, 20%)',
        'line-width': 10,
        'line-opacity': 0.6
      }
    });
    
    // Inner gradient route
    if (style.gradientStops) {
      this.map.addLayer({
        id: LAYER_IDS.route,
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            ...style.gradientStops.flat()
          ],
          'line-width': 7,
          'line-opacity': 0.95,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            ...style.gradientStops.flat()
          ]
        } as any
      });
    } else {
      this.map.addLayer({
        id: LAYER_IDS.route,
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': style.baseColor,
          'line-width': 7,
          'line-opacity': 0.95
        }
      });
    }
    
    // Animated dash overlay for active segment
    if (style.animated) {
      this.map.addLayer({
        id: LAYER_IDS.routeDash,
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'hsl(200, 100%, 85%)',
          'line-width': 3,
          'line-opacity': 0.7,
          'line-dasharray': [2, 4],
          'line-offset': 0
        }
      });
      
      // Start animation
      this.startDashAnimation();
    }
  }
  
  /**
   * Add pulse animation at upcoming turn
   */
  private addTurnPulse(location: [number, number]): void {
    const pulseGeoJSON: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [location[1], location[0]]  // [lng, lat]
      }
    };
    
    // Add pulse source
    if (!this.map.getSource('turn-pulse')) {
      this.map.addSource('turn-pulse', {
        type: 'geojson',
        data: pulseGeoJSON
      });
    } else {
      const source = this.map.getSource('turn-pulse') as mapboxgl.GeoJSONSource;
      source.setData(pulseGeoJSON);
    }
    
    // Add pulse circle layer
    if (!this.map.getLayer(LAYER_IDS.turnPulse)) {
      this.map.addLayer({
        id: LAYER_IDS.turnPulse,
        type: 'circle',
        source: 'turn-pulse',
        paint: {
          'circle-radius': 10,
          'circle-color': 'hsl(45, 100%, 60%)',
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'hsl(45, 100%, 80%)',
          'circle-stroke-opacity': 0.6
        }
      });
    }
    
    // Start pulse animation
    this.startPulseAnimation();
  }
  
  /**
   * Start animated dash effect
   */
  private startDashAnimation(): void {
    this.stopAnimation();
    this.lastFrameTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (!this.map.getLayer(LAYER_IDS.routeDash)) {
        this.stopAnimation();
        return;
      }
      
      // Calculate delta time for frame-rate independent animation
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;
      
      // Update dash offset (moves at ~30 pixels per second)
      this.dashOffset += (deltaTime / 1000) * 30;
      if (this.dashOffset > 100) {
        this.dashOffset = 0;
      }
      
      try {
        this.map.setPaintProperty(
          LAYER_IDS.routeDash,
          'line-dasharray',
          [2, 4]
        );
      } catch (error) {
        // Layer might have been removed
        this.stopAnimation();
        return;
      }
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }
  
  /**
   * Start pulse animation at turn point
   */
  private startPulseAnimation(): void {
    this.pulseRadius = 10;
    this.pulseOpacity = 0.8;
    
    const animate = () => {
      if (!this.map.getLayer(LAYER_IDS.turnPulse)) {
        return;
      }
      
      // Expand pulse
      this.pulseRadius += 1.5;
      this.pulseOpacity -= 0.02;
      
      // Reset when fully expanded
      if (this.pulseRadius > 50 || this.pulseOpacity <= 0) {
        this.pulseRadius = 10;
        this.pulseOpacity = 0.8;
      }
      
      try {
        this.map.setPaintProperty(
          LAYER_IDS.turnPulse,
          'circle-radius',
          this.pulseRadius
        );
        this.map.setPaintProperty(
          LAYER_IDS.turnPulse,
          'circle-opacity',
          this.pulseOpacity
        );
        this.map.setPaintProperty(
          LAYER_IDS.turnPulse,
          'circle-stroke-opacity',
          this.pulseOpacity * 0.75
        );
      } catch (error) {
        // Layer might have been removed
        return;
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * Clear all route layers
   */
  clearRoute(): void {
    this.stopAnimation();
    
    Object.values(LAYER_IDS).forEach(layerId => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });
    
    if (this.map.getSource('turn-pulse')) {
      this.map.removeSource('turn-pulse');
    }
  }
  
  /**
   * Stop all animations
   */
  stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Update turn pulse location
   */
  updatePulseLocation(location: [number, number] | null): void {
    if (!location) {
      // Remove pulse
      if (this.map.getLayer(LAYER_IDS.turnPulse)) {
        this.map.removeLayer(LAYER_IDS.turnPulse);
      }
      if (this.map.getSource('turn-pulse')) {
        this.map.removeSource('turn-pulse');
      }
      return;
    }
    
    const pulseGeoJSON: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [location[1], location[0]]
      }
    };
    
    const source = this.map.getSource('turn-pulse') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(pulseGeoJSON);
    }
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.clearRoute();
  }
}
