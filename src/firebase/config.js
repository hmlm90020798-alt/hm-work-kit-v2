import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAyaMa6BymV9g80SrCKd4WqAh-sp3y1N-c",
  authDomain: "hm-work-kit.firebaseapp.com",
  projectId: "hm-work-kit",
  storageBucket: "hm-work-kit.firebasestorage.app",
  messagingSenderId: "181782197272",
  appId: "1:181782197272:web:85bc80bb6f60ddc6f47f6d"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
