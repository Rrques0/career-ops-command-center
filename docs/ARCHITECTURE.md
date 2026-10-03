# Architecture direction

## Current repository

The workspace currently has two unrelated roots of concern. The Career Ops command center is a React/Vite frontend backed by a loopback Python HTTP service, SQLite persistence, a bridge to the `career-ops` engine, and Playwright/backend tests. The TouchDesigner system is script/data/GLSL driven. Existing root `ARCHITECTURE.md` and scoped `career-ops/AGENTS.md` remain authoritative for those systems.

## Study OS boundary

Study OS must be treated as a new bounded product until the user chooses where it belongs. Do not share Career Ops tables, endpoints, stores, UI state, or engine commands by convenience. If a future integration is justified, introduce a typed adapter at an explicit seam and document ownership.

## Proposed shape after approval

Start as a small vertical slice with one application boundary, a domain model for subjects, goals, planned sessions, completed sessions, and review events, and a persistence adapter behind a stable service interface. Keep scheduling, retention calculations, and analytics as domain services with deterministic inputs. Keep AI, document parsing, and external calendar providers behind optional ports so the core loop works offline.

## Context recovery

`PRODUCT.md` holds user value and scope. This file holds boundaries and seams. `DESIGN.md` holds interaction principles. `ROADMAP.md` holds sequencing. `DECISIONS.md` holds reasons and reversals. Source configuration and package scripts remain the source of truth for commands and versions.

## Architecture review gates

Before implementation, identify the chosen app location, runtime, persistence strategy, data ownership, offline behavior, privacy model, and test seams. A proposal is incomplete until it names failure behavior and a verification command for each new boundary.
