
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { toast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: any) => {
      console.error('Firebase Permission Error:', error);
      // We don't show a generic toast for security rules errors as they 
      // are handled by the dev overlay or specific UI states.
    });

    return () => unsubscribe();
  }, []);

  return null;
}
