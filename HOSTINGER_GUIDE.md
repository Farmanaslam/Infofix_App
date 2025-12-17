
# Hostinger Deployment Guide

## 1. Fix for "npm install" Errors
If you see `npm error code 13` or issues with `supabase`:
1. **Delete** the `node_modules` folder in your project.
2. **Delete** the `package-lock.json` file.
3. Run `npm install` again.
   *(We have removed the problematic Supabase CLI dependency to ensure this works on Windows.)*

## 2. Build & Deploy Steps
1. **Install Dependencies:**
   `npm install`

2. **Configure API Key:**
   - Open the `.env` file.
   - Replace `your_gemini_api_key_here` with your actual Google Gemini API key.

3. **Build the App:**
   `npm run build`
   - This creates a `dist` folder containing your website files.
   - It bundles all libraries into the JavaScript files, preventing blank page errors.
   - It also copies the `.htaccess` file from `public` to `dist`.

4. **Verify `.htaccess` Exists:**
   - The `.htaccess` file starts with a dot, making it hidden.
   - **Check Terminal:** Run `dir /a dist` (Windows) or `ls -a dist` (Mac) to confirm it is there.

5. **Upload to Hostinger:**
   - Open Hostinger File Manager.
   - Navigate to `public_html`.
   - **Delete** any old files.
   - Upload **all contents** inside the `dist` folder.
   
   **Troubleshooting Upload:**
   - If you cannot see/drag the `.htaccess` file because it is hidden on your computer:
     1. In Hostinger File Manager, inside `public_html`, click "New File".
     2. Name it `.htaccess` (ensure the dot is at the start).
     3. Paste the code from section 3 below.

## 3. `.htaccess` Content (If creating manually)
If you need to create the file manually on the server, paste this code:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```
