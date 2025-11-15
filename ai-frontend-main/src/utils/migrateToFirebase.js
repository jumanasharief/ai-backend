// src/utils/migrateToFirebase.js
// أداة لنقل البيانات من localStorage إلى Firebase

import {
  doc,
  setDoc,
  collection,
  addDoc,
  writeBatch,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * نقل بيانات localStorage إلى Firebase Firestore
 * يتم استدعاء هذا مرة واحدة بعد تسجيل دخول المستخدم للمرة الأولى
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<Object>} - نتيجة النقل
 */
export const migrateLocalStorageToFirebase = async (userId) => {
  if (!userId) {
    console.error('No user ID provided for migration');
    return { success: false, error: 'No user ID' };
  }

  const results = {
    userData: null,
    goalsData: null,
    workoutHistory: null,
    errors: []
  };

  try {
    console.log('🔄 Starting data migration for user:', userId);

    // 1. نقل بيانات المستخدم
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        await setDoc(doc(db, 'users', userId), {
          email: parsedUser.email,
          name: parsedUser.name || '',
          gender: parsedUser.gender || '',
          birthdate: parsedUser.birthdate || '',
          age: parsedUser.age || null,
          profilePictureUrl: parsedUser.profilePicture || null,
          hasCompletedOnboarding: parsedUser.hasCompletedOnboarding || false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        results.userData = 'success';
        console.log('✅ User data migrated');
      } catch (error) {
        console.error('❌ Error migrating user data:', error);
        results.errors.push({ type: 'userData', error });
      }
    }

    // 2. نقل بيانات الأهداف
    const goalsData = localStorage.getItem('goalsData');
    if (goalsData) {
      try {
        const parsedGoals = JSON.parse(goalsData);

        // نقل الأهداف
        await setDoc(doc(db, 'goals', userId), {
          userId: userId,
          currentWeight: parsedGoals.currentWeight || null,
          goalWeight: parsedGoals.goalWeight || null,
          initialWeight: parsedGoals.initialWeight || null,
          goalType: parsedGoals.goal || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // نقل سجل الوزن باستخدام batch
        if (parsedGoals.weightHistory && parsedGoals.weightHistory.length > 0) {
          const batch = writeBatch(db);
          const historyRef = collection(db, 'weightHistory', userId, 'entries');

          parsedGoals.weightHistory.forEach((entry) => {
            const docRef = doc(historyRef);
            batch.set(docRef, {
              weight: entry.weight,
              recordedDate: entry.date,
              createdAt: serverTimestamp()
            });
          });

          await batch.commit();
          console.log(`✅ Migrated ${parsedGoals.weightHistory.length} weight entries`);
        }

        results.goalsData = 'success';
        console.log('✅ Goals data migrated');
      } catch (error) {
        console.error('❌ Error migrating goals data:', error);
        results.errors.push({ type: 'goalsData', error });
      }
    }

    // 3. نقل سجل التمارين باستخدام batch
    const workoutHistory = localStorage.getItem('workoutHistory');
    if (workoutHistory) {
      try {
        const parsedWorkouts = JSON.parse(workoutHistory);

        if (parsedWorkouts && parsedWorkouts.length > 0) {
          const batch = writeBatch(db);
          const workoutsRef = collection(db, 'workouts');

          parsedWorkouts.forEach((workout) => {
            const docRef = doc(workoutsRef);
            batch.set(docRef, {
              userId: userId,
              exercise: workout.exercise,
              workoutDate: new Date(workout.date),
              durationMs: workout.duration,
              reps: workout.reps,
              calories: workout.calories,
              accuracy: workout.accuracy,
              level: workout.level,
              createdAt: serverTimestamp()
            });
          });

          await batch.commit();
          results.workoutHistory = 'success';
          console.log(`✅ Migrated ${parsedWorkouts.length} workouts`);
        }
      } catch (error) {
        console.error('❌ Error migrating workout history:', error);
        results.errors.push({ type: 'workoutHistory', error });
      }
    }

    // 4. مسح localStorage بعد النقل الناجح
    if (results.errors.length === 0) {
      localStorage.removeItem('userData');
      localStorage.removeItem('goalsData');
      localStorage.removeItem('workoutHistory');
      
      // تعيين علامة النقل
      localStorage.setItem('migrationCompleted', 'true');
      localStorage.setItem('migrationDate', new Date().toISOString());
      
      console.log('✅ Successfully migrated all data and cleared localStorage');
    } else {
      console.warn('⚠️ Migration completed with errors');
    }

    return {
      success: results.errors.length === 0,
      results,
      errors: results.errors
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error };
  }
};

/**
 * التحقق من إذا كان المستخدم قد قام بالنقل بالفعل
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<boolean>}
 */
export const hasUserMigrated = async (userId) => {
  try {
    // التحقق من علامة localStorage
    const migrationCompleted = localStorage.getItem('migrationCompleted');
    if (migrationCompleted === 'true') {
      return true;
    }

    // التحقق من وجود بيانات في Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * التحقق من وجود بيانات في localStorage
 * @returns {boolean}
 */
export const hasLocalStorageData = () => {
  const userData = localStorage.getItem('userData');
  const goalsData = localStorage.getItem('goalsData');
  const workoutHistory = localStorage.getItem('workoutHistory');

  return !!(userData || goalsData || workoutHistory);
};

/**
 * تشغيل النقل التلقائي إذا لزم الأمر
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<Object>}
 */
export const autoMigrate = async (userId) => {
  try {
    console.log('🔍 Checking migration status...');

    // التحقق إذا كان قد تم النقل بالفعل
    const hasMigrated = await hasUserMigrated(userId);
    
    if (hasMigrated) {
      console.log('✅ User has already migrated');
      return { 
        success: true, 
        message: 'Already migrated',
        alreadyMigrated: true 
      };
    }

    // التحقق من وجود بيانات للنقل
    const hasData = hasLocalStorageData();
    
    if (!hasData) {
      console.log('ℹ️ No data to migrate');
      return { 
        success: true, 
        message: 'No data to migrate',
        noData: true 
      };
    }

    // تنفيذ النقل
    console.log('🚀 Running automatic migration...');
    const result = await migrateLocalStorageToFirebase(userId);
    
    if (result.success) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.error('❌ Migration failed:', result.errors);
    }

    return result;
  } catch (error) {
    console.error('❌ Auto migration error:', error);
    return { success: false, error };
  }
};

/**
 * إعادة تعيين حالة النقل (للتطوير/الاختبار فقط)
 * @param {string} userId - معرف المستخدم
 */
export const resetMigrationStatus = (userId) => {
  localStorage.removeItem('migrationCompleted');
  localStorage.removeItem('migrationDate');
  console.log('⚠️ Migration status reset for user:', userId);
};

/**
 * الحصول على معلومات النقل
 * @returns {Object}
 */
export const getMigrationInfo = () => {
  const completed = localStorage.getItem('migrationCompleted') === 'true';
  const date = localStorage.getItem('migrationDate');
  const hasData = hasLocalStorageData();

  return {
    completed,
    date,
    hasData
  };
};