
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

const checkDb = () => {
    if (!firestore) throw new Error("قاعدة البيانات غير متصلة");
    return firestore;
}

export const db = {
  employees: {
    list: async (): Promise<Employee[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.EMPLOYEES));
      return snapshot.docs.map(doc => doc.data() as Employee);
    },
    add: async (item: Employee): Promise<Employee> => {
      await setDoc(doc(checkDb(), COLLECTIONS.EMPLOYEES, item.id), item);
      return item;
    },
    update: async (item: Employee): Promise<Employee> => {
      await updateDoc(doc(checkDb(), COLLECTIONS.EMPLOYEES, item.id), { ...item });
      return item;
    },
    delete: async (id: string): Promise<void> => {
      await deleteDoc(doc(checkDb(), COLLECTIONS.EMPLOYEES, id));
    },
    import: async (data: Employee[]): Promise<void> => {
      const batch = writeBatch(checkDb());
      data.forEach(item => {
        const ref = doc(checkDb(), COLLECTIONS.EMPLOYEES, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
       const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.EMPLOYEES));
       const batch = writeBatch(checkDb());
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.TASKS));
      return snapshot.docs.map(doc => doc.data() as Task);
    },
    add: async (item: Task): Promise<Task> => {
      await setDoc(doc(checkDb(), COLLECTIONS.TASKS, item.id), item);
      return item;
    },
    update: async (item: Task): Promise<Task> => {
      await updateDoc(doc(checkDb(), COLLECTIONS.TASKS, item.id), { ...item });
      return item;
    },
    delete: async (id: string): Promise<void> => {
      await deleteDoc(doc(checkDb(), COLLECTIONS.TASKS, id));
    },
    import: async (data: Task[]): Promise<void> => {
      const batch = writeBatch(checkDb());
      data.forEach(item => {
        const ref = doc(checkDb(), COLLECTIONS.TASKS, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
       const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.TASKS));
       const batch = writeBatch(checkDb());
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  assignments: {
    list: async (): Promise<Assignment[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.ASSIGNMENTS));
      return snapshot.docs.map(doc => doc.data() as Assignment);
    },
    add: async (item: Assignment): Promise<Assignment> => {
      await setDoc(doc(checkDb(), COLLECTIONS.ASSIGNMENTS, item.id), item);
      return item;
    },
    delete: async (id: string): Promise<void> => {
      await deleteDoc(doc(checkDb(), COLLECTIONS.ASSIGNMENTS, id));
    },
    import: async (data: Assignment[]): Promise<void> => {
      const batch = writeBatch(checkDb());
      data.forEach(item => {
        const ref = doc(checkDb(), COLLECTIONS.ASSIGNMENTS, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
       const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.ASSIGNMENTS));
       const batch = writeBatch(checkDb());
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  logs: {
    list: async (): Promise<TaskLog[]> => {
      const q = query(collection(checkDb(), COLLECTIONS.LOGS));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as TaskLog);
    },
    add: async (items: TaskLog[]): Promise<TaskLog[]> => {
      const batch = writeBatch(checkDb());
      items.forEach(item => {
         const ref = doc(checkDb(), COLLECTIONS.LOGS, item.id);
         batch.set(ref, item);
      });
      await batch.commit();
      return items;
    },
    update: async (item: TaskLog): Promise<TaskLog> => {
      await updateDoc(doc(checkDb(), COLLECTIONS.LOGS, item.id), { ...item });
      return item;
    },
    delete: async (id: string): Promise<void> => {
      await deleteDoc(doc(checkDb(), COLLECTIONS.LOGS, id));
    },
    import: async (data: TaskLog[]): Promise<void> => {
      const batch = writeBatch(checkDb());
      data.slice(0, 490).forEach(item => {
        const ref = doc(checkDb(), COLLECTIONS.LOGS, item.id);
        batch.set(ref, item);
      });
      await batch.commit();
    },
    clear: async () => {
       const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.LOGS));
       const batch = writeBatch(checkDb());
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  insights: {
    getLatest: async (): Promise<TeamInsight | null> => {
      const q = query(collection(checkDb(), COLLECTIONS.INSIGHTS), orderBy('generatedAt', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as TeamInsight;
    },
    save: async (insight: TeamInsight): Promise<void> => {
      const id = `INSIGHT-${Date.now()}`;
      await setDoc(doc(checkDb(), COLLECTIONS.INSIGHTS, id), { ...insight, id });
    }
  },

  systemLogs: {
    list: async (): Promise<SystemAuditLog[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.SYSTEM_LOGS));
      return snapshot.docs.map(doc => doc.data() as SystemAuditLog);
    },
    add: async (item: SystemAuditLog): Promise<void> => {
      await setDoc(doc(checkDb(), COLLECTIONS.SYSTEM_LOGS, item.id), item);
    }
  },

  factoryReset: async () => {
    if(window.confirm("هذا الإجراء سيحذف البيانات المحلية ويحاول تصفير السحابية.")) {
        window.location.reload();
    }
  }
};
