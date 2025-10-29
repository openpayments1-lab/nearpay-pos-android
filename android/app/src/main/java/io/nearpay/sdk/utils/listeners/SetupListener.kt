package io.nearpay.sdk.utils.listeners

import io.nearpay.sdk.data.models.SetupFailure

interface SetupListener {
    fun onSetupCompleted()
    fun onSetupFailed(setupFailure: SetupFailure)
}
