// Import official modular Firebase libraries [1]
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { fishTypes } from './fish-data.js';

// Firebase Credentials Config [1]
const firebaseConfig = {
  apiKey: "AIzaSyD1CZtAqwgyq4qW0LNyTwUCUHTNw2ibQcg",
  authDomain: "going-fishin.firebaseapp.com",
  projectId: "going-fishin",
  storageBucket: "going-fishin.firebasestorage.app",
  messagingSenderId: "572667908989",
  appId: "1:572667908989:web:e9ab64917eda97d30a3214",
  measurementId: "G-HY8NW1XBB6"
};

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
        console.error("Cloud saving bypassed. Saving locally... ", e);
    }
}

// Load progress from either Firebase or Offline LocalStorage [1]
export async function loadPlayerDataFromCloud(userId) {
    if (!userId) {
        try {
            const loadedCoins = parseInt(localStorage.getItem('fishin_coins')) || 0;
            const loadedRodId = parseInt(localStorage.getItem('fishin_currentRodId')) || 0;
            
            const localRods = localStorage.getItem('fishin_ownedRods');
            let loadedRods = [0];
            try {
                loadedRods = localRods ? JSON.parse(localRods) : [0];
                if (!Array.isArray(loadedRods)) loadedRods = [0];
            } catch(e) {}
            
            const localInv = localStorage.getItem('fishin_inventory');
            let savedFishNames = [];
            try {
                savedFishNames = localInv ? JSON.parse(localInv) : [];
                if (!Array.isArray(savedFishNames)) savedFishNames = [];
            } catch(e) {}
            
            const loadedInventory = [];
            savedFishNames.forEach(name => {
                const actualName = (name && typeof name === 'object') ? name.name : name;
                const fish = fishTypes.find(f => f.name === actualName);
                if (fish) loadedInventory.push(fish);
            });
            
            return { coins: loadedCoins, currentRodId: loadedRodId, ownedRods: loadedRods, inventory: loadedInventory };
        } catch (err) {
            console.warn("LocalStorage reset cleanly:", err);
            return { coins: 0, currentRodId: 0, ownedRods: [0], inventory: [] };
        }
    }
    
    try {
        const userDocRef = doc(db, "users", userId);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const savedFishNames = data.inventory || [];
            const loadedInventory = [];
            savedFishNames.forEach(name => {
                const actualName = (name && typeof name === 'object') ? name.name : name;
                const fish = fishTypes.find(f => f.name === actualName);
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
