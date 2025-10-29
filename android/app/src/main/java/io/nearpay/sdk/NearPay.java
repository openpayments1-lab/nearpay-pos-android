package io.nearpay.sdk;

import android.content.Context;
import io.nearpay.sdk.data.models.AuthenticationData;
import io.nearpay.sdk.utils.enums.NetworkConfiguration;
import io.nearpay.sdk.utils.enums.UIPosition;
import io.nearpay.sdk.utils.listeners.PaymentListener;
import java.util.Locale;

// STUB CLASS - Replace with real NearPay SDK
public class NearPay {
    
    public void purchase(Double amount, PaymentListener listener) {
        // Stub implementation - will be replaced by real SDK
        android.util.Log.w("NearPay", "STUB SDK: Real NearPay SDK not integrated yet");
    }

    public static class Builder {
        public Builder context(Context context) { return this; }
        public Builder authenticationData(AuthenticationData data) { return this; }
        public Builder environment(Environments env) { return this; }
        public Builder locale(Locale locale) { return this; }
        public Builder networkConfiguration(NetworkConfiguration config) { return this; }
        public Builder uiPosition(UIPosition position) { return this; }
        public Builder loadingUi(boolean show) { return this; }
        public NearPay build() { return new NearPay(); }
    }
}
