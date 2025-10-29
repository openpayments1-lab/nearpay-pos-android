package io.nearpay.sdk.data.models

sealed class AuthenticationData {
    data class Jwt(val token: String) : AuthenticationData()
    data class Mobile(val phoneNumber: String) : AuthenticationData()
    data class Email(val email: String) : AuthenticationData()
    object UserEnter : AuthenticationData()
}
