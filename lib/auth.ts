import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

export async function checkUsernameExists(username: string): Promise<boolean> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

export async function createUserDocument(uid: string, username: string) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { username });
}

export async function getUsernameByUid(uid: string): Promise<string | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data().username;
  }
  return null;
}

