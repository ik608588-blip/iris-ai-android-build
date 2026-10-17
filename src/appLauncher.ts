import { registerPlugin } from "@capacitor/core";

interface AppLauncherPlugin {
  open(options: { app: string }): Promise<{
    success: boolean;
    app: string;
  }>;
}

export const AppLauncher = registerPlugin<AppLauncherPlugin>("AppLauncher");
