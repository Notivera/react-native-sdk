# react-native-notivera

React Native Turbo Module wrapper for the [Notivera](https://notivera.com/) native Android and iOS SDKs.

Native pins (same as the Flutter plugin):

- Android: `com.github.Notivera:android-sdk:5.0.1` (JitPack)
- iOS: `NotiveraSDK` **5.0.0** XCFramework from [ios-spm-notivera](https://github.com/Notivera/ios-spm-notivera)

Requires **React Native 0.76+** (New Architecture / Turbo Modules). Minimum iOS **15.1** (React Native), Android **minSdk 24**. The underlying Notivera iOS SDK supports iOS 14+, but this wrapper follows RN’s deployment target.

```sh
yarn add react-native-notivera
# or
npm install react-native-notivera
```

## JavaScript usage

```ts
import { Notivera, type NotiveraPushEvent } from 'react-native-notivera';

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

Add **Notification Service Extension** and **Notification Content Extension** targets in the host Xcode app (same as the native iOS / Flutter examples). Source templates live under `example/ios/NotiveraServiceExtension` and `example/ios/NotiveraContentExtension`.

1. Link **NotiveraSDK** to both extension targets (from the pod / vendored XCFramework).
2. Use the **same App Group** as the main app.
3. Service extension subclass:

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

4. Content extension storyboard VC custom class: `NotiveraCarouselNotificationContentViewController` (module `NotiveraSDK`), category `PushologiesCarouselNotification`.

Suggested extension bundle IDs for the demo app: `com.notivera.app.PushNotificationServiceExtension` and `com.notivera.app.Carousel`.

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

Wire the NSE/NCE targets in Xcode once (files are already under `example/ios/`).
