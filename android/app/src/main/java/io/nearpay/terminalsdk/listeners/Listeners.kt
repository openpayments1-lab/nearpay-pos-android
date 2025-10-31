package io.nearpay.terminalsdk.listeners

import io.nearpay.terminalsdk.data.*

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
