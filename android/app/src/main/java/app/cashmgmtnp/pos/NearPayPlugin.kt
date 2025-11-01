package app.cashmgmtnp.pos

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import io.nearpay.terminalsdk.*
import java.util.UUID

@CapacitorPlugin(name = "NearPay")
class NearPayPlugin : Plugin() {
    
    companion object {
        private const val TAG = "NearPayPlugin"
    }
    
    private var terminalSDK: TerminalSDK? = null
    private var currentUser: User? = null
    private var currentTerminal: Terminal? = null
    private var availableTerminals: List<TerminalConnection> = emptyList()

    @PluginMethod
    fun initialize(call: PluginCall) {
        try {
            val environment = call.getString("environment") ?: "sandbox"
            val country = call.getString("country") ?: "SA"
            val googleCloudProjectNumber = call.getLong("googleCloudProjectNumber")
            
            if (googleCloudProjectNumber == null) {
                call.reject("Google Cloud Project Number is required")
                return
            }
            
            val sdkEnv = if (environment == "production") {
                SdkEnvironment.PRODUCTION
            } else {
                SdkEnvironment.SANDBOX
            }
            
            val sdkCountry = when (country.uppercase()) {
                "SA" -> Country.SA
                "TR" -> Country.TR
                "USA" -> Country.USA
                "KEN" -> Country.KEN
                else -> Country.SA
            }

            terminalSDK = TerminalSDK.Builder()
                .activity(activity)
                .environment(sdkEnv)
                .googleCloudProjectNumber(googleCloudProjectNumber)
                .country(sdkCountry)
                .build()

            Log.d(TAG, "NearPay Terminal SDK initialized successfully with Google Cloud Project Number: $googleCloudProjectNumber")
            
            val result = JSObject()
            result.put("success", true)
            result.put("message", "NearPay Terminal SDK initialized")
            call.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize NearPay Terminal SDK", e)
            call.reject("Failed to initialize: ${e.message}")
        }
    }

