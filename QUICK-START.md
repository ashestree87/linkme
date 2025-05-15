# LinkMe Quick Start Guide

This guide will help you quickly set up and test the LinkMe application on your local machine.

## Prerequisites

- Node.js (14+) installed
- Git installed
- npm or yarn installed
- A LinkedIn Sales Navigator account

## Step 1: Clone and Install

```bash
# Clone the repository (if you haven't already)
git clone <your-repo-url> linkme
cd linkme

# Install dependencies
npm install
```

## Step 2: Set Up Environment Variables

```bash
# Copy the example environment variables file
cp .dev.vars.example .dev.vars
```

Now edit the `.dev.vars` file to add your LinkedIn credentials:

1. **Get LinkedIn cookies**:
   - Log in to [LinkedIn Sales Navigator](https://www.linkedin.com/sales/) in Chrome
   - Press F12 to open DevTools
   - Go to Application tab > Cookies > www.linkedin.com
   - Find and copy these cookies:
     - `li_at` (main authentication cookie)
     - `JSESSIONID` (for CSRF protection)

2. **Edit the `.dev.vars` file** with your text editor:
   ```
   LI_AT=your_li_at_cookie_value_here
   CSRF=your_jsessionid_cookie_value_here
   USERAGENT=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36
   WEBHOOK_SECRET=any_random_string_for_development
   ```

## Step 3: Start the Development Server

```bash
# Start the development server in remote mode (required for browser bindings)
npm run dev
```

This will start the Cloudflare Workers development server in remote mode, which is required for the browser bindings (Puppeteer) to work properly. The local code will still run on your machine, but browser rendering will happen on Cloudflare's infrastructure.

When you run this command:
1. You'll be prompted to log in to your Cloudflare account (if not already logged in)
2. The server typically runs at http://localhost:8787
3. You may see logs indicating that browser rendering is happening remotely

> **Note**: If you want to run without browser features for UI development only, you can use:
> ```bash
> npm run dev:local
> ```
> But LinkedIn search functionality won't work in this mode.

## Step 4: Testing the Application

1. **Access Admin UI**:
   - Open your browser to http://localhost:8787
   - You should see the LinkMe admin dashboard

2. **Test Empty Search**:
   - Click on the "Connections" tab in the top navigation
   - Without entering any search terms, click "Search LinkedIn"
   - This should show recent connections or profiles

3. **Test Specific Search**:
   - Try searching with specific terms like:
     - Keywords: "CEO" or "Developer"
     - Location: "San Francisco" or "London"
     - Industry: "Technology" or "Finance"
   - Click "Search LinkedIn" to see the results

4. **Test Adding Leads**:
   - When search results appear, click "Add as Lead" on any profile
   - Go back to the "Leads" tab to see your added lead

## Troubleshooting

### No Search Results

If you're not seeing any search results:

1. **Check Browser Console**:
   - Open browser DevTools (F12) and check for errors in the Console tab
   - Look for messages about LinkedIn authentication or scraping issues

2. **Verify Cookies**:
   - LinkedIn cookies expire frequently
   - Get fresh cookies from your browser and update `.dev.vars`
   - Restart the dev server after updating cookies

3. **LinkedIn Restrictions**:
   - LinkedIn may temporarily restrict automated access
   - Try using a different LinkedIn account
   - Wait a few hours before trying again

### Other Issues

- **Puppeteer Errors**: Make sure you're using a compatible Node.js version
- **Port Conflicts**: If port 8787 is in use, Wrangler will use another port
- **Network Issues**: Ensure your computer has internet access and can reach LinkedIn

## Next Steps

- Try uploading CSV files with LinkedIn URNs and names
- Explore the different lead status workflows
- Check out the modular code structure in `src/admin/` directory 