import Foundation
import NotiveraSDK
import UIKit
import UserNotifications

/// Process-lifetime native SDK bridge used by the React Native Turbo Module and host AppDelegate.
@objc(NotiveraBridge)
public final class NotiveraBridge: NSObject {
  private struct BufferedRemoteNotification {
    let application: UIApplication
    let userInfo: [AnyHashable: Any]
    let completionHandler: (UIBackgroundFetchResult) -> Void
  }

  private struct BufferedBackgroundURLSession {
    let application: UIApplication
    let identifier: String
    let completionHandler: () -> Void
  }

  private struct BufferedNotificationTap {
    let userInfo: [AnyHashable: Any]
    let categoryIdentifier: String
  }

  @objc public static let shared = NotiveraBridge()

  /// Posted on the main queue after `initialize` with the `Notivera` instance as `object`.
  /// Used by the example OfflineDemo module (same role as Flutter's init notification).
  public static let didInitializeNotification = Notification.Name("NotiveraBridgeDidInitialize")

  /// Process-lifetime SDK (matches Flutter: do not release on JS reload).
  private static var retainedSdk: Notivera?
  private static var pendingLaunchTap: BufferedNotificationTap?

  private var sdk: Notivera?
  private var eventObservers: [Any] = []
  private var bufferedDeviceToken: Data?
  private var bufferedRegistrationError: Error?
  private var bufferedRemoteNotifications: [BufferedRemoteNotification] = []
  private var bufferedBackgroundURLSessions: [BufferedBackgroundURLSession] = []

  /// Invoked on the main queue when a native push/in-app event occurs.
  @objc public var onPushEvent: (([String: Any]) -> Void)?

  /// Current SDK instance for host example code (e.g. OfflineDemo).
  @objc public func notiveraSdk() -> Notivera? {
    sdk ?? Self.retainedSdk
  }

  private override init() {
    super.init()
    sdk = Self.retainedSdk
  }

  // MARK: - AppDelegate / lifecycle helpers (public for host apps)

  @objc public static func captureNotificationResponse(_ response: UNNotificationResponse) {
    let userInfo = response.notification.request.content.userInfo
    let category = response.notification.request.content.categoryIdentifier
    guard isNotiveraTap(userInfo: userInfo, categoryIdentifier: category) else {
      return
    }
    pendingLaunchTap = BufferedNotificationTap(
      userInfo: userInfo,
      categoryIdentifier: category
    )
    NSLog("[NotiveraBridge] Captured launch notification tap category=%@", category)
  }

  @objc public static func flushPendingNotificationResponse(delaySeconds: Double = 0.5) {
    guard let tap = pendingLaunchTap else { return }
    guard let sdk = retainedSdk else {
      NSLog("[NotiveraBridge] Pending tap kept — SDK not initialized yet")
      return
    }
    pendingLaunchTap = nil
    DispatchQueue.main.asyncAfter(deadline: .now() + delaySeconds) {
      NSLog("[NotiveraBridge] Flushing launch notification tap category=%@", tap.categoryIdentifier)
      deliverNotificationTap(tap, using: sdk)
    }
  }

