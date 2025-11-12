# Native Integration Notes for AI Navigator

This folder contains documentation about native platform integrations, limitations, and potential migration paths for AI Navigator.

## Overview

AI Navigator is currently a Progressive Web App (PWA) that works across platforms through the browser. While PWAs offer excellent cross-platform compatibility, there are limitations when it comes to deep system integrations like CarPlay and Android Auto.

## Contents

- [CarPlay & Android Auto Limitations](./carplay-android-auto.md) - Why web apps can't integrate with vehicle infotainment systems
- [Native Wrapper Options](./native-wrapper-options.md) - Potential paths to native app status
- [Migration Considerations](./migration-considerations.md) - What to consider before going native

## Quick Summary

### What Works Now (PWA)
- ✅ Installable to home screen (iOS, Android, Desktop)
- ✅ Offline functionality with service workers
- ✅ Full-screen standalone mode
- ✅ Push notifications (Android, Desktop)
- ✅ Geolocation API
- ✅ Device orientation/sensors
- ✅ Camera access (for AR features)
- ✅ Local storage and caching
- ✅ Background sync
- ✅ Works on all platforms

### What Doesn't Work (PWA Limitations)
- ❌ CarPlay integration
- ❌ Android Auto integration
- ❌ App Store distribution
- ❌ Push notifications on iOS
- ❌ Background location updates
- ❌ System-level integrations
- ❌ In-app purchases through stores

## Current State

AI Navigator currently includes:
- **Car Mode UI**: Optimized interface for driving with larger buttons and higher contrast
- **Offline Maps**: Download map regions for offline navigation
- **Voice Guidance**: Turn-by-turn spoken directions
- **AR Preview**: Augmented reality navigation overlay

These features work great in the browser but cannot integrate with CarPlay or Android Auto.

## Next Steps

If vehicle integration is a priority, review the [native wrapper options](./native-wrapper-options.md) to understand the migration path and trade-offs.
