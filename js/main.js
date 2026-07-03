// Import assets, engines, and saving triggers from other modules [1]
import { fishTypes } from './fish-data.js';
import { rodsData } from './rods-data.js';
import { sfx, LofiEngine, userInteractiveTrigger } from './audio-engine.js';
import { auth, savePlayerDataToCloud, loadPlayerDataFromCloud } from './firebase-db.js';
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- CORE GAME STATE VARIABLES ---
let coins = 0; 
let inventory = []; 
let isFishing = false;
let lineAnimFrame = null; 
let rippleInterval = null; 
let hasCastedOnce = false;
let currentRodId = 0; 
let ownedRods = [0];
let userId = null;

// --- DOM ELEMENTS REFERENCE DICTIONARY ---
const ui = {
    ground: document.getElementById('groundArea'), 
    pond: document.getElementById('pond'), 
    bobber: document.getElementById('bobber'),
    rod: document.getElementById('rod'), 
    rodTip: document.getElementById('rodTip'), 
    linePath: document.getElementById('linePath'),
    status: document.getElementById('statusMessage'), 
    coins: document.getElementById('coinCount'), 
    inventory: document.getElementById('inventoryList'),
    sellBtn: document.getElementById('sellBtn'), 
    popup: document.getElementById('catchPopup'),
    popupIcon: document.getElementById('catchIcon'), 
    popupName: document.getElementById('catchName'), 
    popupRarity: document.getElementById('catchRarity'),
    shopModal: document.getElementById('shopModal'), 
    openShopBtn: document.getElementById('openShopBtn'), 
    closeShopBtn: document.getElementById('closeShopBtn'), 
    shopList: document.getElementById('shopList'),
    indexModal: document.getElementById('indexModal'), 
    openIndexBtn: document.getElementById('openIndexBtn'), 
    closeIndexBtn: document.getElementById('closeIndexBtn'), 
    indexList: document.getElementById('indexList')
};

// --- DATA-SYNC WRAPPERS ---
function savePlayerData() {
    savePlayerDataToCloud(userId, coins, inventory, currentRodId, ownedRods);
}

// Connect user authentication to cloud operations on application start [1]
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        const cloudData = await loadPlayerDataFromCloud(userId);
        if (cloudData) {
            coins = cloudData.coins;
            currentRodId = cloudData.currentRodId;
            ownedRods = cloudData.ownedRods;
            inventory = cloudData.inventory;
        }
    } else {
        userId = null;
        const offlineData = await loadPlayerDataFromCloud(null);
        if (offlineData) {
            coins = offlineData.coins;
            currentRodId = offlineData.currentRodId;
            ownedRods = offlineData.ownedRods;
            inventory = offlineData.inventory;
        }
    }
    updateVisualsOnLoad();
});

// Initialize Anonymous Auth session instantly [1]
signInAnonymously(auth).catch((error) => {
    console.warn("Auth offline fallback in place: ", error);
});

// Re-populates variables and card arrays back into DOM elements on login
function updateVisualsOnLoad() {
    ui.coins.innerText = formatMoney(coins);
    ui.rod.style.background = rodsData[currentRodId].color;
    ui.inventory.innerHTML = '';
    
    inventory.forEach(fish => {
        addFishToUI(fish);
    });
}

// --- UTILITIES ---
function formatMoney(num) { 
    return num.toLocaleString('en-US'); 
}

let statusMsgTimeout;
function showMessage(text, autoFade = true) {
    ui.status.innerText = text; 
    ui.status.style.opacity = '1';
    clearTimeout(statusMsgTimeout);
    
    if (autoFade) {
        statusMsgTimeout = setTimeout(() => { 
            ui.status.style.opacity = '0'; 
        }, 4000);
    }
}

// --- MODAL POPUPS TRIGGER BINDINGS ---
ui.openShopBtn.addEventListener('click', () => { 
    if (isFishing) return; 
    userInteractiveTrigger();
    sfx.click();
    renderShop(); 
    ui.shopModal.classList.add('show'); 
});

ui.closeShopBtn.addEventListener('click', () => { 
    sfx.click();
    ui.shopModal.classList.remove('show'); 
});

