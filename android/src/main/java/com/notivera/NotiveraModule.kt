package com.notivera

import android.app.Application
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.lifecycle.Observer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.notivera.sdk.ConnectionType as SdkConnectionType
import com.notivera.sdk.NotiveraPushTheme as SdkNotiveraPushTheme
import com.notivera.sdk.SDK
import com.notivera.sdk.SDKConfig
import com.notivera.sdk.SDKResponse
import com.notivera.sdk.business.data.EventType as SdkEventType
import com.notivera.sdk.business.data.PushEvent as SdkPushEvent
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

@ReactModule(name = NotiveraModule.NAME)
class NotiveraModule(reactContext: ReactApplicationContext) :
  NativeNotiveraSpec(reactContext) {

  private var initialized = false
  private var eventObserver: Observer<SdkPushEvent>? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun getName(): String = NAME

  override fun initialize(config: ReadableMap, promise: Promise) {
    runOnMainThread(promise) {
      val app = reactApplicationContext.applicationContext as Application
      SDK.init(app, config.toSdk(), config.toPushTheme(app))
      initialized = true
      ensureEventObserver()
      null
    }
  }

  override fun invalidate() {
    runOnMainThread {
      eventObserver?.let { SDK.pushEvent.removeObserver(it) }
      eventObserver = null
    }
    super.invalidate()
  }

  override fun getDeviceId(promise: Promise) {
    runOnMainThread(promise) {
      requireInitialized()
      SDK.getDeviceId()
    }
  }

  override fun getCustomerId(promise: Promise) {
    try {
      requireInitialized()
      val id = SDK.getCustomerId()
      promise.resolve(id.ifEmpty { null })
    } catch (error: Throwable) {
      promise.reject(error.codeOr("sdk-error"), error.message, error)
    }
  }

  override fun setCustomerId(customerId: String, promise: Promise) {
    try {
      requireInitialized()
      SDK.setCustomerId(customerId)
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject(error.codeOr("sdk-error"), error.message, error)
    }
  }

  override fun getSdkVersion(promise: Promise) {
    // Android native SDK does not expose a public version string (Flutter returns null).
    promise.resolve(null)
  }

  override fun subscribeTag(tag: String, promise: Promise) {
    invokeAsync(promise, "subscribeTag") { callback ->
      SDK.subscribeTag(tag, callback)
    }
  }

  override fun unsubscribeTag(tag: String, promise: Promise) {
    invokeAsync(promise, "unsubscribeTag") { callback ->
      SDK.unsubscribeTag(tag, callback)
    }
  }

  override fun updatePersonalisationVariables(entries: ReadableArray, promise: Promise) {
    val schema = mutableMapOf<String, String?>()
    for (i in 0 until entries.size()) {
      val map = entries.getMap(i) ?: continue
      val name = map.getString("name") ?: continue
      schema[name] = if (map.hasKey("value") && !map.isNull("value")) map.getString("value") else null
    }
    invokeAsync(promise, "updatePersonalisationVariables") { callback ->
      SDK.updatePersonalisationVariables(schema, callback)
    }
  }

  override fun getAllPersonalisations(promise: Promise) {
    try {
      requireInitialized()
      val result = Arguments.createArray()
      SDK.getAllPersonalisations().forEach { (name, value) ->
        val row = Arguments.createMap()
        row.putString("name", name)
        if (value == null) {
          row.putNull("value")
        } else {
          row.putString("value", value)
        }
        result.pushMap(row)
      }
      promise.resolve(result)
    } catch (error: Throwable) {
      promise.reject(error.codeOr("sdk-error"), error.message, error)
    }
  }

  override fun showInAppNotification(customIdentifier: String, promise: Promise) {
    invokeAsync(promise, "showInAppNotification") { callback ->
      SDK.showInAppNotification(customIdentifier, callback)
    }
  }

  override fun closeNotificationView(promise: Promise) {
    runOnMainThread(promise) {
      requireInitialized()
      SDK.closeNotificationView()
      null
    }
  }

  override fun requestAuthorisationPrompts(promise: Promise) {
    runOnMainThread(promise) {
      requireInitialized()
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("No Android Activity is attached.")
      SDK.requestGeofencePermission(activity)
      null
    }
  }

  override fun setPushToken(token: String, promise: Promise) {
    try {
      requireInitialized()
      SDK.setFCMToken(token)
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject(error.codeOr("sdk-error"), error.message, error)
    }
  }

  override fun isNotiveraMessage(data: ReadableMap, promise: Promise) {
    try {
      requireInitialized()
      promise.resolve(SDK.isNotiveraMessage(data.toStringMap()))
    } catch (error: Throwable) {
      promise.reject(error.codeOr("sdk-error"), error.message, error)
    }
  }

  override fun handlePushMessage(data: ReadableMap, promise: Promise) {
    runOnMainThread(promise) {
      requireInitialized()
      val payload = data.toStringMap()
      val root = payload["root"]
      Log.i(
        TAG,
        "handlePushMessage keys=${payload.keys} rootBytes=${root?.length ?: 0} " +
          "demo=${payload.containsKey("PSDKDemoNotification")}",
      )
      if (root.isNullOrBlank()) {
        throw IllegalArgumentException("handlePushMessage requires a non-empty 'root' string")
      }
      SDK.handlePushMessage(payload)
      null
    }
  }

  private fun invokeAsync(
    promise: Promise,
    operation: String,
    call: (SDKResponse<String>) -> Unit,
  ) {
    runOnMainThread {
      try {
        requireInitialized()
        call(
          object : SDKResponse<String> {
            override fun onSuccess(result: String) {
              promise.resolve(result)
            }

            override fun onError(throwable: Throwable) {
              Log.e(TAG, "$operation failed: ${throwable.message}", throwable)
              promise.reject(throwable.codeOr("sdk-error"), throwable.message, throwable)
            }
          },
        )
      } catch (error: Throwable) {
        promise.reject(error.codeOr("sdk-error"), error.message, error)
      }
    }
  }

  private fun runOnMainThread(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
    } else {
      mainHandler.post(block)
    }
  }

  private fun runOnMainThread(promise: Promise, block: () -> Any?) {
    runOnMainThread {
      try {
        promise.resolve(block())
      } catch (error: Throwable) {
        promise.reject(
          if (error is IllegalStateException && error.message?.contains("Activity") == true) {
            "no-activity"
          } else {
            error.codeOr("sdk-error")
          },
          error.message ?: "operation failed",
          error,
        )
      }
    }
  }

  private fun requireInitialized() {
    if (!initialized) {
      throw IllegalStateException("Call initialize() before using the Notivera SDK.")
    }
  }

  private fun ensureEventObserver() {
    if (eventObserver != null) {
      return
    }
    val observer = Observer<SdkPushEvent> { event ->
      emitOnPushEvent(event.toWritableMap())
    }
    eventObserver = observer
    SDK.pushEvent.observeForever(observer)
  }

  companion object {
    const val NAME = "Notivera"
    private const val TAG = "NotiveraModule"
  }
}

