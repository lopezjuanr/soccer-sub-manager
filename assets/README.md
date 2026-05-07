# App Assets

Source assets for Soccer Sub Manager. These are the master files used to generate all platform-specific icon and splash screen sizes.

## Files

| File | Size | Purpose |
|---|---|---|
| `app-icon-1024.png` | 1024×1024 px | App icon — dark charcoal background, lime green soccer ball, substitution silhouettes |
| `splash-screen.png` | 2732×2732 px | Splash screen — dark background, glowing lime green soccer ball, app name and tagline |

## Regenerating Android assets

After cloning the repo, run the following from the project root to regenerate all resized Android icon and splash screen variants:

```bash
# 1. Make sure the android/ platform is present
npx cap add android   # only needed if android/ doesn't exist yet

# 2. Regenerate icons and splash screens from the source files in assets/
npx capacitor-assets generate --iconBackgroundColor '#1a1a1a' --splashBackgroundColor '#111111'
```

This will populate `android/app/src/main/res/mipmap-*/` (icons) and `android/app/src/main/res/drawable-*/` (splash screens) automatically.

> **Note:** The `android/` folder is excluded from this repo via `.gitignore` because it contains large binary files and generated build artifacts. Always regenerate it locally from these source assets.
