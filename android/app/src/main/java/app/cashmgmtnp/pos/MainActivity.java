package app.cashmgmtnp.pos;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Register NearPay plugin BEFORE super.onCreate()
        // This is required for Capacitor to properly register the plugin
        registerPlugin(NearPayPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