private fun Throwable.codeOr(default: String): String {
  return when (this) {
    is IllegalStateException ->
      if (message?.contains("initialize") == true) "not-initialized" else default
    is UnknownHostException -> "network-unreachable"
    is SocketTimeoutException -> "network-timeout"
    is IOException -> "network-error"
    else -> default
  }
}

private fun ReadableMap.toStringMap(): Map<String, String> {
  val out = mutableMapOf<String, String>()
  val iterator = keySetIterator()
  while (iterator.hasNextKey()) {
    val key = iterator.nextKey()
    val asString = getString(key)
    if (asString != null) {
      out[key] = asString
      continue
    }
    // Coerce non-string bridge values so offline demo payloads still flow through.
    when (getType(key)) {
      com.facebook.react.bridge.ReadableType.Boolean ->
        out[key] = getBoolean(key).toString()
      com.facebook.react.bridge.ReadableType.Number ->
        out[key] = getDouble(key).toString()
      else -> Unit
    }
  }
  return out
}

private fun ReadableMap.toSdk(): SDKConfig {
  return SDKConfig(
    apiKey = getString("apiKey") ?: "",
    apiSecret = getString("apiSecret") ?: "",
    tenantID = getString("tenantId") ?: "",
    appVersion = getString("appVersion") ?: "",
    customerId = optionalString("customerId"),
    downloadConnectionType = optionalString("downloadConnectionType").toSdkConnection(),
    enableDebug = optionalBoolean("enableDebug") ?: false,
    trackLocation = optionalBoolean("trackLocation") ?: false,
    enableGeofence = optionalBoolean("enableGeofence") ?: false,
    inAppOpenDelay = optionalInt("inAppOpenDelayMs")?.toLong(),
  )
}

