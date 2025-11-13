/**
 * NightVisionService - AI-powered night vision driving assist
 * 
 * Features:
 * - Low-light enhancement using histogram equalization and gamma correction
 * - Edge detection using Sobel operator
 * - Color mapping (infrared simulation, thermal contrast)
 * - AI-powered object detection (animals, pedestrians, road lines)
 */

import { PreferencesService } from '../preferences';
import { EventBus } from '../eventBus';

export type ColorMode = 'normal' | 'infrared' | 'thermal';

export interface DetectionResult {
  type: 'animal' | 'pedestrian' | 'road_line' | 'edge';
  confidence: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  points?: Array<{ x: number; y: number }>;
}

export interface NightVisionResult {
  enhancedFrame: ImageData;
  edgeMap?: ImageData;
  detections: DetectionResult[];
  colorMode: ColorMode;
  processingTimeMs: number;
}

class NightVisionService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private colorMode: ColorMode = 'normal';
  private initialized = false;
  private intensity: number = 50; // 10-100%, default 50%
  private gammaFactor: number = 1.5; // Computed from intensity

  /**
   * Initialize the service with a canvas element
   */
  initialize(width: number = 640, height: number = 480): void {
    if (this.initialized) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    if (!this.ctx) {
      throw new Error('[NightVision] Failed to get 2D context');
    }

    // Load settings from preferences
    this.loadSettingsFromPreferences();

    // Subscribe to preference changes
    EventBus.subscribe('preferences:updated', () => {
      this.loadSettingsFromPreferences();
    });

    this.initialized = true;
    console.log('[NightVision] Service initialized:', width, 'x', height);
  }

  /**
   * Load Night Vision settings from PreferencesService
   */
  private loadSettingsFromPreferences(): void {
    const prefs = PreferencesService.getPreferences();
    this.intensity = prefs.nightVision.intensity;
    
    // Map intensity (10-100) to gamma factor (0.8-2.5)
    // Lower intensity = lower gamma (darker), higher intensity = higher gamma (brighter)
    this.gammaFactor = 0.8 + ((this.intensity - 10) / 90) * 1.7;
    
    // Set color mode based on thermal mode setting
    // thermal=false → 'normal' (standard night vision enhancement)
    // thermal=true → 'thermal' (heat-signature color mapping)
    this.colorMode = prefs.nightVision.thermalMode ? 'thermal' : 'normal';
    
    console.log('[NightVision] Settings loaded:', {
      intensity: this.intensity,
      gammaFactor: this.gammaFactor.toFixed(2),
      colorMode: this.colorMode
    });
  }

  /**
   * Set color mode for night vision rendering
   */
  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
    console.log('[NightVision] Color mode set to:', mode);
  }

  /**
   * Get current color mode
   */
  getColorMode(): ColorMode {
    return this.colorMode;
  }

  /**
   * Enhance low-light image using histogram equalization and gamma correction
   */
  enhanceLowLight(imageData: ImageData, gamma?: number): ImageData {
    // Use provided gamma or fall back to preference-based gamma
    const effectiveGamma = gamma !== undefined ? gamma : this.gammaFactor;
    if (!this.ctx) {
      throw new Error('[NightVision] Service not initialized');
    }

    const enhanced = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Step 1: Apply gamma correction to brighten dark areas
    this.applyGammaCorrection(enhanced.data, effectiveGamma);

    // Step 2: Apply histogram equalization for better contrast
    this.applyHistogramEqualization(enhanced.data);

    // Step 3: Reduce noise using simple averaging
    this.reduceNoise(enhanced.data, imageData.width, imageData.height);

    return enhanced;
  }

  /**
   * Apply gamma correction to brighten image
   */
  private applyGammaCorrection(data: Uint8ClampedArray, gamma: number): void {
    const gammaTable = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      gammaTable[i] = Math.min(255, Math.pow(i / 255, 1 / gamma) * 255);
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = gammaTable[data[i]];       // R
      data[i + 1] = gammaTable[data[i + 1]]; // G
      data[i + 2] = gammaTable[data[i + 2]]; // B
      // Alpha unchanged
    }
  }

  /**
   * Apply histogram equalization for better contrast
   */
  private applyHistogramEqualization(data: Uint8ClampedArray): void {
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray]++;
    }

    // Calculate cumulative distribution function
    const cdf = new Array(256).fill(0);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Normalize CDF
    const totalPixels = data.length / 4;
    const cdfMin = cdf.find(v => v > 0) || 0;
    
    // Guard against uniform frames (all pixels same value)
    if (totalPixels === cdfMin || cdfMin === totalPixels) {
      console.warn('[NightVision] Uniform frame detected, skipping histogram equalization');
      return;
    }

    const equalizationTable = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      equalizationTable[i] = Math.floor(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
    }

    // Apply equalization
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      const newValue = equalizationTable[gray];
      data[i] = newValue;
      data[i + 1] = newValue;
      data[i + 2] = newValue;
    }
  }

  /**
   * Simple noise reduction using 3x3 averaging filter
   */
  private reduceNoise(data: Uint8ClampedArray, width: number, height: number): void {
    const temp = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += temp[nIdx];
            }
          }
          data[idx + c] = Math.floor(sum / 9);
        }
      }
    }
  }

  /**
   * Detect edges using Sobel operator
   */
  detectEdges(imageData: ImageData, threshold: number = 100): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const edges = new ImageData(width, height);

    // Sobel kernels
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    // Convert to grayscale and apply Sobel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
            
            gx += gray * sobelX[ky + 1][kx + 1];
            gy += gray * sobelY[ky + 1][kx + 1];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const edgeValue = magnitude > threshold ? 255 : 0;

        const outIdx = (y * width + x) * 4;
        edges.data[outIdx] = edgeValue;
        edges.data[outIdx + 1] = edgeValue;
        edges.data[outIdx + 2] = edgeValue;
        edges.data[outIdx + 3] = 255;
      }
    }

    return edges;
  }

  /**
   * Apply infrared color mapping (green-tinted night vision)
   */
  applyInfraredMapping(imageData: ImageData): ImageData {
    const infrared = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    for (let i = 0; i < infrared.data.length; i += 4) {
      const gray = (infrared.data[i] + infrared.data[i + 1] + infrared.data[i + 2]) / 3;
      
      // Infrared effect: enhance green channel, reduce red and blue
      infrared.data[i] = Math.min(255, gray * 0.3);     // R - reduced
      infrared.data[i + 1] = Math.min(255, gray * 1.2); // G - enhanced
      infrared.data[i + 2] = Math.min(255, gray * 0.3); // B - reduced
    }

    return infrared;
  }

  /**
   * Apply thermal contrast mapping (heat signature visualization)
   */
  applyThermalMapping(imageData: ImageData): ImageData {
    const thermal = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    for (let i = 0; i < thermal.data.length; i += 4) {
      const intensity = (thermal.data[i] + thermal.data[i + 1] + thermal.data[i + 2]) / 3;
      
      // Thermal color mapping: cold (blue) to hot (red/yellow)
      const normalized = intensity / 255;
      
      if (normalized < 0.25) {
        // Cold: Blue to Cyan
        thermal.data[i] = 0;
        thermal.data[i + 1] = Math.floor(normalized * 4 * 255);
        thermal.data[i + 2] = 255;
      } else if (normalized < 0.5) {
        // Cool: Cyan to Green
        thermal.data[i] = 0;
        thermal.data[i + 1] = 255;
        thermal.data[i + 2] = Math.floor((0.5 - normalized) * 4 * 255);
      } else if (normalized < 0.75) {
        // Warm: Green to Yellow
        thermal.data[i] = Math.floor((normalized - 0.5) * 4 * 255);
        thermal.data[i + 1] = 255;
        thermal.data[i + 2] = 0;
      } else {
        // Hot: Yellow to Red
        thermal.data[i] = 255;
        thermal.data[i + 1] = Math.floor((1 - normalized) * 4 * 255);
        thermal.data[i + 2] = 0;
      }
    }

    return thermal;
  }

  /**
   * Detect animals in the frame (AI-powered - placeholder)
   * See BACKLOG.md: Animal Detection (NightVisionService)
   */
  async detectAnimals(imageData: ImageData): Promise<DetectionResult[]> {
    console.log('[NightVision] Animal detection called - AI integration pending');
    return [];
  }

  /**
   * Detect pedestrians in the frame (AI-powered - placeholder)
   * See BACKLOG.md: Pedestrian Detection (NightVisionService)
   */
  async detectPedestrians(imageData: ImageData): Promise<DetectionResult[]> {
    console.log('[NightVision] Pedestrian detection called - AI integration pending');
    return [];
  }

  /**
   * Detect road lines in the frame (AI-powered - placeholder)
   * See BACKLOG.md: Road Line Detection (NightVisionService)
   */
  async detectRoadLines(imageData: ImageData): Promise<DetectionResult[]> {
    console.log('[NightVision] Road line detection called - AI integration pending');
    return [];
  }

  /**
   * Process a frame with all enhancements and detections
   */
  async processFrame(
    imageData: ImageData,
    options: {
      enableEnhancement?: boolean;
      enableEdgeDetection?: boolean;
      enableObjectDetection?: boolean;
      colorMode?: ColorMode;
    } = {}
  ): Promise<NightVisionResult> {
    const startTime = performance.now();

    let enhanced = imageData;
    let edgeMap: ImageData | undefined;
    const detections: DetectionResult[] = [];

    // Apply low-light enhancement
    if (options.enableEnhancement !== false) {
      enhanced = this.enhanceLowLight(imageData);
    }

    // Apply color mapping
    const mode = options.colorMode || this.colorMode;
    if (mode === 'infrared') {
      enhanced = this.applyInfraredMapping(enhanced);
    } else if (mode === 'thermal') {
      enhanced = this.applyThermalMapping(enhanced);
    }

    // Detect edges
    if (options.enableEdgeDetection) {
      edgeMap = this.detectEdges(enhanced);
      
      // Extract edge detections as results
      const edgePoints = this.extractEdgePoints(edgeMap);
      if (edgePoints.length > 0) {
        detections.push({
          type: 'edge',
          confidence: 1.0,
          points: edgePoints,
        });
      }
    }

    // Object detection
    if (options.enableObjectDetection) {
      const [animals, pedestrians, roadLines] = await Promise.all([
        this.detectAnimals(enhanced),
        this.detectPedestrians(enhanced),
        this.detectRoadLines(enhanced),
      ]);
      detections.push(...animals, ...pedestrians, ...roadLines);
    }

    const processingTimeMs = performance.now() - startTime;

    return {
      enhancedFrame: enhanced,
      edgeMap,
      detections,
      colorMode: mode,
      processingTimeMs,
    };
  }

  /**
   * Extract edge points from edge map for detection results
   */
  private extractEdgePoints(edgeMap: ImageData): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const width = edgeMap.width;
    const height = edgeMap.height;
    
    // Sample edge points (every 10th pixel to avoid too many points)
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width; x += 10) {
        const idx = (y * width + x) * 4;
        if (edgeMap.data[idx] > 128) { // Edge pixel threshold
          points.push({ x, y });
        }
      }
    }
    
    return points;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    console.log('[NightVision] Service disposed');
  }
}

export const nightVisionService = new NightVisionService();
