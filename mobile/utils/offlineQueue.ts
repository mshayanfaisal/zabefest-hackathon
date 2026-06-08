import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "./supabase";
import { ensureSession } from "./auth";

const QUEUE_KEY = "kp_report_queue";

export type QueuedReport = {
  category: string;
  sub_type: string;
  description: string;
  lat: number;
  lng: number;
  photo_url?: string;
  is_anonymous: boolean;
  is_sos?: boolean;
  severity_score?: number;
  area?: string;
  address?: string;
  user_name?: string;
  user_phone?: string;
  user_nic?: string;
  queued_at: string;
};

export const getQueue = async (): Promise<QueuedReport[]> => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const enqueueReport = async (report: QueuedReport) => {
  const queue = await getQueue();
  queue.push(report);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

// Push queued reports to Supabase. Reports keep their queued_at so the server
// can record true report time. Returns number successfully flushed.
export const flushQueue = async (): Promise<number> => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return 0;

  const queue = await getQueue();
  if (queue.length === 0) return 0;

  await ensureSession(); // attach a real auth.uid() before insert

  const failed: QueuedReport[] = [];
  let flushed = 0;

  for (const report of queue) {
    const { queued_at, ...rest } = report;
    const { data, error } = await supabase
      .from("reports")
      .insert({ ...rest, created_at: queued_at })
      .select()
      .single();
    if (error) {
      failed.push(report);
    } else {
      flushed += 1;
      // Fire-and-forget severity scoring for synced reports.
      supabase.functions
        .invoke("score-report", {
          body: {
            report_id: data.id,
            description: report.description,
            category: report.category,
            sub_type: report.sub_type,
          },
        })
        .catch(() => {});
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  return flushed;
};

// Auto-flush whenever connectivity returns. Call once at app start.
export const initOfflineSync = (onFlush?: (n: number) => void) => {
  return NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      const n = await flushQueue();
      if (n > 0) onFlush?.(n);
    }
  });
};
