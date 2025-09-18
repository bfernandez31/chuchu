# Data Model: Hybrid Predictive Rendering System

**Date**: 2025-09-18
**Phase**: Phase 1 - Design Artifacts

## Overview

This document defines the data structures and relationships required for the hybrid predictive rendering system, focusing on state management, prediction, and reconciliation between client and server.

## Core Entities

### 1. AuthoritativeGameState

**Purpose**: Server-side canonical game state that serves as the single source of truth.

**Attributes**:
- `timestamp`: Server timestamp when state was generated (number)
- `sequence`: Incremental sequence number for ordering (number)
- `players`: Array of authoritative player states (AuthoritativePlayerState[])
- `entities`: Array of game entities with positions (GameEntity[])
- `arrows`: Array of placed arrows (Arrow[])
- `boardSize`: Current board dimensions (BoardDimensions)
- `gamePhase`: Current game phase (GamePhase enum)
- `performance`: Server performance metrics (ServerPerformanceMetrics)

**Validation Rules**:
- Timestamp must be monotonically increasing
- Sequence number must increment by 1 per update
- All entity positions must be within board boundaries
- Maximum 32 players supported
- Performance metrics must be within acceptable ranges

**State Transitions**:
- `WAITING` → `ACTIVE` when minimum players joined
- `ACTIVE` → `ENDING` when time expires or goals met
- `ENDING` → `WAITING` when new round starts

### 2. PredictiveGameState

**Purpose**: Client-side predicted game state based on local input and interpolation.

**Attributes**:
- `baseTimestamp`: Timestamp of last received authoritative state (number)
- `predictionTimestamp`: Current prediction time (number)
- `predictedPlayers`: Array of predicted player states (PredictedPlayerState[])
- `predictedEntities`: Array of predicted entity states (PredictedEntity[])
- `localPlayerInput`: Buffer of unacknowledged input (PlayerInputBuffer)
- `confidence`: Prediction confidence level (0.0-1.0)
- `interpolationState`: Current interpolation parameters (InterpolationState)

**Validation Rules**:
- Prediction timestamp must be >= base timestamp
- Confidence must be between 0.0 and 1.0
- Input buffer must not exceed 10 entries
- Predicted positions must be physically possible

**Relationships**:
- Derived from AuthoritativeGameState through prediction algorithms
- Synchronized with PlayerInput through input buffer
- Reconciled with incoming AuthoritativeGameState updates

### 3. PlayerInput

**Purpose**: Timestamped user actions for prediction and rollback calculations.

**Attributes**:
- `playerId`: Unique player identifier (string)
- `timestamp`: Client timestamp when input occurred (number)
- `sequence`: Input sequence number (number)
- `inputType`: Type of input action (InputType enum)
- `data`: Input-specific data (InputData union)
- `predicted`: Whether this input was client-predicted (boolean)
- `acknowledged`: Whether server has confirmed this input (boolean)

**Input Types**:
- `ARROW_PLACE`: Arrow placement with position and direction
- `MOVE`: Player movement direction
- `ACTION`: Special game actions (pause, restart, etc.)

**Validation Rules**:
- Timestamp must be within acceptable time window (±1000ms)
- Sequence numbers must be unique per player session
- Input data must match input type requirements
- Maximum 60 inputs per second per player

**State Management**:
- Stored in client input buffer until acknowledged
- Used for rollback calculations when predictions diverge
- Replayed after rollback to maintain user intent

### 4. StateReconciliation

**Purpose**: Correction event applied when client prediction diverges from server authority.

**Attributes**:
- `timestamp`: When reconciliation occurred (number)
- `rollbackDistance`: How many frames to roll back (number)
- `corrections`: Array of entity corrections (EntityCorrection[])
- `inputReplay`: Inputs to replay after rollback (PlayerInput[])
- `smoothingDuration`: Time to smooth visual correction (number)
- `severity`: Reconciliation severity level (ReconciliationSeverity enum)

**Correction Types**:
- `POSITION`: Entity position correction
- `VELOCITY`: Entity velocity adjustment
- `STATE`: Entity state change (direction, status)
- `CREATION`: Entity creation/deletion

**Validation Rules**:
- Rollback distance must be ≤ 5 frames (83ms at 60 FPS)
- Smoothing duration must be 16-50ms (1-3 frames)
- Severity must match correction magnitude
- Input replay must preserve original timestamps

**Smoothing Strategy**:
- `MINOR` (≤1 pixel): No visual correction needed
- `MODERATE` (1-5 pixels): Smooth interpolation over 2 frames
- `MAJOR` (>5 pixels): Immediate correction with easing

### 5. PerformanceMetrics

**Purpose**: Real-time performance monitoring for system optimization.

**Client Metrics**:
- `frameRate`: Current FPS (number)
- `frameTime`: Average frame render time in ms (number)
- `predictionAccuracy`: Prediction accuracy percentage (number)
- `rollbackFrequency`: Rollbacks per second (number)
- `networkLatency`: Round-trip time in ms (number)
- `memoryUsage`: Client memory usage in MB (number)

