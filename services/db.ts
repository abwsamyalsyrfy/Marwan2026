
import { Employee, Task, Assignment, TaskLog, SystemAuditLog, TeamInsight } from '../types';
import { firestore } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  limit,
  orderBy
} from "firebase/firestore";

const COLLECTIONS = {
  EMPLOYEES: 'employees',
  TASKS: 'tasks',
  ASSIGNMENTS: 'assignments',
  LOGS: 'logs',
  SYSTEM_LOGS: 'system_logs',
  INSIGHTS: 'insights'
};

// --- LocalStorage Adapter for Offline/Clean Start Mode ---
const localDb = {
  get: <T>(key: string): T[] => JSON.parse(localStorage.getItem(`taskease_${key}`) || '[]'),
  set: (key: string, data: any) => localStorage.setItem(`taskease_${key}`, JSON.stringify(data)),
  clearAll: () => {
    Object.values(COLLECTIONS).forEach(key => localStorage.removeItem(`taskease_${key}`));
  }
};

const isCloudEnabled = () => firestore !== null && firestore !== undefined;

export const db = {
  employees: {
    list: async (): Promise<Employee[]> => {
      if (!isCloudEnabled()) return localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
      const snapshot = await getDocs(collection(firestore!, COLLECTIONS.EMPLOYEES));
      return snapshot.docs.map(doc => doc.data() as Employee);
    },
    add: async (item: Employee): Promise<Employee> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, [...data, item]);
        return item;
      }
      await setDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, item.id), item);
      return item;
    },
    update: async (item: Employee): Promise<Employee> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, data.map(e => e.id === item.id ? item : e));
        return item;
      }
      await updateDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, item.id), { ...item });
      return item;
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Employee>(COLLECTIONS.EMPLOYEES);
        localDb.set(COLLECTIONS.EMPLOYEES, data.filter(e => e.id !== id));
        return;
      }
      await deleteDoc(doc(firestore!, COLLECTIONS.EMPLOYEES, id));
    },
    import: async (data: Employee[]): Promise<void> => {
      if (!isCloudEnabled()) {
        localDb.set(COLLECTIONS.EMPLOYEES, data);
        return;
      }
      const batch = writeBatch(firestore!);
      data.forEach(item => {
        const ref = doc(firestore!, COLLECTIONS.EMPLOYEES, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
       if (!isCloudEnabled()) {
         localDb.set(COLLECTIONS.EMPLOYEES, []);
         return;
       }
       const snapshot = await getDocs(collection(firestore!, COLLECTIONS.EMPLOYEES));
       const batch = writeBatch(firestore!);
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      if (!isCloudEnabled()) return localDb.get<Task>(COLLECTIONS.TASKS);
      const snapshot = await getDocs(collection(firestore!, COLLECTIONS.TASKS));
      return snapshot.docs.map(doc => doc.data() as Task);
    },
    add: async (item: Task): Promise<Task> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, [...data, item]);
        return item;
      }
      await setDoc(doc(firestore!, COLLECTIONS.TASKS, item.id), item);
      return item;
    },
    update: async (item: Task): Promise<Task> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, data.map(t => t.id === item.id ? item : t));
        return item;
      }
      await updateDoc(doc(firestore!, COLLECTIONS.TASKS, item.id), { ...item });
      return item;
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Task>(COLLECTIONS.TASKS);
        localDb.set(COLLECTIONS.TASKS, data.filter(t => t.id !== id));
        return;
      }
      await deleteDoc(doc(firestore!, COLLECTIONS.TASKS, id));
    },
    import: async (data: Task[]): Promise<void> => {
      if (!isCloudEnabled()) {
        localDb.set(COLLECTIONS.TASKS, data);
        return;
      }
      const batch = writeBatch(firestore!);
      data.forEach(item => {
        const ref = doc(firestore!, COLLECTIONS.TASKS, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
       if (!isCloudEnabled()) {
         localDb.set(COLLECTIONS.TASKS, []);
         return;
       }
       const snapshot = await getDocs(collection(firestore!, COLLECTIONS.TASKS));
       const batch = writeBatch(firestore!);
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  assignments: {
    list: async (): Promise<Assignment[]> => {
      if (!isCloudEnabled()) return localDb.get<Assignment>(COLLECTIONS.ASSIGNMENTS);
      const snapshot = await getDocs(collection(firestore!, COLLECTIONS.ASSIGNMENTS));
      return snapshot.docs.map(doc => doc.data() as Assignment);
    },
    add: async (item: Assignment): Promise<Assignment> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Assignment>(COLLECTIONS.ASSIGNMENTS);
        localDb.set(COLLECTIONS.ASSIGNMENTS, [...data, item]);
        return item;
      }
      await setDoc(doc(firestore!, COLLECTIONS.ASSIGNMENTS, item.id), item);
      return item;
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<Assignment>(COLLECTIONS.ASSIGNMENTS);
        localDb.set(COLLECTIONS.ASSIGNMENTS, data.filter(a => a.id !== id));
        return;
      }
      await deleteDoc(doc(firestore!, COLLECTIONS.ASSIGNMENTS, id));
    },
    import: async (data: Assignment[]): Promise<void> => {
      if (!isCloudEnabled()) {
        localDb.set(COLLECTIONS.ASSIGNMENTS, data);
        return;
      }
      const batch = writeBatch(firestore!);
      data.forEach(item => {
        const ref = doc(firestore!, COLLECTIONS.ASSIGNMENTS, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
      if (!isCloudEnabled()) {
        localDb.set(COLLECTIONS.ASSIGNMENTS, []);
        return;
      }
       const snapshot = await getDocs(collection(firestore!, COLLECTIONS.ASSIGNMENTS));
       const batch = writeBatch(firestore!);
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  logs: {
    list: async (): Promise<TaskLog[]> => {
      if (!isCloudEnabled()) return localDb.get<TaskLog>(COLLECTIONS.LOGS);
      const q = query(collection(firestore!, COLLECTIONS.LOGS));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as TaskLog);
    },
    add: async (items: TaskLog[]): Promise<TaskLog[]> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        localDb.set(COLLECTIONS.LOGS, [...data, ...items]);
        return items;
      }
      const batch = writeBatch(firestore!);
      items.forEach(item => {
         const ref = doc(firestore!, COLLECTIONS.LOGS, item.id);
         batch.set(ref, item);
      });
      await batch.commit();
      return items;
    },
    update: async (item: TaskLog): Promise<TaskLog> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        localDb.set(COLLECTIONS.LOGS, data.map(l => l.id === item.id ? item : l));
        return item;
      }
      await updateDoc(doc(firestore!, COLLECTIONS.LOGS, item.id), { ...item });
      return item;
    },
    delete: async (id: string): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TaskLog>(COLLECTIONS.LOGS);
        localDb.set(COLLECTIONS.LOGS, data.filter(l => l.id !== id));
        return;
      }
      await deleteDoc(doc(firestore!, COLLECTIONS.LOGS, id));
    },
    import: async (data: TaskLog[]): Promise<void> => {
      if (!isCloudEnabled()) {
        localDb.set(COLLECTIONS.LOGS, data);
        return;
      }
      const batch = writeBatch(firestore!);
      data.slice(0, 490).forEach(item => {
        const ref = doc(firestore!, COLLECTIONS.LOGS, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
      if (!isCloudEnabled()) {
        localDb.set(COLLECTIONS.LOGS, []);
        return;
      }
       const snapshot = await getDocs(collection(firestore!, COLLECTIONS.LOGS));
       const batch = writeBatch(firestore!);
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  insights: {
    getLatest: async (): Promise<TeamInsight | null> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<TeamInsight>(COLLECTIONS.INSIGHTS);
        return data.length > 0 ? data[data.length - 1] : null;
      }
      const q = query(collection(firestore!, COLLECTIONS.INSIGHTS), orderBy('generatedAt', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as TeamInsight;
    },
    save: async (insight: TeamInsight): Promise<void> => {
      const id = `INSIGHT-${Date.now()}`;
      if (!isCloudEnabled()) {
        const data = localDb.get<TeamInsight>(COLLECTIONS.INSIGHTS);
        localDb.set(COLLECTIONS.INSIGHTS, [...data, { ...insight, id }]);
        return;
      }
      await setDoc(doc(firestore!, COLLECTIONS.INSIGHTS, id), { ...insight, id });
    },
    clear: async () => {
       if (!isCloudEnabled()) {
         localDb.set(COLLECTIONS.INSIGHTS, []);
         return;
       }
       const snapshot = await getDocs(collection(firestore!, COLLECTIONS.INSIGHTS));
       const batch = writeBatch(firestore!);
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  systemLogs: {
    list: async (): Promise<SystemAuditLog[]> => {
      if (!isCloudEnabled()) return localDb.get<SystemAuditLog>(COLLECTIONS.SYSTEM_LOGS);
      const snapshot = await getDocs(collection(firestore!, COLLECTIONS.SYSTEM_LOGS));
      return snapshot.docs.map(doc => doc.data() as SystemAuditLog);
    },
    add: async (item: SystemAuditLog): Promise<void> => {
      if (!isCloudEnabled()) {
        const data = localDb.get<SystemAuditLog>(COLLECTIONS.SYSTEM_LOGS);
        localDb.set(COLLECTIONS.SYSTEM_LOGS, [...data, item]);
        return;
      }
      await setDoc(doc(firestore!, COLLECTIONS.SYSTEM_LOGS, item.id), item);
    },
    clear: async () => {
       if (!isCloudEnabled()) {
         localDb.set(COLLECTIONS.SYSTEM_LOGS, []);
         return;
       }
       const snapshot = await getDocs(collection(firestore!, COLLECTIONS.SYSTEM_LOGS));
       const batch = writeBatch(firestore!);
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  factoryReset: async () => {
    const confirmMsg = isCloudEnabled() 
      ? "تحذير: سيتم حذف كافة البيانات نهائياً من السحابة. هل أنت متأكد؟"
      : "سيتم تصفير البيانات المحلية بالكامل. هل أنت متأكد؟";

    if(window.confirm(confirmMsg)) {
        try {
            if (isCloudEnabled()) {
                await db.logs.clear();
                await db.assignments.clear();
                await db.tasks.clear();
                await db.employees.clear();
                await db.systemLogs.clear();
                await db.insights.clear();
            } else {
                localDb.clearAll();
            }
            alert("تم تصفير قاعدة البيانات بنجاح.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء التصفير.");
        }
    }
  }
};
