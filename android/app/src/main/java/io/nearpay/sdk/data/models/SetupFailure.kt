package io.nearpay.sdk.data.models

sealed class SetupFailure {
    object AuthenticationFailed : SetupFailure()
    object AlreadyInstalled : SetupFailure()
    object NotInstalled : SetupFailure()
    data class InvalidStatus(val status: String) : SetupFailure()
    object GeneralFailure : SetupFailure()
}
