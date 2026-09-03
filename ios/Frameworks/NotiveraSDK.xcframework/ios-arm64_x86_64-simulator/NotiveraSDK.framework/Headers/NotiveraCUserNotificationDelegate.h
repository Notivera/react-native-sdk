//
//  NotiveraCUserNotificationDelegate.h
//  NotiveraSDK
//
//  Created by Phil on 07/02/2023.
//  Copyright © 2026 Notivera. All rights reserved.
//

#import <UserNotifications/UserNotifications.h>
#import <NotiveraSDK/NotiveraSDK-Swift.h>

NS_ASSUME_NONNULL_BEGIN

@interface NotiveraCUserNotificationDelegate : NSObject<UNUserNotificationCenterDelegate>

@property(nonatomic, strong) NotiveraUserNotificationDelegate *sdkDelegate;

-(instancetype)initWithSdk:(Notivera *)sdk;

@end

NS_ASSUME_NONNULL_END
