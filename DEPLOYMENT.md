# Deploying PriceCanvas

This application is ready to be deployed to the web! Since it's built using a modern React frontend with an Express backend, we have provided a standard `Dockerfile` that makes hosting incredibly simple on almost any modern cloud provider.

## Option 1: Render.com (Recommended)
Render is one of the easiest ways to host full-stack Docker applications.

**Prerequisites:** Connect this project to a GitHub repository.

1. Go to [Render](https://render.com) and create an account.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select this repository.
4. Render will automatically detect the `Dockerfile`.
5. Under settings:
   - **Name:** pricecanvas
   - **Region:** Choose whatever is closest to you.
   - **Instance Type:** "Free" is perfect for testing.
6. Click **Create Web Service**. 

Wait 2-3 minutes for the build to finish. Your app will be live at `https://pricecanvas-xyz.onrender.com`!

## Option 2: Railway.app 
Railway is another fantastic, highly-automated platform.

**Prerequisites:** Connect this project to a GitHub repository.

1. Go to [Railway](https://railway.app) and create an account.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically detect the Dockerfile and start building.
5. Once deployed, click on the service, go to the **Settings** tab, and under **Domains**, click **Generate Domain** so you have a public URL.

## Managing Your Database
This application uses a lightweight local SQLite database (`drawings.db`) to store user sessions and drawings. 

**Important Note on Free Tiers:** If you host this on the "Free" tier of services like Render or Heroku, they use *ephemeral file systems*. This means that if the server reboots (which happens daily on free tiers), the `drawings.db` file will be wiped clean! If you want your database drawings to persist permanently, you should upgrade to a basic paid tier (usually $5-$7/mo) that includes a persistent disk volume, and mount that volume to `/app/drawings.db` inside the Docker container.

## 30-Day Demo Lock
This version contains the highly requested 30-Day Time Lock functionality. 

When a user opens your deployed link for the exact first time, it stores a timestamp in their browser cache (`pricecanvas_trial_start`). Exactly 30 days after that timestamp, the application will render a full-screen "Pro Version Coming Soon" lock screen preventing any further interaction.
