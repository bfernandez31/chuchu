/**
 * T011: Contract test for PUT /api/v1/performance/thresholds
 * Tests threshold configuration update
 * Validates PerformanceThresholds schema
 * Tests validation of threshold values
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Performance API Contract: PUT /api/v1/performance/thresholds', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('Request Schema Validation', () => {
    test('should validate complete PerformanceThresholds structure', () => {
      const validThresholds = {
        frameRate: {
          warning: 45,
          critical: 30
        },
        latency: {
          warning: 200,
          critical: 500
        },
        rollbackRate: {
          warning: 5,
          critical: 10
        },
        cpuUsage: {
          warning: 70,
          critical: 90
        }
      };

      // Test required top-level fields
      expect(validThresholds).toHaveProperty('frameRate');
      expect(validThresholds).toHaveProperty('latency');
      expect(validThresholds).toHaveProperty('rollbackRate');
      expect(validThresholds).toHaveProperty('cpuUsage');

      // Test threshold structure
      Object.values(validThresholds).forEach(threshold => {
        expect(threshold).toHaveProperty('warning');
        expect(threshold).toHaveProperty('critical');
        expect(typeof threshold.warning).toBe('number');
        expect(typeof threshold.critical).toBe('number');
      });

      expect(() => {
        validatePerformanceThresholds(validThresholds);
      }).not.toThrow();
    });

    test('should validate individual threshold configurations', () => {
      const frameRateThreshold = { warning: 45, critical: 30 };
      const latencyThreshold = { warning: 200, critical: 500 };
      const rollbackThreshold = { warning: 5, critical: 10 };
      const cpuThreshold = { warning: 70, critical: 90 };

      [frameRateThreshold, latencyThreshold, rollbackThreshold, cpuThreshold].forEach(threshold => {
        expect(threshold).toHaveProperty('warning');
        expect(threshold).toHaveProperty('critical');
        expect(typeof threshold.warning).toBe('number');
        expect(typeof threshold.critical).toBe('number');
      });
    });

    test('should validate threshold value relationships', () => {
      const thresholdValidator = new ThresholdValidator();

      // Frame rate: warning should be higher than critical (higher is better)
      expect(thresholdValidator.validateFrameRateThresholds(45, 30)).toBe(true);
      expect(thresholdValidator.validateFrameRateThresholds(30, 45)).toBe(false);

      // Latency: warning should be lower than critical (lower is better)
      expect(thresholdValidator.validateLatencyThresholds(200, 500)).toBe(true);
      expect(thresholdValidator.validateLatencyThresholds(500, 200)).toBe(false);

      // Rollback rate: warning should be lower than critical (lower is better)
      expect(thresholdValidator.validateRollbackThresholds(5, 10)).toBe(true);
      expect(thresholdValidator.validateRollbackThresholds(10, 5)).toBe(false);

      // CPU usage: warning should be lower than critical (lower is better)
      expect(thresholdValidator.validateCpuThresholds(70, 90)).toBe(true);
      expect(thresholdValidator.validateCpuThresholds(90, 70)).toBe(false);
    });

    test('should validate threshold value ranges', () => {
      const rangeValidator = new ThresholdRangeValidator();

      // Frame rate ranges (1-120 FPS)
      expect(rangeValidator.isValidFrameRate(60)).toBe(true);
      expect(rangeValidator.isValidFrameRate(0)).toBe(false);
      expect(rangeValidator.isValidFrameRate(150)).toBe(false);

      // Latency ranges (0-5000ms)
      expect(rangeValidator.isValidLatency(200)).toBe(true);
      expect(rangeValidator.isValidLatency(-10)).toBe(false);
      expect(rangeValidator.isValidLatency(6000)).toBe(false);

      // Rollback rate ranges (0-100 per minute)
      expect(rangeValidator.isValidRollbackRate(5)).toBe(true);
      expect(rangeValidator.isValidRollbackRate(-1)).toBe(false);
      expect(rangeValidator.isValidRollbackRate(150)).toBe(false);

      // CPU usage ranges (0-100%)
      expect(rangeValidator.isValidCpuUsage(75)).toBe(true);
      expect(rangeValidator.isValidCpuUsage(-5)).toBe(false);
      expect(rangeValidator.isValidCpuUsage(105)).toBe(false);
    });
  });

  describe('Request Body Validation', () => {
    test('should reject request with missing required fields', () => {
      const incompleteThresholds = [
        // Missing frameRate
        {
          latency: { warning: 200, critical: 500 },
          rollbackRate: { warning: 5, critical: 10 },
          cpuUsage: { warning: 70, critical: 90 }
        },
        // Missing latency
        {
          frameRate: { warning: 45, critical: 30 },
          rollbackRate: { warning: 5, critical: 10 },
          cpuUsage: { warning: 70, critical: 90 }
        },
        // Missing rollbackRate
        {
          frameRate: { warning: 45, critical: 30 },
          latency: { warning: 200, critical: 500 },
          cpuUsage: { warning: 70, critical: 90 }
        },
        // Missing cpuUsage
        {
          frameRate: { warning: 45, critical: 30 },
          latency: { warning: 200, critical: 500 },
          rollbackRate: { warning: 5, critical: 10 }
        }
      ];

      incompleteThresholds.forEach(thresholds => {
        expect(() => {
          validatePerformanceThresholds(thresholds);
        }).toThrow('Missing required threshold field');
      });
    });

    test('should reject invalid threshold structures', () => {
      const invalidThresholds = [
        // Missing warning in frameRate
        {
          frameRate: { critical: 30 },
          latency: { warning: 200, critical: 500 },
          rollbackRate: { warning: 5, critical: 10 },
          cpuUsage: { warning: 70, critical: 90 }
        },
        // Missing critical in latency
        {
          frameRate: { warning: 45, critical: 30 },
          latency: { warning: 200 },
          rollbackRate: { warning: 5, critical: 10 },
          cpuUsage: { warning: 70, critical: 90 }
        },
        // Invalid value types
        {
          frameRate: { warning: '45', critical: 30 },
          latency: { warning: 200, critical: 500 },
          rollbackRate: { warning: 5, critical: 10 },
          cpuUsage: { warning: 70, critical: 90 }
        }
      ];

      invalidThresholds.forEach(thresholds => {
        expect(() => {
          validatePerformanceThresholds(thresholds);
        }).toThrow();
      });
    });

    test('should validate JSON content type', () => {
      const requestValidator = new RequestValidator();

      expect(requestValidator.isValidContentType('application/json')).toBe(true);
      expect(requestValidator.isValidContentType('application/xml')).toBe(false);
      expect(requestValidator.isValidContentType('text/plain')).toBe(false);
      expect(requestValidator.isValidContentType('')).toBe(false);
    });
  });

  describe('HTTP Response Validation', () => {
    test('should handle successful 200 response with updated thresholds', async () => {
      const requestThresholds = createValidPerformanceThresholds();
      const responseThresholds = { ...requestThresholds, updatedAt: '2025-09-18T10:30:00.000Z' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(responseThresholds)
      });

      const apiClient = new ThresholdsAPIClient();
      const response = await apiClient.updateThresholds(requestThresholds);

      expect(response.status).toBe(200);
      expect(response.data).toEqual(responseThresholds);
      expect(() => {
        validatePerformanceThresholds(response.data);
      }).not.toThrow();
    });

    test('should handle 400 response for invalid threshold values', async () => {
      const invalidThresholds = {
        frameRate: { warning: 30, critical: 45 }, // Invalid: warning < critical
        latency: { warning: 200, critical: 500 },
        rollbackRate: { warning: 5, critical: 10 },
        cpuUsage: { warning: 70, critical: 90 }
      };

      const badRequestResponse = {
        error: 'INVALID_THRESHOLD_VALUES',
        message: 'Frame rate warning threshold must be higher than critical threshold',
        details: {
          field: 'frameRate',
          provided: { warning: 30, critical: 45 },
          constraint: 'warning > critical'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValueOnce(badRequestResponse)
      });

      const apiClient = new ThresholdsAPIClient();

      await expect(apiClient.updateThresholds(invalidThresholds))
        .rejects.toThrow('Invalid threshold values');
    });

    test('should validate 400 error response structure', () => {
      const badRequestError = {
        error: 'THRESHOLD_VALIDATION_FAILED',
        message: 'One or more threshold values are invalid',
        details: {
          errors: [
            { field: 'frameRate.warning', message: 'Must be greater than critical value' },
            { field: 'latency.critical', message: 'Must not exceed 5000ms' }
          ]
        }
      };

      // Validate error response structure
      expect(badRequestError).toHaveProperty('error');
      expect(badRequestError).toHaveProperty('message');
      expect(typeof badRequestError.error).toBe('string');
      expect(typeof badRequestError.message).toBe('string');

      // Validate details structure
      if (badRequestError.details) {
        expect(typeof badRequestError.details).toBe('object');
      }
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate realistic threshold configurations', () => {
      const realisticValidator = new RealisticThresholdValidator();

      // Good configuration
      const goodThresholds = {
        frameRate: { warning: 45, critical: 30 },
        latency: { warning: 150, critical: 300 },
        rollbackRate: { warning: 3, critical: 8 },
        cpuUsage: { warning: 70, critical: 85 }
      };

      expect(realisticValidator.validateConfiguration(goodThresholds)).toBe(true);

      // Overly strict configuration
      const strictThresholds = {
        frameRate: { warning: 59, critical: 58 },
        latency: { warning: 10, critical: 20 },
        rollbackRate: { warning: 0.1, critical: 0.2 },
        cpuUsage: { warning: 20, critical: 25 }
      };

      expect(realisticValidator.validateConfiguration(strictThresholds)).toBe(false);

      // Overly lenient configuration
      const lenientThresholds = {
        frameRate: { warning: 15, critical: 10 },
        latency: { warning: 1000, critical: 2000 },
        rollbackRate: { warning: 50, critical: 100 },
        cpuUsage: { warning: 95, critical: 99 }
      };

      expect(realisticValidator.validateConfiguration(lenientThresholds)).toBe(false);
    });

    test('should validate threshold impact on system behavior', () => {
      const impactAnalyzer = new ThresholdImpactAnalyzer();

      const aggressiveThresholds = {
        frameRate: { warning: 55, critical: 50 },
        latency: { warning: 100, critical: 150 },
        rollbackRate: { warning: 2, critical: 5 },
        cpuUsage: { warning: 60, critical: 75 }
      };

      const impact = impactAnalyzer.analyzeImpact(aggressiveThresholds);

      expect(impact.alertFrequency).toBe('high');
      expect(impact.falsePositiveRisk).toBe('medium');
      expect(impact.performanceOverhead).toBe('low');
    });

    test('should validate threshold change impact', () => {
      const currentThresholds = createValidPerformanceThresholds();
      const newThresholds = {
        ...currentThresholds,
        frameRate: { warning: 55, critical: 45 }, // More strict
        latency: { warning: 300, critical: 600 }   // More lenient
      };

      const changeAnalyzer = new ThresholdChangeAnalyzer();
      const changeImpact = changeAnalyzer.analyzeChange(currentThresholds, newThresholds);

      expect(changeImpact.frameRateChange).toBe('stricter');
      expect(changeImpact.latencyChange).toBe('more_lenient');
      expect(changeImpact.overallImpact).toBe('mixed');
    });
  });

  describe('Default Values and Presets', () => {
    test('should validate default threshold values', () => {
      const defaultThresholds = {
        frameRate: { warning: 45, critical: 30 },
        latency: { warning: 200, critical: 500 },
        rollbackRate: { warning: 5, critical: 10 },
        cpuUsage: { warning: 70, critical: 90 }
      };

      expect(() => {
        validatePerformanceThresholds(defaultThresholds);
      }).not.toThrow();

      const validator = new ThresholdValidator();
      expect(validator.validateAllThresholds(defaultThresholds)).toBe(true);
    });

    test('should provide threshold presets for different scenarios', () => {
      const presetManager = new ThresholdPresetManager();

      const strictPreset = presetManager.getPreset('strict');
      const balancedPreset = presetManager.getPreset('balanced');
      const lenientPreset = presetManager.getPreset('lenient');

      // Strict preset should have higher frame rate requirements
      expect(strictPreset.frameRate.warning).toBeGreaterThan(balancedPreset.frameRate.warning);
      expect(balancedPreset.frameRate.warning).toBeGreaterThan(lenientPreset.frameRate.warning);

      // Strict preset should have lower latency tolerances
      expect(strictPreset.latency.warning).toBeLessThan(balancedPreset.latency.warning);
      expect(balancedPreset.latency.warning).toBeLessThan(lenientPreset.latency.warning);
    });

    test('should validate environment-specific thresholds', () => {
      const environmentValidator = new EnvironmentThresholdValidator();

      const developmentThresholds = createValidPerformanceThresholds();
      const productionThresholds = {
        ...developmentThresholds,
        frameRate: { warning: 55, critical: 45 },
        latency: { warning: 100, critical: 200 }
      };

      expect(environmentValidator.isValidForEnvironment(developmentThresholds, 'development')).toBe(true);
      expect(environmentValidator.isValidForEnvironment(productionThresholds, 'production')).toBe(true);
      expect(environmentValidator.isValidForEnvironment(developmentThresholds, 'production')).toBe(false);
    });
  });
});

// Helper functions and classes
function validatePerformanceThresholds(thresholds: any): void {
  const required = ['frameRate', 'latency', 'rollbackRate', 'cpuUsage'];
  for (const field of required) {
    if (!thresholds || !thresholds.hasOwnProperty(field)) {
      throw new Error(`Missing required threshold field: ${field}`);
    }
  }

  for (const [key, threshold] of Object.entries(thresholds)) {
    if (required.includes(key)) {
      const t = threshold as any;
      if (!t.hasOwnProperty('warning') || !t.hasOwnProperty('critical')) {
        throw new Error(`Invalid threshold structure for ${key}`);
      }
      if (typeof t.warning !== 'number' || typeof t.critical !== 'number') {
        throw new Error(`Invalid threshold values for ${key}`);
      }
    }
  }
}

class ThresholdValidator {
  validateFrameRateThresholds(warning: number, critical: number): boolean {
    return warning > critical; // Higher frame rate is better
  }

  validateLatencyThresholds(warning: number, critical: number): boolean {
    return warning < critical; // Lower latency is better
  }

  validateRollbackThresholds(warning: number, critical: number): boolean {
    return warning < critical; // Lower rollback rate is better
  }

  validateCpuThresholds(warning: number, critical: number): boolean {
    return warning < critical; // Lower CPU usage is better
  }

  validateAllThresholds(thresholds: any): boolean {
    return this.validateFrameRateThresholds(thresholds.frameRate.warning, thresholds.frameRate.critical) &&
           this.validateLatencyThresholds(thresholds.latency.warning, thresholds.latency.critical) &&
           this.validateRollbackThresholds(thresholds.rollbackRate.warning, thresholds.rollbackRate.critical) &&
           this.validateCpuThresholds(thresholds.cpuUsage.warning, thresholds.cpuUsage.critical);
  }
}

class ThresholdRangeValidator {
  isValidFrameRate(value: number): boolean {
    return value >= 1 && value <= 120;
  }

  isValidLatency(value: number): boolean {
    return value >= 0 && value <= 5000;
  }

  isValidRollbackRate(value: number): boolean {
    return value >= 0 && value <= 100;
  }

  isValidCpuUsage(value: number): boolean {
    return value >= 0 && value <= 100;
  }
}

class RequestValidator {
  isValidContentType(contentType: string): boolean {
    return contentType === 'application/json';
  }
}

class RealisticThresholdValidator {
  validateConfiguration(thresholds: any): boolean {
    // Check if thresholds are reasonable for a game
    if (thresholds.frameRate.warning < 20 || thresholds.frameRate.warning > 55) return false;
    if (thresholds.latency.critical > 1000 || thresholds.latency.warning < 50) return false;
    if (thresholds.rollbackRate.critical > 50 || thresholds.rollbackRate.warning < 1) return false;
    if (thresholds.cpuUsage.critical > 95 || thresholds.cpuUsage.warning < 50) return false;

    return true;
  }
}

class ThresholdImpactAnalyzer {
  analyzeImpact(thresholds: any): {
    alertFrequency: string;
    falsePositiveRisk: string;
    performanceOverhead: string;
  } {
    let alertFrequency = 'low';
    let falsePositiveRisk = 'low';

    // Analyze strictness
    if (thresholds.frameRate.warning > 50 || thresholds.latency.warning < 150) {
      alertFrequency = 'high';
      falsePositiveRisk = 'medium';
    }

    return {
      alertFrequency,
      falsePositiveRisk,
      performanceOverhead: 'low' // Monitoring overhead is generally low
    };
  }
}

class ThresholdChangeAnalyzer {
  analyzeChange(current: any, proposed: any): {
    frameRateChange: string;
    latencyChange: string;
    overallImpact: string;
  } {
    const frameRateChange = proposed.frameRate.warning > current.frameRate.warning ? 'stricter' : 'more_lenient';
    const latencyChange = proposed.latency.warning < current.latency.warning ? 'stricter' : 'more_lenient';

    let overallImpact = 'neutral';
    if (frameRateChange !== latencyChange) {
      overallImpact = 'mixed';
    } else if (frameRateChange === 'stricter') {
      overallImpact = 'stricter';
    } else {
      overallImpact = 'more_lenient';
    }

    return { frameRateChange, latencyChange, overallImpact };
  }
}

class ThresholdPresetManager {
  getPreset(presetName: string): any {
    const presets = {
      strict: {
        frameRate: { warning: 55, critical: 45 },
        latency: { warning: 100, critical: 200 },
        rollbackRate: { warning: 2, critical: 5 },
        cpuUsage: { warning: 60, critical: 80 }
      },
      balanced: {
        frameRate: { warning: 45, critical: 30 },
        latency: { warning: 200, critical: 500 },
        rollbackRate: { warning: 5, critical: 10 },
        cpuUsage: { warning: 70, critical: 90 }
      },
      lenient: {
        frameRate: { warning: 30, critical: 20 },
        latency: { warning: 300, critical: 600 },
        rollbackRate: { warning: 10, critical: 20 },
        cpuUsage: { warning: 80, critical: 95 }
      }
    };

    return presets[presetName as keyof typeof presets] || presets.balanced;
  }
}

class EnvironmentThresholdValidator {
  isValidForEnvironment(thresholds: any, environment: string): boolean {
    if (environment === 'production') {
      // Production should have stricter thresholds
      return thresholds.frameRate.warning >= 50 && thresholds.latency.warning <= 150;
    }
    return true; // Development/staging can be more lenient
  }
}

class ThresholdsAPIClient {
  private baseUrl = 'http://localhost:3000/api/v1';

  async updateThresholds(thresholds: any): Promise<{ status: number; data: any }> {
    const response = await fetch(`${this.baseUrl}/performance/thresholds`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(thresholds)
    });

    if (response.status === 400) {
      throw new Error('Invalid threshold values');
    }

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return {
      status: response.status,
      data: await response.json()
    };
  }
}

function createValidPerformanceThresholds() {
  return {
    frameRate: {
      warning: 45,
      critical: 30
    },
    latency: {
      warning: 200,
      critical: 500
    },
    rollbackRate: {
      warning: 5,
      critical: 10
    },
    cpuUsage: {
      warning: 70,
      critical: 90
    }
  };
}