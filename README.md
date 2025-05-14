# LinkMe

A Cloudflare Workers project built with TypeScript.

## Project Structure

```
linkme/
├── src/                 # Source code
│   ├── handlers/        # Route handlers
│   ├── middleware/      # Middleware functions
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