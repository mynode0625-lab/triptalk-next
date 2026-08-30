export type ProviderKey = "shinhan";

export type Session = {
  provider: ProviderKey;
  name: string;
  email: string;
  avatar: string;
  /** ISO 8601 */
  loginAt: string;
  demo: boolean;
};

/** Route Handler 가 돌려주는 정규화된 프로필 */
export type NormalizedProfile = {
  provider: ProviderKey;
  id: string;
  name: string;
  email: string;
};
