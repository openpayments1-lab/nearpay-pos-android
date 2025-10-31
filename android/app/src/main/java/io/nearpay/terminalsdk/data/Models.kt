package io.nearpay.terminalsdk.data

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
)

data class TerminalConnection(
    val terminalConnectionData: TerminalConnectionData
)

data class TerminalConnectionData(
    val id: String? = null,
    val name: String? = null
)

data class Terminal(
    val id: String? = null
)

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
