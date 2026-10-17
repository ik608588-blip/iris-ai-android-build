import { registerPlugin } from "@capacitor/core";

interface AppLauncherPlugin {
  open(options: { app: string }): Promise<{
    success: boolean;
    app: string;
  }>;
  search(options: {
    service: string;
    query: string;
    play?: boolean;
  }): Promise<{
    success: boolean;
    service: string;
    query: string;
  }>;
}

export const AppLauncher =
  registerPlugin<AppLauncherPlugin>("AppLauncher");
