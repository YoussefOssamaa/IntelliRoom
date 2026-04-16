import React, { createContext, useState, useContext, useEffect } from "react";

const ShopContext = createContext();

const AUTH_API_URL = "http://localhost:5000/api/shopper/me";
const CART_API_URL = "http://localhost:5000/api/cart";
const WISHLIST_API_URL = "http://localhost:5000/api/wishlist";

export const ShopProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(AUTH_API_URL, {
          method: "GET",
          credentials: "include", 
        });

        if (response.status === 401) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          // console.log("DATABASE SENT THIS:", data);
          // console.log("BACKEND AUTH RESPONSE:", data);
          if (data.success && data.user) {
            setUser(data.user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch cart from database:", error);
      }
    };

    fetchUser();
  }, []); // run once

  // Fetch cart
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await fetch(CART_API_URL, {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401) return;

        if (response.ok) {
          const data = await response.json();
          console.log("REFRESH CART DATA:", data);

          if (data && data.cart && data.cart.items) {
            const formattedCart = data.cart.items.map((item) => ({
              ...item.product,
              cartQuantity: item.quantity,
            }));
            setCart(formattedCart);
          }
        }
      } catch (error) {
        console.error("Failed to fetch cart from database:", error);
      }
    };

    fetchCart();
  }, []);

  // Fetch wishlist
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const response = await fetch(WISHLIST_API_URL, {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401) return; // Guest users just get ignored

        if (response.ok) {
          const data = await response.json();

          if (data && data.success && data.wishlist) {
            setFavorites(data.wishlist);
          }
        }
      } catch (error) {
        console.error("Failed to fetch wishlist from database:", error);
      }
    };

    fetchWishlist();
  }, []);

  // Add or remove from Cart
  const toggleCart = async (product) => {
    const isInCart = cart.some((item) => item._id === product._id);

    if (isInCart) {
      // If already in cart, remove it
      removeFromCart(product._id);
    } else {
      // Optimistic UI update
      setCart([...cart, { ...product, cartQuantity: 1 }]);

      try {
        const response = await fetch(CART_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId: product._id, quantity: 1 }),
        });

        if (!response.ok) {
          console.error("Backend rejected adding to cart");
        }
      } catch (error) {
        console.error("Failed to add item to database:", error);
      }
    }
  };

  // Update Quantity
  const updateCartQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) return;

    // Optimistic UI update
    setCart(
      cart.map((item) =>
        item._id === id ? { ...item, cartQuantity: newQuantity } : item,
      ),
    );

    try {
      await fetch(CART_API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: id, quantity: newQuantity }),
      });
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  // Remove from Cart
  const removeFromCart = async (id) => {
    // Optimistic UI update
    setCart(cart.filter((item) => item._id !== id));

    try {
      await fetch(`${CART_API_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  // Add or remove from Wishlist
  const toggleFavorite = async (product) => {
    const isFavorite = favorites.some((item) => item._id === product._id);

    // 1. Optimistic UI update 
    if (isFavorite) {
      setFavorites(favorites.filter((item) => item._id !== product._id));
    } else {
      setFavorites([...favorites, product]);
    }

    // 2. Background Database Sync
    try {
      const response = await fetch(`${WISHLIST_API_URL}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: product._id }),
      });

      if (!response.ok) {
        console.error("Backend rejected updating the wishlist");
        // remember to revert the UI update !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      }
    } catch (error) {
      console.error("Failed to update wishlist in database:", error);
    }
  };

  return (
    <ShopContext.Provider
      value={{
        user,
        favorites,
        cart,
        toggleFavorite,
        toggleCart,
        updateCartQuantity,
        removeFromCart,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
