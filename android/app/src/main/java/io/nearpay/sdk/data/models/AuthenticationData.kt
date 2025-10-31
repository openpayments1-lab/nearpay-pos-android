package io.nearpay.sdk.data.models

sealed class AuthenticationData {
    data class Jwt(val token: String) : AuthenticationData()
}