    @PluginMethod
    fun jwtLogin(call: PluginCall) {
        if (terminalSDK == null) {
            call.reject("Terminal SDK not initialized. Call initialize() first.")
            return
        }

        try {
            val jwt = call.getString("jwt")
            if (jwt.isNullOrEmpty()) {
                call.reject("JWT token is required")
                return
            }

            val loginData = JWTLoginData(jwt = jwt)
            
            terminalSDK?.jwtLogin(loginData, object : JWTLoginListener {
                override fun onJWTLoginSuccess(terminal: Terminal) {
                    currentTerminal = terminal
                    Log.d(TAG, "JWT Login success. Terminal UUID: ${terminal.terminalUUID}")
                    
                    val result = JSObject()
                    result.put("success", true)
                    result.put("terminalUUID", terminal.terminalUUID)
                    result.put("terminalId", terminal.id)
                    result.put("message", "JWT login successful")
                    call.resolve(result)
                }

                override fun onJWTLoginFailure(jwtLoginFailure: JWTLoginFailure) {
                    Log.e(TAG, "JWT Login failure: ${jwtLoginFailure.message}")
                    call.reject("JWT login failed: ${jwtLoginFailure.message}")
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error during JWT login", e)
            call.reject("JWT login failed: ${e.message}")
        }
    }

    @PluginMethod
    fun sendOTP(call: PluginCall) {
        if (terminalSDK == null) {
            call.reject("Terminal SDK not initialized. Call initialize() first.")
            return
        }

        try {
            val mobile = call.getString("mobile")
            if (mobile.isNullOrEmpty()) {
                call.reject("Mobile number is required")
                return
            }

            val mobileLogin = MobileLogin(mobile)
            
            terminalSDK?.sendOTP(mobileLogin, object : SendOTPMobileListener {
                override fun onSendOTPMobileSuccess(otpResponse: OtpResponse) {
                    Log.d(TAG, "OTP sent successfully")
                    
                    val result = JSObject()
                    result.put("success", true)
                    result.put("message", "OTP sent to $mobile")
                    call.resolve(result)
                }

                override fun onSendOTPMobileFailure(otpMobileFailure: OTPMobileFailure) {
                    Log.e(TAG, "OTP send failed: ${otpMobileFailure.message}")
                    call.reject("Failed to send OTP: ${otpMobileFailure.message}")
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error sending OTP", e)
            call.reject("OTP send failed: ${e.message}")
        }
    }

    @PluginMethod
    fun verifyOTP(call: PluginCall) {
        if (terminalSDK == null) {
            call.reject("Terminal SDK not initialized. Call initialize() first.")
            return
        }

        try {
            val mobile = call.getString("mobile")
            val code = call.getString("code")
            
            if (mobile.isNullOrEmpty() || code.isNullOrEmpty()) {
                call.reject("Mobile number and OTP code are required")
                return
            }

            val loginData = LoginData(mobile = mobile, code = code)
            
            terminalSDK?.verify(loginData, object : VerifyMobileListener {
                override fun onVerifyMobileSuccess(user: User) {
                    currentUser = user
                    Log.d(TAG, "OTP verified successfully. User: ${user.name}")
                    
                    val result = JSObject()
                    result.put("success", true)
                    result.put("userId", user.id)
                    result.put("userName", user.name)
                    result.put("userMobile", user.mobile)
                    call.resolve(result)
                }

                override fun onVerifyMobileFailure(verifyMobileFailure: VerifyMobileFailure) {
                    Log.e(TAG, "OTP verification failed: ${verifyMobileFailure.message}")
                    call.reject("OTP verification failed: ${verifyMobileFailure.message}")
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error verifying OTP", e)
            call.reject("OTP verification failed: ${e.message}")
        }
    }

    @PluginMethod
    fun listTerminals(call: PluginCall) {
        if (currentUser == null) {
            call.reject("User not authenticated. Call verifyOTP() first.")
            return
        }

        try {
            val page = call.getInt("page") ?: 1
            val pageSize = call.getInt("pageSize") ?: 10
            
            currentUser?.listTerminals(page, pageSize, null, object : GetTerminalsListener {
                override fun onGetTerminalsSuccess(terminalsConnection: List<TerminalConnection>) {
                    Log.d(TAG, "Terminals retrieved: ${terminalsConnection.size}")
                    
                    availableTerminals = terminalsConnection
                    
                    val result = JSObject()
                    result.put("success", true)
                    result.put("count", terminalsConnection.size)
                    
                    val terminalsArray = org.json.JSONArray()
                    terminalsConnection.forEach { termConn ->
                        val termObj = JSObject()
                        termObj.put("id", termConn.id)
                        termObj.put("name", termConn.terminalConnectionData.name)
                        terminalsArray.put(termObj)
                    }
                    result.put("terminals", terminalsArray)
                    
                    call.resolve(result)
                }

                override fun onGetTerminalsFailure(getTerminalsFailure: GetTerminalsFailure) {
                    Log.e(TAG, "Failed to get terminals: ${getTerminalsFailure.message}")
                    call.reject("Failed to get terminals: ${getTerminalsFailure.message}")
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error listing terminals", e)
            call.reject("Failed to list terminals: ${e.message}")
        }
    }

    @PluginMethod
    fun connectTerminal(call: PluginCall) {
        if (currentUser == null) {
            call.reject("User not authenticated. Call verifyOTP() first.")
            return
        }

        try {
            if (availableTerminals.isEmpty()) {
                call.reject("No terminals available. Call listTerminals() first.")
                return
            }
            
            val terminalId = call.getString("terminalId")
            val terminalConnection = if (terminalId != null) {
                availableTerminals.find { it.id == terminalId }
            } else {
                availableTerminals.firstOrNull()
            }
            
            if (terminalConnection == null) {
                call.reject("Terminal not found. Please call listTerminals() first.")
                return
            }
            
            terminalConnection.connect(activity, object : ConnectTerminalListener {
                override fun onConnectTerminalSuccess(terminal: Terminal) {
                    currentTerminal = terminal
                    Log.d(TAG, "Terminal connected successfully")
                    
                    val result = JSObject()
                    result.put("success", true)
                    result.put("terminalId", terminal.id)
                    result.put("message", "Terminal connected")
                    call.resolve(result)
                }

                override fun onConnectTerminalFailure(connectTerminalFailure: ConnectTerminalFailure) {
                    Log.e(TAG, "Terminal connection failed: ${connectTerminalFailure.message}")
                    call.reject("Terminal connection failed: ${connectTerminalFailure.message}")
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error connecting terminal", e)
            call.reject("Failed to connect terminal: ${e.message}")
        }
    }

    @PluginMethod
    fun processPayment(call: PluginCall) {
        if (currentTerminal == null) {
            call.reject("Terminal not connected. Call connectTerminal() first.")
            return
        }

        try {
            val amount = call.getDouble("amount")
            if (amount == null || amount <= 0) {
                call.reject("Valid amount is required")
                return
            }

            val amountInMinorUnits = (amount * 100).toLong()
            val transactionUUID = UUID.randomUUID().toString()

            Log.d(TAG, "Processing payment for amount: $amount (${amountInMinorUnits} minor units)")

            currentTerminal?.purchase(
                amount = amountInMinorUnits,
                scheme = null,  // Accept all schemes
                transactionUUID = transactionUUID,
                readCardListener = object : ReadCardListener {
                    override fun onReadCardSuccess() {
                        Log.d(TAG, "Card read successfully")
                    }

                    override fun onReadCardFailure(readCardFailure: ReadCardFailure) {
                        Log.e(TAG, "Card read failed: ${readCardFailure.message}")
                    }

                    override fun onReaderWaiting() {
                        Log.d(TAG, "Reader waiting for card")
                    }

                    override fun onReaderReading() {
                        Log.d(TAG, "Reading card")
                    }
                },
                sendTransactionListener = object : SendTransactionListener {
                    override fun onSendTransactionSuccess(purchaseResponse: PurchaseResponse) {
                        Log.d(TAG, "Transaction completed successfully")
                        
                        val response = JSObject()
                        response.put("success", true)
                        response.put("status", purchaseResponse.status ?: "APPROVED")
                        response.put("transactionId", transactionUUID)
                        response.put("amount", amount)
                        
                        call.resolve(response)
                    }

                    override fun onSendTransactionFailure(failure: SendTransactionFailure) {
                        Log.e(TAG, "Transaction failed: ${failure.message}")
                        
                        val response = JSObject()
                        response.put("success", false)
                        response.put("status", "FAILED")
                        response.put("errorMessage", failure.message ?: "Transaction failed")
                        call.resolve(response)
                    }
                }
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error processing payment", e)
            call.reject("Payment processing failed: ${e.message}")
        }
    }

    @PluginMethod
    fun checkSession(call: PluginCall) {
        val result = JSObject()
        result.put("sdkInitialized", terminalSDK != null)
        result.put("userAuthenticated", currentUser != null)
        result.put("terminalConnected", currentTerminal != null)
        call.resolve(result)
    }
}
