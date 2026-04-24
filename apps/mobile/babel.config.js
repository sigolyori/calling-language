module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Monorepo workaround: babel-preset-expo hoists to repo root but
      // `require.resolve('expo-router')` fails from there because expo-router
      // stays in apps/mobile/node_modules. Force the expo-router plugin
      // directly so EXPO_ROUTER_APP_ROOT gets substituted at build time.
      require("babel-preset-expo/build/expo-router-plugin").expoRouterBabelPlugin,
    ],
  };
};
