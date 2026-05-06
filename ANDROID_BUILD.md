# Android Build Guide — Soccer Sub Manager

This guide explains how to build and publish the Android APK / AAB for Google Play.

---

## Prerequisites

Install the following on your local machine before proceeding:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| pnpm | 10+ | `npm install -g pnpm` |
| Android Studio | Latest | https://developer.android.com/studio |
| Java JDK | 17+ | Bundled with Android Studio |

After installing Android Studio, open it once and let it download the Android SDK. Accept all license agreements.

---

## One-Time Setup

### 1. Clone the repo and install dependencies

```bash
git clone https://github.com/lopezjuanr/soccer-sub-manager.git
cd soccer-sub-manager
pnpm install
```

### 2. Set the Android SDK path

Create a file at `android/local.properties` (this file is gitignored — never commit it):

```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

On Windows, the path is typically:
```
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

---

## Building the App

### Build + sync web assets to Android

Every time you make changes to the web app, run this command to rebuild and sync:

```bash
pnpm run cap:sync
```

This runs `vite build` and then `npx cap sync android` — copying the built web assets into the Android project.

### Open in Android Studio

```bash
pnpm run cap:open
```

This opens the `android/` folder in Android Studio where you can:
- Run the app on an emulator or physical device
- Build a signed APK or AAB for release

---

## Generating a Signed Release Build (for Google Play)

### 1. Create a keystore (one-time, keep this file safe forever)

```bash
keytool -genkey -v -keystore soccer-sub-manager.jks \
  -alias soccer-sub-manager \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store `soccer-sub-manager.jks` somewhere safe and **never commit it to git**.

### 2. Configure signing in Android Studio

In Android Studio:
1. Go to **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle (AAB)** (required for Google Play)
3. Point to your `.jks` keystore file
4. Enter your keystore password, key alias, and key password
5. Select **Release** build variant
6. Click **Finish**

The signed `.aab` file will be in:
```
android/app/release/app-release.aab
```

### 3. Alternatively, sign via Gradle (for CI/CD)

Add to `android/app/build.gradle` inside `android { ... }`:

```groovy
signingConfigs {
    release {
        storeFile file(System.getenv("KEYSTORE_PATH") ?: "soccer-sub-manager.jks")
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias System.getenv("KEY_ALIAS")
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

---

## Updating the App

After making changes to the web app:

```bash
# 1. Rebuild web assets and sync to Android
pnpm run cap:sync

# 2. Open Android Studio and build a new signed AAB
pnpm run cap:open
```

Increment `versionCode` and `versionName` in `android/app/build.gradle` before each Play Store upload.

---

## App Configuration

| Setting | Value | Location |
|---|---|---|
| App ID (package name) | `com.lopezjuanr.soccersubmanager` | `capacitor.config.ts` |
| App name | Soccer Sub Manager | `capacitor.config.ts` |
| Min Android version | API 22 (Android 5.1) | `android/variables.gradle` |
| Target Android version | API 34 (Android 14) | `android/variables.gradle` |
| Version code | 1 | `android/app/build.gradle` |
| Version name | 1.0 | `android/app/build.gradle` |

---

## Google Play Submission Checklist

- [ ] Signed AAB generated
- [ ] App icon added (512×512 PNG in Play Console)
- [ ] Feature graphic added (1024×500 PNG)
- [ ] At least 2 screenshots per device type
- [ ] Store listing written (title, short description, full description)
- [ ] Privacy Policy URL set (required for paid apps)
- [ ] Content rating questionnaire completed
- [ ] Pricing set to paid (one-time purchase)
- [ ] Target audience and content settings filled
- [ ] App submitted for review

---

## Troubleshooting

**`sdk.dir` not found error**
→ Create `android/local.properties` with the correct SDK path (see above).

**`JAVA_HOME` not set**
→ Android Studio bundles a JDK. In Android Studio, go to **File → Project Structure → SDK Location** and note the JDK path. Set `JAVA_HOME` to that path.

**WebView shows blank screen**
→ Run `pnpm run cap:sync` to ensure the latest web build is copied to the Android assets folder.

**App crashes on launch**
→ Run `adb logcat` while connected to a device to see the error log.
