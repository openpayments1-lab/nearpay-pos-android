package io.nearpay.payment;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import io.nearpay.sdk.Environments;
import io.nearpay.sdk.NearPay;
import io.nearpay.sdk.data.models.AuthenticationData;
import io.nearpay.sdk.utils.enums.NetworkConfiguration;
import io.nearpay.sdk.utils.enums.UIPosition;
import io.nearpay.sdk.utils.listeners.PaymentListener;
import java.util.Locale;

@CapacitorPlugin(name = "NearPay")
public class NearPayPlugin extends Plugin {
    private static final String TAG = "NearPayPlugin";
    private NearPay nearPay;

    @PluginMethod
    public void initialize(PluginCall call) {
        try {
            String authToken = call.getString("authToken");
            String environment = call.getString("environment", "sandbox");
            
            if (authToken == null || authToken.isEmpty()) {
                call.reject("Authentication token is required");
                return;
            }

            // Initialize NearPay SDK
            Environments env = environment.equals("production") ? 
                Environments.PRODUCTION : Environments.SANDBOX;

            nearPay = new NearPay.Builder()
                .context(getContext())
                .authenticationData(AuthenticationData.Jwt.INSTANCE.invoke(authToken))
                .environment(env)
                .locale(Locale.getDefault())
                .networkConfiguration(NetworkConfiguration.DEFAULT)
                .uiPosition(UIPosition.CENTER_BOTTOM)
                .loadingUi(true)
                .build();

            Log.d(TAG, "NearPay SDK initialized successfully");
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "NearPay SDK initialized");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize NearPay SDK: " + e.getMessage(), e);
            call.reject("Failed to initialize NearPay: " + e.getMessage());
        }
    }

    @PluginMethod
    public void processPayment(PluginCall call) {
        if (nearPay == null) {
            call.reject("NearPay SDK not initialized. Call initialize() first.");
            return;
        }

        try {
            Double amount = call.getDouble("amount");
            if (amount == null || amount <= 0) {
                call.reject("Valid amount is required");
                return;
            }

            Log.d(TAG, "Processing payment for amount: " + amount);

            nearPay.purchase(amount, new PaymentListener() {
                @Override
                public void onPaymentApproved(io.nearpay.sdk.data.models.PaymentResult result) {
                    Log.d(TAG, "Payment approved: " + result.getTransactionUUID());
                    
                    JSObject response = new JSObject();
                    response.put("success", true);
                    response.put("transactionId", result.getTransactionUUID());
                    
                    // Add card details if available
                    if (result.getCardDetails() != null) {
                        JSObject cardDetails = new JSObject();
                        cardDetails.put("type", result.getCardDetails().getCardBrand());
                        cardDetails.put("last4", result.getCardDetails().getLast4());
                        response.put("cardDetails", cardDetails);
                    }
                    
                    response.put("amount", amount);
                    call.resolve(response);
                }

                @Override
                public void onPaymentDeclined(io.nearpay.sdk.data.models.PaymentResult result) {
                    Log.d(TAG, "Payment declined");
                    
                    JSObject response = new JSObject();
                    response.put("success", false);
                    response.put("errorMessage", "Payment declined by customer or card issuer");
                    response.put("errorCode", "PAYMENT_DECLINED");
                    call.resolve(response);
                }

                @Override
                public void onPaymentError(io.nearpay.sdk.utils.enums.PaymentError error) {
                    Log.e(TAG, "Payment error: " + error.toString());
                    
                    JSObject response = new JSObject();
                    response.put("success", false);
                    response.put("errorMessage", error.toString());
                    response.put("errorCode", "PAYMENT_ERROR");
                    call.resolve(response);
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "Error processing payment: " + e.getMessage(), e);
            call.reject("Payment processing failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkSession(PluginCall call) {
        if (nearPay == null) {
            call.reject("NearPay SDK not initialized");
            return;
        }

        // For now, just return a success response
        // In production, you would check the actual session status
        JSObject result = new JSObject();
        result.put("sessionActive", true);
        call.resolve(result);
    }
}
