import { defineConfig } from "#q-app";

export default defineConfig(() => ({
    css: ["app.scss"],
    extras: ["material-icons"],
    build: {
        typescript: { strict: true, vueShim: true },
        vueRouterMode: "hash"
    },
    devServer: { open: false },
    framework: { config: {}, plugins: [] },
    electron: {
        preloadScripts: ["electron-preload"],
        inspectPort: 5858,
        bundler: "packager",
        packager: {
            appBundleId: "com.budgetpro.desktop",
            appCategoryType: "public.app-category.finance"
        }
    }
}));
