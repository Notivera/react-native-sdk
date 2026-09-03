# Notivera React Native example

Demo host for `react-native-notivera`.

## Setup

```sh
# from repo root
yarn
cp example/src/notiveraDemoSecrets.example.ts example/src/notiveraDemoSecrets.ts
# fill credentials

yarn example android

cd example/ios && bundle exec pod install && cd ../..
yarn example ios
```

### Android

- `applicationId`: `com.notivera.demo`
- JitPack + Firebase (`google-services.json`) already wired
- `android.enableR8.fullMode=false`

### iOS

- Bundle ID: `com.notivera.app`
- App Group: `group.com.notivera.app` (`NotiveraAppGroup` in Info.plist)
- AppDelegate forwards APNs to `NotiveraBridge`
- Extension sources under `NotiveraServiceExtension/` and `NotiveraContentExtension/` — add as Xcode targets and link `NotiveraSDK` (see root README)
