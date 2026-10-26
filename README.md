# HR System

An HR management web application built with Angular. It brings common workforce workflows together in one interface, including employee directory and onboarding, attendance, payroll, performance, profile management, and role-based approvals. Supabase provides authentication and backend services for the connected workflows.

## Tech Stack

[![Angular](https://img.shields.io/badge/Angular-22.0.0%2B-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

- **Frontend:** Angular standalone components, Angular Router, TypeScript, RxJS
- **Styling:** Tailwind CSS 4
- **Backend services:** Supabase Auth, Supabase database and Storage, Supabase Edge Functions
- **Testing:** Angular CLI unit-test builder with Vitest

## Live Demo

No live demo is currently configured.  
**Demo:** _Coming soon_

## Key Features

- Role-aware sign-in and protected application routes
- HR dashboard with workforce overview widgets
- Employee directory and multi-step employee onboarding
- Employee profile and avatar management
- Attendance, payroll, and performance overview pages
- Owner-only approvals for profile change requests
- Supabase-backed authentication and data access for connected features
- Supabase Edge Functions for creating employees and updating email addresses

> Some overview screens currently use sample presentation data. Feature availability and data access depend on the Supabase project configuration and database policies.

## Project Structure

```text
.
├── public/                         # Static assets and images
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── components/         # Shared layout and UI components
│   │   │   ├── guards/             # Authentication and role guards
│   │   │   └── services/           # Auth, Supabase, profile, and related services
│   │   ├── features/               # Auth, employee onboarding, profile, approvals
│   │   ├── pages/                  # Dashboard, directory, attendance, payroll, performance
│   │   ├── app.config.ts           # Application providers
│   │   └── app.routes.ts           # Lazy-loaded routes
│   ├── environments/               # Development and production Supabase config
│   ├── main.ts                     # Application entry point
│   └── styles.css                  # Global Tailwind CSS entry point
├── supabase/
│   ├── functions/                  # Supabase Edge Functions
│   └── config.toml                 # Local Supabase function configuration
├── angular.json                   # Angular CLI build and test configuration
├── package.json                    # Dependencies and npm scripts
└── tsconfig*.json                  # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js and npm versions supported by Angular 22
- A Supabase project for authentication and backend-connected features
- Supabase CLI, if you plan to run or deploy the Edge Functions

### Installation

1. Clone the repository and enter the project directory:

   ```bash
   git clone <repository-url>
   cd HR-System
   ```

2. Install the dependencies:

   ```bash
   npm ci
   ```

3. Configure the Supabase project settings in both:

   - `src/environments/environment.development.ts`
   - `src/environments/environment.ts`

   Set `supabaseUrl` to your project URL and `supabaseKey` to the project's **publishable (anon) key**. Never place a Supabase service-role key in frontend code. Configure appropriate database policies and the schema used by the app, including its profiles, employees, departments, notifications, and profile change request data.

4. Start the development server:

   ```bash
   npm start
   ```

5. Open [http://localhost:4200](http://localhost:4200). The Angular development server reloads when source files change.

### Useful Commands

| Command | Description |
| --- | --- |
| `npm start` | Serve the app locally |
| `npm run build` | Build using the configured default (development) build |
| `npm run build -- --configuration production` | Create an optimized production build |
| `npm run watch` | Rebuild on source changes using development settings |
| `npm test` | Run unit tests |

## Build & Deployment

Build the production version with:

```bash
npm run build -- --configuration production
```

The production files are generated under `dist/hr-system/browser/`. Deploy the contents of that directory to a static web host. The application uses hash-based routing, so client-side routes are represented after `#` in the URL.

For backend-connected features, deploy the Edge Functions to the Supabase project after installing and configuring the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase functions deploy create-employee
supabase functions deploy update-email
```

Set required server-side secrets (including `SUPABASE_SERVICE_ROLE_KEY`) in Supabase's function secrets configuration; do not add them to Angular environment files or the built frontend.
