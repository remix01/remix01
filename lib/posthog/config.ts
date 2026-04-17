/**
 * PostHog Configuration
 * Advanced analytics setup for EU-based deployment
 */

export const POSTHOG_CONFIG = {
  // ─── CREDENTIALS ────────────────────────────────────────────────────
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_tVJxRQ6czM2AqiX9CGkQEwpgowmcv9bzHwcMyXeMbSeY',
  apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  defaults: process.env.NEXT_PUBLIC_POSTHOG_DEFAULTS ?? '2026-01-30',

  // ─── INITIALIZATION CONFIG ──────────────────────────────────────────
  initialization: {
    // Identity & Privacy
    person_profiles: 'identified_only',
    respect_dnt: true,

    // Page Tracking
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,

    // Session Recording
    session_recording: {
      maskAllInputs: true,
      maskAllTextContent: true,
      recordCanvas: false,
      collectWindowPerformance: true,
    },

    // Persistence
    persistence: 'localStorage' as const,
    secure_cookie: true,
    cross_subdomain_cookie: true,

    // Performance
    batch_events: true,
    batch_size: 50,
    batch_timeout: 10000,
  },

  // ─── EVENT NAMES (for consistency) ──────────────────────────────────
  events: {
    // Authentication
    AUTH_SIGNUP: 'user_signup',
    AUTH_LOGIN: 'user_login',
    AUTH_LOGOUT: 'user_logout',
    AUTH_SOCIAL_SIGNUP: 'social_signup',

    // Feature Usage
    FEATURE_VIEWED: 'feature_viewed',
    FEATURE_INTERACTION: 'feature_interaction',
    FEATURE_COMPLETED: 'feature_completed',

    // Search & Discovery
    SEARCH_PERFORMED: 'search_performed',
    SEARCH_FILTERED: 'search_filtered',

    // E-Commerce / Transactions
    ITEM_VIEWED: 'item_viewed',
    ITEM_ADDED_TO_CART: 'item_added_to_cart',
    CHECKOUT_STARTED: 'checkout_started',
    PURCHASE_COMPLETED: 'purchase_completed',

    // Navigation
    PAGE_VIEWED: '$pageview',
    PAGE_LEFT: '$pageleave',

    // Errors
    ERROR_OCCURRED: 'error_occurred',

    // Performance
    PAGE_LOAD_PERFORMANCE: 'page_load_performance',

    // Engagement
    USER_ENGAGED: 'user_engaged',
    FEEDBACK_PROVIDED: 'feedback_provided',
  },

  // ─── USER PROPERTY KEYS (for consistency) ────────────────────────────
  userProperties: {
    EMAIL: 'email',
    NAME: 'name',
    PLAN: 'plan',
    SIGNUP_DATE: 'signup_date',
    LAST_SEEN: 'last_seen',
    LANGUAGE: 'language',
    TIMEZONE: 'timezone',
    IS_PAYING: 'is_paying',
    CUSTOMER_ID: 'customer_id',
  },

  // ─── FEATURE FLAGS ──────────────────────────────────────────────────
  featureFlags: {
    // Define common feature flags here for easy reference
    // Example: NEW_DASHBOARD: 'new_dashboard_v2'
  },

  // ─── SAMPLING RATES ─────────────────────────────────────────────────
  // Controls which sessions get recorded (1 = 100%, 0.5 = 50%, etc.)
  samplingRates: {
    SESSION_RECORDING: 1.0, // Record all sessions
    AUTOCAPTURE: 1.0, // Capture all events
  },

  // ─── PRIVACY SETTINGS ───────────────────────────────────────────────
  privacy: {
    GDPR_COMPLIANT: true,
    MASK_IP: false, // EU data center stores legitimately
    RESPECT_DNT: true, // Respect browser's Do Not Track
  },
}

// ─── SESSION RECORDING CAPTURE SETTINGS ────────────────────────────────
export const SESSION_RECORDING_CONFIG = {
  // Elements to never capture
  maskUntilInteraction: false,
  
  // Text content masking
  maskAllTextContent: true,
  
  // Input masking
  maskAllInputs: true,
  
  // Canvas recording
  recordCanvas: false,
  
  // Performance metrics
  collectWindowPerformance: true,
  
  // Max payload size (bytes)
  maxBufferSize: 1024 * 1024, // 1MB
}

// ─── AUTOCAPTURE SETTINGS ───────────────────────────────────────────────
export const AUTOCAPTURE_CONFIG = {
  // Capture form submissions
  capture_form_submit: true,
  
  // Capture radio button changes
  capture_radio_group_change: true,
  
  // Capture checkbox changes
  capture_checkbox_change: true,
  
  // Capture selection changes
  capture_select_change: true,
  
  // Exclude elements from autocapture
  excluded_elements: [
    '.posthog-no-capture',
    '[data-posthog-no-capture]',
  ],
  
  // Element attributes to capture
  element_attributes: ['class', 'id', 'data-*'],
}

// ─── BATCH SETTINGS ─────────────────────────────────────────────────────
export const BATCH_CONFIG = {
  // Number of events before sending batch
  batch_size: 50,
  
  // Time before sending batch (milliseconds)
  batch_timeout: 10000, // 10 seconds
  
  // Queue size limit
  max_queue_size: 1000,
}
