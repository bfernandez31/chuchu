# Research: Hybrid Predictive Rendering Architecture

**Date**: 2025-09-18
**Research Phase**: Phase 0 - Architecture Research

## Research Summary

This document consolidates research findings for implementing a hybrid predictive rendering system in the ChuChu Rocket multiplayer game, addressing client-side prediction, state interpolation, rollback netcode, and performance optimization.

## 1. Client-Side Prediction Patterns

### Decision: Lag Compensation with Client-Side Prediction
**Rationale**: Provides immediate visual feedback while maintaining server authority. Players see their actions instantly while server validates and corrects if necessary.

**Architecture Pattern**:
- Client immediately applies local input to predicted state
- Server processes authoritative state independently
- Client reconciles differences when server updates arrive
- Rollback applied only when prediction diverges significantly

**Alternatives Considered**:
- **Pure Server Authority**: Rejected due to visible input lag
- **Client Authority**: Rejected due to cheating vulnerability
- **Lockstep Simulation**: Rejected due to network complexity

### Implementation Approach
- Separate rendering pipeline from game logic pipeline
- Client maintains both predicted and authoritative state timelines
- Input buffer with timestamps for rollback calculations
- Maximum prediction window of 3-5 frames to limit visual rollback

## 2. WebSocket Batching Optimization

### Decision: Enhanced Delta Compression with Adaptive Batching
**Rationale**: Current system already has basic batching (WebSocketBatcher). Enhancement will reduce bandwidth by 20%+ through delta compression and adaptive update rates.

**Key Optimizations**:
- **Delta Compression**: Send only changed properties, not full state
- **Adaptive Tick Rate**: Reduce server updates from 50Hz to 20Hz
- **Priority-Based Updates**: Critical updates (collisions) sent immediately
- **State Compression**: Use protobuf efficiently with field presence

**Alternatives Considered**:
- **Binary Diff**: Too complex for real-time requirements
- **Fixed Compression**: Less efficient than adaptive approach
- **Full State Sync**: Current approach, insufficient bandwidth savings

### Current WebSocketBatcher Enhancement
The existing `WebSocketBatcher` class provides foundation:
```typescript
// Current: Batches updates by type
scheduleUpdate(updateType: 'game' | 'queue' | 'highscore')

// Enhanced: Add delta compression and priority
scheduleUpdate(updateType, deltaState?, priority?)
```

## 3. Canvas Rendering Performance

### Decision: Hybrid Canvas Strategy with Layer Optimization
**Rationale**: Maintain 60 FPS through strategic canvas layering and optimized redraw cycles.

**Performance Techniques**:
- **Background Layer Caching**: Grid and static elements cached in separate canvas
- **Entity Layer Optimization**: Only redraw moving objects and dirty regions
- **Interpolation Smoothing**: Smooth movement between server updates using linear interpolation
- **Predictive Rendering**: Render predicted positions immediately

**Current GameDisplay Enhancement**:
The existing system has optimization foundations:
```typescript
// Current: Basic grid caching
private gridCanvas!: HTMLCanvasElement;
private gridCached: boolean = false;

// Enhanced: Multi-layer approach
private backgroundLayer: HTMLCanvasElement;
private entitiesLayer: HTMLCanvasElement;
private predictiveLayer: HTMLCanvasElement;
```

**Alternatives Considered**:
- **WebGL**: Rejected due to complexity and current Canvas investment
- **Single Canvas**: Current approach, insufficient for 60 FPS target
- **DOM Manipulation**: Rejected due to performance limitations

## 4. Rollback Netcode Implementation

### Decision: Visual Rollback with Smoothing Interpolation
**Rationale**: Minimize jarring visual corrections while maintaining game accuracy.

**Rollback Strategy**:
- **Maximum Rollback Distance**: 5 frames (83ms at 60 FPS)
- **Smooth Correction**: Interpolate corrections over 2-3 frames
- **Rollback Threshold**: Only rollback when prediction error > 2 pixels
- **Input Replay**: Replay buffered inputs after rollback

**Visual Polish**:
- **Correction Easing**: Use easing curves for smooth position correction
- **Error Prediction**: Learn from rollback patterns to improve future predictions
- **Minimal UI Impact**: Most rollbacks should be invisible to players

**Alternatives Considered**:
- **Immediate Snap**: Rejected due to jarring visual experience
- **No Rollback**: Rejected due to accuracy requirements
- **Server Rewind**: Too complex for current architecture

