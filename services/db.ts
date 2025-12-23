
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
    if (!firestore) throw new Error("قاعدة البيانات غير متصلة. يرجى التأكد من ضبط الإعدادات في firebase.ts");
    return firestore;
}

/**
 * دالة مساعدة لمسح مجموعة كاملة
 */
const clearCollection = async (collectionName: string) => {
    const db = checkDb();
    const snapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
};

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
       await clearCollection(COLLECTIONS.EMPLOYEES);
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
       await clearCollection(COLLECTIONS.TASKS);
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
       await clearCollection(COLLECTIONS.ASSIGNMENTS);
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
       await clearCollection(COLLECTIONS.LOGS);
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
    },
    clear: async () => {
      await clearCollection(COLLECTIONS.INSIGHTS);
    }
  },

  systemLogs: {
    list: async (): Promise<SystemAuditLog[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.SYSTEM_LOGS));
      return snapshot.docs.map(doc => doc.data() as SystemAuditLog);
    },
    add: async (item: SystemAuditLog): Promise<void> => {
      await setDoc(doc(checkDb(), COLLECTIONS.SYSTEM_LOGS, item.id), item);
    },
    clear: async () => {
      await clearCollection(COLLECTIONS.SYSTEM_LOGS);
    }
  },

  factoryReset: async () => {
    if(window.confirm("تحذير: هذا الإجراء سيقوم بحذف كافة البيانات (موظفين، مهام، سجلات) نهائياً من السحابة. هل أنت متأكد؟")) {
        try {
            await clearCollection(COLLECTIONS.LOGS);
            await clearCollection(COLLECTIONS.ASSIGNMENTS);
            await clearCollection(COLLECTIONS.TASKS);
            await clearCollection(COLLECTIONS.EMPLOYEES);
            await clearCollection(COLLECTIONS.SYSTEM_LOGS);
            await clearCollection(COLLECTIONS.INSIGHTS);
            alert("تم تصفير قاعدة البيانات بنجاح.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء التصفير، يرجى التحقق من صلاحيات Firebase.");
        }
    }
  }
};
