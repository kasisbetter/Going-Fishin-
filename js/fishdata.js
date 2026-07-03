// Cute SVG starfish icon
const cuteStarfishSvg = `
<svg viewBox="0 0 100 100" class="cute-starfish" style="width: 55px; height: 55px;">
    <path d="M50 15 C54 34 68 36 85 40 C72 50 74 65 79 81 C64 72 51 72 36 81 C41 65 43 50 30 40 C47 36 51 34 50 15 Z" fill="#ff7675" stroke="#e17055" stroke-width="4.5" stroke-linejoin="round" />
    <circle cx="39" cy="51" r="4.5" fill="#ff2a75" opacity="0.4" />
    <circle cx="61" cy="51" r="4.5" fill="#ff2a75" opacity="0.4" />
    <circle cx="42" cy="46" r="4" fill="#2d3436" />
    <circle cx="41" cy="44" r="1.5" fill="#ffffff" />
    <circle cx="58" cy="46" r="4" fill="#2d3436" />
    <circle cx="57" cy="44" r="1.5" fill="#ffffff" />
    <path d="M48 51 Q50 54 52 51" fill="none" stroke="#2d3436" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="50" cy="28" r="2" fill="#ffeaa7" opacity="0.8" />
    <circle cx="70" cy="48" r="1.5" fill="#ffeaa7" opacity="0.8" />
    <circle cx="30" cy="48" r="1.5" fill="#ffeaa7" opacity="0.8" />
</svg>
`;

// Exporting the fish data so other scripts can access it [1]
export const fishTypes = [
  { name: "Minnow", rarity: "common", value: 15, icon: "🐟", req: "Base Odds" },
  { name: "Bluegill", rarity: "common", value: 35, icon: "🐠", req: "Base Odds" },
  { name: "Trout", rarity: "common", value: 60, icon: "🐟", req: "Base Odds" },
  { name: "Pink Koi", rarity: "rare", value: 250, icon: "🐡", req: "Needs Luck" },
  { name: "Puffer", rarity: "rare", value: 400, icon: "🐡", req: "Needs Luck" },
  { name: "Golden Bass", rarity: "legendary", value: 2500, icon: "🐟", req: "High Luck" },
  { name: "Starfish", rarity: "legendary", value: 5000, icon: cuteStarfishSvg, req: "High Luck" }
];
