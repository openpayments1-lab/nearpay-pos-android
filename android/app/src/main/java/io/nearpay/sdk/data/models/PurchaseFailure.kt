package io.nearpay.sdk.data.models

sealed class PurchaseFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : PurchaseFailure(message)
    data class AuthenticationFailed(override val message: String?) : PurchaseFailure(message)
    data class InvalidAmount(override val message: String?) : PurchaseFailure(message)
    data class UserCancelled(override val message: String?) : PurchaseFailure(message)
}
