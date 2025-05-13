import { Fragment, InputEvent, useState, type FC } from 'hono/jsx'
import { render } from 'hono/jsx/dom'

const Layout: FC = (props) => {
    return (
        <html>
        <head>
            <title>CD wishlist</title>
            <link rel="stylesheet" href="https://unpkg.com/marx-css/css/marx.min.css"/>    
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        </head>
        <body style={{margin: "1em"}}>{props.children}</body>
      </html>
    )
}

const AlbumArtistSearch: FC = (props) => {
    const [artistQuery, setArtistQuery] = useState("album");
    const handleArtistQueryChange = (event: InputEvent) => {
        const value = event.target.value;
        setArtistQuery(value);
      };

      
    const [albumQuery, setAlbumQuery] = useState("");
    const handleAlbumQueryChange = (event: InputEvent) => {
        const value = event.target.value;
        setAlbumQuery(value);
      };


    return (<Fragment>
        <label for="artist">Artist:</label>
        <input type="text" name="artist" onChange={handleArtistQueryChange} value={artistQuery}/>
        <label for="albumtitle">Album:</label>
        <input type="text" name="albumtitle" onChange={handleAlbumQueryChange} value={albumQuery}/>
        <AlbumArtistResultList albumQuery={albumQuery} artistQuery={artistQuery} ></AlbumArtistResultList>
        </Fragment>);
}

const AlbumArtistResultList: FC<{artistQuery: string, albumQuery: string}> = ({albumQuery, artistQuery}) => {
    return (<Fragment><p>artist: '{artistQuery}'<p>
        </p> album: '{albumQuery}'</p></Fragment>)
}

const App: FC = (props) => {
    return (
        <Layout>
        <h1>Get notified when used CD markets have your cd</h1>
        <input type="hidden" name="subscriptionId"/>
        <form id="form">
            <fieldset>  
                <legend>Items to subscribe to</legend>
                <AlbumArtistSearch></AlbumArtistSearch>
            </fieldset>
            <br/>
                <button type="button" id="addrow">Add item</button>
            <br/><br/>
            <input type="submit" value="Submit"/>
        </form>
        
    </Layout>
    )
}

  export default <App/>;