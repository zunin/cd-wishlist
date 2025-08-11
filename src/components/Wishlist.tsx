import { FC, // @ts-types="react"
useEffect, useState } from "react";
import { AlbumArtistResultList } from "./AlbumArtistResultList.tsx";
import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { type Release } from "../models/Release.ts";

export const Wishlist: FC<{wishList: Array<string>, setWishList: (wishList: Array<string>) => void}> = ({wishList}) => {
    const [results, setResults] = useState([] as Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>);
    const [musicBrainzClient] = useState(new MusicBrainzClient());
    useEffect(() => {
        async function fetch () {
            const metaPromises = wishList.map(id => musicBrainzClient.getMusicBrainzHit(id));
            const res = await Promise.all<MusicbrainzMeta>(metaPromises);
            setResults(res.map((meta) => {return {musicBrainz: meta, available: []}}))
        }
       
        fetch();

    }, [wishList, musicBrainzClient])
    
    
    return (<div>
        <h2>Wishlist</h2>
        <AlbumArtistResultList wishlist={wishList} results={results}></AlbumArtistResultList>

        </div>)
}


