
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

// --- محول التخزين المحلي ---
const localDb = {
  get: <T>(key: string): T[] => JSON.parse(localStorage.getItem(`taskease_${key}`) || '[]'),
  set: (key: string, data: any) => localStorage.setItem(`taskease_${key}`, JSON.stringify(data)),
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
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, [...data, item]);
        return item;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, item.id), item);
        return item;
      } catch (e) { return handleDbError(e); }
    },
    update: async (item: Employee): Promise<Employee> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, data.map(e => e.id === item.id ? item : e));
        return item;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, item.id), item, { merge: true });
        return item;
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
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.EMPLOYEES, data); return; }
      try {
        const batch = writeBatch(firestore!);
        data.forEach(item => batch.set(doc(firestore!, COLLECTIONS.EMPLOYEES, item.id), item, { merge: true }));
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
      if (!isCloudEnabled()) {
        const data = localDb.get<Announcement>(COLLECTIONS.ANNOUNCEMENTS);
        localDb.set(COLLECTIONS.ANNOUNCEMENTS, [item, ...data]);
        return;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, item.id), item);
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
      if (!isCloudEnabled()) return;
      try {
        const annRef = doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, announcementId);
        await updateDoc(annRef, {
          replies: arrayUnion(reply)
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
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, [...data, item]);
        return item;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.TASKS, item.id), item);
        return item;
      } catch (e) { return handleDbError(e); }
    },
    update: async (item: Task): Promise<Task> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, data.map(t => t.id === item.id ? item : t));
        return item;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.TASKS, item.id), item, { merge: true });
        return item;
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
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.TASKS, data); return; }
      try {
        const batch = writeBatch(firestore!);
        data.forEach(item => batch.set(doc(firestore!, COLLECTIONS.TASKS, item.id), item, { merge: true }));
        await batch.commit();
      } catch (e) { handleDbError(e); }
    },
    clear: async () => {
       if (!isCloudEnabled()) { localDb.set(COLLECTIONS.TASKS, []); return; }
       try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.TASKS));
        const batch = writeBatch(firestore!);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
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
      if (!isCloudEnabled()) {
        const data = localDb.get<Assignment>(COLLECTIONS.ASSIGNMENTS);
        localDb.set(COLLECTIONS.ASSIGNMENTS, [...data, item]);
        return item;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.ASSIGNMENTS, item.id), item);
        return item;
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
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.ASSIGNMENTS, data); return; }
      try {
        const batch = writeBatch(firestore!);
        data.forEach(item => batch.set(doc(firestore!, COLLECTIONS.ASSIGNMENTS, item.id), item, { merge: true }));
        await batch.commit();
      } catch (e) { handleDbError(e); }
    },
    clear: async () => {
       if (!isCloudEnabled()) { localDb.set(COLLECTIONS.ASSIGNMENTS, []); return; }
       try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.ASSIGNMENTS));
        const batch = writeBatch(firestore!);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
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
    add: async (items: TaskLog[]): Promise<TaskLog[]> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        const processedItems = items.map(l => ({ ...l, id: generateDeterministicLogId(l) }));
        localDb.set(COLLECTIONS.LOGS, [...data, ...processedItems]);
        return processedItems;
      }
      try {
        const batch = writeBatch(firestore!);
        const processedItems = items.map(item => {
            const deterministicId = generateDeterministicLogId(item);
            const logWithId = { ...item, id: deterministicId };
            batch.set(doc(firestore!, COLLECTIONS.LOGS, deterministicId), logWithId, { merge: true });
            return logWithId;
        });
        await batch.commit();
        return processedItems;
      } catch (e) { return handleDbError(e); }
    },
    update: async (item: TaskLog): Promise<TaskLog> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        localDb.set(COLLECTIONS.LOGS, data.map(l => l.id === item.id ? item : l));
        return item;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.LOGS, item.id), item, { merge: true });
        return item;
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
      if (!isCloudEnabled()) { localDb.set(COLLECTIONS.LOGS, data); return; }
      try {
        const batch = writeBatch(firestore!);
        data.forEach(item => {
            const finalId = generateDeterministicLogId(item);
            batch.set(doc(firestore!, COLLECTIONS.LOGS, finalId), { ...item, id: finalId }, { merge: true });
        });
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

  insights: {
    getLatest: async (): Promise<TeamInsight | null> => {
      if (!isCloudEnabled()) return null;
      try {
        const q = query(collection(firestore!, COLLECTIONS.INSIGHTS), orderBy('generatedAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return snapshot.docs[0].data() as TeamInsight;
      } catch (e) { return null; }
    },
    save: async (insight: TeamInsight): Promise<void> => {
      if (!isCloudEnabled()) return;
      try {
        const id = `INSIGHT-${Date.now()}`;
        await setDoc(doc(firestore!, COLLECTIONS.INSIGHTS, id), { ...insight, id });
      } catch (e) { handleDbError(e); }
    },
    clear: async () => {
       if (!isCloudEnabled()) return;
       try {
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.INSIGHTS));
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
        const snapshot = await getDocs(collection(firestore!, COLLECTIONS.SYSTEM_LOGS));
        return snapshot.docs.map(doc => doc.data() as SystemAuditLog);
      } catch (e) { return handleDbError(e); }
    },
    add: async (item: SystemAuditLog): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<SystemAuditLog>(COLLECTIONS.SYSTEM_LOGS);
        localDb.set(COLLECTIONS.SYSTEM_LOGS, [...data, item]);
        return;
      }
      try {
        await setDoc(doc(firestore!, COLLECTIONS.SYSTEM_LOGS, item.id), item);
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

  factoryReset: async () => {
    if(window.confirm("تحذير: هذا سيقوم بتصفير كافة البيانات والبدء من جديد. هل أنت متأكد؟")) {
        try {
            if (isCloudEnabled()) {
                await db.logs.clear();
                await db.assignments.clear();
                await db.tasks.clear();
                await db.employees.clear();
                await db.systemLogs.clear();
                await db.insights.clear();
                await deleteDoc(doc(firestore!, COLLECTIONS.ANNOUNCEMENTS, 'all')); // Simplified
            }
            localDb.clearAll();
            alert("تم تصفير النظام بنجاح.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء التصفير، يرجى التحقق من الاتصال بالإنترنت.");
        }
    }
  }
};
