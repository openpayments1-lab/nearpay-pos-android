package io.nearpay.sdk.data.models

sealed class SetupFailure(open val message: String?) {
    data class GeneralError(override val message: String?) : SetupFailure(message)
    data class AuthenticationFailed(override val message: String?) : SetupFailure(message)
    data class InvalidApiKey(override val message: String?) : SetupFailure(message)
    data class NetworkError(override val message: String?) : SetupFailure(message)
    data class DeviceNotSupported(override val message: String?) : SetupFailure(message)
}
