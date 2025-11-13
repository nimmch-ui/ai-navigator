/**
 * Night Vision Demo Utility
 * Provides helper functions to test and demonstrate night vision capabilities
 */

import { nightVisionService, type ColorMode } from '@/services/vision/NightVisionService';

/**
 * Create a test image with low-light conditions
 */
export function createTestLowLightImage(width: number = 640, height: number = 480): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create a dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0a0a0a');
  gradient.addColorStop(0.5, '#1a1a1a');
  gradient.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add some dim objects
  ctx.fillStyle = '#333333';
  ctx.fillRect(100, 100, 80, 80);
  ctx.fillRect(300, 200, 60, 100);
  ctx.fillRect(450, 150, 100, 50);

  // Add some very dim edges
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Apply night vision processing to a video element or image
 */
export async function applyNightVision(
  source: HTMLVideoElement | HTMLImageElement,
  colorMode: ColorMode = 'infrared'
): Promise<ImageData> {
  const canvas = document.createElement('canvas');
  canvas.width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  canvas.height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  const ctx = canvas.getContext('2d')!;

  // Draw source to canvas
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Initialize service if needed
  nightVisionService.initialize(canvas.width, canvas.height);
  nightVisionService.setColorMode(colorMode);

  // Process frame
  const result = await nightVisionService.processFrame(imageData, {
    enableEnhancement: true,
    enableEdgeDetection: false,
    enableObjectDetection: false,
  });

  return result.enhancedFrame;
}

/**
 * Demo function to test all color modes
 */
export async function demoColorModes(): Promise<void> {
  console.log('[NightVision Demo] Testing all color modes...');

  const testImage = createTestLowLightImage();
  nightVisionService.initialize(640, 480);

  const modes: ColorMode[] = ['normal', 'infrared', 'thermal'];

  for (const mode of modes) {
    console.log(`[NightVision Demo] Testing ${mode} mode...`);
    nightVisionService.setColorMode(mode);

    const result = await nightVisionService.processFrame(testImage, {
      enableEnhancement: true,
      enableEdgeDetection: true,
    });

    console.log(`[NightVision Demo] ${mode} mode processed in ${result.processingTimeMs.toFixed(2)}ms`);
  }

  console.log('[NightVision Demo] All color modes tested successfully!');
}

/**
 * Render night vision result to a canvas
 */
export function renderToCanvas(imageData: ImageData, canvas: HTMLCanvasElement): void {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Compare original and enhanced images side-by-side
 */
export function compareImages(
  original: ImageData,
  enhanced: ImageData,
  containerElement: HTMLElement
): void {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '10px';

  const originalCanvas = document.createElement('canvas');
  const enhancedCanvas = document.createElement('canvas');

  renderToCanvas(original, originalCanvas);
  renderToCanvas(enhanced, enhancedCanvas);

  const originalLabel = document.createElement('div');
  originalLabel.textContent = 'Original';
  originalLabel.style.textAlign = 'center';

  const enhancedLabel = document.createElement('div');
  enhancedLabel.textContent = 'Enhanced';
  enhancedLabel.style.textAlign = 'center';

  const originalWrapper = document.createElement('div');
  originalWrapper.appendChild(originalLabel);
  originalWrapper.appendChild(originalCanvas);

  const enhancedWrapper = document.createElement('div');
  enhancedWrapper.appendChild(enhancedLabel);
  enhancedWrapper.appendChild(enhancedCanvas);

  wrapper.appendChild(originalWrapper);
  wrapper.appendChild(enhancedWrapper);

  containerElement.innerHTML = '';
  containerElement.appendChild(wrapper);
}

export default {
  createTestLowLightImage,
  applyNightVision,
  demoColorModes,
  renderToCanvas,
  compareImages,
};
