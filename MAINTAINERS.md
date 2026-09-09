# Maintainer notes

## Native SDK pins

| Layer | Version |
|-------|---------|
| npm package | see `package.json` |
| Android native | `com.github.Notivera:android-sdk:5.0.1` in `android/build.gradle` |
| iOS native | `NotiveraSDK` **5.0.0** XCFramework in `ios/Frameworks/` |

Refresh iOS binary:

```sh
rm -rf ios/Frameworks/NotiveraSDK.xcframework
# pod install runs prepare_command, or:
curl -L -o /tmp/NotiveraSDK.xcframework.zip \
  https://github.com/Notivera/ios-spm-notivera/releases/download/5.0.0/NotiveraSDK.xcframework.zip
unzip -qo /tmp/NotiveraSDK.xcframework.zip -d ios/Frameworks
rm -rf ios/Frameworks/__MACOSX
```

Keep Android / iOS pins aligned with [`notivera_flutter`](../notivera_flutter) when releasing.

## Architecture

- Turbo Module Spec: `src/NativeNotivera.ts` (Codegen)
- Public JS API: `src/index.tsx` (`Notivera` class)
- Android bridge: `android/src/main/java/com/notivera/NotiveraModule.kt`
- iOS bridge: `ios/NotiveraBridge.swift` + `ios/Notivera.mm`

## Local toolchain

```sh
export JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/corretto-17.0.17/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

Do not install a second JDK for this project unless Corretto 17 is unavailable.

## Example iOS extensions

`example/ios/NotiveraServiceExtension` and `example/ios/NotiveraContentExtension` are Xcode app-extension targets in `NotiveraExample.xcodeproj` (App Group + `NotiveraSDK.xcframework` linked; do **not** add the `Notivera` pod to extensions). Host-app setup docs: root README §4.
