// Firebase Configuration File
// When you are ready to connect to your live Firebase backend,
// 1. Uncomment this file.
// 2. Add your Firebase config keys.
// 3. Update src/lib/db.js to import and use these Firestore methods instead of LocalStorage.

/*
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Offline persistence (satisfies the Offline-First requirement)
enableIndexedDbPersistence(db).catch((err) => {
    console.error("Firebase persistence error:", err.code);
});

export const getCollectionFirebase = async (collectionName) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const data = [];
  querySnapshot.forEach((doc) => {
    data.push({ id: doc.id, ...doc.data() });
  });
  return data;
};

export const addDocumentFirebase = async (collectionName, data) => {
  const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString()
  });
  return { id: docRef.id, ...data };
};

export const updateDocumentFirebase = async (collectionName, id, updates) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, updates);
  return { id, ...updates };
};

export const getDocumentFirebase = async (collectionName, id) => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};
*/
