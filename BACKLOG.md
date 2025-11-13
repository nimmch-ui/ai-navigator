# AI Navigator - Feature Backlog

This document tracks planned enhancements and AI integrations that depend on external ML models, additional data sources, or future platform capabilities.

## AI & Machine Learning Integration

### Computer Vision & Night Vision

**Animal Detection (NightVisionService)**
- **Status**: Planned
- **Dependencies**: TensorFlow.js COCO-SSD or OpenAI Vision API
- **Description**: Real-time animal detection in low-light camera feed for night driving safety
- **Priority**: Medium
- **Reference**: `client/src/services/vision/NightVisionService.ts:340`

**Pedestrian Detection (NightVisionService)**
- **Status**: Planned
- **Dependencies**: TensorFlow.js COCO-SSD or OpenAI Vision API
- **Description**: Real-time pedestrian detection in low-light conditions
- **Priority**: High (safety critical)
- **Reference**: `client/src/services/vision/NightVisionService.ts:349`

**Road Line Detection (NightVisionService)**
- **Status**: Planned
- **Dependencies**: Computer vision algorithm or trained ML model for lane marking detection
- **Description**: Detect and highlight road lane markings in night vision feed
- **Priority**: Medium
- **Reference**: `client/src/services/vision/NightVisionService.ts:358`

### Predictive Navigation

**Lane Deviation Prediction (PredictiveEngine)**
- **Status**: Pending data availability
- **Dependencies**: Reliable lane geometry data from mapping provider (Mapbox/TomTom lane-level data)
- **Description**: Predict lane deviation risk based on current trajectory and lane geometry
- **Priority**: Medium
- **Reference**: `client/src/services/ai/PredictiveEngine.ts:347`
- **Notes**: Current implementation calculates risk score of 0 as placeholder until lane tracking data is available

## Navigation Features

**Deep Link Navigation Trigger (DeepLinks)**
- **Status**: Pending navigation service integration
- **Dependencies**: Navigation service with programmatic start/stop API
- **Description**: Auto-start navigation when deep link contains start and end coordinates
- **Priority**: Low
- **Reference**: `client/src/services/deepLinks.ts:121`
- **Notes**: Deep link parsing complete; awaiting navigation service hookup

## Documentation

All inline TODO comments in the codebase now reference this backlog document to maintain production-ready code quality while tracking future enhancements.

## Contributing

When adding new backlog items:
1. Add entry to this document with full context
2. Replace inline TODOs with: `// See BACKLOG.md: [Feature Name]`
3. Include status, dependencies, priority, and file reference
