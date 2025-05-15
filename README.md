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

### Testing Locally

To test the application locally:

1. **Set up environment variables**:
   - Copy `.dev.vars.example` to `.dev.vars`
   - Fill in your LinkedIn cookies and credentials:
     ```bash
     cp .dev.vars.example .dev.vars
     nano .dev.vars  # or use your preferred editor
     ```

2. **Get LinkedIn cookies**:
   - Login to LinkedIn Sales Navigator in your browser
   - Open Developer Tools (F12)
   - Go to Application > Cookies > www.linkedin.com
   - Find and copy the value of `li_at` and `JSESSIONID` cookies
   - Paste these values in your `.dev.vars` file

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the admin interface**:
   - Open your browser to the URL shown in the terminal (usually http://localhost:8787)
   - You should see the admin dashboard

5. **Test the LinkedIn search**:
   - Click on the "Connections" tab
   - Try an empty search first - this should show recent connections
   - Then try searching with keywords like "CEO" or "Developer"
   - The results should appear below the search form

6. **Debug issues**:
   - Check your browser console for error messages
   - Verify your cookies are valid and not expired
   - Ensure you're using a valid user agent string

### Troubleshooting

If you encounter issues with the LinkedIn integration:

1. **Cookie issues**:
   - LinkedIn cookies expire periodically
   - Re-login to LinkedIn and get fresh cookies
   - Update your `.dev.vars` file with the new values

2. **No search results**:
   - Check the browser console for errors
   - Verify your Sales Navigator account has access to search
   - Try different search terms or filters

3. **LinkedIn blocking requests**:
   - Use a more realistic user agent string
   - Ensure you're not making too many requests too quickly
   - Check if your IP has been temporarily blocked by LinkedIn

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
│   ├── admin/           # Admin interface components
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

## Technical Implementation

### LinkedIn Integration

This application uses web automation via Cloudflare's Puppeteer integration to interact with LinkedIn, rather than using their official API (which has restrictive access limits and requires partnership approval). Here's how it works:

1. **Authentication**: The app uses LinkedIn cookies (`li_at` and `JSESSIONID`) provided by the user to authenticate with LinkedIn's Sales Navigator.

2. **Data Collection**: Instead of API calls, the app:
   - Loads LinkedIn Sales Navigator pages via headless browser
   - Parses the HTML content to extract profile information
   - Uses the same patterns and selectors that LinkedIn's own frontend uses
   - Respects rate limits through randomized delays between actions

3. **Search Integration**: When performing searches:
   - The app constructs search URLs with appropriate parameters
   - Handles empty searches by displaying recent connections
   - Extracts structured data from search results

This approach is similar to what other platforms use when official API access is limited or unavailable. It provides a lightweight alternative while respecting LinkedIn's terms of service through proper authentication.