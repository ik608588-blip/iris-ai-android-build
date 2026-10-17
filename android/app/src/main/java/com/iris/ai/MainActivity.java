package com.iris.ai;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AppLauncherPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
