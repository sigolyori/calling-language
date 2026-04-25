// Loaded both for normal app start and for FCM headless tasks (when the
// app is killed and FCM wakes a fresh JS context). fcm-background must
// be imported first so messaging().setBackgroundMessageHandler is
// registered before any incoming message is dispatched.
import "./lib/fcm-background";
import "expo-router/entry";