ui.openIndexBtn.addEventListener('click', () => { 
    sfx.click();
    renderIndex(); 
    ui.indexModal.classList.add('show'); 
});

ui.closeIndexBtn.addEventListener('click', () => { 
    sfx.click();
    ui.indexModal.classList.remove('show'); 
});

function renderIndex() {
    ui.indexList.innerHTML = '';
    fishTypes.forEach((fish) => {
        const fishClass = `visual-${fish.name.toLowerCase().replace(/\s+/g, '-')}`;
        ui.indexList.innerHTML += `
            <div class="index-card ${fishClass}">
                <div class="index-icon-wrap"><span class="fish-icon">${fish.icon}</span></div>
                <h4>${fish.name}</h4>
                <div class="req">${fish.req}</div>
                <div class="val">🪙 ${formatMoney(fish.value)}</div>
            </div>
        `;
    });
}

function renderShop() {
    ui.shopList.innerHTML = '';
    for (let i = 0; i < rodsData.length; i++) {
        const rod = rodsData[i];
        const isOwned = ownedRods.includes(rod.id);
        const isEquipped = currentRodId === rod.id;
        const canAfford = coins >= rod.price;
        
        let btnHtml = '';
        if (isEquipped) {
            btnHtml = `<button class="buy-btn equipped" id="btn-${rod.id}">✔ Equipped</button>`;
        } else if (isOwned) {
            btnHtml = `<button class="buy-btn equip" id="btn-${rod.id}" onclick="equipRod(${rod.id})">Equip</button>`;
        } else {
            btnHtml = `<button class="buy-btn ${canAfford ? '' : 'disabled'}" id="btn-${rod.id}" onclick="buyRod(${rod.id}, this)">🪙 ${formatMoney(rod.price)}</button>`;
        }

        let visualHtml = `
            <div class="shop-rod-visual ${rod.aura ? rod.aura + '-aura' : ''}">
                ${rod.aura ? `<div class="aura-glow"></div>` : ''}
                ${rod.aura === 'legendary' ? '<div class="particle p1">✨</div><div class="particle p2">✨</div>' : ''}
                ${rod.aura === 'poseidon' ? '<div class="particle p1">🫧</div><div class="particle p2">🫧</div>' : ''}
                <div class="s-pole" style="background: ${rod.color};"></div><div class="s-reel" style="background: ${rod.reel};"></div>
            </div>
        `;

        ui.shopList.innerHTML += `
            <div class="modal-item" style="animation-delay: ${i * 0.08}s">
                ${visualHtml}
                <div class="item-info">
                    <h4>${rod.name}</h4>
                    <div class="item-stats">
                        <span class="stat-luck">Luck: x${rod.luck}</span>
                        <span class="stat-time">Time: ${rod.time / 1000}s</span>
                    </div>
                </div>
                ${btnHtml}
            </div>
        `;
    }
}

// Bind shop functions to window scope for Spck inline HTML triggers [1]
window.buyRod = function(id, btnElement) {
    const rod = rodsData[id];
    if (coins >= rod.price && !ownedRods.includes(id)) {
        sfx.sell();
        coins -= rod.price; 
        ui.coins.innerText = formatMoney(coins);
        ownedRods.push(id);
        
        btnElement.classList.add('purchased'); 
        btnElement.innerText = "Bought!";
        setTimeout(() => { 
            window.equipRod(id); 
        }, 300); 
    } else if (coins < rod.price) {
        sfx.error();
        showMessage("Not enough coins!", true);
    }
};

window.equipRod = function(id) {
    sfx.click();
    currentRodId = id; 
    ui.rod.style.background = rodsData[id].color; 
    renderShop();
    savePlayerData(); 
};

// Create floating pollen spores
for (let i = 0; i < 8; i++) { 
    let pollen = document.createElement('div'); 
    pollen.className = 'pollen'; 
    pollen.style.left = Math.random() * 100 + '%'; 
    pollen.style.top = Math.random() * 60 + '%'; 
    pollen.style.animationDelay = (Math.random() * 4) + 's'; 
    pollen.style.animationDuration = (6 + Math.random() * 4) + 's'; 
    ui.ground.appendChild(pollen); 
}

