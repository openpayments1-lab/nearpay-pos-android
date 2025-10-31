package io.nearpay.terminalsdk.listeners

import io.nearpay.terminalsdk.data.*

// Failure types
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

// Listener interfaces
interface SendOTPMobileListener {
    fun onSendOTPMobileSuccess(otpResponse: OtpResponse)
    fun onSendOTPMobileFailure(otpMobileFailure: OTPMobileFailure)
}

interface VerifyMobileListener {
    fun onVerifyMobileSuccess(user: User)
    fun onVerifyMobileFailure(verifyMobileFailure: VerifyMobileFailure)
}

interface GetTerminalsListener {
    fun onGetTerminalsSuccess(terminalsConnection: List<TerminalConnection>)
    fun onGetTerminalsFailure(getTerminalsFailure: GetTerminalsFailure)
}

interface ConnectTerminalListener {
    fun onConnectTerminalSuccess(terminal: Terminal)
    fun onConnectTerminalFailure(connectTerminalFailure: ConnectTerminalFailure)
}

interface ReadCardListener {
    fun onReadCardSuccess()
    fun onReadCardFailure(readCardFailure: ReadCardFailure)
    fun onReaderDisplayed()
    fun onReaderClosed()
    fun onReaderWaiting()
    fun onReaderReading()
    fun onReaderRetry()
    fun onPinEntering()
    fun onReaderFinished()
    fun onReadingStarted()
    fun onReaderError(error: String?)
}

interface SendTransactionListener {
    fun onSendTransactionCompleted(transactionResponse: TransactionResponse)
    fun onSendTransactionFailure(failure: SendTransactionFailure)
}
