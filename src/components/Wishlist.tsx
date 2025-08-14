import {
  FC, // @ts-types="react"
  useEffect,
  useState,
} from "react";
import { AlbumArtistResultList } from "./AlbumArtistResultList.tsx";
import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { type Release } from "../models/Release.ts";

export const Wishlist: FC<
  { wishList: Array<string>; setWishList: (wishList: Array<string>) => void; releases: Array<Release> }
> = ({ wishList, setWishList,releases }) => {
  const [results, setResults] = useState([] as Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>);
    const [musicBrainzClient] = useState(new MusicBrainzClient());
    useEffect(() => {
        async function fetch () {
            const metaPromises = wishList.map(id => musicBrainzClient.getMusicBrainzHit(id));
            const res = await Promise.all<MusicbrainzMeta>(metaPromises);
            setResults(res.filter(x => !!x).map((meta) => {return {musicBrainz: meta, available: releases.filter(r => r.musicbrainz?.releaseGroupId === meta.releaseGroupId)}}))
        }
       
        fetch();

    }, [wishList, musicBrainzClient])

  return (
    <div>
      <h2>Wishlist</h2>
      <AlbumArtistResultList wishList={wishList} setWishList={setWishList} results={results}>
      </AlbumArtistResultList>
    </div>
  );
};