  @objc public func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    if let sdk {
      sdk.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    } else {
      bufferedDeviceToken = deviceToken
      bufferedRegistrationError = nil
      NSLog("[NotiveraBridge] APNs token buffered until initialize (%d bytes)", deviceToken.count)
    }
  }

  @objc public func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    if let sdk {
      sdk.application(
        application,
        didFailToRegisterForRemoteNotificationsWithError: error,
        completion: nil
      )
    } else {
      bufferedRegistrationError = error
      NSLog("[NotiveraBridge] APNs failure buffered: %@", error.localizedDescription)
    }
  }

  @objc public func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) -> Bool {
    if let sdk {
      guard sdk.isNotiveraNotification(userInfo: userInfo) else { return false }
      sdk.application(
        application,
        didReceiveRemoteNotification: userInfo,
        fetchCompletionHandler: completionHandler
      )
      return true
    }
    guard isPotentialNotiveraNotification(userInfo: userInfo) else { return false }
    bufferedRemoteNotifications.append(
      BufferedRemoteNotification(
        application: application,
        userInfo: userInfo,
        completionHandler: completionHandler
      )
    )
    return true
  }

  @objc public func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) -> Bool {
    guard let sdk else {
      bufferedBackgroundURLSessions.append(
        BufferedBackgroundURLSession(
          application: application,
          identifier: identifier,
          completionHandler: completionHandler
        )
      )
      return true
    }
    sdk.application(
      application,
      handleEventsForBackgroundURLSession: identifier,
      completionHandler: completionHandler
    )
    return true
  }

  @objc public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    let category = response.notification.request.content.categoryIdentifier
    if let sdk, Self.isNotiveraTap(userInfo: userInfo, categoryIdentifier: category) {
      Self.pendingLaunchTap = nil
      Self.deliverNotificationTap(
        BufferedNotificationTap(userInfo: userInfo, categoryIdentifier: category),
        using: sdk
      )
    } else {
      Self.captureNotificationResponse(response)
    }
    completionHandler()
  }

  // MARK: - JS API

  @objc public func initialize(config: [String: Any]) throws {
    let apiKey = config["apiKey"] as? String ?? ""
    let apiSecret = config["apiSecret"] as? String ?? ""
    let tenantId = config["tenantId"] as? String ?? ""
    let customerId = config["customerId"] as? String
    let inAppOpenDelayMs = (config["inAppOpenDelayMs"] as? NSNumber)?.intValue ?? 0

    let instance: Notivera
    if let existing = Self.retainedSdk {
      instance = existing
      NSLog("[NotiveraBridge] Reusing process-lifetime Notivera SDK")
    } else {
      instance = Notivera(
        apiKey: apiKey,
        apiSecret: apiSecret,
        inAppOpenDelay: inAppOpenDelayMs,
        tenantID: tenantId
      )
      Self.retainedSdk = instance
    }
    instance.customerID = customerId
    sdk = instance
    flushBufferedLifecycleEvents(using: instance)
    instance.setNotiveraUserNotificationDelegate(
      delegate: NotiveraUserNotificationDelegate(sdk: instance)
    )
    startObservingEvents()
    Self.flushPendingNotificationResponse(delaySeconds: 0.75)
    NotificationCenter.default.post(
      name: Self.didInitializeNotification,
      object: instance
    )
  }

  @objc public func getDeviceIdAndReturnError(_ error: NSErrorPointer) -> String? {
    do {
      return try requireSDK().deviceID?.uuidString
    } catch let err as NSError {
      error?.pointee = err
      return nil
    }
  }

  @objc public func getCustomerIdAndReturnError(_ error: NSErrorPointer) -> String? {
    do {
      return try requireSDK().customerID
    } catch let err as NSError {
      error?.pointee = err
      return nil
    }
  }

  @objc public func setCustomerId(_ customerId: String) throws {
    try requireSDK().customerID = customerId
  }

  @objc public func getSdkVersionAndReturnError(_ error: NSErrorPointer) -> String? {
    do {
      return try requireSDK().sdkVersion
    } catch let err as NSError {
      error?.pointee = err
      return nil
    }
  }

  @objc public func subscribeTag(_ tag: String) throws -> String {
    try requireSDK().subscribeTag(tag: tag)
    return "ok"
  }

  @objc public func unsubscribeTag(_ tag: String) throws -> String {
    try requireSDK().unsubscribeTag(tag: tag)
    return "ok"
  }

  @objc public func updatePersonalisationVariables(_ entries: [[String: Any]]) throws -> String {
    let schemas = entries.map { entry in
      NotiveraPersonalisationSchema(
        name: entry["name"] as? String ?? "",
        value: entry["value"] as? String ?? ""
      )
    }
    try requireSDK().updatePersonalisationVariables(schema: schemas)
    return "ok"
  }

  @objc public func getAllPersonalisationsAndReturnError(_ error: NSErrorPointer) -> [[String: Any]] {
    do {
      let schemas = try requireSDK().getAllPersonalisations() ?? []
      return schemas.compactMap { schema in
        guard let name = schema.name else { return nil }
        var row: [String: Any] = ["name": name]
        if let value = schema.value {
          row["value"] = value
        }
        return row
      }
    } catch let err as NSError {
      error?.pointee = err
      return []
    }
  }

  @objc public func showInAppNotification(_ customIdentifier: String) throws -> String {
    try requireSDK().showInAppNotification(with: customIdentifier)
    return "ok"
  }

  @objc public func closeNotificationView() throws {
    try requireSDK().closeNotificationView()
  }

  @objc public func requestAuthorisationPrompts(
    completion: @escaping (Error?) -> Void
  ) {
    Task { @MainActor in
      do {
        let sdk = try self.requireSDK()
        await sdk.showAuthorisationPrompts()
        sdk.setNotiveraUserNotificationDelegate(
          delegate: NotiveraUserNotificationDelegate(sdk: sdk)
        )
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func setPushToken(_ token: String) throws {
    _ = token
  }

  @objc public func isNotiveraMessage(_ data: [String: String], error: NSErrorPointer) -> NSNumber {
    do {
      let value = try requireSDK().isNotiveraNotification(userInfo: data)
      return NSNumber(value: value)
    } catch let err as NSError {
      error?.pointee = err
      return NSNumber(value: false)
    }
  }

  @objc public func handlePushMessage(_ data: [String: String]) throws {
    let sdk = try requireSDK()
    if data["PSDKDemoNotification"] != nil {
      throw bridgeError(
        code: "unsupported-on-ios",
        message:
          "Offline demo payloads (PSDKDemoNotification) are Android-only. "
          + "iOS offline demos use local UNNotifications in the native app."
      )
    }
    let userInfo = Dictionary<AnyHashable, Any>(
      uniqueKeysWithValues: data.map { ($0.key, $0.value as Any) }
    )
    guard sdk.isNotiveraNotification(userInfo: userInfo) else {
      throw bridgeError(
        code: "not-notivera-message",
        message:
          "Payload is not a Notivera iOS notification. Expected aps.category "
          + "NSDKNotification or PushologiesCarouselNotification."
      )
    }
    sdk.application(
      UIApplication.shared,
      didReceiveRemoteNotification: userInfo,
      fetchCompletionHandler: { _ in }
    )
  }

  // MARK: - Internals

  private func requireSDK() throws -> Notivera {
    guard let sdk else {
      throw bridgeError(
        code: "not-initialized",
        message: "Call initialize() before using the Notivera SDK."
      )
    }
    return sdk
  }

  private func bridgeError(code: String, message: String) -> NSError {
    NSError(
      domain: "NotiveraBridge",
      code: 0,
      userInfo: [
        NSLocalizedDescriptionKey: message,
        "code": code,
      ]
    )
  }

  private func flushBufferedLifecycleEvents(using sdk: Notivera) {
    let token = bufferedDeviceToken
    let registrationError = bufferedRegistrationError
    let remoteNotifications = bufferedRemoteNotifications
    let backgroundSessions = bufferedBackgroundURLSessions

    bufferedDeviceToken = nil
    bufferedRegistrationError = nil
    bufferedRemoteNotifications.removeAll()
    bufferedBackgroundURLSessions.removeAll()

    if let token {
      sdk.application(
        UIApplication.shared,
        didRegisterForRemoteNotificationsWithDeviceToken: token
      )
    } else if let registrationError {
      sdk.application(
        UIApplication.shared,
        didFailToRegisterForRemoteNotificationsWithError: registrationError,
        completion: nil
      )
    }

    for notification in remoteNotifications {
      guard sdk.isNotiveraNotification(userInfo: notification.userInfo) else {
        notification.completionHandler(.noData)
        continue
      }
      sdk.application(
        notification.application,
        didReceiveRemoteNotification: notification.userInfo,
        fetchCompletionHandler: notification.completionHandler
      )
    }

    for session in backgroundSessions {
      sdk.application(
        session.application,
        handleEventsForBackgroundURLSession: session.identifier,
        completionHandler: session.completionHandler
      )
    }
  }

  private func isPotentialNotiveraNotification(userInfo: [AnyHashable: Any]) -> Bool {
    guard
      let aps = userInfo["aps"] as? [AnyHashable: Any],
      let category = aps["category"] as? String
    else {
      return false
    }
    return category == "NSDKNotification" || category == "PushologiesCarouselNotification"
  }

  private static func isNotiveraTap(
    userInfo: [AnyHashable: Any],
    categoryIdentifier: String
  ) -> Bool {
    if categoryIdentifier == "NSDKNotification"
      || categoryIdentifier == "PushologiesCarouselNotification"
    {
      return true
    }
    if let aps = userInfo["aps"] as? [AnyHashable: Any],
      let category = aps["category"] as? String
    {
      return category == "NSDKNotification" || category == "PushologiesCarouselNotification"
    }
    return false
  }

  private static func deliverNotificationTap(
    _ tap: BufferedNotificationTap,
    using sdk: Notivera
  ) {
    var info = tap.userInfo
    info["handleTargertURL"] = true
    sdk.application(
      UIApplication.shared,
      didReceiveRemoteNotification: info,
      fetchCompletionHandler: { _ in }
    )
  }

  private func stopObservingEvents() {
    eventObservers.forEach { NotificationCenter.default.removeObserver($0) }
    eventObservers.removeAll()
  }

  private func startObservingEvents() {
    stopObservingEvents()
    let subscriptions: [(String, String)] = [
      (Notivera.eventNotificationTapped, "notificationTapped"),
      (Notivera.videoCloseButtonTapped, "videoClosed"),
      (Notivera.inAppClosedButtonTapped, "inAppClosed"),
      (Notivera.inAppCtaTapped, "inAppCtaTapped"),
    ]
    for (name, eventType) in subscriptions {
      let observer = NotificationCenter.default.addObserver(
        forName: NSNotification.Name(name),
        object: nil,
        queue: .main
      ) { [weak self] notification in
        self?.emit(eventType: eventType, notification: notification)
      }
      eventObservers.append(observer)
    }
  }

  private func emit(eventType: String, notification: Foundation.Notification) {
    var id = UUID().uuidString
    var title: String?
    var message: String?
    var clientMetadata: String?
    var type: String?
    var targetUrl: String?

    if let payload = notification.userInfo?["payload"] as? String,
      let data = payload.data(using: .utf8),
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    {
      id = json["notificationId"] as? String ?? id
      title = json["title"] as? String
      message = json["message"] as? String
      clientMetadata = json["clientMetadata"] as? String
      if let rawType = json["type"] {
        type = String(describing: rawType)
      }
      targetUrl = json["targetUrl"] as? String
    } else if let userInfo = notification.object as? [AnyHashable: Any] {
      clientMetadata = stringify(userInfo)
      if let aps = userInfo["aps"] as? [AnyHashable: Any] {
        if let alert = aps["alert"] as? [AnyHashable: Any] {
          title = alert["title"] as? String
          message = alert["body"] as? String
        } else if let alert = aps["alert"] as? String {
          message = alert
        }
      }
    }

    var event: [String: Any] = [
      "id": id,
      "eventType": eventType,
    ]
    if let title { event["title"] = title }
    if let message { event["message"] = message }
    if let clientMetadata { event["clientMetadata"] = clientMetadata }
    if let type { event["type"] = type }
    if let targetUrl { event["targetUrl"] = targetUrl }
    onPushEvent?(event)
  }

  private func stringify(_ value: Any) -> String? {
    guard JSONSerialization.isValidJSONObject(value),
      let data = try? JSONSerialization.data(withJSONObject: value),
      let string = String(data: data, encoding: .utf8)
    else {
      return String(describing: value)
    }
    return string
  }
}
