package io.nearpay.sdk.data.models

data class TransactionData(
    val transactionUUID: String? = null,
    val amount: Long = 0,
    val transactionStatus: String? = null,
    val cardScheme: String? = null,
    val maskedPAN: String? = null,
    val authorizationCode: String? = null,
    val retrievalReferenceNumber: String? = null
)
