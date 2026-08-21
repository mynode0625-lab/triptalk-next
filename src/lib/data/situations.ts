import type { Situation, SituationKey } from "@/types/landing";

export const SITUATION_TABS: { key: SituationKey; label: string }[] = [
  { key: "basics", label: "🗣 기본 표현" },
  { key: "airport", label: "✈ 공항 · 기내" },
  { key: "hotel", label: "🏨 숙소" },
  { key: "food", label: "🍽 식당 · 카페" },
  { key: "city", label: "🚕 이동 · 관광" },
  { key: "trouble", label: "🚨 돌발 상황" }
];

/** 레벨 라벨 — 원본의 ["", "입문", "중급", "심화"] 배열과 동일합니다. */
export const LEVEL_LABEL = ["", "입문", "중급", "심화"] as const;

export const SITUATIONS: Record<SituationKey, Situation[]> = {
  /* 여행영어 책들이 예외 없이 1장에 두는 내용. 상황별 표현을 아무리 외워도
     상대의 말이 안 들리면 대화가 거기서 끊긴다. */
  basics: [
    { emoji: "🔁", lv: 1, title: "못 알아들었을 때", desc: "천천히 다시 말해달라고 부탁하고, 들은 것을 확인하기.",
      en: "Sorry, could you say that again more slowly?", ko: "죄송한데, 조금 천천히 다시 말씀해 주시겠어요?", scene: "askagain" },
    { emoji: "🔢", lv: 1, title: "숫자와 가격", desc: "객실 번호, 시간, 금액을 흘려듣지 않고 되짚기.",
      en: "One hundred fifty, not fifteen?", ko: "150달러요, 15달러가 아니고요?", scene: "numbers" },
    { emoji: "👋", lv: 1, title: "인사와 스몰토크", desc: "처음 만난 사람과 짧게 주고받기. 첫 마디가 제일 어렵습니다.",
      en: "I'm from Korea. How about you?", ko: "한국에서 왔어요. 그쪽은요?", scene: "greeting" },
    { emoji: "🙋", lv: 1, title: "도와달라고 하기", desc: "먼저 말을 걸고, 무엇이 문제인지 설명하기.",
      en: "Yes, could you help me, please?", ko: "네, 도와주시겠어요?", scene: "askhelp" }
  ],

  airport: [
    { emoji: "🛄", lv: 1, title: "체크인 카운터", desc: "좌석 요청, 수하물 무게 초과, 경유편 확인까지.",
      en: "Could I get an aisle seat, please?", ko: "통로 쪽 좌석으로 부탁드려도 될까요?", scene: "checkin" },
    { emoji: "🛂", lv: 3, title: "입국 심사", desc: "방문 목적과 체류 기간을 흔들림 없이 답하기.",
      en: "I'm here for sightseeing, for about ten days.", ko: "관광 목적으로 열흘 정도 머뭅니다.", scene: "immigration" },
    { emoji: "🧳", lv: 2, title: "수하물 분실 신고", desc: "가방이 나오지 않았을 때의 신고와 배송 요청.",
      en: "My luggage didn't come out on the carousel.", ko: "제 짐이 컨베이어에 나오지 않았어요." },
    { emoji: "🍱", lv: 1, title: "기내 서비스 요청", desc: "식사 선택, 담요 요청, 자리 바꾸기.",
      en: "Could I have a blanket, please?", ko: "담요 하나 주시겠어요?" },
    { emoji: "🔁", lv: 2, title: "환승 안내 문의", desc: "탑승구 위치와 남은 시간 확인하기.",
      en: "Which gate is the connecting flight to Rome?", ko: "로마행 연결편은 몇 번 게이트인가요?" },
    { emoji: "💱", lv: 1, title: "환전과 면세점", desc: "환율 확인, 세금 환급 창구 찾기.",
      en: "Where can I get my tax refund processed?", ko: "세금 환급은 어디서 받을 수 있나요?", scene: "exchange" },
    { emoji: "🧾", lv: 3, title: "택스 리펀드", desc: "환급 서류 확인부터 현금·카드 선택까지.",
      en: "Here are my receipts and forms.", ko: "영수증과 서류 여기 있습니다.", scene: "taxrefund" }
  ],
  hotel: [
    { emoji: "🔑", lv: 1, title: "체크인 · 체크아웃", desc: "예약 확인과 얼리 체크인 요청.",
      en: "I have a reservation under the name Kim.", ko: "김으로 예약되어 있습니다." },
    { emoji: "🛏", lv: 2, title: "객실 변경 요청", desc: "소음, 뷰, 층수 문제로 방 바꾸기.",
      en: "Would it be possible to move to a quieter room?", ko: "좀 더 조용한 방으로 옮길 수 있을까요?" },
    { emoji: "🚿", lv: 2, title: "시설 문제 신고", desc: "온수, 에어컨, 와이파이가 안 될 때.",
      en: "The hot water isn't working in my room.", ko: "방에 온수가 나오지 않습니다.", scene: "hotel" },
    { emoji: "🧺", lv: 1, title: "부대시설 이용", desc: "조식 시간, 수영장, 세탁 서비스 문의.",
      en: "What time does breakfast start?", ko: "조식은 몇 시부터인가요?" },
    { emoji: "📦", lv: 1, title: "짐 보관 요청", desc: "체크아웃 후 짐 맡기고 나가기.",
      en: "Can I leave my bags here until 5 p.m.?", ko: "오후 5시까지 짐을 맡겨도 될까요?" },
    { emoji: "🧾", lv: 3, title: "요금 이의 제기", desc: "청구서에 모르는 항목이 있을 때.",
      en: "There seems to be a charge I don't recognise.", ko: "제가 모르는 요금이 청구된 것 같습니다." }
  ],
  food: [
    { emoji: "🪑", lv: 1, title: "자리 잡기 · 예약", desc: "인원 수 말하기, 대기 시간 묻기.",
      en: "A table for two, please. How long is the wait?", ko: "두 명이요. 얼마나 기다려야 하나요?" },
    { emoji: "📋", lv: 2, title: "메뉴 주문과 추천", desc: "추천 요청, 재료 확인, 굽기 정도 말하기.",
      en: "What would you recommend for someone who likes seafood?", ko: "해산물 좋아하는 사람에게 뭘 추천하시나요?", scene: "restaurant" },
    { emoji: "🥜", lv: 3, title: "알레르기 · 식단 제한", desc: "먹으면 안 되는 재료를 정확히 전달하기.",
      en: "I'm allergic to peanuts — does this contain any?", ko: "땅콩 알레르기가 있는데, 여기 들어 있나요?" },
    { emoji: "☕", lv: 1, title: "카페 주문", desc: "사이즈, 옵션, 테이크아웃 말하기.",
      en: "A large iced latte to go, please.", ko: "아이스 라떼 라지 사이즈로 테이크아웃할게요." },
    { emoji: "💳", lv: 1, title: "계산과 팁", desc: "나눠 내기, 카드 결제, 팁 문화 대응.",
      en: "Could we split the bill, please?", ko: "계산을 나눠서 할 수 있을까요?" },
    { emoji: "😐", lv: 2, title: "음식 문제 말하기", desc: "잘못 나온 음식, 덜 익은 음식 이야기하기.",
      en: "I think this isn't what I ordered.", ko: "제가 주문한 게 아닌 것 같아요." }
  ],
  city: [
    { emoji: "🚖", lv: 2, title: "택시 · 차량 호출", desc: "목적지 설명, 경로와 요금 확인.",
      en: "Could you take me to this address, please?", ko: "이 주소로 가주시겠어요?", scene: "taxi" },
    { emoji: "🚇", lv: 1, title: "대중교통 이용", desc: "표 사기, 환승 묻기, 노선 확인.",
      en: "Which line should I take to get to the museum?", ko: "박물관까지 가려면 몇 호선을 타야 하나요?" },
    { emoji: "🗺", lv: 1, title: "길 묻기", desc: "방향 듣고 이해하기, 다시 물어보기.",
      en: "Sorry, could you say that again more slowly?", ko: "죄송한데, 조금 더 천천히 다시 말씀해 주시겠어요?" },
    { emoji: "🎟", lv: 2, title: "티켓 구매 · 투어", desc: "입장권, 오디오 가이드, 할인 문의.",
      en: "Do you offer a student discount?", ko: "학생 할인이 있나요?" },
    { emoji: "🛍", lv: 2, title: "쇼핑과 흥정", desc: "사이즈 교환, 환불, 가격 협상.",
      en: "Do you have this in a smaller size?", ko: "이거 더 작은 사이즈 있나요?" },
    { emoji: "📸", lv: 1, title: "사진 부탁하기", desc: "지나가는 사람에게 정중히 부탁하기.",
      en: "Would you mind taking a photo of us?", ko: "저희 사진 한 장 찍어주실 수 있을까요?" }
  ],
  trouble: [
    { emoji: "🚑", lv: 3, title: "병원 · 약국", desc: "증상 설명, 처방약 요청, 보험 서류.",
      en: "I've had a fever since last night.", ko: "어젯밤부터 열이 납니다." },
    { emoji: "👮", lv: 3, title: "도난 · 분실 신고", desc: "경찰서에서 상황 설명하고 확인서 받기.",
      en: "My wallet was stolen on the subway.", ko: "지하철에서 지갑을 도난당했습니다.", scene: "lostcard" },
    { emoji: "✈️", lv: 3, title: "항공편 결항 대응", desc: "재예약, 숙박 보상 요구하기.",
      en: "Can you rebook me on the next available flight?", ko: "다음 가능한 항공편으로 재예약해 주시겠어요?" },
    { emoji: "💸", lv: 2, title: "결제 오류 · 이중 청구", desc: "카드가 안 될 때, 두 번 결제됐을 때.",
      en: "I think I was charged twice for this.", ko: "이거 두 번 결제된 것 같습니다.", scene: "carddecline" },
    { emoji: "🏧", lv: 2, title: "해외 ATM 인출 실패", desc: "돈은 안 나왔는데 출금 문자만 왔을 때.",
      en: "The ATM didn't give me my cash.", ko: "ATM에서 현금이 안 나왔어요.", scene: "atm" },
    { emoji: "📶", lv: 1, title: "유심 · 통신 문제", desc: "유심 구매와 데이터 안 될 때 문의.",
      en: "My data doesn't seem to be working.", ko: "데이터가 안 되는 것 같아요." },
    { emoji: "🆘", lv: 3, title: "긴급 도움 요청", desc: "낯선 상황에서 도움을 구하는 표현.",
      en: "Excuse me, I need some help — this is an emergency.", ko: "실례합니다, 도움이 필요해요. 긴급 상황입니다." }
  ]
};
