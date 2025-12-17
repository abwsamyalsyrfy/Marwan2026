
import { Employee, Task, Assignment, TaskLog, SystemAuditLog } from '../types';
import { firestore } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";

// أسماء المجموعات في Firestore
const COLLECTIONS = {
  EMPLOYEES: 'employees',
  TASKS: 'tasks',
  ASSIGNMENTS: 'assignments',
  LOGS: 'logs',
  SYSTEM_LOGS: 'system_logs'
};

// helper to check if firebase is ready
const checkDb = () => {
    if (!firestore) throw new Error("قاعدة البيانات غير متصلة. تأكد من إعداد ملف firebase.ts");
    return firestore;
}

// --- واجهة قاعدة البيانات (SaaS / Cloud Version) ---
export const db = {
  // --- الموظفين ---
  employees: {
    list: async (): Promise<Employee[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.EMPLOYEES));
      return snapshot.docs.map(doc => doc.data() as Employee);
    },
    add: async (item: Employee): Promise<Employee> => {
      // نستخدم setDoc مع ID الموظف ليكون هو نفسه ID الوثيقة لمنع التكرار وسهولة البحث
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
       // الحذف الكامل يتطلب Cloud Functions في البيئة الحقيقية، هنا سنقوم بحذف الواجهة فقط للتجربة
       // أو يمكننا جلب الكل وحذفهم (غير منصوح به للبيانات الكبيرة)
       const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.EMPLOYEES));
       const batch = writeBatch(checkDb());
       snapshot.docs.forEach((d) => batch.delete(d.ref));
       await batch.commit();
    }
  },

  // --- المهام ---
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

  // --- التعيينات ---
  assignments: {
    list: async (): Promise<Assignment[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.ASSIGNMENTS));
      return snapshot.docs.map(doc => doc.data() as Assignment);
    },
    add: async (item: Assignment): Promise<Assignment> => {
      // هنا نستخدم ID عشوائي أو المولد من التطبيق
      await setDoc(doc(checkDb(), COLLECTIONS.ASSIGNMENTS, item.id), item);
      return item;
    },
    delete: async (id: string): Promise<void> => {
      await deleteDoc(doc(checkDb(), COLLECTIONS.ASSIGNMENTS, id));
    },
    import: async (data: Assignment[]): Promise<void> => {
      // Batch writes limit is 500, simple loop for safety in this demo
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

  // --- السجلات ---
  logs: {
    list: async (): Promise<TaskLog[]> => {
      // جلب السجلات مرتبة (قد يتطلب فهرس في Firebase Console)
      // إذا فشل الترتيب، سيقوم الكود بالواجهة بترتيبها
      try {
        const q = query(collection(checkDb(), COLLECTIONS.LOGS));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as TaskLog);
      } catch (e) {
        console.error("Error fetching logs", e);
        return [];
      }
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
      data.slice(0, 490).forEach(item => { // Safe batch limit
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

  // --- سجلات النظام ---
  systemLogs: {
    list: async (): Promise<SystemAuditLog[]> => {
      const snapshot = await getDocs(collection(checkDb(), COLLECTIONS.SYSTEM_LOGS));
      return snapshot.docs.map(doc => doc.data() as SystemAuditLog);
    },
    add: async (item: SystemAuditLog): Promise<void> => {
      await setDoc(doc(checkDb(), COLLECTIONS.SYSTEM_LOGS, item.id), item);
    },
    clear: async () => { /* ... */ }
  },

  // --- تهيئة عامة (Reset) ---
  factoryReset: async () => {
    if(window.confirm("هذا الإجراء سيحذف البيانات من المتصفح فقط. لحذف قاعدة البيانات السحابية يجب استخدام لوحة تحكم Firebase.")) {
        window.location.reload();
    }
  }
};
