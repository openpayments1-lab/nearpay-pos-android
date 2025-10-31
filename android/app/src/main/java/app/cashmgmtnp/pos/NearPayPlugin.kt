package app.cashmgmtnp.pos

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import io.nearpay.sdk.Environments
import io.nearpay.sdk.NearPay
import io.nearpay.sdk.data.models.AuthenticationData
import io.nearpay.sdk.data.models.PurchaseFailure
import io.nearpay.sdk.data.models.SetupFailure
import io.nearpay.sdk.data.models.TransactionData
import io.nearpay.sdk.utils.enums.NetworkConfiguration
import io.nearpay.sdk.utils.enums.UIPosition
import io.nearpay.sdk.utils.listeners.PurchaseListener
import io.nearpay.sdk.utils.listeners.SetupListener
import java.util.Locale
import java.util.UUID

@CapacitorPlugin(name = "NearPay")
class NearPayPlugin : Plugin() {
    
    companion object {
        private const val TAG = "NearPayPlugin"
    }
    
    private var nearPay: NearPay? = null
    private var isSetupComplete = false

    @PluginMethod
    fun initialize(call: PluginCall) {
        try {
            val authToken = call.getString("authToken")
            val environment = call.getString("environment") ?: "sandbox"
            
            if (authToken.isNullOrEmpty()) {
                call.reject("Authentication token is required")
                return
            }

            val env = if (environment == "production") {
                Environments.PRODUCTION
            } else {
                Environments.SANDBOX
            }

            nearPay = NearPay.Builder()
                .context(activity)
                .authenticationData(AuthenticationData.Jwt(authToken))
                .environment(env)
                .locale(Locale.getDefault())
                .networkConfiguration(NetworkConfiguration.DEFAULT)
                .uiPosition(UIPosition.CENTER_BOTTOM)
                .loadingUi(true)
                .build()

            nearPay?.setup(object : SetupListener {
                override fun onSetupCompleted() {
                    isSetupComplete = true
                    Log.d(TAG, "NearPay SDK setup completed successfully")
                    
                    val result = JSObject()
                    result.put("success", true)
                    result.put("message", "NearPay SDK initialized and setup completed")
                    call.resolve(result)
                }

                override fun onSetupFailed(setupFailure: SetupFailure) {
                    isSetupComplete = false
                    val errorMessage = when (setupFailure) {
                        is SetupFailure.AuthenticationFailed -> "Authentication failed"
                        is SetupFailure.AlreadyInstalled -> "Plugin already installed"
                        is SetupFailure.NotInstalled -> "Plugin not installed"
                        is SetupFailure.InvalidStatus -> "Invalid status: ${setupFailure.status}"
                        is SetupFailure.GeneralFailure -> "General failure"
                    }
                    
                    Log.e(TAG, "NearPay SDK setup failed: $errorMessage")
                    call.reject("Setup failed: $errorMessage")
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize NearPay SDK", e)
            call.reject("Failed to initialize NearPay: ${e.message}")
        }
    }

    @PluginMethod
    fun processPayment(call: PluginCall) {
        if (nearPay == null) {
            call.reject("NearPay SDK not initialized. Call initialize() first.")
            return
        }

        if (!isSetupComplete) {
            call.reject("NearPay SDK setup not complete. Please wait for initialization.")
            return
        }

        try {
            val amount = call.getDouble("amount")
            if (amount == null || amount <= 0) {
                call.reject("Valid amount is required")
                return
            }

            val amountInMinorUnits = (amount * 100).toLong()
            
            val customerReferenceNumber = call.getString("reference") ?: UUID.randomUUID().toString()
            val enableReceiptUi = true
            val enableReversal = true
            val finishTimeOut = 60L
            val requestId = UUID.randomUUID()
            val enableUiDismiss = true

            Log.d(TAG, "Processing payment for amount: $amount (${amountInMinorUnits} minor units)")

            nearPay?.purchase(
                amountInMinorUnits,
                customerReferenceNumber,
                enableReceiptUi,
                enableReversal,
                finishTimeOut,
                requestId,
                enableUiDismiss,
                object : PurchaseListener {
                    override fun onPurchaseApproved(transactionData: TransactionData) {
                        Log.d(TAG, "Payment approved: ${transactionData.uuid}")
                        
                        val response = JSObject()
                        response.put("success", true)
                        response.put("status", "APPROVED")
                        response.put("transactionId", transactionData.uuid)
                        response.put("amount", amount)
                        response.put("reference", customerReferenceNumber)
                        
                        transactionData.scheme?.let { scheme ->
                            val cardDetails = JSObject()
                            cardDetails.put("type", scheme)
                            transactionData.cardholderName?.let { cardDetails.put("cardholderName", it) }
                            response.put("cardDetails", cardDetails)
                        }
                        
                        call.resolve(response)
                    }

                    override fun onPurchaseFailed(purchaseFailure: PurchaseFailure) {
                        val (errorMessage, errorCode) = when (purchaseFailure) {
                            is PurchaseFailure.PurchaseRejected -> {
                                "Payment was rejected" to "PURCHASE_REJECTED"
                            }
                            is PurchaseFailure.AuthenticationFailed -> {
                                "Authentication failed - invalid credentials" to "AUTH_FAILED"
                            }
                            is PurchaseFailure.InvalidStatus -> {
                                "Invalid transaction status: ${purchaseFailure.status}" to "INVALID_STATUS"
                            }
                            is PurchaseFailure.GeneralFailure -> {
                                "Payment failed" to "GENERAL_FAILURE"
                            }
                        }
                        
                        Log.e(TAG, "Payment failed: $errorMessage")
                        
                        val response = JSObject()
                        response.put("success", false)
                        response.put("status", "FAILED")
                        response.put("errorMessage", errorMessage)
                        response.put("errorCode", errorCode)
                        call.resolve(response)
                    }
                }
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error processing payment", e)
            call.reject("Payment processing failed: ${e.message}")
        }
    }

    @PluginMethod
    fun checkSession(call: PluginCall) {
        if (nearPay == null) {
            call.reject("NearPay SDK not initialized")
            return
        }

        val result = JSObject()
        result.put("sessionActive", isSetupComplete)
        result.put("sdkInitialized", true)
        call.resolve(result)
    }
}
