# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.19.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

Install the Playwright Chromium browser once, then run the browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright starts its own Angular server on `http://127.0.0.1:4201` (the port must be free).
The admin suite covers unauthenticated access to `/admin/products`, form validation,
rejected credentials, admin login and reload, sign-out, non-admin access, and expired sessions.
API responses are mocked; no running backend or real account is required. These tests verify
frontend access behavior, not backend authorization enforcement.

Use `npm run test:e2e:ui` for interactive mode or `npx playwright show-report` for the HTML report.

Run only the admin component and routing tests with:

```bash
npm test -- --watch=false --include=src/app/pages/admin/Admin.spec.ts
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
