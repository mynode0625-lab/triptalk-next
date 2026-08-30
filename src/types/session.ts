export type ProviderKey = "shinhan";

export type Session = {
  provider: ProviderKey;
  /**
   * 제공자가 부여한 고유 id. 이름·이메일과 달리 바뀌지 않으므로 "이 후기를 누가
   * 썼는가" 의 열쇠로 쓴다. 이메일을 열쇠로 삼으면 이용자가 이메일을 바꿀 때
   * 같은 사람이 남이 된다.
   */
  sub: string;
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
