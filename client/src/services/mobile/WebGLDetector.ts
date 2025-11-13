/**
 * WebGL Detector - Detect WebGL capabilities and provide fallback strategies
 */

export interface WebGLCapabilities {
  isSupported: boolean;
  version: 1 | 2 | null;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  renderer: string;
  vendor: string;
  isLowEnd: boolean;
}

export class WebGLDetector {
  private static capabilities: WebGLCapabilities | null = null;

  /**
   * Detect WebGL capabilities
   */
  static detect(): WebGLCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    let version: 1 | 2 | null = null;

    // Try WebGL 2
    try {
      gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
      if (gl) {
        version = 2;
      }
    } catch (e) {
      console.warn('[WebGLDetector] WebGL 2 not available');
    }

    // Fallback to WebGL 1
    if (!gl) {
      try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
        if (gl) {
          version = 1;
        }
      } catch (e) {
        console.warn('[WebGLDetector] WebGL 1 not available');
      }
    }

    if (!gl) {
      this.capabilities = {
        isSupported: false,
        version: null,
        maxTextureSize: 0,
        maxRenderBufferSize: 0,
        renderer: 'none',
        vendor: 'none',
        isLowEnd: true
      };
      return this.capabilities;
    }

    // Get capabilities
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo 
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    // Detect low-end GPU (small texture size or software renderer)
    const isLowEnd = this.evaluateLowEndGPU(renderer, maxTextureSize);

    this.capabilities = {
      isSupported: true,
      version,
      maxTextureSize,
      maxRenderBufferSize,
      renderer,
      vendor,
      isLowEnd
    };

    console.log('[WebGLDetector] Capabilities detected:', this.capabilities);
    return this.capabilities;
  }

  /**
   * Evaluate if GPU is low-end based on renderer and capabilities (internal helper)
   */
  private static evaluateLowEndGPU(renderer: string, maxTextureSize: number): boolean {
    const lowEndIndicators = [
      'swiftshader',
      'software',
      'llvmpipe',
      'mesa',
      'intel hd graphics 3000',
      'intel hd graphics 2000'
    ];

    const rendererLower = renderer.toLowerCase();
    const hasSoftwareRenderer = lowEndIndicators.some(indicator => 
      rendererLower.includes(indicator)
    );

    // Small texture size indicates low-end or mobile GPU
    const hasSmallTextureSize = maxTextureSize < 4096;

    return hasSoftwareRenderer || hasSmallTextureSize;
  }

  /**
   * Check if WebGL is supported
   */
  static isSupported(): boolean {
    return this.detect().isSupported;
  }

  /**
   * Check if device has low-end GPU
   */
  static isLowEndGPU(): boolean {
    return this.detect().isLowEnd;
  }

  /**
   * Get recommended map style based on GPU capabilities
   */
  static getRecommendedMapStyle(): '3d' | '2d' {
    const caps = this.detect();
    
    if (!caps.isSupported || caps.isLowEnd || caps.version === 1) {
      return '2d';
    }
    
    return '3d';
  }

  /**
   * Get capabilities
   */
  static getCapabilities(): WebGLCapabilities {
    return this.detect();
  }

  /**
   * Force re-detection (useful after GPU context loss)
   */
  static reset(): void {
    this.capabilities = null;
  }
}
