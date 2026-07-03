// Import official modular Firebase libraries [1]
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { fishTypes } from './fish-data.js';

// Your personalized Firebase credentials [1]
const firebaseConfig = {
  apiKey: "AIzaSyD1CZtAqwgyq4qW0LNyTwUCUHTNw2ibQcg",
  authDomain: "going-fishin.firebaseapp.com",
  projectId: "going-fishin",
  storageBucket: "going-fishin.firebasestorage.app",
  messagingSenderId: "572667908989",
  appId: "1:572667908989:web:e9ab64917eda97d30a3214",
  measurementId: "G-HY8NW1XBB6"
};

// Initialize services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

// Save progress to either Firebase or Offline LocalStorage [1]
export async function savePlayerDataToCloud(userId, coins, inventory, currentRodId, ownedRods) {
  if (!userId) {
    localStorage.setItem('fishin_coins', coins);
    localStorage.setItem('fishin_inventory', JSON.stringify(inventory.map(f => f.name)));
    localStorage.setItem('fishin_currentRodId', currentRodId);
    localStorage.setItem('fishin_ownedRods', JSON.stringify(ownedRods));
    return;
  }
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, {
      coins: coins,
      inventory: inventory.map(f => f.name),
      currentRodId: currentRodId,
      ownedRods: ownedRods
    }, { merge: true });
    console.log("Cloud save success.");
  } catch (e) {
    console.error("Cloud save bypassed. Saving locally... ", e);
  }
}

// Load progress from either Firebase or Offline LocalStorage [1]
export async function loadPlayerDataFromCloud(userId) {
  if (!userId) {
    const loadedCoins = parseInt(localStorage.getItem('fishin_coins')) || 0;
    const loadedRodId = parseInt(localStorage.getItem('fishin_currentRodId')) || 0;
    
    const localRods = localStorage.getItem('fishin_ownedRods');
    const loadedRods = localRods ? JSON.parse(localRods) : [0];
    
    const localInv = localStorage.getItem('fishin_inventory');
    const savedFishNames = localInv ? JSON.parse(localInv) : [];
    const loadedInventory = [];
    savedFishNames.forEach(name => {
      const fish = fishTypes.find(f => f.name === name);
      if (fish) loadedInventory.push(fish);
    });
    
    return { coins: loadedCoins, currentRodId: loadedRodId, ownedRods: loadedRods, inventory: loadedInventory };
  }
  
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const savedFishNames = data.inventory || [];
      const loadedInventory = [];
      savedFishNames.forEach(name => {
        const fish = fishTypes.find(f => f.name === name);
        if (fish) loadedInventory.push(fish);
      });
      
      return {
        coins: data.coins || 0,
        currentRodId: data.currentRodId || 0,
        ownedRods: data.ownedRods || [0],
        inventory: loadedInventory
      };
    } else {
      return { coins: 0, currentRodId: 0, ownedRods: [0], inventory: [] };
    }
  } catch (e) {
    console.error("Could not fetch cloud documents: ", e);
    return null;
  }
}
