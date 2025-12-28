
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, TeamInsight, Announcement, AnnouncementReply } from '../types';
import { firestore } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  query, 
  limit, 
  orderBy, 
  updateDoc, 
  arrayUnion, 
  arrayRemove
} from "firebase/firestore";

const COLLECTIONS = {
  EMPLOYEES: 'employees',
  TASKS: 'tasks',
  ASSIGNMENTS: 'assignments',
  LOGS: 'logs',
  SYSTEM_LOGS: 'system_logs',
  INSIGHTS: 'insights',
  ANNOUNCEMENTS: 'announcements'
};

/**
 * وظيفة مساعدة لتحويل أي كائن إلى POJO (كائن بسيط) لتجنب أخطاء المراجع الدائرية
 */
const toPlainObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toPlainObject);
  
  // تجنب تحويل الكائنات المعقدة مثل مراجع Firebase
  try {
    const plain: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        // نتجاهل الدوال والـ Symbols وأي مراجع قد تسبب مشاكل
        if (typeof val !== 'function' && typeof val !== 'symbol') {
          plain[key] = toPlainObject(val);
        }
      }
    }
    return plain;
  } catch (e) {
    return String(obj);
  }
};

// --- محول التخزين المحلي ---
const localDb = {
  get: <T>(key: string): T[] => {
    try {
      const data = localStorage.getItem(`taskease_${key}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error parsing localStorage key ${key}:`, e);
      return [];
    }
  },
  set: (key: string, data: any) => {
    try {
      // تحويل البيانات لكائن بسيط قبل الحفظ للتخلص من المراجع الدائرية
      const sanitized = toPlainObject(data);
      localStorage.setItem(`taskease_${key}`, JSON.stringify(sanitized));
    } catch (e) {
      console.error(`Circular structure or serialization error at key ${key}:`, e);
    }
  },
  clearAll: () => {
    Object.values(COLLECTIONS).forEach(key => localStorage.removeItem(`taskease_${key}`));
  }
};

let cloudBlocked = false;

const handleDbError = (error: any) => {
  if (error?.code === 'permission-denied') {
    cloudBlocked = true;
    console.error("❌ Firebase: Missing permissions.");
  }
  throw error;
};

const isCloudEnabled = () => firestore !== null && !cloudBlocked;

const generateDeterministicLogId = (log: TaskLog) => {
    const dateOnly = log.logDate.split('T')[0];
    if (log.taskType === 'Daily' && log.taskId !== 'LEAVE' && log.taskId !== 'EXTRA') {
        return `LOG_${log.employeeId}_${log.taskId}_${dateOnly}`;
    } else {
        return log.id && !log.id.includes('LOG-') ? log.id : `${log.taskId || 'EXTRA'}_${log.employeeId}_${log.logDate.replace(/[:.-]/g, '_')}`;
    }
};

