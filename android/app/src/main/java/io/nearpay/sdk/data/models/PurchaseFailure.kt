package io.nearpay.sdk.data.models

sealed class PurchaseFailure {
    object PurchaseRejected : PurchaseFailure()
    object AuthenticationFailed : PurchaseFailure()
    data class InvalidStatus(val status: String) : PurchaseFailure()
    object GeneralFailure : PurchaseFailure()
}
