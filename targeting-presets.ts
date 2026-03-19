// apps/dashboard/lib/targeting-presets.ts

export const GULF_TARGETING_PRESETS = {
  SA_BROAD: {
    label: 'Saudi Arabia — Broad',
    targeting_spec: {
      geo_locations: { countries: ['SA'] },
      age_min: 18,
      age_max: 65,
      locales: [28], // Arabic
      device_platforms: ['mobile', 'desktop'],
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed', 'story', 'reels', 'instream_video'],
      instagram_positions: ['stream', 'story', 'reels', 'explore'],
    },
  },

  SA_AFFLUENT_25_45: {
    label: 'Saudi Arabia — Affluent 25-45',
    targeting_spec: {
      geo_locations: {
        countries: ['SA'],
        cities: [
          { key: '287736', name: 'Riyadh', radius: 25, distance_unit: 'kilometer' },
          { key: '287736', name: 'Jeddah', radius: 25, distance_unit: 'kilometer' },
        ],
      },
      age_min: 25,
      age_max: 45,
      locales: [28, 6], // Arabic + English
      behaviors: [
        { id: '6002714895372', name: 'Frequent international travelers' },
      ],
    },
  },

  KW_BROAD: {
    label: 'Kuwait — Broad',
    targeting_spec: {
      geo_locations: { countries: ['KW'] },
      age_min: 22,
      age_max: 55,
      locales: [28, 6],
      device_platforms: ['mobile', 'desktop'],
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed', 'story'],
      instagram_positions: ['stream', 'story', 'reels'],
    },
  },

  QA_BROAD: {
    label: 'Qatar — Broad (incl. expats)',
    targeting_spec: {
      geo_locations: { countries: ['QA'] },
      age_min: 25,
      age_max: 50,
      locales: [28, 6], // Arabic + English — expat-heavy
      device_platforms: ['mobile'],
      publisher_platforms: ['facebook', 'instagram'],
    },
  },

  JO_YOUNG_MOBILE: {
    label: 'Jordan — Young Mobile (18-35)',
    targeting_spec: {
      geo_locations: { countries: ['JO'] },
      age_min: 18,
      age_max: 35,
      locales: [28],
      device_platforms: ['mobile'],
      publisher_platforms: ['facebook', 'instagram'],
      instagram_positions: ['stream', 'story', 'reels'],
    },
  },

  GULF_WIDE: {
    label: 'Gulf — All Markets',
    targeting_spec: {
      geo_locations: { countries: ['SA', 'KW', 'QA', 'AE', 'BH', 'OM'] },
      age_min: 22,
      age_max: 55,
      locales: [28, 6],
    },
  },
} as const;

export type TargetingPresetKey = keyof typeof GULF_TARGETING_PRESETS;

// Gulf market benchmarks — used by Claude for performance evaluation
export const GULF_BENCHMARKS = {
  SA: { cpmMax: 7, ctrMin: 1.5, cpcMax: 0.45, roasMin: 3.0, peakHour: '20:00-23:00 AST', bestFormat: 'Reels' },
  KW: { cpmMax: 8, ctrMin: 1.8, cpcMax: 0.45, roasMin: 3.5, peakHour: '21:00-00:00 AST', bestFormat: 'Stories' },
  QA: { cpmMax: 9, ctrMin: 1.6, cpcMax: 0.55, roasMin: 3.0, peakHour: '20:00-23:00 AST', bestFormat: 'Reels' },
  JO: { cpmMax: 4, ctrMin: 1.2, cpcMax: 0.30, roasMin: 2.5, peakHour: '19:00-22:00 AST', bestFormat: 'Feed' },
  AE: { cpmMax: 10, ctrMin: 1.6, cpcMax: 0.60, roasMin: 3.0, peakHour: '20:00-23:00 GST', bestFormat: 'Reels' },
} as const;

export type GulfCountry = keyof typeof GULF_BENCHMARKS;

// INSIGHTS_FIELDS — standard fields for all Meta insights queries
export const INSIGHTS_FIELDS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'status',
  'spend',
  'impressions',
  'reach',
  'clicks',
  'ctr',
  'cpm',
  'cpc',
  'frequency',
  'actions',
  'cost_per_action_type',
  'purchase_roas',
  'outbound_clicks',
  'outbound_clicks_ctr',
  'video_play_actions',
  'landing_page_views',
].join(',');
