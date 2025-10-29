package io.nearpay.sdk.utils.listeners;

import io.nearpay.sdk.data.models.PaymentResult;
import io.nearpay.sdk.utils.enums.PaymentError;

// STUB CLASS - Replace with real NearPay SDK
public interface PaymentListener {
    void onPaymentApproved(PaymentResult result);
    void onPaymentDeclined(PaymentResult result);
    void onPaymentError(PaymentError error);
}
