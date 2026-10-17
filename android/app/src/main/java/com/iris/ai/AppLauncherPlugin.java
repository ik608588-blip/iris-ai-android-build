package com.iris.ai;

import android.content.Intent;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@CapacitorPlugin(name = "AppLauncher")
public class AppLauncherPlugin extends Plugin {
    private static final Map<String, String> APPS = new HashMap<>();

    static {
        APPS.put("chrome", "com.android.chrome");
        APPS.put("browser", "com.android.chrome");
        APPS.put("youtube", "com.google.android.youtube");
        APPS.put("yt", "com.google.android.youtube");
        APPS.put("settings", "com.android.settings");
        APPS.put("whatsapp", "com.whatsapp");
        APPS.put("instagram", "com.instagram.android");
        APPS.put("termux", "com.termux");
    }

    @PluginMethod
    public void open(PluginCall call) {
        String requested = call.getString("app");

        if (requested == null || requested.trim().isEmpty()) {
            call.reject("Please specify an app to open.");
            return;
        }

        String name = requested.trim().toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", "")
                .replaceAll("(app|application)$", "");

        String packageName = APPS.get(name);

        if (packageName == null) {
            call.reject("That app isn't supported yet.");
            return;
        }

        try {
            PackageManager pm = getContext().getPackageManager();
            Intent intent = pm.getLaunchIntentForPackage(packageName);

            if (intent == null) {
                call.reject(requested + " isn't installed or can't be launched.");
                return;
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("app", requested);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Couldn't open " + requested + ".", e);
        }
    }
}