**Server Metrics**:
- `tickRate`: Current server tick rate (number)
- `cpuUsage`: Server CPU utilization percentage (number)
- `memoryUsage`: Server memory usage in MB (number)
- `activeConnections`: Number of active WebSocket connections (number)
- `messagesSent`: Messages sent per second (number)
- `messagesReceived`: Messages received per second (number)

**Validation Rules**:
- Frame rate must be between 1-120 FPS
- Memory usage must be < 500MB for client, < 2GB for server
- Latency must be < 1000ms for valid connections
- All percentages must be 0-100

## Enhanced Message Protocols

### 1. DeltaGameState

**Purpose**: Compressed state update containing only changed data.

**Structure**:
```typescript
interface DeltaGameState {
  baseSequence: number;          // Previous state sequence
  deltaSequence: number;         // Current state sequence
  timestamp: number;             // Server timestamp
  changedPlayers: PlayerDelta[]; // Only modified players
  changedEntities: EntityDelta[]; // Only modified entities
  newArrows: Arrow[];            // Newly placed arrows
  removedEntityIds: string[];    // Deleted entity IDs
  compressionRatio: number;      // Compression efficiency
}
```

**Compression Techniques**:
- Send only modified entity properties
- Use relative coordinates for small movements
- Batch position updates for multiple entities
- Optimize protobuf field presence

### 2. PredictionInput

**Purpose**: Enhanced input message with prediction metadata.

**Structure**:
```typescript
interface PredictionInput {
  input: PlayerInput;           // Base input data
  clientTimestamp: number;      // Client-side timestamp
  predictionId: string;         // Unique prediction identifier
  expectedOutcome: string;      // Client's predicted result
  confidenceLevel: number;      // Prediction confidence
}
```

### 3. RollbackCorrection

**Purpose**: Server-initiated correction message.

**Structure**:
```typescript
interface RollbackCorrection {
  correctionId: string;         // Unique correction identifier
  affectedEntities: string[];   // Entity IDs requiring correction
  rollbackToSequence: number;   // Target sequence for rollback
  corrections: EntityCorrection[]; // Specific corrections
  replayInputs: PlayerInput[];  // Inputs to replay
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; // Correction priority
}
```

## State Flow Diagrams

### Client Prediction Flow
```
User Input → Input Buffer → Prediction Engine → Render Predicted State
     ↓
Await Server Response → Reconciliation Check → Apply Corrections (if needed)
```

### Server Authority Flow
```
Receive Input → Validate → Apply to Authoritative State → Generate Delta → Broadcast
```

### Rollback Flow
```
Detect Divergence → Calculate Rollback → Apply Corrections → Replay Inputs → Resume Prediction
```

## Data Relationships

### Primary Relationships
- `AuthoritativeGameState` has many `AuthoritativePlayerState`
- `PredictiveGameState` references `AuthoritativeGameState` as base
- `PlayerInput` belongs to specific `Player`
- `StateReconciliation` corrects `PredictiveGameState`
- `PerformanceMetrics` aggregate from all system components

### Temporal Relationships
- States are ordered by timestamp and sequence
- Inputs are buffered and ordered by sequence
- Reconciliations reference specific past states
- Metrics are aggregated over time windows

### Consistency Rules
- All timestamps use consistent clock source
- Sequence numbers ensure ordering integrity
- State transitions follow defined rules
- Corrections maintain causal consistency

## Storage and Caching Strategy

### Client-Side Storage
- **Input Buffer**: Ring buffer of last 60 inputs (1 second at 60 FPS)
- **State History**: Ring buffer of last 10 authoritative states
- **Prediction Cache**: Current predicted state plus 3 frames ahead
- **Metrics Buffer**: Last 5 seconds of performance data

### Server-Side Storage
- **Current State**: Single authoritative game state
- **State Deltas**: Last 10 delta states for late clients
- **Player Sessions**: Input validation and rate limiting
- **Performance Aggregation**: Rolling metrics for monitoring

### Memory Management
- Automatic cleanup of old states and inputs
- Maximum buffer sizes enforced
- Compression for historical data
- Efficient protobuf serialization

## Implementation Notes

### TypeScript Interfaces
All entities will be implemented as TypeScript interfaces with strict typing and validation. Protobuf definitions will generate corresponding TypeScript types for network serialization.

### Validation Framework
Each entity includes validation methods to ensure data integrity:
- Range validation for numeric fields
- Timestamp validation for temporal consistency
- Reference validation for entity relationships
- Performance validation for metrics

### Testing Strategy
- Unit tests for each entity's validation rules
- Integration tests for state transitions
- Performance tests for data structure efficiency
- Consistency tests for client-server synchronization

This data model provides the foundation for implementing the hybrid predictive rendering system while maintaining data integrity and performance requirements.