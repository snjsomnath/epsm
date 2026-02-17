/**
 * Tests for API utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getApiUrl } from '../api'

describe('API Utils', () => {
  describe('getApiUrl', () => {
    it('should construct correct API URL with endpoint', () => {
      const url = getApiUrl('parse-idf')
      expect(url).toBe('/api/parse-idf')
    })

    it('should handle endpoint with leading slash', () => {
      const url = getApiUrl('/parse-idf')
      expect(url).toBe('/api/parse-idf')
    })

    it('should handle endpoint without leading slash', () => {
      const url = getApiUrl('simulations/list')
      expect(url).toBe('/api/simulations/list')
    })

    it('should handle empty endpoint', () => {
      const url = getApiUrl('')
      expect(url).toBe('/api/')
    })

    it('should handle nested endpoints', () => {
      const url = getApiUrl('simulations/123/results')
      expect(url).toBe('/api/simulations/123/results')
    })

    it('should handle query parameters', () => {
      const url = getApiUrl('simulations?status=completed')
      expect(url).toBe('/api/simulations?status=completed')
    })
  })
})
