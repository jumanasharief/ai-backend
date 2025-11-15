// src/utils/uploadProfilePicture.js
// دوال لرفع وإدارة صور البروفايل في Firebase Storage

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * رفع صورة البروفايل إلى Firebase Storage
 * @param {string} userId - معرف المستخدم
 * @param {File} file - ملف الصورة
 * @returns {Promise<Object>} - {url, path, error}
 */
export const uploadProfilePicture = async (userId, file) => {
  try {
    // التحقق من الملف
    if (!file) throw new Error('No file provided');

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // التحقق من حجم الملف (أقصى 5 ميجابايت)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // إنشاء مرجع التخزين
    const storageRef = ref(storage, filePath);

    // رفع الملف
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        userId: userId,
        uploadedAt: new Date().toISOString()
      }
    });

    // الحصول على رابط التحميل
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { url: downloadURL, path: filePath, error: null };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return { url: null, path: null, error };
  }
};

/**
 * حذف صورة البروفايل
 * @param {string} filePath - مسار الملف في Storage
 * @returns {Promise<Object>} - {success, error}
 */
export const deleteProfilePicture = async (filePath) => {
  try {
    if (!filePath) throw new Error('No file path provided');

    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return { success: false, error };
  }
};

/**
 * ضغط الصورة قبل الرفع
 * @param {File} file - ملف الصورة
 * @param {number} maxWidth - أقصى عرض (افتراضي: 800)
 * @param {number} quality - جودة الصورة (0-1، افتراضي: 0.8)
 * @returns {Promise<File>} - الصورة المضغوطة
 */
export const compressImage = async (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // تغيير الحجم إذا لزم الأمر
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            }));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = reject;
    };

    reader.onerror = reject;
  });
};

/**
 * قراءة الصورة كـ Data URL (للمعاينة)
 * @param {File} file - ملف الصورة
 * @returns {Promise<string>} - Data URL
 */
export const readImageAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * التحقق من صحة نوع الصورة
 * @param {File} file - ملف الصورة
 * @returns {boolean}
 */
export const isValidImageType = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * التحقق من حجم الصورة
 * @param {File} file - ملف الصورة
 * @param {number} maxSizeMB - أقصى حجم بالميجابايت (افتراضي: 5)
 * @returns {boolean}
 */
export const isValidImageSize = (file, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * الحصول على معلومات الصورة
 * @param {File} file - ملف الصورة
 * @returns {Promise<Object>} - {width, height, size, type}
 */
export const getImageInfo = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
          sizeInMB: (file.size / 1024 / 1024).toFixed(2)
        });
      };

      img.onerror = reject;
    };

    reader.onerror = reject;
  });
};

/**
 * رفع صورة مع ضغط تلقائي
 * @param {string} userId - معرف المستخدم
 * @param {File} file - ملف الصورة
 * @param {Object} options - خيارات الضغط
 * @returns {Promise<Object>} - {url, path, error}
 */
export const uploadProfilePictureWithCompression = async (
  userId, 
  file, 
  options = { maxWidth: 800, quality: 0.8 }
) => {
  try {
    // التحقق من النوع
    if (!isValidImageType(file)) {
      throw new Error('Invalid image type. Please use JPEG, PNG, or GIF.');
    }

    // التحقق من الحجم
    if (!isValidImageSize(file, 5)) {
      throw new Error('Image size must be less than 5MB.');
    }

    // ضغط الصورة
    const compressedFile = await compressImage(file, options.maxWidth, options.quality);

    // رفع الصورة المضغوطة
    return await uploadProfilePicture(userId, compressedFile);
  } catch (error) {
    console.error('Error uploading with compression:', error);
    return { url: null, path: null, error };
  }
};