# Tasks: Hybrid Predictive Rendering System

**Input**: Design documents from `/specs/001-sur-github-il/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → ✅ Implementation plan found - TypeScript/Node.js web app
   → ✅ Tech stack: TypeScript 5.2.2, WebSocket, Protobuf, HTML5 Canvas
2. Load optional design documents:
   → ✅ data-model.md: 5 core entities + enhanced protocols
   → ✅ contracts/: WebSocket protocol + Performance API
   → ✅ research.md: Architecture decisions loaded
   → ✅ quickstart.md: 6 integration test scenarios
3. Generate tasks by category:
   → ✅ Setup: TypeScript environment, testing framework, dependencies
   → ✅ Tests: Contract tests, integration scenarios
   → ✅ Core: Models, prediction engine, rollback manager, performance monitor
   → ✅ Integration: Enhanced WebSocket, canvas rendering, API endpoints
   → ✅ Polish: Performance validation, documentation
4. Apply task rules:
   → ✅ Different files marked [P] for parallel execution
   → ✅ Tests before implementation (TDD principle)
5. Tasks numbered T001-T043 sequentially
6. Dependencies mapped for execution order
7. Parallel execution examples provided
8. Task completeness validated:
   → ✅ All contracts have tests
   → ✅ All entities have model implementations
   → ✅ All scenarios have integration tests
9. Return: SUCCESS (43 tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in task descriptions

## Path Conventions

Based on plan.md structure: Single TypeScript project with enhanced architecture

- **Backend**: `src/` with new subdirectories for prediction components
- **Frontend**: `browser/` with enhanced rendering components
- **Tests**: `tests/` directory to be created with comprehensive test structure

## Phase 3.1: Setup and Infrastructure

- [x] **T001** Create enhanced project structure for hybrid rendering components
  - Create `src/prediction/`, `src/networking/`, `src/performance/` directories
  - Create `tests/` directory with subdirectories: `contract/`, `integration/`, `unit/`
  - Set up TypeScript configuration for new modules

- [x] **T002** Initialize testing framework and dependencies
  - Install and configure Jest for TypeScript testing
  - Add @types/jest and ts-jest dependencies
  - Configure jest.config.js for project structure
  - Add testing scripts to package.json

- [x] **T003** [P] Configure enhanced protobuf schema for hybrid rendering
  - Extend `src/messages.proto` with DeltaGameState, PredictionInput, RollbackCorrection
  - Add PerformanceMetrics and StateReconciliation message types
  - Regenerate TypeScript types: `npm run protobuf`

- [x] **T004** [P] Set up performance monitoring dependencies
  - Install performance monitoring libraries (performance-hooks for Node.js)
  - Configure browser Performance API integration
  - Set up metrics collection infrastructure

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (WebSocket Protocol)

- [x] **T005** [P] Contract test for predictiveInput message in `tests/contract/websocket_predictive_input.test.ts`
  - Test message format validation according to websocket-protocol.json
  - Validate timestamp, sequence, inputType, and prediction fields
  - Test rate limiting (60 inputs/second)

- [x] **T006** [P] Contract test for deltaGameState message in `tests/contract/websocket_delta_state.test.ts`
  - Test delta compression message format
  - Validate baseSequence, deltaSequence, changedPlayers, changedEntities
  - Test compression ratio calculations

- [x] **T007** [P] Contract test for rollbackCorrection message in `tests/contract/websocket_rollback.test.ts`
  - Test rollback correction message structure
  - Validate correctionId, rollbackToSequence, corrections array
  - Test priority levels and affected entities

- [x] **T008** [P] Contract test for inputAcknowledgment message in `tests/contract/websocket_acknowledgment.test.ts`
  - Test server acknowledgment message format
  - Validate playerId, acknowledgedSequence, processingTime
  - Test acknowledgment timing requirements

### Contract Tests (Performance API)

- [x] **T009** [P] Contract test for GET /api/v1/performance/metrics in `tests/contract/performance_metrics_get.test.ts`
  - Test response schema validation according to performance-api.json
  - Validate server, game, network, and client metrics structure
  - Test timeRange parameter handling

- [x] **T010** [P] Contract test for GET /api/v1/performance/players/{playerId} in `tests/contract/performance_player_get.test.ts`
  - Test player-specific metrics response schema
  - Validate PlayerPerformanceMetrics structure
  - Test 404 handling for non-existent players

- [x] **T011** [P] Contract test for PUT /api/v1/performance/thresholds in `tests/contract/performance_thresholds_put.test.ts`
  - Test threshold configuration update
  - Validate PerformanceThresholds schema
  - Test validation of threshold values

### Integration Tests (User Scenarios)

- [x] **T012** [P] Integration test for Scenario 1: Basic Predictive Input Response in `tests/integration/basic_prediction.test.ts`
  - Test immediate visual feedback for player actions
  - Validate <16ms input response time
  - Test server acknowledgment within 100ms
  - Verify prediction accuracy (±1 pixel tolerance)

- [x] **T013** [P] Integration test for Scenario 2: Network Latency Tolerance in `tests/integration/latency_tolerance.test.ts`
  - Test 200ms network latency simulation
  - Validate 60 FPS maintenance under latency
  - Test multiplayer state synchronization
  - Verify smooth gameplay experience

- [x] **T014** [P] Integration test for Scenario 3: Multi-Player Coordination in `tests/integration/multiplayer.test.ts`
  - Test 8 concurrent players scenario
  - Validate server performance under load
  - Test state synchronization across all clients
  - Verify bandwidth usage targets

- [x] **T015** [P] Integration test for Scenario 4: Rollback and Correction in `tests/integration/rollback.test.ts`
  - Test prediction divergence and correction
  - Validate <50ms rollback smoothing
  - Test visual correction imperceptibility
  - Verify state accuracy restoration

- [x] **T016** [P] Integration test for Scenario 5: Performance Monitoring in `tests/integration/performance_monitoring.test.ts`
  - Test real-time metrics collection
  - Validate performance API endpoints
  - Test alert triggering at thresholds
  - Verify metrics accuracy (±5%)

- [x] **T017** [P] Integration test for Scenario 6: System Recovery in `tests/integration/system_resilience.test.ts`
  - Test network disconnection tolerance
  - Validate automatic reconnection (<5 seconds)
  - Test state synchronization after reconnection
  - Verify data integrity preservation

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models and Types

- [x] **T018** [P] Implement AuthoritativeGameState model in `src/models/authoritative-game-state.ts`
  - Define TypeScript interface matching data-model.md specification
  - Implement validation rules (timestamp monotonic, sequence increment)
  - Add state transition logic (WAITING → ACTIVE → ENDING)
  - Include performance metrics integration

- [x] **T019** [P] Implement PredictiveGameState model in `src/models/predictive-game-state.ts`
  - Define client-side predicted state structure
  - Implement confidence calculation (0.0-1.0)
  - Add interpolation state management
  - Include input buffer management (max 10 entries)

- [x] **T020** [P] Implement PlayerInput model in `src/models/player-input.ts`
  - Define timestamped input structure
  - Implement input type validation (ARROW_PLACE, MOVE, ACTION)
  - Add rate limiting validation (60 inputs/second)
  - Include acknowledgment tracking

- [x] **T021** [P] Implement StateReconciliation model in `src/models/state-reconciliation.ts`
  - Define rollback correction structure
  - Implement severity classification (MINOR, MODERATE, MAJOR)
  - Add smoothing duration calculation (16-50ms)
  - Include input replay management

- [x] **T022** [P] Implement PerformanceMetrics model in `src/models/performance-metrics.ts`
  - Define client and server metrics structure
  - Implement validation ranges (FPS 1-120, latency <1000ms)
  - Add metrics aggregation logic
  - Include threshold monitoring

### Core Prediction Engine

- [x] **T023** Implement PredictionEngine in `src/prediction/prediction-engine.ts`
  - Create client-side state prediction algorithms
  - Implement linear interpolation with velocity prediction
  - Add prediction confidence scoring
  - Integrate with PlayerInput buffer management
  - Dependencies: T018, T019, T020

- [x] **T024** Implement InterpolationService in `src/prediction/interpolation-service.ts`
  - Create smooth state transition algorithms
  - Implement linear interpolation between server states
  - Add velocity extrapolation for prediction
  - Include boundary handling for collisions
  - Dependencies: T023

- [x] **T025** Implement RollbackManager in `src/prediction/rollback-manager.ts`
  - Create rollback netcode implementation
  - Implement visual correction smoothing (easing curves)
  - Add prediction error detection (>2 pixel threshold)
  - Include input replay after rollback
  - Dependencies: T021, T023

### Performance Monitoring System

- [x] **T026** [P] Implement PerformanceMonitor in `src/performance/performance-monitor.ts`
  - Create real-time metrics collection
  - Implement client and server metric aggregation
  - Add alert triggering at configured thresholds
  - Include historical data tracking
  - Dependencies: T022

- [x] **T027** [P] Implement MetricsCollector in `src/performance/metrics-collector.ts`
  - Create browser Performance API integration
  - Implement Node.js performance hooks
  - Add FPS calculation and frame time tracking
  - Include memory usage monitoring
  - Dependencies: T026

### Enhanced Networking

- [x] **T028** Enhance WebSocketBatcher in `src/queue.ts`
  - Extend existing WebSocketBatcher with delta compression
  - Implement adaptive batching (5ms → variable delay)
  - Add priority-based message handling
  - Include compression ratio tracking
  - Dependencies: T005, T006, T007, T008

- [x] **T029** Implement DeltaCompression in `src/networking/delta-compression.ts`
  - Create delta state calculation algorithms
  - Implement protobuf field presence optimization
  - Add change detection for players and entities
  - Include compression efficiency monitoring
  - Dependencies: T018, T028

- [x] **T030** Implement NetworkOptimizer in `src/networking/network-optimizer.ts`
  - Create adaptive tick rate management (50Hz → 20Hz)
  - Implement bandwidth usage optimization
  - Add connection quality monitoring
  - Include message prioritization
  - Dependencies: T028, T029

## Phase 3.4: Enhanced Client-Side Rendering

- [x] **T031** Enhance GameDisplay with multi-layer rendering in `browser/server/game.display.ts`
  - Extend existing GameDisplay class with layer separation
  - Implement background layer caching optimization
  - Add predictive rendering overlay
  - Include 60 FPS performance optimization
  - Dependencies: T023, T024

- [x] **T032** Implement PredictiveRenderer in `browser/server/predictive-renderer.ts`
  - Create client-side prediction rendering
  - Implement smooth interpolation display
  - Add local input immediate feedback
  - Include rollback visual correction
  - Dependencies: T025, T031

- [x] **T033** [P] Enhance player input handling in `browser/player/input.component.ts`
  - Extend existing input component with prediction
  - Add timestamped input generation
  - Implement immediate visual feedback
  - Include input buffer management
  - Dependencies: T020

## Phase 3.5: API Integration

- [x] **T034** Implement Performance API handlers in `src/api/performance-handlers.ts`
  - Create handler functions for performance monitoring endpoints
  - Implement GET /api/v1/performance/metrics handler
  - Add GET /api/v1/performance/players/{playerId} handler
  - Include PUT /api/v1/performance/thresholds handler
  - Add GET /api/v1/performance/alerts handler
  - Include GET /api/v1/performance/rollbacks handler
  - Dependencies: T026, T027

- [x] **T035** Integrate Performance API routes with find-my-way router in `src/router.ts`
  - Extend existing router with performance API routes using router.on()
  - Add route definitions for all performance endpoints
  - Implement error handling and JSON response formatting (reuse makeResponseOk helper)
  - Include query parameter parsing for timeRange, includeClients, severity
  - Add proper CORS headers (already handled by makeResponseOk)
  - Dependencies: T034

- [x] **T036** Implement WebSocket message routing enhancement in `src/queue.ts`
  - Extend existing message processing with new message types
  - Add predictiveInput message handling
  - Implement rollbackCorrection message distribution
  - Include inputAcknowledgment generation
  - Add rollback acknowledgment and ping/pong handling
  - Include performance monitoring integration
  - Dependencies: T028, T025

## Phase 3.6: Game Logic Integration

- [x] **T037** Integrate prediction engine with Game class in `src/game.ts`
  - Extend existing Game class with prediction support
  - Add authoritative state management
  - Implement delta state generation
  - Include performance metrics collection
  - Dependencies: T023, T026, T029

- [x] **T038** Enhance Player class with prediction in `src/player.ts`
  - Extend existing Player class with input buffering
  - Add prediction validation
  - Implement rollback coordination
  - Include performance tracking per player
  - Dependencies: T020, T025

## Phase 3.7: Performance Optimization

- [ ] **T039** [P] Implement Canvas performance optimizations in `browser/server/canvas-optimizer.ts`
  - Create dirty region rendering optimization
  - Implement entity layer caching
  - Add frame rate monitoring and adjustment
  - Include memory usage optimization
  - Dependencies: T031, T032

- [ ] **T040** [P] Add server performance optimization in `src/performance/server-optimizer.ts`
  - Implement CPU usage monitoring
  - Add memory leak detection
  - Create connection pool optimization
  - Include garbage collection tuning
  - Dependencies: T026, T030

## Phase 3.8: Validation and Polish

- [ ] **T041** [P] Performance validation testing in `tests/performance/hybrid_rendering_performance.test.ts`
  - Test 60 FPS maintenance under 500ms latency
  - Validate 20% bandwidth reduction vs current system
  - Test 30% server load reduction
  - Verify user experience metrics
  - Dependencies: T012-T017, T037-T040

- [ ] **T042** [P] Load testing with 32 concurrent players in `tests/load/concurrent_players.test.ts`
  - Test maximum player capacity
  - Validate performance under full load
  - Test network stability with high concurrency
  - Verify prediction accuracy at scale
  - Dependencies: T041

- [ ] **T043** [P] Update documentation and monitoring dashboard in `docs/hybrid-rendering.md`
  - Document new architecture components
  - Create performance monitoring guide
  - Add troubleshooting documentation
  - Include configuration reference
  - Dependencies: T026, T034

## Dependencies

### Critical Path Dependencies

- **Setup** (T001-T004) → All other tasks
- **Tests** (T005-T017) → Implementation (T018-T040)
- **Models** (T018-T022) → Core services (T023-T027)
- **Prediction Engine** (T023-T025) → Client rendering (T031-T033)
- **Networking** (T028-T030) → Game integration (T037-T038)
- **Core Implementation** (T018-T038) → Validation (T041-T043)

### Parallel Execution Blocks

- **Contract Tests**: T005-T011 can run simultaneously
- **Integration Tests**: T012-T017 can run simultaneously
- **Data Models**: T018-T022 can run simultaneously
- **Performance Components**: T026-T027 can run simultaneously
- **Client Components**: T033, T039 can run simultaneously
- **Documentation**: T043 can run independently

## Parallel Execution Examples

### Block 1: Contract Tests (Run Simultaneously)

```bash
# Launch all contract tests in parallel
Task: "Contract test for predictiveInput message in tests/contract/websocket_predictive_input.test.ts"
Task: "Contract test for deltaGameState message in tests/contract/websocket_delta_state.test.ts"
Task: "Contract test for rollbackCorrection message in tests/contract/websocket_rollback.test.ts"
Task: "Contract test for Performance API GET /metrics in tests/contract/performance_metrics_get.test.ts"
```

### Block 2: Integration Tests (Run Simultaneously)

```bash
# Launch all integration scenarios in parallel
Task: "Integration test for Basic Predictive Input Response in tests/integration/basic_prediction.test.ts"
Task: "Integration test for Network Latency Tolerance in tests/integration/latency_tolerance.test.ts"
Task: "Integration test for Multi-Player Coordination in tests/integration/multiplayer.test.ts"
Task: "Integration test for Rollback and Correction in tests/integration/rollback.test.ts"
```

### Block 3: Data Models (Run Simultaneously)

```bash
# Launch all model implementations in parallel
Task: "Implement AuthoritativeGameState model in src/models/authoritative-game-state.ts"
Task: "Implement PredictiveGameState model in src/models/predictive-game-state.ts"
Task: "Implement PlayerInput model in src/models/player-input.ts"
Task: "Implement PerformanceMetrics model in src/models/performance-metrics.ts"
```

## Task Execution Guidelines

### Test-Driven Development (TDD)

1. **Phase 3.2 must complete first** - All tests must be written and failing
2. **Verify test failures** before implementing any functionality
3. **One test → One implementation** cycle for each component
4. **Green tests** before moving to next task

### Performance Validation

- Each task includes performance acceptance criteria
- **60 FPS client rendering** must be maintained
- **<16ms input response** time required
- **20% bandwidth reduction** target
- **30% server load reduction** target

### Quality Gates

- **TypeScript compilation** must pass for each task
- **Test coverage** required for all new components
- **Performance benchmarks** must meet targets
- **Documentation** updated for architectural changes

## Success Criteria

The hybrid predictive rendering system implementation is complete when:

1. **All 43 tasks completed** with passing tests
2. **Performance targets achieved** (60 FPS, bandwidth/server load reductions)
3. **Integration tests passing** for all 6 quickstart scenarios
4. **Load testing validated** with 32 concurrent players
5. **Documentation complete** with troubleshooting guides
6. **Monitoring operational** with real-time performance dashboards

## Notes

- **[P] markers**: 23 tasks can run in parallel, 20 must run sequentially
- **File conflicts avoided**: No two [P] tasks modify the same file
- **Incremental commits**: Commit after each completed task
- **Rollback strategy**: Each task is independently reversible
- **Performance monitoring**: Continuous validation throughout implementation
