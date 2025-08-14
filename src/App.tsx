import { // @ts-types="react"
useEffect, useState } from 'react'
import './App.css'
import { AlbumArtistSearch } from "./components/AlbumArtistSearch.tsx";
import { Wishlist } from "./components/Wishlist.tsx";
import { type Release } from "./models/Release.ts";

function App() {
  const [wishList, setWishList] = useState(JSON.parse(localStorage.getItem('wishlist')  ?? "[]") as Array<string>);
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishList));
  }, [wishList])

  const [releases, setReleases] = useState([] as Array<Release>);
  useEffect(() => {
    async function createRequest() {
      const res = await fetch("https://raw.githubusercontent.com/zunin/cd6000.dk-history/refs/heads/main/cds.json")
      setReleases(await res.json() as Array<Release>)
    }
    createRequest();
  }, [])
  

  return (
    <>
    <h1>Get notified when used CD markets have your cd</h1>
    <legend>Items to subscribe to</legend>
    <AlbumArtistSearch releases={releases} wishList={wishList} setWishList={setWishList}></AlbumArtistSearch>
    <Wishlist releases={releases} wishList={wishList} setWishList={setWishList}></Wishlist>
    </>
  )
}

export default App
