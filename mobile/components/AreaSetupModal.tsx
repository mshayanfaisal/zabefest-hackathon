import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { theme } from '../utils/theme';

import { KARACHI_EXHAUSTIVE_DATA } from '../utils/karachi_data';

export default function AreaSetupModal({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedTown, setSelectedTown] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
                {/* Search Bar */}
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${!selectedDistrict ? 'District' : !selectedTown ? 'Town' : 'Area'}...`}
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <ScrollView style={styles.areaScroll} nestedScrollEnabled={true}>
                  {!selectedDistrict ? (
                    KARACHI_EXHAUSTIVE_DATA
                      .filter(d => d.district.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((d) => (
                      <TouchableOpacity key={d.district} style={styles.areaRow} onPress={() => { setSelectedDistrict(d.district); setSearchQuery(""); }} activeOpacity={0.7}>
                        <Text style={styles.areaText}>{d.district}</Text>
                        <Text style={styles.check}>→</Text>
                      </TouchableOpacity>
                    ))
                  ) : !selectedTown ? (
                    <>
                      <TouchableOpacity style={styles.groupHeaderRow} onPress={() => { setSelectedDistrict(""); setSearchQuery(""); }} activeOpacity={0.7}>
                        <Text style={styles.groupHeaderText}>← Back to Districts</Text>
                      </TouchableOpacity>
                      {KARACHI_EXHAUSTIVE_DATA.find(d => d.district === selectedDistrict)?.towns
                        .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((t) => (
                        <TouchableOpacity key={t.name} style={styles.areaRow} onPress={() => { setSelectedTown(t.name); setSearchQuery(""); }} activeOpacity={0.7}>
                          <Text style={styles.areaText}>{t.name}</Text>
                          <Text style={styles.check}>→</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.groupHeaderRow} onPress={() => { setSelectedTown(""); setSearchQuery(""); }} activeOpacity={0.7}>
                        <Text style={styles.groupHeaderText}>← Back to {selectedDistrict}</Text>
                      </TouchableOpacity>
                      {KARACHI_EXHAUSTIVE_DATA.find(d => d.district === selectedDistrict)?.towns.find(t => t.name === selectedTown)?.areas
                        .filter(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((a) => (
                        <TouchableOpacity key={a} style={[styles.areaRow, selectedArea === a && styles.areaRowActive]} onPress={() => setSelectedArea(a)} activeOpacity={0.7}>
                          <Text style={[styles.areaText, selectedArea === a && styles.areaTextActive]}>{a}</Text>
                          {selectedArea === a && <Text style={styles.check}>✅</Text>}
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
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
  container: { width: '90%', maxHeight: '85%', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#4B5563', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  areaContainer: { flexShrink: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 20 },
  searchInput: { backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#111827' },
  areaScroll: { flexGrow: 0 },
  groupHeaderRow: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  groupHeaderText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  areaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  areaRowActive: { backgroundColor: '#F0FDF4' },
  areaText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  areaTextActive: { fontWeight: '700', color: '#166534' },
  check: { fontSize: 15, color: '#9CA3AF' },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, fontSize: 15, color: '#111827', marginBottom: 16 },
  btn: { backgroundColor: '#111827', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  backText: { color: '#6B7280', fontSize: 14, fontWeight: '700' }
});
