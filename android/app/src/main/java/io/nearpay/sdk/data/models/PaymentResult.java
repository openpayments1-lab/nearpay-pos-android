package io.nearpay.sdk.data.models;

// STUB CLASS - Replace with real NearPay SDK
public class PaymentResult {
    
    public String getTransactionUUID() {
        return "stub-transaction-" + System.currentTimeMillis();
    }
    
    public CardDetails getCardDetails() {
        return null;
    }
    
    public static class CardDetails {
        public String getCardBrand() { return "VISA"; }
        public String getLast4() { return "1234"; }
    }
}
