require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "Notivera"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://github.com/Notivera/react-native-sdk.git", :tag => "#{s.version}" }

  # Only bridge sources — do not recurse into ios/Frameworks (vendored XCFramework).
  s.source_files = "ios/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/*.h"
  s.vendored_frameworks = "ios/Frameworks/NotiveraSDK.xcframework"
  s.swift_version = "5.0"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
  }

  # Download the binary if maintainers clone without the vendored framework.
  s.prepare_command = <<-CMD
    FRAMEWORK_DIR="ios/Frameworks"
    FRAMEWORK="$FRAMEWORK_DIR/NotiveraSDK.xcframework"
    ZIP_URL="https://github.com/Notivera/ios-spm-notivera/releases/download/5.0.0/NotiveraSDK.xcframework.zip"
    if [ ! -d "$FRAMEWORK" ]; then
      mkdir -p "$FRAMEWORK_DIR"
      curl -L -o "$FRAMEWORK_DIR/NotiveraSDK.xcframework.zip" "$ZIP_URL"
      unzip -qo "$FRAMEWORK_DIR/NotiveraSDK.xcframework.zip" -d "$FRAMEWORK_DIR"
      rm -f "$FRAMEWORK_DIR/NotiveraSDK.xcframework.zip"
      rm -rf "$FRAMEWORK_DIR/__MACOSX"
    fi
  CMD

  install_modules_dependencies(s)
end
