import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface WishlistItem {
    id: string
}

export interface WishlistState {
    ids: Array<WishlistItem>
}

export const wishlistSlice = createSlice({
    name: "wishlist",
    initialState: {
        ids: []
    } satisfies WishlistState as WishlistState,
    reducers: {
        addItem: (state, action: PayloadAction<WishlistItem>) => {
            state.ids = [...state.ids, action.payload]
        },
        removeItem: (state, action: PayloadAction<WishlistItem>) => {
            state.ids = [...state.ids].filter(item => item.id !== action.payload.id);
        },
        clearAll: (state) => {
            state.ids = [];
        },
    },
});
// Action creators are generated for each case reducer function
export const { addItem, removeItem, clearAll } = wishlistSlice.actions

export default wishlistSlice.reducer
