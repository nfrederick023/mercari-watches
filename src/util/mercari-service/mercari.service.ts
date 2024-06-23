import axios from "axios";
import { MercariSearchRequest, MercariSearchResponse, SimpleMercariItem } from "./mercari.interfaces";


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

const generateSearchRequest = async (page: number, keyword: string, token: string): Promise<MercariSearchResponse | undefined> => {
  const mercariSearchURL = "https://api.mercari.jp/v2/entities:search";
  const searchRequest = createMercariSearchRequest(page, keyword);
  const headers = generateSearchHeaders(token);


  return (await axios.post<MercariSearchResponse>(mercariSearchURL, searchRequest, { headers })).data;

}

const getLatestListings = async (keyword: string, token: string): Promise<SimpleMercariItem[]> => {
  const pagesToQuery = 5;
  let itemsList: SimpleMercariItem[] = [];
  const promises: Promise<MercariSearchResponse | undefined>[] = [];

  try {
    for (let i = 0; i < pagesToQuery; i++) {
      promises.push(generateSearchRequest(i, keyword, token));
    }

    const searchResults = await Promise.all(promises);
    searchResults.forEach(result => itemsList.push(...result.items));


    itemsList = itemsList.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.id === value.id
      ))
    )

    console.log(itemsList[0].id)

    return itemsList;
  }
  catch (e) {
    console.log("Search Failed: " + e);
    return []
  }
};

export default getLatestListings;