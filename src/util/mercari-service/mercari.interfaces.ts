export interface MercariSearchRequest {
  searchSessionId: string;
  searchCondition: MercariSearchCondition;
  pageSize?: number;
  pageToken?: string;
  indexRouting?: string;
  defaultDatasets?: string[];
  serviceFrom?: string;
  thumbnailTypes?: string[];
  useDynamicAttribute?: boolean;
  userId?: string;
  withItemBrand?: boolean;
  withItemPromotions?: boolean;
  withItemSize?: boolean;
  withItemSizes?: boolean;
  withOfferPricePromotion?: boolean;
  withShopname?: boolean;
  withSuggestedItems?: boolean;
}

interface MercariSearchCondition {
  keyword: string;
  attributes?: string[];
  brandId?: string[];
  categoryId?: string[];
  colorId?: string[];
  excludeKeyword?: string;
  hasCoupon?: boolean;
  itemConditionId?: string[];
  itemTypes?: string[];
  order?: string;
  priceMax?: number;
  priceMin?: number;
  sellerId?: string[];
  shippingFromArea?: string[];
  shippingMethod?: string[];
  shippingPayerId?: string[];
  shopIds?: string[];
  sizeId?: string[];
  skuIds?: string[];
  sort?: string;
  status?: string[];
}

export interface MercariSearchResponse {
  items: MercariSearchItem[];
  meta: MercariSearchMeta;
  components: string[];
  searchCondition: MercariSearchCondition | null;
}

interface MercariSearchMeta {
  nextPageToken: string;
  previousPageToken: string;
  numFound: string;
}

interface MercariSearchItem {
  id: string;
  sellerId: string;
  buyerId: string;
  status: "ITEM_STATUS_ON_SALE" | "ITEM_STATUS_SOLD_OUT",
  name: string;
  price: string;
  created: string;
  updated: string;
  thumbnails: string[];
  itemType: string;
  itemConditionId: string;
  shippingPayerId: string;
  itemSizes: string[];
  itemBrand: string | null;
  itemPromotions: string[];
  shopName: string;
  itemSize: string | null;
  shippingMethodId: string;
  categoryId: string;
  isNoPrice: boolean;
}

export interface SimpleMercariItem {
  id: string;
  name: string;
}