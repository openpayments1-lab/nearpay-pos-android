package io.nearpay.sdk

import android.app.Activity
import io.nearpay.sdk.data.models.AuthenticationData
import io.nearpay.sdk.utils.enums.NetworkConfiguration
import io.nearpay.sdk.utils.enums.UIPosition
import io.nearpay.sdk.utils.listeners.SetupListener
import io.nearpay.sdk.utils.listeners.PurchaseListener
import java.util.Locale

class NearPay private constructor() {
    
    fun setup(listener: SetupListener) {
        // Stub: Real implementation requires NearPay Direct SDK
    }
    
    fun purchase(amount: Long, listener: PurchaseListener) {
        // Stub: Real implementation requires NearPay Direct SDK
    }
    
    class Builder {
        private var activity: Activity? = null
        private var authenticationData: AuthenticationData? = null
        private var environment: Environments? = null
        private var locale: Locale? = null
        private var networkConfiguration: NetworkConfiguration? = null
        private var uiPosition: UIPosition? = null
        
        fun context(activity: Activity) = apply { this.activity = activity }
        fun authenticationData(data: AuthenticationData) = apply { this.authenticationData = data }
        fun environment(env: Environments) = apply { this.environment = env }
        fun locale(locale: Locale) = apply { this.locale = locale }
        fun networkConfiguration(config: NetworkConfiguration) = apply { this.networkConfiguration = config }
        fun uiPosition(position: UIPosition) = apply { this.uiPosition = position }
        
        fun build(): NearPay {
            return NearPay()
        }
    }
}
