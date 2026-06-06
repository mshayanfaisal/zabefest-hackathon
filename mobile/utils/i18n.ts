import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import { useSyncExternalStore } from "react";
import en from "../locales/en.json";
import ur from "../locales/ur.json";

export const i18n = new I18n({ en, ur });
i18n.enableFallback = true;
i18n.defaultLocale = "en";

const device = getLocales()[0]?.languageCode ?? "en";
i18n.locale = device === "ur" ? "ur" : "en";

// Tiny external store so a language toggle re-renders every consumer.
let listeners: Array<() => void> = [];
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
};

export const setLocale = (locale: "en" | "ur") => {
  i18n.locale = locale;
  I18nManager.allowRTL(locale === "ur");
  // Note: full RTL layout flip requires an app reload; text + alignment update live.
  emit();
};

export const toggleLocale = () => setLocale(i18n.locale === "ur" ? "en" : "ur");

// Hook: re-renders on locale change, returns a translate fn + current locale.
export const useT = () => {
  const locale = useSyncExternalStore(
    subscribe,
    () => i18n.locale,
    () => i18n.locale,
  );
  const t = (key: string, opts?: object) => i18n.t(key, opts);
  return { t, locale, isRTL: locale === "ur" };
};
