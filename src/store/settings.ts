import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface Credentials {
    username?: string;
    password?: string;
}

export type SettingsState = Credentials;

export const settingsSlice = createSlice({
    name: "wishlist",
    initialState: {
        
    } satisfies SettingsState as SettingsState,
    reducers: {
        setCredentials: (state, action: PayloadAction<Credentials>) => {
            state.password = action.payload.password;
            state.username = action.payload.username;
        }
    },
});
// Action creators are generated for each case reducer function
export const { setCredentials } = settingsSlice.actions

export default settingsSlice.reducer
