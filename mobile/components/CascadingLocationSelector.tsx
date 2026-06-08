import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { KARACHI_EXHAUSTIVE_DATA } from '../utils/karachi_data';
import { theme } from '../utils/theme';

interface Props {
  initialArea?: string;
  onSelectArea: (area: string) => void;
  onClear?: () => void;
  onClose?: () => void;
}

export default function CascadingLocationSelector({ onSelectArea, onClear, onClose }: Props) {
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");

  if (!district) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select District</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {onClear && (
               <TouchableOpacity onPress={onClear}>
                 <Text style={styles.clearText}>Clear</Text>
               </TouchableOpacity>
            )}
            {onClose && (
               <TouchableOpacity onPress={onClose}>
                 <Text style={styles.closeText}>Close</Text>
               </TouchableOpacity>
            )}
          </View>
        </View>
        <ScrollView style={styles.scroll}>
          {KARACHI_EXHAUSTIVE_DATA.map((d) => (
            <TouchableOpacity key={d.district} style={styles.row} onPress={() => setDistrict(d.district)} activeOpacity={0.7}>
              <Text style={styles.rowText}>{d.district}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!town) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => setDistrict("")} activeOpacity={0.7} style={styles.backBtn}>
             <Text style={styles.backArrow}>←</Text>
             <Text style={styles.title}>Select Town</Text>
           </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll}>
          {KARACHI_EXHAUSTIVE_DATA.find(d => d.district === district)?.towns.map((t) => (
            <TouchableOpacity key={t.name} style={styles.row} onPress={() => setTown(t.name)} activeOpacity={0.7}>
              <Text style={styles.rowText}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => setTown("")} activeOpacity={0.7} style={styles.backBtn}>
           <Text style={styles.backArrow}>←</Text>
           <Text style={styles.title}>Select Area</Text>
         </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll}>
        {KARACHI_EXHAUSTIVE_DATA.find(d => d.district === district)?.towns.find(t => t.name === town)?.areas.map((a) => (
          <TouchableOpacity key={a} style={styles.row} onPress={() => onSelectArea(a)} activeOpacity={0.7}>
            <Text style={styles.rowText}>{a}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: '75%', backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  clearText: { fontSize: 15, color: '#047857', fontWeight: '700' },
  closeText: { fontSize: 15, color: '#6B7280', fontWeight: '700' },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backArrow: { fontSize: 20, marginRight: 8, color: '#4B5563', fontWeight: '800' },
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  rowText: { fontSize: 16, color: '#374151', fontWeight: '600', textAlign: 'center', letterSpacing: 0.2 },
});
