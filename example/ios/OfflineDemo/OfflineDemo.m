#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(OfflineDemo, NSObject)

RCT_EXTERN_METHOD(installDelegate:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(schedule:(NSString *)category
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
