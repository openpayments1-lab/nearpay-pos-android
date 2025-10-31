package io.nearpay.terminalsdk

import android.app.Activity
import io.nearpay.terminalsdk.data.*
import io.nearpay.terminalsdk.listeners.*

class TerminalSDK private constructor() {
    
    fun sendOTP(mobileLogin: MobileLogin, listener: SendOTPMobileListener) {
        // Stub: Real implementation requires NearPay Terminal SDK
    }
    
    fun verify(loginData: LoginData, listener: VerifyMobileListener) {
        // Stub: Real implementation requires NearPay Terminal SDK
    }
    
    class Builder {
        private var activity: Activity? = null
        private var environment: SdkEnvironment? = null
        private var googleCloudProjectNumber: Long? = null
        private var huaweiSafetyDetectApiKey: String? = null
        private var country: Country? = null
        
        fun activity(activity: Activity) = apply { this.activity = activity }
        fun environment(env: SdkEnvironment) = apply { this.environment = env }
        fun googleCloudProjectNumber(number: Long) = apply { this.googleCloudProjectNumber = number }
        fun huaweiSafetyDetectApiKey(key: String) = apply { this.huaweiSafetyDetectApiKey = key }
        fun country(country: Country) = apply { this.country = country }
        
        fun build(): TerminalSDK {
            return TerminalSDK()
        }
    }
}
