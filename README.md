# notivera-react-native

React Native Turbo Module wrapper for the [Notivera](https://notivera.com/) native Android and iOS SDKs.

Native pins (same as the Flutter plugin):

- Android: `com.github.Notivera:android-sdk:5.0.2` (JitPack)
- iOS: `NotiveraSDK` **5.0.0** XCFramework from [ios-spm-notivera](https://github.com/Notivera/ios-spm-notivera)

Requires **React Native 0.76+** (New Architecture / Turbo Modules). Minimum iOS **15.1** (React Native), Android **minSdk 24**. The underlying Notivera iOS SDK supports iOS 14+, but this wrapper follows RN’s deployment target.

```sh
yarn add notivera-react-native
# or
npm install notivera-react-native
```

## JavaScript usage

```ts
import { Notivera, type NotiveraPushEvent } from 'notivera-react-native';

async function startNotivera() {
  Notivera.instance.addPushEventListener((event: NotiveraPushEvent) => {
    console.log('Notivera event', event.eventType, event.title);
  });

  await Notivera.instance.initialize({
    apiKey: 'YOUR_API_KEY',
    apiSecret: 'YOUR_API_SECRET',
    appVersion: '1.0.0',
    tenantId: 'YOUR_TENANT_ID',
    // Android-only: resource names under your app res/ (not JS assets).
    pushTheme: {
      smallIcon: 'ic_launcher_foreground',
      largeIcon: 'ic_launcher_round',
      color: 'ic_launcher_background',
    },
  });

  await Notivera.instance.requestAuthorisationPrompts();
  await Notivera.instance.subscribeTag('news');
}
```

### Platform push difference

| Platform | Token | Incoming push payload |
|----------|--------|------------------------|
| **Android** | Host obtains FCM token → `setPushToken` | Host forwards FCM data → `isNotiveraMessage` / `handlePushMessage` |
| **iOS** | APNs forwarded by the native bridge (no `setPushToken`) | **Not** forwarded in JS. The host **Notification Service Extension** gates Notivera via `request.isNotiveraRequest` |

---

## Android setup

### 1. JitPack

```gradle
maven { url = uri("https://jitpack.io") }
```

Add that repository in the host app `settings.gradle` / `build.gradle` (wherever other Maven repos are declared).

### 2. Firebase Cloud Messaging (required for push)

FCM is **not** bundled. Use `@react-native-firebase/app` + `@react-native-firebase/messaging` (or your own FCM pipeline), then after `initialize`:

```ts
await Notivera.instance.setPushToken(fcmToken);
// On data messages:
if (await Notivera.instance.isNotiveraMessage(data)) {
  await Notivera.instance.handlePushMessage(data);
}
```

Also add `google-services.json`, the Google Services Gradle plugin, and `POST_NOTIFICATIONS` on Android 13+.

### 3. Release / R8

```properties
# android/gradle.properties
android.enableR8.fullMode=false
```

The library ships `consumer-rules.pro` (`-keep class com.notivera.**`) when minify is enabled.

---

## iOS setup

Minimum iOS version: **15.1** (React Native example / podspec).

The pod vendors `NotiveraSDK.xcframework` (5.0.0). You do **not** call `setPushToken` for APNs from JS.

### 1. App Group (required)

Without an App Group the native SDK will `fatalError`. In the app `Info.plist`:

```xml
<key>NotiveraAppGroup</key>
<string>group.com.yourcompany.yourapp</string>
```

Add the same App Group to app entitlements (`com.apple.security.application-groups`).

### 2. Capabilities and Info.plist

Enable **Push Notifications** and **Background Modes → Remote notifications**.

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Used for geofenced campaigns.</string>
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### 3. AppDelegate — APNs + cold-start taps (required)

Forward APNs lifecycle to `NotiveraBridge` and capture cold-start taps:

```swift
import Notivera
import UserNotifications

// didFinishLaunching:
UNUserNotificationCenter.current().delegate = self

func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
  NotiveraBridge.shared.application(
    application,
    didRegisterForRemoteNotificationsWithDeviceToken: deviceToken
  )
}

func userNotificationCenter(_ center: UNUserNotificationCenter,
                            didReceive response: UNNotificationResponse,
                            withCompletionHandler completionHandler: @escaping () -> Void) {
  NotiveraBridge.captureNotificationResponse(response)
  NotiveraBridge.shared.userNotificationCenter(
    center,
    didReceive: response,
    withCompletionHandler: completionHandler
  )
}
```

Also forward `didFailToRegister…`, `didReceiveRemoteNotification…fetchCompletionHandler`, and `handleEventsForBackgroundURLSession` the same way (see the example `AppDelegate.swift`).

### 4. Notification extensions (required for rich push)

Notivera rich push (video, carousel, interactive content) needs **both** extension targets in the **host** Xcode app. They are **not** shipped inside this RN package or the XCFramework — you add them to your app project (same as the native iOS / Flutter SDK). Templates live under `example/ios/NotiveraServiceExtension` and `example/ios/NotiveraContentExtension`.

#### Link NotiveraSDK into the extensions (required)

After `pod install`, the binary is at:

`node_modules/notivera-react-native/ios/Frameworks/NotiveraSDK.xcframework`

**Do not** add the `Notivera` CocoaPod to extension targets. That pod pulls React Native / Turbo Module deps and is invalid for app extensions. Link the **XCFramework only**.

For each extension target:

1. **General → Frameworks and Libraries → + → Add Other… → Add Files…**
2. Select `NotiveraSDK.xcframework` (path above, or copy/vendor it into your repo).
3. Set linkage to **Do Not Embed** on the extension (the host app already embeds the framework via the `Notivera` pod).
4. Add **UserNotifications.framework** (service + content) and **UserNotificationsUI.framework** (content only).
5. Build settings:
   - `FRAMEWORK_SEARCH_PATHS` → include the directory that contains `NotiveraSDK.xcframework`
   - `LD_RUNPATH_SEARCH_PATHS` → `$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks`
   - `APPLICATION_EXTENSION_API_ONLY` → `YES`
6. Use the **same App Group** as the main app (`NotiveraAppGroup` in each extension `Info.plist` + App Groups entitlement on the app **and** both extensions).
7. Embed both `.appex` products on the main app target (**Embed Foundation Extensions** / Embed App Extensions). Bundle IDs must be prefixed with the app ID, e.g. `com.yourcompany.yourapp.NotiveraServiceExtension`.

Without linking `NotiveraSDK`, `import NotiveraSDK` / `NotiveraServiceExtension` / `NotiveraCarouselNotificationContentViewController` will not build in the extensions.

#### Notification Service Extension

1. Xcode: **File → New → Target… → Notification Service Extension**
2. Replace the generated class with a subclass of `NotiveraServiceExtension`. This is the iOS equivalent of Android’s JS `isNotiveraMessage` / `handlePushMessage` — do **not** call those JS APIs for APNs:

```swift
import NotiveraSDK
import UserNotifications

class NotificationServiceExtension: NotiveraServiceExtension {
  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    if request.isNotiveraRequest {
      super.didReceive(request, withContentHandler: contentHandler)
    } else {
      contentHandler(request.content)
    }
  }
}
```

3. Extension `Info.plist`:

```xml
<key>NSExtension</key>
<dict>
  <key>NSExtensionPointIdentifier</key>
  <string>com.apple.usernotifications.service</string>
  <key>NSExtensionPrincipalClass</key>
  <string>$(PRODUCT_MODULE_NAME).NotificationServiceExtension</string>
  <key>UNNotificationExtensionCategory</key>
  <array>
    <string>NSDKNotification</string>
    <string>PushologiesCarouselNotification</string>
  </array>
</dict>
<key>NotiveraAppGroup</key>
<string>group.com.yourcompany.yourapp</string>
```

#### Notification Content Extension (carousel)

1. Xcode: **File → New → Target… → Notification Content Extension**
2. In the storyboard (`MainInterface`), set the view controller **Custom Class** to:
   - Class: `NotiveraCarouselNotificationContentViewController`
   - Module: `NotiveraSDK`
   (A stub `UIViewController` Swift file can remain unused; the storyboard must load the SDK class.)
3. Extension `Info.plist`:

```xml
<key>NSExtension</key>
<dict>
  <key>NSExtensionAttributes</key>
  <dict>
    <key>UNNotificationExtensionCategory</key>
    <array>
      <string>PushologiesCarouselNotification</string>
    </array>
    <key>UNNotificationExtensionDefaultContentHidden</key>
    <string>NO</string>
    <key>UNNotificationExtensionInitialContentSizeRatio</key>
    <real>1</real>
    <key>UNNotificationExtensionUserInteractionEnabled</key>
    <true/>
  </dict>
  <key>NSExtensionMainStoryboard</key>
  <string>MainInterface</string>
  <key>NSExtensionPointIdentifier</key>
  <string>com.apple.usernotifications.content-extension</string>
</dict>
<key>NotiveraAppGroup</key>
<string>group.com.yourcompany.yourapp</string>
```

#### Categories

| Category | Used by |
|----------|---------|
| `NSDKNotification` | Service extension (standard / video-style pushes) |
| `PushologiesCarouselNotification` | Service + content extensions (carousel) |

Without these targets, App Group sharing, and `NotiveraSDK` linked into both extensions, rich push will not work correctly on iOS.

---

## Example app

```sh
yarn
yarn example android
# iOS:
cd example/ios && bundle exec pod install && cd ../..
yarn example ios
```

Copy `example/src/notiveraDemoSecrets.example.ts` → `notiveraDemoSecrets.ts` and fill credentials.

Android demo `applicationId`: `com.notivera.demo`  
iOS demo bundle / App Group: `com.notivera.app` / `group.com.notivera.app`

NSE/NCE targets are already in `example/ios/NotiveraExample.xcodeproj` (`NotiveraServiceExtension`, `NotiveraContentExtension`), with `NotiveraSDK.xcframework` linked and both appexes embedded.
