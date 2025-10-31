package com.nicknowak.nearpay.assignment

import android.os.Bundle
import androidx.activity.ComponentActivity
import io.nearpay.softpos.reader_ui.UiDockPosition
import io.nearpay.terminalsdk.SdkEnvironment
import io.nearpay.terminalsdk.Terminal
import io.nearpay.terminalsdk.TerminalSDK
import io.nearpay.terminalsdk.data.dto.*
import io.nearpay.terminalsdk.listeners.*
import io.nearpay.terminalsdk.listeners.failures.*
import java.util.UUID

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        fun showDialog(title: String, message: String) {
            runOnUiThread {
                android.app.AlertDialog.Builder(this)
                    .setTitle(title)
                    .setMessage(message)
                    .setPositiveButton("OK") { dialog, _ -> dialog.dismiss() }
                    .show()
            }
        }
        showDialog("test", "test");
        try {
            val nearpay = TerminalSDK.Builder()
                .activity(this)
                .environment(SdkEnvironment.SANDBOX)
                .googleCloudProjectNumber(392076631783)
                .country(Country.USA)
                .uiDockPosition(UiDockPosition.BOTTOM_RIGHT)
                .build()

            showDialog("Nearpay", "TerminalSDK initialized successfully")

            val loginData = JWTLoginData(
                jwt = "JWT_TOKEN_HERE"
            )

            nearpay.jwtLogin(loginData, object : JWTLoginListener {
                override fun onJWTLoginSuccess(terminal: Terminal) {
                    showDialog("JWT Login Success", "Terminal UUID: ${terminal.terminalUUID}")

                    val amount = 100
                    val transactionUUID = UUID.randomUUID().toString()
                    val customerReferenceNumber = "12345"

                    terminal.purchase(
                        amount = amount.toLong(),
                        scheme = null,
                        intentUUID = transactionUUID,
                        customerReferenceNumber = customerReferenceNumber,
                        readCardListener = object : ReadCardListener {
                            override fun onReadCardSuccess() {
                                showDialog("Card", "Card read successfully")
                            }

                            override fun onReadCardFailure(readCardFailure: ReadCardFailure) {
                                showDialog("Card Failure", readCardFailure.toString())
                            }

                            override fun onReaderDisplayed() {
                                showDialog("Reader", "Reader displayed")
                            }

                            override fun onReaderClosed() {
                                showDialog("Reader", "Reader closed")
                            }

                            override fun onReaderWaiting() {
                                showDialog("Reader", "Waiting for card")
                            }

                            override fun onReaderReading() {
                                showDialog("Reader", "Reading card...")
                            }

                            override fun onReaderRetry() {
                                showDialog("Reader", "Reader retry needed")
                            }

                            override fun onPinEntering() {
                                showDialog("Reader", "PIN entry in progress")
                            }

                            override fun onReaderFinished() {
                                showDialog("Reader", "Card read finished")
                            }

                            override fun onReadingStarted() {
                                showDialog("Reader", "Reading started")
                            }

                            override fun onReaderError(error: String?) {
                                showDialog("Reader Error", error ?: "Unknown reader error")
                            }
                        },
                        sendTransactionListener = object : SendTransactionListener {
                            override fun onSendTransactionCompleted(purchaseResponse: PurchaseResponse) {
                                showDialog(
                                    "Transaction Completed",
                                    "Purchase UUID: ${purchaseResponse}"
                                )
                            }

                            override fun onSendTransactionFailure(failure: SendTransactionFailure) {
                                showDialog("Transaction Failure", failure.toString())
                            }
                        }
                    )
                }

                override fun onJWTLoginFailure(jwtLoginFailure: JWTLoginFailure) {
                    showDialog("JWT Login Failure", jwtLoginFailure.toString())
                }
            })

        } catch (e: Throwable) {
            showDialog("Error", e.toString())
        }
    }
}