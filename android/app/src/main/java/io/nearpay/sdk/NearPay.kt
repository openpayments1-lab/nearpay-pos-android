package io.nearpay.sdk

import android.content.Context
import io.nearpay.sdk.data.models.AuthenticationData
import io.nearpay.sdk.utils.enums.NetworkConfiguration
import io.nearpay.sdk.utils.enums.UIPosition
import io.nearpay.sdk.utils.listeners.PurchaseListener
import io.nearpay.sdk.utils.listeners.SetupListener
import java.util.Locale
import java.util.UUID

class NearPay private constructor(
    private val context: Context,
    private val authenticationData: AuthenticationData,
    private val environment: Environments,
    private val locale: Locale,
    private val networkConfiguration: NetworkConfiguration,
    private val uiPosition: UIPosition,
    private val loadingUi: Boolean
) {
    
    fun setup(listener: SetupListener) {
        // Stub: Auto-complete setup
        listener.onSetupCompleted()
    }
    
    fun purchase(
        amount: Long,
        customerReferenceNumber: String,
        enableReceiptUi: Boolean,
        enableReversal: Boolean,
        finishTimeOut: Long,
        requestId: UUID,
        enableUiDismiss: Boolean,
        listener: PurchaseListener
    ) {
        // Stub: Simulate successful payment
        val mockTransaction = io.nearpay.sdk.data.models.TransactionData(
            uuid = requestId.toString(),
            scheme = "VISA",
            cardholderName = "STUB USER"
        )
        listener.onPurchaseApproved(mockTransaction)
    }
    
    class Builder {
        private var context: Context? = null
        private var authenticationData: AuthenticationData? = null
        private var environment: Environments = Environments.SANDBOX
        private var locale: Locale = Locale.getDefault()
        private var networkConfiguration: NetworkConfiguration = NetworkConfiguration.DEFAULT
        private var uiPosition: UIPosition = UIPosition.CENTER_BOTTOM
        private var loadingUi: Boolean = true
        
        fun context(context: Context) = apply { this.context = context }
        fun authenticationData(data: AuthenticationData) = apply { this.authenticationData = data }
        fun environment(env: Environments) = apply { this.environment = env }
        fun locale(locale: Locale) = apply { this.locale = locale }
        fun networkConfiguration(config: NetworkConfiguration) = apply { this.networkConfiguration = config }
        fun uiPosition(position: UIPosition) = apply { this.uiPosition = position }
        fun loadingUi(show: Boolean) = apply { this.loadingUi = show }
        
        fun build(): NearPay {
            return NearPay(
                context = context ?: throw IllegalStateException("Context is required"),
                authenticationData = authenticationData ?: throw IllegalStateException("AuthenticationData is required"),
                environment = environment,
                locale = locale,
                networkConfiguration = networkConfiguration,
                uiPosition = uiPosition,
                loadingUi = loadingUi
            )
        }
    }
}
