import { useState } from "react";
import UseSettings from "./useSettings.ts";

function useYWishList() {
  const [settings] = UseSettings();
  const { rootDoc } = settings;
  const _yWishlist = rootDoc.getArray<string>("wishlist");
  return useState(_yWishlist);
}

export function useWistListActions() {
  const [ywishList] = useYWishList();

  const addWishlistItem = (id: string) => ywishList.push([id]);
  const removeWishlistItem = (id: string) => {
    const idIndex = ywishList.toArray().indexOf(id);
    if (idIndex != -1) {
      ywishList.delete(idIndex, 1);
    }
  };
  return { addWishlistItem, removeWishlistItem };
}

export default function UseWishList(): [string[], React.Dispatch<React.SetStateAction<string[]>>] {
  const [ywishList] = useYWishList();
  const [wishList, setWishList] = useState([] as Array<string>);

  ywishList.observe(() => {
    setWishList(ywishList.toJSON());
  });

  return [wishList, setWishList];
}
