import { useState } from 'react';

/**
 * Carrito de productos con control de stock.
 * cart: [{ product, qty }]
 */
export function useCart() {
  const [cart, setCart] = useState([]);

  const cartQuantities = Object.fromEntries(cart.map((c) => [c.product.id, c.qty]));
  const cartTotal = cart.reduce((sum, c) => sum + Number(c.product.sale_price_pen || 0) * c.qty, 0);
  const itemCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((c) => (c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId, qty) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === productId ? { ...c, qty: Math.min(Math.max(0, qty), c.product.stock) } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  // Formato esperado por la API: [{ product_id, quantity }]
  const toApiItems = () => cart.map((c) => ({ product_id: c.product.id, quantity: c.qty }));

  return { cart, cartQuantities, cartTotal, itemCount, addToCart, updateCartQty, clearCart, toApiItems };
}
