import { useState } from 'react'
import './App.css'
import { AlbumArtistSearch } from "./components/AlbumArtistSearch.tsx";
import { Wishlist } from "./components/Wishlist.tsx";

function App() {
  //const [count, setCount] = useState(0)


  return (
    <>
    <h1>Get notified when used CD markets have your cd</h1>
    <legend>Items to subscribe to</legend>
    <AlbumArtistSearch></AlbumArtistSearch>
    <Wishlist></Wishlist>
    </>
  )
}

export default App
