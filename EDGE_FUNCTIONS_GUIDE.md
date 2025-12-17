# Guide to Deploying Your Full Application on Supabase

This guide explains the modern architecture for deploying a full-stack application (React SPA + Edge Functions) entirely on the Supabase platform. Your previous deployment method was incorrect and has been fixed.

The application now uses this architecture:
1.  **Frontend Hosting**: The compiled React application (the `dist` folder) is hosted in a **Supabase Storage bucket**.
2.  **Web Server**: A new **Edge Function (`frontend-server`)** acts as the web server. It serves the files from the Storage bucket and correctly handles SPA routing (e.g., loading `index.html` for paths like `/tickets`).
3.  **API**: Your existing `hyper-api` Edge Function continues to work as a backend API endpoint.

---

## 1. One-Time Setup: Create the Storage Bucket

You must create a public bucket in Supabase Storage to hold the website files.

1.  Go to your Supabase project dashboard.
2.  Navigate to **Storage** (the cylinder icon).
3.  Click **"New bucket"**.
4.  Enter the bucket name **exactly** as `website-dist`.
5.  Toggle **"Public bucket"** to ON.
6.  Click **"Create bucket"**.

---

## 2. Link Your Local Project (If Not Done)

If this is your first time deploying, link your local repository to your remote Supabase project.

```bash
# Log in to your Supabase account
npx supabase login

# Link this project to your remote Supabase project.
# Find your <project-ref> in your project's URL.
npx supabase link --project-ref <your-project-ref>
```

---

## 3. Build and Deploy Everything

A new, consolidated deployment script has been created. Simply run this one command from your project's root directory:

```bash
npm run deploy
```

This command will automatically perform all necessary steps:
1.  **`npm run build`**: Compiles your React app into the `dist` folder.
2.  **`deploy:frontend`**: Clears the `website-dist` bucket and uploads the new `dist` contents.
3.  **`deploy:functions`**: Deploys both the `frontend-server` and `hyper-api` Edge Functions with the correct settings.

After a successful deployment, your application will be live and accessible at:
`https://<your-project-ref>.supabase.co/functions/v1/frontend-server`

---

## 4. Final Step: Using Your Custom Domain

The `{"error":"requested path is invalid"}` error occurred because Supabase Custom Domains point to the API Gateway, not to a website. You cannot directly point `infofixcomputer.com` to the Edge Function URL.

To solve this, you must use a free CDN service like Cloudflare as a proxy:

1.  **Point Your Domain to Cloudflare**: In your domain registrar, change your nameservers to the ones provided by Cloudflare.
2.  **Configure Cloudflare**:
    *   Set up a `CNAME` record for `www` that points to `<your-project-ref>.supabase.co`. This keeps your API accessible at `www.infofixcomputer.com/rest/v1/...`.
    *   Use a **"Worker"** or **"Page Rule"** to proxy requests from your root domain (`infofixcomputer.com`) to your new Edge Function URL (`https://<project-ref>.supabase.co/functions/v1/frontend-server`). This is the standard and recommended way to achieve this.

This final step is outside the scope of the application code but is the required industry-standard solution for this platform.