// --- CORE PHYSICS & INTERACTION ---
function drawFishingLine() {
    if (!isFishing) { 
        ui.linePath.style.display = 'none'; 
        return; 
    }
    ui.linePath.style.display = 'block';
    
    const tipRect = ui.rodTip.getBoundingClientRect(); 
    const bobberRect = ui.bobber.getBoundingClientRect();
    
    const x1 = tipRect.left + tipRect.width / 2; 
    const y1 = tipRect.top + tipRect.height / 2;
    const x2 = bobberRect.left + bobberRect.width / 2; 
    const y2 = bobberRect.top + bobberRect.height / 2;
    
    const droopAmount = ui.bobber.classList.contains('bite') ? 0 : 40; 
    
    ui.linePath.setAttribute('d', `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${((y1 + y2) / 2) + droopAmount} ${x2} ${y2}`);
    lineAnimFrame = requestAnimationFrame(drawFishingLine);
}

ui.pond.addEventListener('click', (e) => {
    if (ui.shopModal.classList.contains('show') || ui.indexModal.classList.contains('show')) {
        return;
    }
    if (isFishing) { 
        showMessage("Already casted your line!", true); 
        sfx.error(); 
        return; 
    }
    userInteractiveTrigger();
    const rect = ui.pond.getBoundingClientRect();
    castLine(e.clientX - rect.left, e.clientY - rect.top);
});

