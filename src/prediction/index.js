"use strict";
// Prediction engine exports
// TODO: Implement these modules in T023-T025
// export * from './prediction-engine';
// export * from './interpolation-service';
// export * from './rollback-manager';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREDICTION_CONFIG = void 0;
// Prediction system configuration
exports.PREDICTION_CONFIG = {
    // Prediction parameters
    MAX_PREDICTION_TIME_MS: 100,
    PREDICTION_CONFIDENCE_THRESHOLD: 0.7,
    INPUT_BUFFER_SIZE: 10,
    // Interpolation settings
    INTERPOLATION_SMOOTHING_FACTOR: 0.8,
    VELOCITY_PREDICTION_WEIGHT: 0.6,
    POSITION_LERP_FACTOR: 0.3,
    // Rollback configuration
    MAX_ROLLBACK_FRAMES: 10,
    ROLLBACK_SMOOTHING_DURATION_MS: 33,
    PREDICTION_ERROR_THRESHOLD_PIXELS: 2,
    // Visual correction easing
    EASING_CURVES: {
        LINEAR: function (t) { return t; },
        EASE_OUT: function (t) { return 1 - Math.pow(1 - t, 3); },
        EASE_IN_OUT: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    },
    // Input rate limiting
    MAX_INPUTS_PER_SECOND: 60,
    INPUT_RATE_WINDOW_MS: 1000
};
//# sourceMappingURL=index.js.map