# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## GitHub OAuth Setup (one-time)

Your credentials:
- **Client ID:** `Ov23ctH4svbBvROTxUx7`
- **Client Secret:** `25da40c680d8e49e0617ebb5792bc4b6ebd27554`
- **Callback URL:** `https://bimifcjflwuekavtswvc.supabase.co/auth/v1/callback`

### If using Lovable Cloud (no Supabase access)

1. In Lovable, click the **Cloud** tab (the + icon next to Preview).
2. Go to **Users → Auth**.
3. Look for **GitHub** – if it exists, enable it and enter:
   - Client ID: `Ov23ctH4svbBvROTxUx7`
   - Client Secret: `25da40c680d8e49e0617ebb5792bc4b6ebd27554`
4. In your GitHub OAuth App settings, add the callback URL above.
5. If **GitHub is not listed**, try prompting Lovable: *"Add GitHub OAuth login with client ID Ov23ctH4svbBvROTxUx7"* – or contact Lovable support for GitHub auth in Cloud. **Alternative:** Connect your own Supabase project in Lovable (Project Settings → Integrations → Connect Supabase) to get full control over auth providers.

### If using your own Supabase project

1. **Supabase Dashboard** → Authentication → Providers → **GitHub**
   - Enable GitHub
   - Client ID: `Ov23ctH4svbBvROTxUx7`
   - Client Secret: `25da40c680d8e49e0617ebb5792bc4b6ebd27554`
   - Save

2. **GitHub OAuth App** → Add callback URL: `https://bimifcjflwuekavtswvc.supabase.co/auth/v1/callback`

3. **Redirect URLs** in Supabase → Add your app URL (e.g. `https://your-app.lovable.app/*`)

### Private repos

The app requests the `repo` scope for private repo access. If you connected before this was added, disconnect and reconnect to grant access.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
