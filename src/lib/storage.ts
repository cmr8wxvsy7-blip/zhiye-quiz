import { openDB, type DBSchema } from "idb";
import { createSeedData } from "../data/seed";
import type { AppData } from "../types";

interface QuizDatabase extends DBSchema {
  state: {
    key: string;
    value: AppData;
  };
}

const DATABASE_NAME = "zhiye-quiz";
const STATE_KEY = "app-data";
const LOCAL_FALLBACK_KEY = "zhiye-quiz-data";

async function getDatabase() {
  return openDB<QuizDatabase>(DATABASE_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("state")) {
        database.createObjectStore("state");
      }
    },
  });
}

export async function loadAppData(): Promise<AppData> {
  try {
    const database = await getDatabase();
    const stored = await database.get("state", STATE_KEY);
    if (stored) {
      return migrateData(stored);
    }
  } catch {
    const fallback = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (fallback) {
      return migrateData(JSON.parse(fallback) as AppData);
    }
  }

  const seed = createSeedData();
  await saveAppData(seed);
  return seed;
}

export async function saveAppData(data: AppData): Promise<void> {
  try {
    const database = await getDatabase();
    await database.put("state", data, STATE_KEY);
  } catch {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(data));
  }
}

export async function resetAppData(): Promise<AppData> {
  const data = createSeedData();
  await saveAppData(data);
  return data;
}

function migrateData(data: AppData): AppData {
  if (data.version === 1) {
    return {
      ...data,
      banks: Array.isArray(data.banks) ? data.banks : [],
      progress: data.progress ?? {},
      attempts: Array.isArray(data.attempts)
        ? data.attempts.map((attempt) => ({
            ...attempt,
            scope: attempt.scope ?? "all",
          }))
        : [],
      session: data.session
        ? { ...data.session, scope: data.session.scope ?? "all" }
        : null,
    };
  }
  return createSeedData();
}
