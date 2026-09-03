#import "Notivera.h"
#import <React/RCTUtils.h>

#if __has_include(<Notivera/Notivera-Swift.h>)
#import <Notivera/Notivera-Swift.h>
#elif __has_include("Notivera-Swift.h")
#import "Notivera-Swift.h"
#endif

@implementation Notivera {
  NotiveraBridge *_bridge;
}

- (instancetype)init
{
  if (self = [super init]) {
    _bridge = [NotiveraBridge shared];
    __weak Notivera *weakSelf = self;
    _bridge.onPushEvent = ^(NSDictionary *event) {
      Notivera *strongSelf = weakSelf;
      if (strongSelf == nil) {
        return;
      }
      [strongSelf emitOnPushEvent:event];
    };
  }
  return self;
}

+ (NSString *)moduleName
{
  return @"Notivera";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
  (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeNotiveraSpecJSI>(params);
}

static NSError *NotiveraMapError(NSError *error)
{
  if (error == nil) {
    return [NSError errorWithDomain:@"Notivera" code:0 userInfo:@{
      NSLocalizedDescriptionKey : @"Unknown Notivera error",
      @"code" : @"sdk-error",
    }];
  }
  NSString *code = error.userInfo[@"code"] ?: @"sdk-error";
  return [NSError errorWithDomain:@"Notivera" code:error.code userInfo:@{
    NSLocalizedDescriptionKey : error.localizedDescription ?: @"Notivera error",
    @"code" : code,
  }];
}

- (void)initialize:(NSDictionary *)config
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  @try {
    [_bridge initializeWithConfig:config error:&error];
    if (error != nil) {
      NSError *mapped = NotiveraMapError(error);
      reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
      return;
    }
    resolve(nil);
  } @catch (NSException *exception) {
    reject(@"sdk-error", exception.reason, nil);
  }
}

- (void)getDeviceId:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSString *value = [_bridge getDeviceIdAndReturnError:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)getCustomerId:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSString *value = [_bridge getCustomerIdAndReturnError:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)setCustomerId:(NSString *)customerId
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  [_bridge setCustomerId:customerId error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(nil);
}

- (void)getSdkVersion:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSString *value = [_bridge getSdkVersionAndReturnError:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)subscribeTag:(NSString *)tag
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSString *value = [_bridge subscribeTag:tag error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)unsubscribeTag:(NSString *)tag
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSString *value = [_bridge unsubscribeTag:tag error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)updatePersonalisationVariables:(NSArray *)entries
                               resolve:(RCTPromiseResolveBlock)resolve
                                reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSString *value = [_bridge updatePersonalisationVariables:entries error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)getAllPersonalisations:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSArray *value = [_bridge getAllPersonalisationsAndReturnError:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value ?: @[]);
}

- (void)showInAppNotification:(NSString *)customIdentifier
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSString *value = [_bridge showInAppNotification:customIdentifier error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)closeNotificationView:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  [_bridge closeNotificationViewAndReturnError:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(nil);
}

- (void)requestAuthorisationPrompts:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject
{
  [_bridge requestAuthorisationPromptsWithCompletion:^(NSError *error) {
    if (error != nil) {
      NSError *mapped = NotiveraMapError(error);
      reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
      return;
    }
    resolve(nil);
  }];
}

- (void)setPushToken:(NSString *)token
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  [_bridge setPushToken:token error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(nil);
}

- (void)isNotiveraMessage:(NSDictionary *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSNumber *value = [_bridge isNotiveraMessage:data error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(value);
}

- (void)handlePushMessage:(NSDictionary *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  [_bridge handlePushMessage:data error:&error];
  if (error != nil) {
    NSError *mapped = NotiveraMapError(error);
    reject(mapped.userInfo[@"code"], mapped.localizedDescription, mapped);
    return;
  }
  resolve(nil);
}

@end
