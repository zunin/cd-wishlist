import { Fragment, type FC } from "hono/jsx";

export const Wishlist: FC = (props) => {
    return (<div>
        <h2>Wishlist</h2>
        <div 
        id="wishlist"
        hx-trigger="load"
        hx-get="/api/releaseGroupByIds"
        hx-vals="js:{id: JSON.parse(localStorage.getItem('wishlist'))}"
        
    >
    </div></div>)
}


