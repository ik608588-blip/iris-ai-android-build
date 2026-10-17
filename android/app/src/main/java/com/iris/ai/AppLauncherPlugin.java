package com.iris.ai;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

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
        APPS.put("youtube music", "com.google.android.apps.youtube.music");
        APPS.put("yt music", "com.google.android.apps.youtube.music");
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
                .replaceAll("\\s+", " ")
                .replaceAll("\\s+(app|application)$", "");

        String packageName = APPS.get(name);

        if (packageName == null) {
            call.reject("That app isn't supported yet.");
            return;
        }

        try {
            Intent intent = getContext().getPackageManager()
                    .getLaunchIntentForPackage(packageName);

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

    @PluginMethod
    public void search(PluginCall call) {
        String service = call.getString("service", "").trim()
                .toLowerCase(Locale.ROOT);
        String query = call.getString("query", "").trim();
        boolean openMusicHome = service.equals("youtube_music")
        && (query.equalsIgnoreCase("music")
        || query.equalsIgnoreCase("open music")
        || query.equalsIgnoreCase("youtube music home"));
boolean play = call.getBoolean("play", false);

        if (query.isEmpty()) {
            call.reject("Please provide something to search for.");
            return;
        }

        String url;

        switch (service) {
            case "google":
                url = "https://www.google.com/search?q=" + Uri.encode(query);
                break;
            case "youtube":
url = openMusicHome
        ? "https://music.youtube.com/"
        : "https://music.youtube.com/search?q=" + Uri.encode(query);                break;
            case "youtube_music":
                url = "https://music.youtube.com/search?q=" + Uri.encode(query);
                break;
            default:
                call.reject("Unsupported search service.");
                return;
        }

       try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (service.equals("youtube") || service.equals("youtube_music")) {
                String packageName = service.equals("youtube")
                        ? "com.google.android.youtube"
                        : "com.google.android.apps.youtube.music";

                Intent appIntent = getContext().getPackageManager()
                        .getLaunchIntentForPackage(packageName);

                if (appIntent != null) {
                    Uri appUri = Uri.parse(service.equals("youtube")
                            ? "https://www.youtube.com/results?search_query=" + Uri.encode(query)
                            : "https://music.youtube.com/search?q=" + Uri.encode(query));

                    intent = new Intent(Intent.ACTION_VIEW, appUri);
                    intent.setPackage(packageName);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                    if (getContext().getPackageManager()
                            .resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) == null) {
                        intent.setPackage(null);
                    }
                }
            }

            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("service", service);
            result.put("query", query);
            result.put("play", play);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Couldn't open search results.", e);
        }
    }
}
