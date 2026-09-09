import Foundation
import Notivera
import NotiveraSDK
import React
import UIKit
import UserNotifications

/// Example-only RN module: schedules native offline demos and installs a
/// notification delegate that presents UIKit/AVKit experiences on tap
/// (same categories as Flutter / ios-sdk offline demos).
@objc(OfflineDemo)
class OfflineDemo: NSObject {
  private static weak var sdk: Notivera?
  private static var didObserveInit = false

  override init() {
    super.init()
    Self.observeSdkInitIfNeeded()
    if Self.sdk == nil {
      Self.sdk = NotiveraBridge.shared.notiveraSdk()
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { true }

  private static func observeSdkInitIfNeeded() {
    guard !didObserveInit else { return }
    didObserveInit = true
    NotificationCenter.default.addObserver(
      forName: NotiveraBridge.didInitializeNotification,
      object: nil,
      queue: .main
    ) { notification in
      sdk = notification.object as? Notivera
      NSLog("[OfflineDemo] Captured Notivera SDK from bridge init notification")
    }
  }

  @objc func installDelegate(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    Self.observeSdkInitIfNeeded()
    if Self.sdk == nil {
      Self.sdk = NotiveraBridge.shared.notiveraSdk()
    }
    guard let sdk = Self.sdk else {
      NSLog("[OfflineDemo] installDelegate skipped — Notivera SDK not ready yet")
      resolve(nil)
      return
    }
    Self.registerOfflineCategories()
    sdk.setNotiveraUserNotificationDelegate(
      delegate: OfflineDemoNotificationDelegate(sdk: sdk)
    )
    NSLog("[OfflineDemo] OfflineDemoNotificationDelegate installed")
    PendingNotificationTap.flush(using: sdk)
    NotiveraBridge.flushPendingNotificationResponse(delaySeconds: 0.5)
    resolve(nil)
  }

  @objc func schedule(
    _ category: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      try OfflineDemoScheduler.schedule(categoryIdentifier: category)
      resolve(nil)
    } catch {
      reject("schedule-failed", error.localizedDescription, error)
    }
  }

  private static func registerOfflineCategories() {
    let center = UNUserNotificationCenter.current()
    center.getNotificationCategories { existing in
      var categories = existing
      let carousel = UNNotificationCategory(
        identifier: "CategoryExtension",
        actions: [
          UNNotificationAction(identifier: "next", title: "→", options: []),
          UNNotificationAction(identifier: "previous", title: "←", options: []),
        ],
        intentIdentifiers: [],
        options: []
      )
      categories.insert(carousel)
      for id in ["VideoWithButtonOne", "VideoWithButtonTwo", "Poll"] {
        categories.insert(
          UNNotificationCategory(
            identifier: id,
            actions: [],
            intentIdentifiers: [],
            options: []
          )
        )
      }
      center.setNotificationCategories(categories)
    }
  }
}
