package io.nearpay.sdk.utils.listeners

import io.nearpay.sdk.data.models.PurchaseFailure
import io.nearpay.sdk.data.models.TransactionData

interface PurchaseListener {
    fun onPurchaseApproved(transactionData: TransactionData)
    fun onPurchaseFailed(purchaseFailure: PurchaseFailure)
}
