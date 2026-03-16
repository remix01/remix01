# Changelog

All notable changes to the LiftGO project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

### Added
- Multi-agent AI system with cost management
- Tier-based AI usage limits (START: 5/day, PRO: 100/day)
- Redis caching for AI responses (30% cost savings)
- Intelligent model routing (Haiku vs Sonnet)
- Admin analytics dashboard for AI usage
- File upload integration across platform
- Work Description Agent for customers
- Offer Comparison Agent with AI recommendations
- Offer Writing Agent for craftsmen (PRO)

### Changed
- Documentation reorganized into structured docs/ folders
- Root directory cleaned (60+ files → README.md + CHANGELOG.md)

### Fixed
- Anthropic API model ID updated to claude-sonnet-4-20250514
- Build errors from v0.dev demo pages

## [1.0.0] - 2026-03-16

### Added
- State machine with permission guards
- Permission layer with RBAC
- Guardrails system for input validation
- Task engine with Upstash QStash
- Real-time notifications system
- Stripe subscription integration
- Admin dashboard with analytics
- Portfolio management for craftsmen
- File upload with Supabase Storage

### Infrastructure
- Next.js 14 App Router
- Supabase (PostgreSQL + Storage + Auth)
- Upstash (Redis + QStash)
- Stripe payments
- Vercel deployment
