import React from 'react';
import {
  ShoppingBag,
  CupSoda,
  GlassWater,
  Coffee,
  Milk,
  Beer,
  Wine,
  Cookie,
  Popcorn,
  Candy,
  Sandwich,
  Pizza,
  Croissant,
  Apple,
  IceCreamCone,
  Cigarette,
  Sparkles,
  Bath,
  Pill,
  Heart,
  Shirt,
  BatteryCharging,
  Gift
} from 'lucide-react';

// Iconos que se pueden asignar a un producto (la clave se guarda en products.icon)
export const PRODUCT_ICONS = [
  { key: 'bag', label: 'General', Icon: ShoppingBag, color: 'text-emerald-600' },
  { key: 'soda', label: 'Gaseosa', Icon: CupSoda, color: 'text-blue-600' },
  { key: 'water', label: 'Agua', Icon: GlassWater, color: 'text-sky-600' },
  { key: 'coffee', label: 'Café', Icon: Coffee, color: 'text-amber-800' },
  { key: 'milk', label: 'Lácteo', Icon: Milk, color: 'text-slate-600' },
  { key: 'beer', label: 'Cerveza', Icon: Beer, color: 'text-amber-600' },
  { key: 'wine', label: 'Licor', Icon: Wine, color: 'text-rose-700' },
  { key: 'cookie', label: 'Galletas', Icon: Cookie, color: 'text-orange-600' },
  { key: 'popcorn', label: 'Snack', Icon: Popcorn, color: 'text-yellow-600' },
  { key: 'candy', label: 'Dulces', Icon: Candy, color: 'text-pink-600' },
  { key: 'sandwich', label: 'Sándwich', Icon: Sandwich, color: 'text-orange-700' },
  { key: 'pizza', label: 'Comida', Icon: Pizza, color: 'text-red-600' },
  { key: 'croissant', label: 'Panadería', Icon: Croissant, color: 'text-amber-700' },
  { key: 'fruit', label: 'Fruta', Icon: Apple, color: 'text-green-600' },
  { key: 'icecream', label: 'Helado', Icon: IceCreamCone, color: 'text-fuchsia-600' },
  { key: 'cigarette', label: 'Cigarros', Icon: Cigarette, color: 'text-stone-600' },
  { key: 'hygiene', label: 'Aseo', Icon: Sparkles, color: 'text-cyan-600' },
  { key: 'bath', label: 'Baño', Icon: Bath, color: 'text-teal-600' },
  { key: 'medicine', label: 'Botiquín', Icon: Pill, color: 'text-red-500' },
  { key: 'intimate', label: 'Íntimo', Icon: Heart, color: 'text-rose-600' },
  { key: 'clothing', label: 'Ropa', Icon: Shirt, color: 'text-indigo-600' },
  { key: 'charger', label: 'Cargador', Icon: BatteryCharging, color: 'text-lime-600' },
  { key: 'gift', label: 'Regalo', Icon: Gift, color: 'text-purple-600' }
];

const BY_KEY = Object.fromEntries(PRODUCT_ICONS.map((i) => [i.key, i]));

// Sin icono asignado: se deduce del nombre del producto
function guessIconKey(name = '') {
  const lower = name.toLowerCase();
  const has = (...words) => words.some((w) => lower.includes(w));
  if (has('agua')) return 'water';
  if (has('gaseosa', 'inca', 'coca', 'jugo', 'red bull', 'energizante')) return 'soda';
  if (has('cerveza')) return 'beer';
  if (has('vino', 'whisky', 'ron', 'pisco')) return 'wine';
  if (has('preservativo')) return 'intimate';
  if (has('shampoo', 'jabon', 'jabón', 'toalla', 'cepillo')) return 'hygiene';
  return 'bag';
}

export function getProductIconDef(product) {
  return BY_KEY[product?.icon] || BY_KEY[guessIconKey(product?.name)];
}

/** Icono del producto: el asignado o, si no tiene, uno según su nombre */
export function ProductIcon({ product, className = 'w-5 h-5' }) {
  const { Icon, color } = getProductIconDef(product);
  return <Icon className={`${className} ${color}`} />;
}
