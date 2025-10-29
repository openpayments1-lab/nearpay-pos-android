package io.nearpay.sdk.data.models

data class TransactionData(
    val uuid: String,
    val scheme: String? = null,
    val cardholderName: String? = null
)