function createRipple(x, y) {
    const ripple = document.createElement('div'); 
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`; 
    ripple.style.top = `${y}px`; 
    ripple.style.width = '35px'; 
    ripple.style.height = '35px';
    ripple.style.animation = 'ripple-effect 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    
    ui.pond.appendChild(ripple); 
    setTimeout(() => ripple.remove(), 900);
}

function castLine(x, y) {
    isFishing = true; 
    hasCastedOnce = true;
    sfx.cast();
    
    ui.bobber.style.left = `${x}px`; 
    ui.bobber.style.top = `${y}px`;
    
    setTimeout(() => {
        sfx.splash();
        createRipple(x, y); 
        ui.bobber.classList.remove('bite'); 
        ui.bobber.classList.add('active');
    }, 300);
    
    ui.rod.style.transform = "rotate(-18deg)"; 
    drawFishingLine();
    showMessage("Quietly waiting...", true);
    
    rippleInterval = setInterval(() => { 
        if (isFishing && !ui.bobber.classList.contains('bite')) {
            createRipple(parseInt(ui.bobber.style.left), parseInt(ui.bobber.style.top));
        }
    }, 1400);
    
    setTimeout(checkBite, rodsData[currentRodId].time);
}

function checkBite() { 
    if (!isFishing) return; 
    Math.random() <= 0.85 ? fishBite() : fishIgnored(); 
}

function fishIgnored() { 
    showMessage("Nothing's biting...", true); 
    ui.rod.style.transform = "rotate(-25deg)"; 
    setTimeout(() => { resetFishingState(); }, 600); 
}

function fishBite() {
    clearInterval(rippleInterval); 
    sfx.bite();
    
    ui.bobber.classList.add('bite'); 
    ui.rod.style.transform = "rotate(-3deg)"; 
    createRipple(parseInt(ui.bobber.style.left), parseInt(ui.bobber.style.top));
    
    showMessage("Oh! A bite!", false); 
    ui.status.style.color = "#ffb703"; 
    ui.status.style.textShadow = "0 2px 4px rgba(0,0,0,0.4)";
    
    setTimeout(reelInFish, 600);
}

function reelInFish() {
    if (!ui.bobber.classList.contains('bite')) return; 
    sfx.cast(); 
    ui.rod.style.transform = "rotate(-45deg)"; 
    
    setTimeout(() => { 
        resetFishingState(); 
        ui.status.style.color = "#fff"; 
        showCatchPopup(); 
    }, 500);
}

function resetFishingState() {
    ui.rod.style.transform = "rotate(60deg)"; 
    ui.bobber.classList.remove('active', 'bite'); 
    isFishing = false;
    
    clearInterval(rippleInterval); 
    cancelAnimationFrame(lineAnimFrame); 
    ui.linePath.style.display = 'none';
}

function showCatchPopup() {
    const fish = rollForFish();
    sfx.catch();
    
    const fishClass = `visual-${fish.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    ui.popupIcon.innerHTML = `<span class="fish-icon">${fish.icon}</span>`; 
    ui.popupName.innerText = fish.name; 
    ui.popupRarity.innerText = fish.rarity;
    ui.popup.className = `catch-popup popup-${fish.rarity} ${fishClass}`; 
    ui.popup.classList.add('show'); 
    ui.status.style.opacity = '0';
    
    setTimeout(() => {
        ui.popup.classList.remove('show'); 
        inventory.push(fish); 
        addFishToUI(fish);
        savePlayerData(); // Cloud database update
    }, 2100);
}

function rollForFish() {
    const rodLuck = rodsData[currentRodId].luck;
    let wCommon = 100; 
    let wRare = 15 * rodLuck; 
    let wLegendary = 3 * rodLuck;
    
    let roll = Math.random() * (wCommon + wRare + wLegendary);
    let rarityCategory = roll < wLegendary ? "legendary" : roll < wLegendary + wRare ? "rare" : "common";
    
    const possibleFish = fishTypes.filter(f => f.rarity === rarityCategory);
    return possibleFish[Math.floor(Math.random() * possibleFish.length)];
}

function addFishToUI(fish) {
    const fishClass = `visual-${fish.name.toLowerCase().replace(/\s+/g, '-')}`;
    const card = document.createElement('div'); 
    
    card.className = `fish-card fish-${fish.rarity} ${fishClass}`;
    card.innerHTML = `<span class="fish-icon">${fish.icon}</span><span class="fish-value">🪙 ${formatMoney(fish.value)}</span>`;
    
    ui.inventory.prepend(card);
}

ui.sellBtn.addEventListener('click', () => {
    if (inventory.length === 0) { 
        sfx.error();
        showMessage("No fish to sell yet!", true); 
        return; 
    }
    sfx.sell();
    let totalValue = inventory.reduce((sum, fish) => sum + fish.value, 0); 
    coins += totalValue;
    
    ui.coins.innerText = formatMoney(coins); 
    ui.coins.style.color = "#ffd700";
    
    setTimeout(() => {
        ui.coins.style.color = "var(--text-main)";
    }, 300);
    
    inventory = []; 
    ui.inventory.innerHTML = ''; 
    
    showMessage(`Sold catch for 🪙${formatMoney(totalValue)}!`, true);
    if (ui.shopModal.classList.contains('show')) {
        renderShop(); 
    }
    savePlayerData(); // Cloud database update
});

// --- CORE GAME LOADING SCREEN LOGIC ---
const loadingBar = document.getElementById('loadingBar');
const loadingScreen = document.getElementById('loadingScreen');
let hasStarted = false;

function startGame() {
    if (hasStarted) return; 
    hasStarted = true;
    
    userInteractiveTrigger();
    sfx.init(); 
    
    loadingScreen.style.opacity = '0';
    setTimeout(() => { 
        loadingScreen.style.display = 'none'; 
        if (!hasCastedOnce) {
            showMessage("Tap the pond to cast your line!", false); 
        }
    }, 400);
}

// Start progress animation instantly as script executes [1]
setTimeout(() => { 
    if (loadingBar) loadingBar.style.width = '100%'; 
}, 100);

// Auto-start once timeline completes
setTimeout(() => { 
    startGame(); 
}, 2800);

// Touch listeners to skip loading screen safely on mobile devices
if (loadingScreen) {
    loadingScreen.addEventListener('click', startGame);
    loadingScreen.addEventListener('touchstart', startGame);
}

// --- COZY LOFI AUDIO INTERACTION BINDING ---
document.getElementById('musicBtn').addEventListener('click', () => { 
    userInteractiveTrigger();
    LofiEngine.toggle(); 
});
