import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { theme } from '../utils/theme';

const NEIGHBORHOOD_DATA = [
  { category: "South Karachi", areas: ["Clifton", "DHA", "Saddar", "Civil Lines", "Kharadar", "Mithadar", "Garden", "Boat Basin", "Bath Island"] },
  { category: "Gulshan / East Karachi", areas: ["Gulshan-e-Iqbal", "Gulistan-e-Johar", "Scheme 33", "PIB Colony", "Gulzar-e-Hijri", "Safoora Goth", "Pehlwan Goth", "Dalmia", "Karsaz", "Shanti Nagar", "Essa Nagri"] },
  { category: "PECHS / Central-East", areas: ["PECHS", "Bahadurabad", "Shahrah-e-Faisal", "Tipu Sultan", "Nursery", "Tariq Road", "Muhammad Ali Society"] },
  { category: "Central Karachi", areas: ["Nazimabad", "North Nazimabad", "Federal B Area", "Liaquatabad", "Buffer Zone", "Hyderi", "Sakhi Hassan", "Karimabad", "Azizabad"] },
  { category: "West Karachi", areas: ["Orangi Town", "Baldia Town", "SITE Area", "Qasba Colony", "Banaras Colony", "Pak Colony", "Metroville", "Manghopir"] },
  { category: "Korangi District", areas: ["Korangi", "Landhi", "Shah Faisal Colony", "Model Colony", "Malir Halt", "Quaidabad"] },
  { category: "Malir District", areas: ["Malir", "Malir Cantt", "Gadap Town", "Bin Qasim Town", "Ibrahim Hyderi", "Gulshan-e-Hadeed", "Steel Town", "Rehri Goth"] },
  { category: "Lyari Region", areas: ["Lyari", "Kalri", "Agra Taj Colony", "Bihar Colony", "Khadda", "Daryaabad"] }
];

export default function AreaSetupModal({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState("");
  const [address, setAddress] = useState("");
  const [phase, setPhase] = useState<1 | 2>(1);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userNic, setUserNic] = useState("");

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const area = await AsyncStorage.getItem("user_area");
    const nic = await AsyncStorage.getItem("user_nic");
    if (!area || !nic) {
      if (area) {
        setSelectedArea(area);
        const addr = await AsyncStorage.getItem("user_address");
        if (addr) setAddress(addr);
        setPhase(2);
      }
      setVisible(true);
    }
  };

  const handleNext = () => {
    if (!selectedArea) {
      alert("Please select your primary area.");
      return;
    }
    setPhase(2);
  };

  const handleSave = async () => {
    if (!userName.trim() || !userPhone.trim() || !userNic.trim()) {
      alert("Please fill in all identity fields to verify your account.");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(userName.trim())) {
      alert("Full Name can only contain letters and spaces.");
      return;
    }
    if (!/^03\d{9}$/.test(userPhone.trim())) {
      alert("Phone Number must be exactly 11 digits and start with 03.");
      return;
    }
    if (userNic.length !== 15) {
      alert("NIC must be 13 digits (format: 00000-0000000-0).");
      return;
    }
    
    await AsyncStorage.setItem("user_area", selectedArea);
    if (address.trim()) {
      await AsyncStorage.setItem("user_address", address.trim());
    }
    await AsyncStorage.setItem("user_name", userName.trim());
    await AsyncStorage.setItem("user_phone", userPhone.trim());
    await AsyncStorage.setItem("user_nic", userNic.trim());
    
    setVisible(false);
    onComplete();
  };

  const formatNIC = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = cleaned.slice(0, 5) + '-' + cleaned.slice(5);
    }
    if (cleaned.length > 12) {
      formatted = formatted.slice(0, 13) + '-' + formatted.slice(13, 14);
    }
    setUserNic(formatted);
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" transparent>
      <BlurView intensity={30} tint="dark" style={styles.overlay}>
        <View style={styles.container}>
          {phase === 1 ? (
            <>
              <Text style={styles.title}>Registration</Text>
              <Text style={styles.subtitle}>Select your primary neighborhood to help dispatch resources efficiently.</Text>
              
              <View style={styles.areaContainer}>
                <ScrollView style={styles.areaScroll} nestedScrollEnabled={true}>
                  {NEIGHBORHOOD_DATA.map((group) => (
                    <View key={group.category} style={styles.groupContainer}>
                      <Text style={styles.groupHeader}>{group.category}</Text>
                      {group.areas.map((area) => (
                        <TouchableOpacity
                          key={area}
                          style={[styles.areaRow, selectedArea === area && styles.areaRowActive]}
                          onPress={() => setSelectedArea(area)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.areaText, selectedArea === area && styles.areaTextActive]}>{area}</Text>
                          {selectedArea === area && <Text style={styles.check}>✅</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Detailed Address (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Street 4, Block 2..."
                placeholderTextColor={theme.muted}
                value={address}
                onChangeText={setAddress}
              />

              <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
                <Text style={styles.btnText}>Next Step</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setPhase(1)} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
              <Text style={styles.title}>Verify Identity</Text>
              <Text style={styles.subtitle}>Provide your basic identity to prevent spam and ensure secure civic reporting.</Text>
              
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Asad Ali"
                placeholderTextColor={theme.muted}
                value={userName}
                onChangeText={setUserName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="03000000000"
                placeholderTextColor={theme.muted}
                value={userPhone}
                onChangeText={setUserPhone}
                keyboardType="phone-pad"
                maxLength={11}
              />

              <Text style={styles.label}>NIC Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="00000-0000000-0"
                placeholderTextColor={theme.muted}
                value={userNic}
                onChangeText={formatNIC}
                keyboardType="number-pad"
                maxLength={15}
              />

              <TouchableOpacity style={styles.btn} onPress={handleSave} activeOpacity={0.8}>
                <Text style={styles.btnText}>Verify & Submit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '90%', maxHeight: '85%', backgroundColor: '#FAFAFA', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  title: { fontSize: 24, fontWeight: '800', color: theme.primary, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: theme.muted, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  areaContainer: { flexShrink: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', marginBottom: 20 },
  areaScroll: { flexGrow: 0 },
  groupContainer: { marginBottom: 8 },
  groupHeader: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, fontWeight: '700', color: '#4B5563' },
  areaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  areaRowActive: { backgroundColor: '#F0FDF4' },
  areaText: { fontSize: 14, color: theme.text },
  areaTextActive: { fontWeight: '700', color: theme.primary },
  check: { fontSize: 14 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14, fontSize: 15, color: theme.text, marginBottom: 16 },
  btn: { backgroundColor: theme.primary, borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: theme.muted, fontSize: 14, fontWeight: '700' }
});
