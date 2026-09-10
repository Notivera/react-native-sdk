# Consumer rules for notivera-react-native (applied when the host app enables minify/R8).
# Prefer also setting android.enableR8.fullMode=false in the host gradle.properties
# — R8 full mode can break Notivera Koin DI (e.g. NoBeanDefFoundException: SDKViewModel).

-keep class com.notivera.** { *; }
-keepclassmembers class com.notivera.** { *; }
-keep class org.koin.** { *; }
-dontwarn org.koin.**
