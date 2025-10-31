package io.nearpay.sdk.utils.listeners

import io.nearpay.sdk.data.models.TransactionData
import io.nearpay.sdk.data.models.PurchaseFailure

interface PurchaseListener {
    fun onPurchaseApproved(transactionData: TransactionData)
    fun onPurchaseFailed(failure: PurchaseFailure)
}
