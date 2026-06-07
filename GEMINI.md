# Prossima Project Documentation

Prossima is a high-performance iOS health dashboard built with Expo. It integrates deeply with Apple HealthKit to track and visualize key biomarkers like HRV, Resting HR, Sleep, and Workouts. Its signature feature is a **Readiness Score** computed on-device to help users optimize their recovery and training.

## Project Structure

This is a **pnpm monorepo** with the following layout:

- **`artifacts/prossima`**: The main Expo (React Native) iOS application.
- **`artifacts/api-server`**: Express.js backend server.
- **`artifacts/mockup-sandbox`**: A Vite-based sandbox for UI component development.
- **`lib/`**: Shared libraries used across the workspace.
    - `api-spec`: OpenAPI specifications and Orval-generated clients.
    - `api-zod`: Zod schemas generated from the API spec.
    - `api-client-react`: React-specific API hooks.
    - `db`: Drizzle ORM schema and database utilities.

## Technology Stack

### Frontend (`artifacts/prossima`)
- **Framework**: [Expo](https://expo.dev/) (React Native) with [Expo Router](https://docs.expo.dev/router/introduction/).
- **Health Integration**: [`react-native-health`](https://github.com/terrillo/rn-apple-healthkit) for Apple HealthKit.
- **State Management**: React Context API (`HealthProvider`, `ProfileProvider`, `ThemeProvider`).
- **Data Persistence**: `AsyncStorage` used as a local time-series store with a 90-day rolling window.
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest) (React Query).
- **Styling**: Custom SVG-based visualizations and theme-aware components.

### Backend (`artifacts/api-server`)
- **Runtime**: Node.js with TypeScript.
- **Framework**: Express.js.
- **Logging**: [Pino](https://github.com/pinojs/pino) and `pino-http`.
- **Bundler**: `esbuild`.

### Data & API
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL (via `pg`).
- **Validation**: [Zod](https://zod.dev/).
- **API Spec**: OpenAPI 3.1.0.

## Building and Running

### Prerequisites
- [pnpm](https://pnpm.io/) installed.
- [mise](https://mise.jdx.dev/) for tool management (optional but recommended).

### Commands
- **Install dependencies**:
  ```bash
  pnpm install
  ```
- **Build libraries and artifacts**:
  ```bash
  pnpm run build
  ```
- **Run TypeScript check**:
  ```bash
  pnpm run typecheck
  ```
- **Start the Expo app (iOS)**:
  ```bash
  cd artifacts/prossima
  pnpm run dev
  ```
- **Start the API server**:
  ```bash
  cd artifacts/api-server
  pnpm run dev
  ```
- **Generate API code**:
  ```bash
  cd lib/api-spec
  pnpm run codegen
  ```

## Development Conventions

- **Strict TypeScript**: Avoid `any` at all costs. Ensure all types are properly exported and shared via the `lib/` workspace packages.
- **HealthKit Logic**: Always check `Platform.OS === 'ios'` before accessing HealthKit features. Use the `HealthProvider` and `HealthStore` abstractions for any health data interaction.
- **Data Persistence**: Prossima uses a 90-day rolling window for local health data in `AsyncStorage`. Be mindful of storage limits; avoid storing large blobs in `AsyncStorage`.
- **API Changes**: Follow an OpenAPI-first approach. Update `lib/api-spec/openapi.yaml` first, then run `pnpm run codegen` to update types and clients.
- **Component Design**: Favor composition. Use the theme context for colors and spacing to ensure dark/light mode consistency.
- **Readiness Engine**: The logic for the Readiness Score is isolated in `artifacts/prossima/context/ReadinessEngine.ts`. Modifications to the scoring algorithm should be verified against historical data samples.

## Key Files

- `artifacts/prossima/app/_layout.tsx`: Main app entry and provider setup.
- `artifacts/prossima/context/HealthContext.tsx`: Core logic for HealthKit sync and Readiness computation.
- `artifacts/prossima/context/HealthStore.ts`: Local persistence layer for health metrics.
- `artifacts/prossima/context/ReadinessEngine.ts`: The algorithm for computing readiness.
- `lib/api-spec/openapi.yaml`: The source of truth for the API contract.
- `lib/db/src/schema/index.ts`: Database schema definitions.
