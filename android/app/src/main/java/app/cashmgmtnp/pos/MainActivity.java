package app.cashmgmtnp.pos;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register NearPay plugin
        registerPlugin(NearPayPlugin.class);
    }
}
