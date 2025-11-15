import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp,
    collection, addDoc, onSnapshot, query, where, orderBy, limit
  } from "firebase/firestore";
  import { db, auth, storage } from "../lib/firebase";
  import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, updateProfile, onAuthStateChanged
  } from "firebase/auth";
  import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
  
  // Auth
  export const onAuthChanged = (cb) => onAuthStateChanged(auth, cb);
  export const signUpWithEmail = async ({ email, password, displayName }) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(user, { displayName });
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid, email: user.email, name: displayName || user.displayName || "",
      hasCompletedOnboarding: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }, { merge: true });
    return user;
  };
  export const signInWithEmail = async ({ email, password }) => (await signInWithEmailAndPassword(auth, email, password)).user;
  export const signOutNow = async () => { await signOut(auth); };
  
  // User profile
  export const getUserDoc = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  };
  export const upsertUserDoc = async (uid, payload) =>
    setDoc(doc(db, "users", uid), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
  
  export const uploadProfileImage = async (uid, file) => {
    const fileRef = ref(storage, `profiles/${uid}-${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    await updateDoc(doc(db, "users", uid), { profilePictureUrl: url, updatedAt: serverTimestamp() });
    return url;
  };
  
  // Goals & weights
  export const getGoals = async (uid) => {
    const snap = await getDoc(doc(db, "goals", uid));
    return snap.exists() ? snap.data() : null;
  };
  export const saveGoals = async (uid, { currentWeight, goalWeight, initialWeight, goalType }) =>
    setDoc(doc(db, "goals", uid), {
      userId: uid, currentWeight: currentWeight ?? null, goalWeight: goalWeight ?? null,
      initialWeight: initialWeight ?? null, goalType: goalType || "",
      updatedAt: serverTimestamp(), createdAt: serverTimestamp(),
    }, { merge: true });
  
  export const addWeightEntry = async (uid, { weight, recordedDate }) =>
    addDoc(collection(db, "weightHistory", uid, "entries"), {
      weight: Number(weight),
      recordedDate: recordedDate || new Date().toISOString().slice(0, 10),
      createdAt: serverTimestamp(),
    });
  
  export const listenGoals = (uid, cb) =>
    onSnapshot(doc(db, "goals", uid), (snap) => cb(snap.exists() ? snap.data() : null));
  
  export const listenWeightEntries = (uid, cb, cap = 100) => {
    const q = query(
      collection(db, "weightHistory", uid, "entries"),
      orderBy("createdAt", "desc"),
      limit(cap)
    );
    return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };
  
  // Workouts
  export const addWorkoutLog = async (uid, { exercise, durationMs, reps, calories, accuracy, level }) =>
    addDoc(collection(db, "workouts"), {
      userId: uid, exercise: exercise || "Unknown", workoutDate: serverTimestamp(),
      durationMs: Number(durationMs) || 0, reps: Number(reps) || 0, calories: Number(calories) || 0,
      accuracy: Number(accuracy) || 0, level: level || "beginner", createdAt: serverTimestamp(),
    });
  
  export const listenMyWorkouts = (uid, cb, cap = 50) => {
    const q = query(
      collection(db, "workouts"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(cap)
    );
    return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };
  