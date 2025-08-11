import { useState } from 'react'
import './App.css'
import { AlbumArtistSearch } from "./components/AlbumArtistSearch.tsx";
import { Wishlist } from "./components/Wishlist.tsx";

function App() {
  const [wishList, setWishList] = useState(JSON.parse(localStorage.getItem('wishlist')  ?? "[]") as Array<string>);


  return (
    <>
    <h1>Get notified when used CD markets have your cd</h1>
    <legend>Items to subscribe to</legend>
    <AlbumArtistSearch></AlbumArtistSearch>
    <Wishlist wishList={wishList} setWishList={setWishList}></Wishlist>
    </>
  )
}

export default App
