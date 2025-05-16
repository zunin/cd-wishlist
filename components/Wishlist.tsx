import { Fragment, type FC } from "hono/jsx";

export const Wishlist: FC = (props) => {
    return (<div 
        hx-trigger="load"
        hx-get="/api/releaseGroupByIds"
        hx-vals="js:{id: JSON.parse(localStorage.getItem('wishlist'))}"
        
    >
        <p>wishlist</p>
    </div>)
}