export const db = {
  employees: {
    list: async (): Promise<Employee[]> => {
      if (!isCloudEnabled()) return localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
      try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.EMPLOYEES));
        return snapshot.docs.map(doc => doc.data() as Employee);
      } catch (e) { return handleDbError(e); }
    },
    add: async (item: Employee): Promise<Employee> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, [...data, cleanItem]);
        return cleanItem;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, cleanItem.id), cleanItem);
        return cleanItem;
      } catch (e) { return handleDbError(e); }
    },
    update: async (item: Employee): Promise<Employee> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, data.map(e => e.id === cleanItem.id ? cleanItem : e));
        return cleanItem;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, cleanItem.id), cleanItem, { merge: true });
        return cleanItem;
      } catch (e) { return handleDbError(e); }
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, data.filter(e => e.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, id));
      } catch (e) { handleDbError(e); }
    },
    import: async (data: Employee[]): Promise<void> => {
      const cleanData = toPlainObject(data);
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.EMPLOYEES, cleanData); return; }
      try {
        const batch = writeBatch(firestore!);
        cleanData.forEach((item: Employee) => batch.set(doc(firestore!, COLLECTIONS.EMPLOYEES, item.id), item, { merge: true }));
        await batch.commit();
      } catch (e) { handleDbError(e); }
    },
    clear: async () => {
       if (!isCloudEnabled()) { localDb.set(COLLECTIONS.EMPLOYEES, []); return; }
       try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.EMPLOYEES));
        const batch = writeBatch(firestore!);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
       } catch (e) { handleDbError(e); }
    }
  },

  announcements: {
    list: async (): Promise<Announcement[]> => {
      if (!isCloudEnabled()) return localDb.get<Announcement>(COLLECTIONS.ANNOUNCEMENTS);
      try {
        const q = query(collection(firestore!, COLLECTIONS.ANNOUNCEMENTS), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Announcement);
      } catch (e) { return handleDbError(e); }
    },
    add: async (item: Announcement): Promise<void> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<Announcement>(COLLECTIONS.ANNOUNCEMENTS);
        localDb.set(COLLECTIONS.ANNOUNCEMENTS, [cleanItem, ...data]);
        return;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, cleanItem.id), cleanItem);
      } catch (e) { handleDbError(e); }
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Announcement>(COLLECTIONS.ANNOUNCEMENTS);
        localDb.set(COLLECTIONS.ANNOUNCEMENTS, data.filter(a => a.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, id));
      } catch (e) { handleDbError(e); }
    },
    archive: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Announcement>(COLLECTIONS.ANNOUNCEMENTS);
        localDb.set(COLLECTIONS.ANNOUNCEMENTS, data.map(a => a.id === id ? { ...a, archived: true } : a));
        return;
      }
      try {
        const annRef = doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, id);
        await updateDoc(annRef, { archived: true });
      } catch (e) { handleDbError(e); }
    },
    toggleLike: async (announcementId: string, employeeId: string, hasLiked: boolean): Promise<void> => {
      if (!isCloudEnabled()) return;
      try {
        const annRef = doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, announcementId);
        await updateDoc(annRef, {
          likes: hasLiked ? arrayRemove(employeeId) : arrayUnion(employeeId)
        });
      } catch (e) { handleDbError(e); }
    },
    addReply: async (announcementId: string, reply: AnnouncementReply): Promise<void> => {
      const cleanReply = toPlainObject(reply);
      if (!isCloudEnabled()) return;
      try {
        const annRef = doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, announcementId);
        await updateDoc(annRef, {
          replies: arrayUnion(cleanReply)
        });
      } catch (e) { handleDbError(e); }
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      if (!isCloudEnabled()) return localDb.get<Task>(COLLECTIONS.TASKS);
      try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.TASKS));
        return snapshot.docs.map(doc => doc.data() as Task);
      } catch (e) { return handleDbError(e); }
    },
    add: async (item: Task): Promise<Task> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, [...data, cleanItem]);
        return cleanItem;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.TASKS, cleanItem.id), cleanItem);
        return cleanItem;
      } catch (e) { return handleDbError(e); }
    },
    update: async (item: Task): Promise<Task> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, data.map(t => t.id === cleanItem.id ? cleanItem : t));
        return cleanItem;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.TASKS, cleanItem.id), cleanItem, { merge: true });
        return cleanItem;
      } catch (e) { return handleDbError(e); }
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, data.filter(t => t.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(firestore!, COLLECTIONS.TASKS, id));
      } catch (e) { handleDbError(e); }
    },
    import: async (data: Task[]): Promise<void> => {
      const cleanData = toPlainObject(data);
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.TASKS, cleanData); return; }
      try {
        const batch = writeBatch(firestore!);
        cleanData.forEach((item: Task) => batch.set(doc(firestore!, COLLECTIONS.TASKS, item.id), item, { merge: true }));
        await batch.commit();
      } catch (e) { handleDbError(e); }
    }
  },

  assignments: {
    list: async (): Promise<Assignment[]> => {
      if (!isCloudEnabled()) return localDb.get<Assignment>(COLLECTIONS.ASSIGNMENTS);
      try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.ASSIGNMENTS));
        return snapshot.docs.map(doc => doc.data() as Assignment);
      } catch (e) { return handleDbError(e); }
    },
    add: async (item: Assignment): Promise<Assignment> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<Assignment>(COLLECTIONS.ASSIGNMENTS);
        localDb.set(COLLECTIONS.ASSIGNMENTS, [...data, cleanItem]);
        return cleanItem;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.ASSIGNMENTS, cleanItem.id), cleanItem);
        return cleanItem;
      } catch (e) { return handleDbError(e); }
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Assignment>(COLLECTIONS.ASSIGNMENTS);
        localDb.set(COLLECTIONS.ASSIGNMENTS, data.filter(a => a.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(firestore!, COLLECTIONS.ASSIGNMENTS, id));
      } catch (e) { handleDbError(e); }
    },
    import: async (data: Assignment[]): Promise<void> => {
      const cleanData = toPlainObject(data);
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.ASSIGNMENTS, cleanData); return; }
      try {
        const batch = writeBatch(firestore!);
        cleanData.forEach((item: Assignment) => batch.set(doc(firestore!, COLLECTIONS.ASSIGNMENTS, item.id), item, { merge: true }));
        await batch.commit();
      } catch (e) { handleDbError(e); }
    }
  },

  logs: {
    list: async (): Promise<TaskLog[]> => {
      if (!isCloudEnabled()) return localDb.get<TaskLog>(COLLECTIONS.LOGS);
      try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.LOGS));
        return snapshot.docs.map(doc => doc.data() as TaskLog);
      } catch (e) { return handleDbError(e); }
    },
    add: async (items: TaskLog | TaskLog[]): Promise<TaskLog[]> => {
      const logs = Array.isArray(items) ? items : [items];
      const cleanLogs = toPlainObject(logs).map((l: TaskLog) => ({
          ...l,
          id: generateDeterministicLogId(l)
      }));

      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        localDb.set(COLLECTIONS.LOGS, [...cleanLogs, ...data]);
        return cleanLogs;
      }
      try {
        const batch = writeBatch(firestore!);
        cleanLogs.forEach((log: TaskLog) => {
          batch.set(doc(firestore!, COLLECTIONS.LOGS, log.id), log);
        });
        await batch.commit();
        return cleanLogs;
      } catch (e) { return handleDbError(e); }
    },
    update: async (item: TaskLog): Promise<TaskLog> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        localDb.set(COLLECTIONS.LOGS, data.map(l => l.id === cleanItem.id ? cleanItem : l));
        return cleanItem;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.LOGS, cleanItem.id), cleanItem, { merge: true });
        return cleanItem;
      } catch (e) { return handleDbError(e); }
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        localDb.set(COLLECTIONS.LOGS, data.filter(l => l.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(firestore!, COLLECTIONS.LOGS, id));
      } catch (e) { handleDbError(e); }
    },
    import: async (data: TaskLog[]): Promise<void> => {
      const cleanData = toPlainObject(data);
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.LOGS, cleanData); return; }
      try {
        const batch = writeBatch(firestore!);
        cleanData.forEach((item: TaskLog) => batch.set(doc(firestore!, COLLECTIONS.LOGS, item.id), item, { merge: true }));
        await batch.commit();
      } catch (e) { handleDbError(e); }
    },
    clear: async () => {
       if (!isCloudEnabled()) { localDb.set(COLLECTIONS.LOGS, []); return; }
       try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.LOGS));
        const batch = writeBatch(firestore!);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
       } catch (e) { handleDbError(e); }
    }
  },

  systemLogs: {
    list: async (): Promise<SystemAuditLog[]> => {
      if (!isCloudEnabled()) return localDb.get<SystemAuditLog>(COLLECTIONS.SYSTEM_LOGS);
      try {
        const q = query(collection(firestore!, COLLECTIONS.SYSTEM_LOGS), orderBy('timestamp', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as SystemAuditLog);
      } catch (e) { return handleDbError(e); }
    },
    add: async (item: SystemAuditLog): Promise<void> => {
      const cleanItem = toPlainObject(item);
      if (!isCloudEnabled()) {
        const data = localDb.get<SystemAuditLog>(COLLECTIONS.SYSTEM_LOGS);
        localDb.set(COLLECTIONS.SYSTEM_LOGS, [cleanItem, ...data].slice(0, 500));
        return;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.SYSTEM_LOGS, cleanItem.id), cleanItem);
      } catch (e) { handleDbError(e); }
    },
    clear: async () => {
       if (!isCloudEnabled()) { localDb.set(COLLECTIONS.SYSTEM_LOGS, []); return; }
       try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.SYSTEM_LOGS));
        const batch = writeBatch(firestore!);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
       } catch (e) { handleDbError(e); }
    }
  },

  insights: {
    getLatest: async (): Promise<TeamInsight | null> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TeamInsight>(COLLECTIONS.INSIGHTS);
        return data.length > 0 ? data[0] : null;
      }
      try {
        const q = query(collection(firestore!, COLLECTIONS.INSIGHTS), orderBy('generatedAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        return snapshot.empty ? null : (snapshot.docs[0].data() as TeamInsight);
      } catch (e) { return handleDbError(e); }
    },
    save: async (item: TeamInsight): Promise<void> => {
      const cleanItem = toPlainObject(item);
      const id = `INSIGHT_${new Date().getTime()}`;
      if (!isCloudEnabled()) {
        localDb.set(COLLECTIONS.INSIGHTS, [cleanItem]);
        return;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.INSIGHTS, id), cleanItem);
      } catch (e) { handleDbError(e); }
    }
  },

  factoryReset: async () => {
    localDb.clearAll();
    if (!isCloudEnabled()) return;
    try {
        const collectionsToClear = Object.values(COLLECTIONS);
        for (const coll of collectionsToClear) {
            const snapshot = await getDocs(collection(firestore!, coll));
            const batch = writeBatch(firestore!);
            snapshot.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }
    } catch (e) { handleDbError(e); }
  }
};
