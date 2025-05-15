# LinkMe

A LinkedIn automation and lead management tool built on Cloudflare Workers.

## Features

- Admin dashboard for lead management
- LinkedIn profile search and import
- Lead tracking and status management
- Automated connection requests and messages
- CSV import/export functionality

## Setup

### Prerequisites

- Node.js 14+
- Cloudflare Workers account
- LinkedIn Sales Navigator account

### Environment Variables

The following environment variables need to be set:

- `LI_AT`: LinkedIn authentication cookie
- `CSRF`: LinkedIn CSRF token (JSESSIONID cookie)
- `USERAGENT`: User agent string to use for requests
- `WEBHOOK_SECRET`: Secret for webhook authentication

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in `.dev.vars` or via Cloudflare Dashboard

### Development

Run the development server:

```bash
npm run dev
```

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Usage

1. Access the admin interface at the root URL of your Worker
2. Upload leads via CSV or add them manually
3. Monitor lead statuses and conversion rates
4. Search for new leads directly from LinkedIn

## License

MIT

## Project Structure

```
linkme/
├── src/                 # Source code
│   ├── handlers/        # Route handlers
│   ├── middleware/      # Middleware function
│   ├── utils/           # Utility functions
│   └── index.ts         # Main entry point
├── public/              # Static assets
├── test/                # Test files
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── wrangler.jsonc       # Cloudflare Workers configuration
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run test` - Run tests

## Dependencies

- @cloudflare/puppeteer - Headless browser automation for Cloudflare Workers
- itty-router - Lightweight router for Cloudflare Workers
- htmx.org - HTML extensions for AJAX, CSS Transitions, WebSockets and more 