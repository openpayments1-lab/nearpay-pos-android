package io.nearpay.terminalsdk.data

import io.nearpay.terminalsdk.listeners.*

enum class SdkEnvironment {
    SANDBOX,
    PRODUCTION,
    INTERNAL
}

enum class Country {
    SA,    // Saudi Arabia
    TR,    // Turkey
    USA,   // United States
    KEN    // Kenya
}

enum class PaymentScheme {
    VISA,
    MASTERCARD,
    AMEX,
    MADA
}

data class MobileLogin(val mobile: String)

data class LoginData(
    val mobile: String,
    val code: String
)

data class OtpResponse(
    val success: Boolean = true,
    val message: String? = null
)

data class User(
    val id: String? = null,
    val name: String? = null,
    val mobile: String? = null,
    val email: String? = null
) {
    fun listTerminals(
        page: Int,
        pageSize: Int,
        filter: String?,
        listener: GetTerminalsListener
    ) {
        // Stub: Real implementation requires NearPay Terminal SDK
    }
}

data class TerminalConnection(
    val terminalConnectionData: TerminalConnectionData
) {
    fun connect(activity: android.app.Activity, listener: ConnectTerminalListener) {
        // Stub: Real implementation requires NearPay Terminal SDK
    }
}

data class TerminalConnectionData(
    val id: String? = null,
    val name: String? = null
)

data class Terminal(
    val id: String? = null
) {
    fun purchase(
        amount: Long,
        scheme: PaymentScheme?,
        transactionUUID: String,
        customerReferenceNumber: String,
        readCardListener: ReadCardListener,
        sendTransactionListener: SendTransactionListener
    ) {
        // Stub: Real implementation requires NearPay Terminal SDK
    }
}

data class TransactionResponse(
    val events: List<TransactionEvent> = emptyList()
)

data class TransactionEvent(
    val receipt: Receipt = Receipt()
)

data class Receipt(
    val data: String? = null
) {
    fun getMadaReceipt(): String? = data
    fun getEPXReceipt(): String? = data
    fun getBKMReceipt(): String? = data
}

sealed class OTPMobileFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : OTPMobileFailure(message)
    data class NetworkError(override val message: String?) : OTPMobileFailure(message)
}

sealed class VerifyMobileFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : VerifyMobileFailure(message)
    data class InvalidCode(override val message: String?) : VerifyMobileFailure(message)
}

sealed class GetTerminalsFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : GetTerminalsFailure(message)
    data class NetworkError(override val message: String?) : GetTerminalsFailure(message)
}

sealed class ConnectTerminalFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : ConnectTerminalFailure(message)
    data class ConnectionFailed(override val message: String?) : ConnectTerminalFailure(message)
}

sealed class ReadCardFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : ReadCardFailure(message)
    data class CardReadError(override val message: String?) : ReadCardFailure(message)
}

sealed class SendTransactionFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : SendTransactionFailure(message)
    data class TransactionDeclined(override val message: String?) : SendTransactionFailure(message)
}