## 5. State Interpolation Algorithms

### Decision: Linear Interpolation with Velocity Prediction
**Rationale**: Simple, performant, and sufficient for ChuChu Rocket's movement patterns.

**Interpolation Approach**:
- **Linear Interpolation**: Between known server states
- **Velocity Extrapolation**: Predict beyond last known state using velocity
- **Acceleration Hints**: Use direction changes to improve prediction
- **Boundary Handling**: Special handling for wall collisions and direction changes

**Mathematical Foundation**:
```
predicted_position = last_known_position + (velocity * time_delta)
interpolated_position = lerp(state_A, state_B, time_ratio)
```

**Alternatives Considered**:
- **Cubic Spline**: Too computationally expensive
- **Physics Simulation**: Overkill for simple movement patterns
- **No Interpolation**: Would result in choppy 20 FPS visuals

## 6. Performance Monitoring

### Decision: Real-Time Metrics Dashboard with Alerting
**Rationale**: Critical for validating performance improvements and monitoring system health.

**Key Metrics**:
- **Client Performance**: FPS, frame time, prediction accuracy
- **Network Performance**: Bandwidth usage, latency, packet loss
- **Server Performance**: CPU usage, memory usage, concurrent players
- **User Experience**: Rollback frequency, visual smoothness score

**Monitoring Architecture**:
- **Client Metrics**: Collected in browser, aggregated server-side
- **Performance API**: Browser Performance API for accurate timing
- **Server Metrics**: Node.js performance hooks and custom counters
- **Dashboard**: Real-time visualization of system health

**Alternatives Considered**:
- **External Monitoring**: Too complex for initial implementation
- **Log-Based Monitoring**: Insufficient for real-time requirements
- **No Monitoring**: Rejected due to performance validation needs

## Technical Integration Strategy

### Current Architecture Integration Points

**Existing Components to Enhance**:
1. **Game Class** (`src/game.ts`): Add prediction state management
2. **Queue Class** (`src/queue.ts`): Enhanced WebSocketBatcher integration
3. **GameDisplay** (`browser/server/game.display.ts`): Multi-layer rendering
4. **Player Interface** (`browser/player/`): Prediction feedback

**New Components Required**:
1. **PredictionEngine**: Client-side state prediction
2. **InterpolationService**: Smooth state transitions
3. **RollbackManager**: Handle prediction corrections
4. **PerformanceMonitor**: Metrics collection and reporting

### Protobuf Message Extensions

**Enhanced Message Types**:
- **DeltaGameState**: Compressed state updates
- **PredictionInput**: Timestamped player actions
- **RollbackCorrection**: Server-initiated corrections
- **PerformanceMetrics**: Real-time performance data

## Performance Targets Validation

### Expected Improvements
- **Client FPS**: Maintain 60 FPS during network lag up to 500ms
- **Network Reduction**: 20% bandwidth savings through delta compression
- **Server Load**: 30% reduction through lower tick rate (50Hz → 20Hz)
- **User Experience**: <50ms visual feedback for player actions

### Risk Mitigation
- **Fallback Mode**: Revert to current system if prediction fails
- **Progressive Enhancement**: Implement features incrementally
- **Performance Budgets**: Strict limits on computational overhead
- **Browser Compatibility**: Ensure support for target browsers

## Implementation Priority

### Phase 1: Foundation (Weeks 1-2)
- Separate rendering from game logic
- Implement basic prediction engine
- Add performance monitoring foundation

### Phase 2: Client Enhancement (Weeks 3-4)
- Client-side prediction implementation
- State interpolation system
- Enhanced canvas rendering

### Phase 3: Server Optimization (Weeks 5-6)
- Delta compression implementation
- Adaptive batching enhancement
- Server tick rate optimization

### Phase 4: Rollback System (Weeks 7-8)
- Rollback netcode implementation
- Visual smoothing algorithms
- Error correction optimization

### Phase 5: Performance Validation (Weeks 9-10)
- Load testing with 32 players
- Performance optimization
- Monitoring dashboard completion

## Conclusion

Research confirms the hybrid predictive rendering approach is feasible within the existing ChuChu Rocket architecture. The combination of client-side prediction, server authority, and optimized networking will achieve the target performance improvements while maintaining game integrity. The implementation can be done incrementally, reducing risk and allowing for iterative optimization.