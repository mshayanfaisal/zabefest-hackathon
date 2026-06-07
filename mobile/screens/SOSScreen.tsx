import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Vibration, Animated, Pressable, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { supabase } from "../utils/supabase";
import { ensureSession } from "../utils/auth";
import { useT } from "../utils/i18n";
import { theme } from "../utils/theme";

export default function SOSScreen() {
  const { t } = useT();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const holdProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          })
        ])
      );
    };
    
    createPulse(pulseAnim1, 0).start();
    createPulse(pulseAnim2, 1000).start();
  }, []);

  const handlePressIn = () => {
    if (sending || sent) return;
    Vibration.vibrate(50);
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        send();
      }
    });
  };

  const handlePressOut = () => {
    if (sending || sent) return;
    holdProgress.stopAnimation();
    Animated.spring(holdProgress, {
      toValue: 0,
      useNativeDriver: false,
      friction: 9,
    }).start();
  };

  const send = async () => {
    setSending(true);
    Vibration.vibrate([0, 400, 150, 400]);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("report.locationDenied"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await ensureSession();

      const userArea = await AsyncStorage.getItem("user_area");
      const userAddress = await AsyncStorage.getItem("user_address");
      const userName = await AsyncStorage.getItem("user_name");
      const userPhone = await AsyncStorage.getItem("user_phone");
      const userNic = await AsyncStorage.getItem("user_nic");

      const { data, error } = await supabase
        .from("reports")
        .insert({
          category: "safety",
          sub_type: "sos",
          description: "EMERGENCY SOS — immediate assistance required",
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          is_sos: true,
          severity_score: 10,
          area: userArea || "Unknown",
          address: userAddress || "",
          user_name: userName || "",
          user_phone: userPhone || "",
          user_nic: userNic || "",
        })
        .select()
        .single();
      if (error) throw error;

      // Simulate webhook for Admin/Community notification
      supabase.functions
        .invoke("emergency-webhook", {
          body: { type: "sos", alert_id: data.id, lat: loc.coords.latitude, lng: loc.coords.longitude }
        })
        .catch(e => console.error("Emergency webhook failed", e));

      setSent(true);
    } catch (err: any) {
      // Handle error gracefully if needed
      console.error(err);
    } finally {
      setSending(false);
      holdProgress.setValue(0);
    }
  };

  const progressInterpolate = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("sos.title")}</Text>
      <Text style={styles.subtitle}>Hold for 3 seconds to immediately alert city authorities with your real-time GPS location.</Text>

      <View style={styles.buttonContainer}>
        {/* Pulsing Radar Rings */}
        {!sent && (
          <>
            <Animated.View style={[
              styles.pulseRing, 
              { 
                transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                opacity: pulseAnim1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }) 
              }
            ]} />
            <Animated.View style={[
              styles.pulseRing, 
              { 
                transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                opacity: pulseAnim2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }) 
              }
            ]} />
          </>
        )}

        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={sending || sent}
          style={styles.pressable}
        >
          <View style={[styles.sosBtn, (sending || sent) && styles.sosBtnDisabled]}>
            <Animated.View style={[styles.progressFill, { height: progressInterpolate }]} />
            <Text style={styles.sosBtnText}>{sent ? "SENT ✓" : "SOS"}</Text>
          </View>
        </Pressable>
      </View>

      {sent ? <Text style={styles.sentNote}>Emergency alert and live location transmitted successfully. Help is on the way.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0A0A0A" }, // Pitch black for maximum contrast
  title: { fontSize: 36, fontWeight: "900", marginBottom: 12, color: theme.danger, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: "#A3A3A3", textAlign: "center", marginBottom: 80, lineHeight: 24, paddingHorizontal: 10 },
  buttonContainer: { width: 240, height: 240, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: theme.danger },
  pressable: { zIndex: 10 },
  sosBtn: { width: 200, height: 200, borderRadius: 100, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: theme.danger, overflow: "hidden", shadowColor: theme.danger, shadowOpacity: 0.8, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, elevation: 20 },
  sosBtnDisabled: { borderColor: theme.primary, shadowColor: theme.primary },
  progressFill: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: theme.danger, opacity: 0.8 },
  sosBtnText: { color: "#FFFFFF", fontSize: 42, fontWeight: "900", textAlign: "center", zIndex: 20, letterSpacing: 2 },
  sentNote: { marginTop: 60, fontSize: 16, color: theme.primary, textAlign: "center", lineHeight: 24, paddingHorizontal: 20, fontWeight: "600" },
});
