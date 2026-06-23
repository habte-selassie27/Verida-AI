---
name: verida-coding-standards
description: Coding standards and patterns for the Verida AI project
---

# Verida AI Coding Standards

## Project Structure
- Monorepo with npm workspaces
- `apps/api/` - Express backend
- `apps/web/` - React frontend
- `packages/shared/` - Shared types and utilities

## TypeScript Guidelines
- Use strict mode (already configured)
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation
- Avoid `any` - use `unknown` and narrow types
- Use `readonly` for immutable data

## Error Handling
- Never use empty catch blocks
- Always log errors or set error state
- Use custom error classes when appropriate
- Return proper HTTP status codes

## API Patterns
- Use Express 5 with proper error handling middleware
- Use Drizzle ORM for database queries (never raw SQL unless necessary)
- Validate all inputs with Zod schemas
- Use BullMQ for background jobs

## Frontend Patterns
- Use React 19 features (hooks, context)
- Use Tailwind CSS for styling
- Use CSS modules for component-specific styles
- Keep components small and focused

## Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate and sanitize all user inputs
- Use parameterized queries (Drizzle handles this)

## Testing
- Write tests for critical business logic
- Use Vitest for unit tests
- Use Supertest for API integration tests
- Aim for 70%+ coverage on new code
