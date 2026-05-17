
'use client';

import { useEffect } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';

export function NotificationListener() {
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;

    // Determine the current user's role and ID from localStorage
    const adminSession = typeof window !== 'undefined' ? localStorage.getItem('culinaro_admin_session') : null;
    const userMobile = typeof window !== 'undefined' ? localStorage.getItem('culinaro_user_mobile') : null;

    const currentUserId = adminSession ? 'admin' : userMobile;

    if (!currentUserId) return;

    // Query for unread notifications for the current user
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', currentUserId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          toast({
            title: notification.title,
            description: notification.message,
            action: (
              <Bell className="w-4 h-4 text-primary" />
            ),
          });

          // Automatically mark as read after showing
          const docRef = doc(firestore, 'notifications', change.doc.id);
          updateDoc(docRef, { read: true });
        }
      });
    });

    return () => unsubscribe();
  }, [firestore]);

  return null;
}
