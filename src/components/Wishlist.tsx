import {
  FC, // @ts-types="react"
  useEffect,
  useState,
} from "react";
import { AlbumArtistResultList } from "./AlbumArtistResultList.tsx";
import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { type Release } from "../models/Release.ts";
import { useAppSelector } from "../reduxhooks.ts";

export const Wishlist: FC<
  {
    releases: Array<Release>;
  }
> = ({ releases }) => {
  const wishlist = useAppSelector((state) => state.wishlist.ids);

  const [results, setResults] = useState(
    [] as Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>,
  );
  const [musicBrainzClient] = useState(new MusicBrainzClient());
  useEffect(() => {
    async function fetch() {
      const metaPromises = wishlist.map((item) =>
        musicBrainzClient.getMusicBrainzHit(item.id)
      );
      const res = await Promise.all<MusicbrainzMeta>(metaPromises);
      setResults(
        res.filter((x) => !!x).map((meta) => {
          return {
            musicBrainz: meta,
            available: releases.filter((r) =>
              r.musicbrainz?.releaseGroupId === meta.releaseGroupId
            ),
          };
        }),
      );
    }

    fetch();
  }, [wishlist, musicBrainzClient, releases]);

  return (
    <div>
      <h2>Wishlist</h2>
      <AlbumArtistResultList
        results={results}
      >
      </AlbumArtistResultList>
    </div>
  );
};
