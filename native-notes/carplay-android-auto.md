# CarPlay & Android Auto Limitations

## Why Web Apps Can't Integrate

### CarPlay (iOS)
CarPlay is Apple's proprietary system for connecting iPhones to vehicle infotainment displays. It has strict limitations:

**Technical Requirements:**
- Must be a native iOS app built with Xcode
- Requires CarPlay entitlement from Apple
- Must use CarPlay framework (CPTemplateApplicationScene)
- Apps must be submitted to App Store review
- Limited to specific app categories (navigation, audio, messaging, etc.)

**API Restrictions:**
- No web browser or WebView support in CarPlay mode
- Only specific Apple-designed templates available
- Cannot render custom UI beyond templates
- Must use Apple's turn-by-turn navigation templates

**Why PWAs Don't Work:**
1. CarPlay actively blocks web content
2. No browser rendering engine in CarPlay environment
3. Apple requires native Swift/Objective-C code
4. Entitlement process requires developer enrollment and approval

### Android Auto
Android Auto has similar but slightly different restrictions:

**Technical Requirements:**
- Must be a native Android app
- Requires Android Auto Library integration
- Must declare Auto support in AndroidManifest.xml
- Limited to approved categories (navigation, media)

**API Restrictions:**
- No WebView rendering in Auto mode
- Must use Android Auto templates
- Limited UI customization
- Specific screen templates for navigation apps

**Why PWAs Don't Work:**
1. Android Auto doesn't support WebView content
2. Requires native Android components
3. Must use Android Auto SDK
4. Google Play Store distribution required

## What Car Mode Provides Instead

Since we can't integrate with CarPlay/Android Auto directly, AI Navigator's **Car Mode** provides:

### ✅ What Car Mode Offers
- **Larger Touch Targets**: Buttons sized for glance-free interaction
- **High Contrast UI**: Better visibility in bright sunlight
- **Simplified Interface**: Only essential navigation info
- **Voice Guidance**: Turn-by-turn spoken directions
- **Fullscreen Mode**: Minimize distractions
- **Speed & ETA Display**: Large, readable text
- **Lane Guidance**: Visual lane indicators

### ❌ What Car Mode Cannot Do
- Display on vehicle's built-in screen (must use phone)
- Integrate with steering wheel controls
- Use vehicle's built-in speakers (uses phone audio)
- Appear in vehicle's app launcher
- Receive vehicle sensor data
- Control vehicle systems

## Usage Recommendations

### Best Practice for Current PWA
1. Mount phone in dashboard holder
2. Connect phone to car audio via Bluetooth
3. Enable Car Mode in AI Navigator
4. Use voice commands for hands-free control
5. Keep screen on during navigation

### Legal Considerations
- Check local laws about phone usage while driving
- Some jurisdictions require hands-free operation
- Dashboard mounting may have restrictions
- Ensure setup doesn't obstruct view

## Alternative Solutions

If CarPlay/Android Auto integration is required, see [Native Wrapper Options](./native-wrapper-options.md) for migration paths.

## Future Possibilities

### WebDriver BiDi & Automotive
There are emerging standards for web-based automotive experiences:
- WebDriver BiDi for browser automation
- Automotive-specific web APIs (proposed)
- W3C Automotive Working Group initiatives

However, these are not yet supported by CarPlay or Android Auto and remain experimental.

### Hybrid Approach
Consider a thin native shell that:
- Provides CarPlay/Android Auto integration
- Loads web-based navigation UI
- Bridges between native platform and web app
- Maintains most code as web technology

See [Native Wrapper Options](./native-wrapper-options.md) for details.
