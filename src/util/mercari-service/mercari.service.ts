import axios from "axios";
import { MercariSearchRequest, MercariSearchResponse, SimpleMercariItem } from "./mercari.interfaces";
import { GlobalService } from "src/global.service";

const createMercariSearchRequest = (page: number, keyword: string): MercariSearchRequest => {
  //hardcoded parameters
  const pageSize = 250;
  const pageToken = "";
  const searchSessionId = "54cd7926b7ab66b67bf34086d6707671";
  const sort = "SORT_CREATED_TIME";
  const order = "ORDER_DESC";
  const defaultDatasets = [
    "DATASET_TYPE_MERCARI",
    "DATASET_TYPE_BEYOND"
  ]

  return {
    pageSize,
    pageToken,
    searchSessionId,
    defaultDatasets,
    searchCondition: {
      keyword,
      sort,
      order
    }
  }
}

const generateSearchHeaders = (dpop: string) => {
  const platform = "web";

  return {
    dpop,
    "x-platform": platform
  }
}

const generateSearchRequest = async (page: number, keyword: string): Promise<MercariSearchResponse | undefined> => {
  const mercariSearchURL = "https://api.mercari.jp/v2/entities:search";
  const token = await generateMercariDpop(mercariSearchURL, "POST");
  const searchRequest = createMercariSearchRequest(page, keyword);
  const headers = generateSearchHeaders(token);

  return (await axios.post<MercariSearchResponse>(mercariSearchURL, searchRequest, { headers })).data;
}

const getLatestListings = async (keyword: string): Promise<SimpleMercariItem[]> => {
  let itemsList: SimpleMercariItem[] = [];
  const promises: (MercariSearchResponse | undefined)[] = [];

  try {
    for (let i = 0; i < (GlobalService.config?.requestPages as number); i++) {
      promises.push(await generateSearchRequest(i, keyword));

      await new Promise<void>((res) => {
        setTimeout(() => {
          res();
        }, GlobalService.config?.requestDelayMS ?? 1000);
      });
    }

    const searchResults = await Promise.all(promises);
    searchResults.forEach(result => { if (result) itemsList.push(...result.items) });

    itemsList = itemsList.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.id === value.id
      ))
    )

    if (itemsList.length) {
      console.log("Latest Item ID: " + itemsList[0].id + " - Search Term: " + keyword)
    } else {
      console.log("No Items Found - Search Term: " + keyword)
    }
    return itemsList;
  }
  catch (e) {
    console.log("Search Failed: " + e);
    return []
  }
};

const generateMercariDpop = async (url: string, method: string) => {
  const jose = ( await import('jose') ).default;
  const uuid = ( await import('uuid') ).default;

  const { publicKey, privateKey } = await jose.generateKeyPair("ES256");
  const jwk = await jose.exportJWK(publicKey);

  const jwt = await new jose.SignJWT({
    htu: url,
    htm: method.toUpperCase(),
    iat: Math.floor(Date.now() / 1000),
    jti: uuid.v4(),
  })
    .setProtectedHeader({
      alg: "ES256",
      typ: "dpop+jwt",
      jwk,
    })
    .sign(privateKey);

  return jwt;
}

export default getLatestListings;