private fun ReadableMap.toPushTheme(context: Context): SdkNotiveraPushTheme {
  val defaults = SdkNotiveraPushTheme()
  if (!hasKey("pushTheme") || isNull("pushTheme")) {
    return defaults
  }
  val theme = getMap("pushTheme") ?: return defaults
  return SdkNotiveraPushTheme(
    smallIconRes =
      context.resolveDrawableOrMipmap(theme.optionalString("smallIcon"))
        ?: defaults.smallIconRes,
    largeIconRes =
      context.resolveDrawableOrMipmap(theme.optionalString("largeIcon"))
        ?: defaults.largeIconRes,
    color =
      context.resolveColorRes(theme.optionalString("color"))
        ?: defaults.color,
  )
}

private fun Context.resolveDrawableOrMipmap(name: String?): Int? {
  if (name.isNullOrBlank()) return null
  val drawable = resources.getIdentifier(name, "drawable", packageName)
  if (drawable != 0) return drawable
  val mipmap = resources.getIdentifier(name, "mipmap", packageName)
  return mipmap.takeIf { it != 0 }
}

private fun Context.resolveColorRes(name: String?): Int? {
  if (name.isNullOrBlank()) return null
  val color = resources.getIdentifier(name, "color", packageName)
  return color.takeIf { it != 0 }
}

private fun String?.toSdkConnection(): SdkConnectionType =
  when (this) {
    "wifi" -> SdkConnectionType.WIFI
    "mobile" -> SdkConnectionType.MOBILE
    "mobileRoaming" -> SdkConnectionType.MOBILE_ROAMING
    "mobileNoRoaming" -> SdkConnectionType.MOBILE_NO_ROAMING
    else -> SdkConnectionType.ALL
  }

private fun SdkPushEvent.toWritableMap(): WritableMap {
  val map = Arguments.createMap()
  map.putString("id", id)
  map.putString("eventType", eventType.toJs())
  map.putString("title", title)
  map.putString("description", description)
  map.putString("replacements", replacements)
  map.putString("message", message)
  map.putString("clientMetadata", clientMetadata)
  map.putString("type", type)
  map.putString("targetUrl", targetUrl)
  return map
}

private fun SdkEventType?.toJs(): String? =
  when (this) {
    SdkEventType.NOTIFICATION_TAPPED -> "notificationTapped"
    SdkEventType.VIDEO_CLOSED -> "videoClosed"
    SdkEventType.IN_APP_CLOSED -> "inAppClosed"
    SdkEventType.IN_APP_CTA_TAPPED -> "inAppCtaTapped"
    null -> null
  }

private fun ReadableMap.optionalString(key: String): String? {
  if (!hasKey(key) || isNull(key)) return null
  return getString(key)
}

private fun ReadableMap.optionalBoolean(key: String): Boolean? {
  if (!hasKey(key) || isNull(key)) return null
  return getBoolean(key)
}

private fun ReadableMap.optionalInt(key: String): Int? {
  if (!hasKey(key) || isNull(key)) return null
  return getInt(key)
}
