import { Release } from "./models/Release.ts";

class ReleaseHistoryRepository {
    constructor() {
        this.cache = [];
    }
    private cache: Array<Release>;
    private async fetch(): Promise<Array<Release>> {
         let cd6000, rytmeboxen;
        
          try {
            cd6000 = await (await fetch(
              "https://raw.githubusercontent.com/zunin/rytmeboxen.dk-history/main/cds.json",
            )).json() as Release[];
          } catch (_) {
            cd6000 = [] as Release[];
          }
          try {
            rytmeboxen = await (await fetch(
              "https://raw.githubusercontent.com/zunin/cd6000.dk-history/main/cds.json",
            )).json() as Release[];
          } catch (_) {
            rytmeboxen = [] as Release[];
          }
          return cd6000.concat(rytmeboxen);
    }

    async get(): Promise<Array<Release>> {
        if (this.cache.length === 0) {
            this.cache = await this.fetch();
        }
        return this.cache;
    }
}

const ReleaseHistoryRepositorySingleton = new ReleaseHistoryRepository();

export default ReleaseHistoryRepositorySingleton;