/**
 * Achievement Definitions for BadgerBadge
 *
 * Each achievement has:
 * - id: Unique identifier (will be hashed to bytes32 in contract)
 * - name: Display name
 * - description: What the achievement is for
 * - category: Type of achievement
 * - validationRules: How the backend validates eligibility
 *
 * IMPORTANT: achievementId in contract = keccak256(id)
 * Use ethers.id(id) to convert string to bytes32
 */

export const ACHIEVEMENTS = [
  {
    id: 'RAINY_DAY_2025',
    name: 'Madison Rainy Day',
    description: 'Experienced a rainy day on campus during 2025',
    category: 'environment',
    icon: '🌧️',
    validationRules: {
      type: 'weather',
      condition: 'rain',
      location: {
        // Madison, WI approximate boundaries
        minLat: 43.0,
        maxLat: 43.15,
        minLng: -89.50,
        maxLng: -89.30,
      },
      // TODO: Integrate with weather API (e.g., OpenWeatherMap, Weather.gov)
      // Backend should verify actual weather conditions at time of claim
    },
  },
  {
    id: 'SNOW_DAY_2025',
    name: 'First Snow',
    description: 'Witnessed the first snowfall of 2025 in Madison',
    category: 'environment',
    icon: '❄️',
    validationRules: {
      type: 'weather',
      condition: 'snow',
      location: {
        minLat: 43.0,
        maxLat: 43.15,
        minLng: -89.50,
        maxLng: -89.30,
      },
      timeWindow: {
        // Only first snow counts (manual override in backend)
        start: '2025-01-01T00:00:00Z',
        end: '2025-03-31T23:59:59Z',
      },
    },
  },
  {
    id: 'MORGRIDGE_HACKER_2025',
    name: 'Morgridge Hackathon',
    description: 'Participated in a hackathon or build fest at Morgridge Hall',
    category: 'event',
    icon: '💻',
    validationRules: {
      type: 'event_code',
      location: {
        // Morgridge Hall approximate location
        lat: 43.0722,
        lng: -89.4050,
        radiusMeters: 100, // Must be within 100m
      },
      // Backend checks event code provided by organizers
      // User must submit eventCode param when claiming
      requiresEventCode: true,
    },
  },
  {
    id: 'LATE_NIGHT_MORGRIDGE',
    name: 'Late Night Hacker',
    description: 'Coding in Morgridge Hall between 2 AM - 5 AM',
    category: 'time_location',
    icon: '🌙',
    validationRules: {
      type: 'time_location',
      location: {
        lat: 43.0722,
        lng: -89.4050,
        radiusMeters: 100,
      },
      timeWindow: {
        // Must be between 2 AM and 5 AM local time
        hourStart: 2,
        hourEnd: 5,
        timezone: 'America/Chicago',
      },
      // SECURITY WARNING: User can spoof location from browser
      // Consider requiring QR code scan in building for better verification
    },
  },
  // Test NFT - Repeatable for testing/development
  {
    id: 'TEST_BADGE',
    name: 'Test',
    description: 'Repeatable test badge for development and testing purposes',
    category: 'test',
    icon: '🧪',
    isTestNFT: true,
    maxSupply: 10000,
    validationRules: {
      type: 'test',
      // No validation required for test NFT
    },
  },

  // Future academic achievements (commented out for now)
  // {
  //   id: 'ALL_A_SEMESTER_2025',
  //   name: 'Straight A\'s',
  //   description: 'Achieved all A\'s in a semester',
  //   category: 'academic',
  //   icon: '📚',
  //   validationRules: {
  //     type: 'academic_record',
  //     // Would require integration with student information system
  //     // Security: Verify with official university API
  //   },
  // },
  // {
  //   id: 'GRADUATION_2025',
  //   name: 'Badger Graduate',
  //   description: 'Graduated from UW-Madison',
  //   category: 'academic',
  //   icon: '🎓',
  //   validationRules: {
  //     type: 'academic_record',
  //     // Verify graduation status with registrar
  //   },
  // },
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category) {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

/**
 * Get all achievement IDs
 */
export function getAchievementIds() {
  return ACHIEVEMENTS.map(a => a.id);
}
