"use client"
import { useEffect, useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Watchlist } from '@/components/Watchlist';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ClientPage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);

  useEffect(() => {
    if (!username) return;

    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'mock-api-key' || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setFirebaseError(true);
      setLoading(false);
      return;
    }

    const findUser = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setError(true);
        } else {
          setUid(snapshot.docs[0].id);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    findUser();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="p-8 text-center bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50 max-w-md w-full">
          <h3 className="text-red-800 dark:text-red-400 font-medium mb-2">Firebase Configuration Missing</h3>
          <p className="text-sm text-red-600 dark:text-red-500">Please add your Firebase config to the environment variables to view this watchlist.</p>
          <Link 
            href="/"
            className="mt-6 inline-block px-6 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (error || !uid) {
    notFound();
  }

  return <Watchlist profileUid={uid} profileUsername={username} />;
}
