package io.nearpay.terminalsdk

import android.app.Activity
import io.nearpay.terminalsdk.data.*
import io.nearpay.terminalsdk.listeners.*

// Extension functions for User, TerminalConnection, and Terminal
// These need to be in a separate file to avoid circular dependencies

fun User.listTerminals(
    page: Int,
    pageSize: Int,
    filter: String?,
    listener: GetTerminalsListener
) {
    // Stub: Real implementation requires NearPay Terminal SDK
}

fun TerminalConnection.connect(activity: Activity, listener: ConnectTerminalListener) {
    // Stub: Real implementation requires NearPay Terminal SDK
}

fun Terminal.purchase(
    amount: Long,
    scheme: PaymentScheme?,
    transactionUUID: String,
    customerReferenceNumber: String,
    readCardListener: ReadCardListener,
    sendTransactionListener: SendTransactionListener
) {
    // Stub: Simulate successful payment for testing
    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
        // Simulate card reading process
        readCardListener.onReaderDisplayed()
        readCardListener.onReadingStarted()
        readCardListener.onReaderWaiting()
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            readCardListener.onReaderReading()
            readCardListener.onReadCardSuccess()
            readCardListener.onReaderFinished()
            
            // Simulate successful transaction
            val response = TransactionResponse(
                events = listOf(
                    TransactionEvent(
                        receipt = Receipt(data = "STUB RECEIPT - Test Transaction")
                    )
                )
            )
            sendTransactionListener.onSendTransactionCompleted(response)
        }, 1500)
    }, 500)
}
