import type { Character } from "@/types/landing";

export const CHARACTERS: Character[] = [
  {
    emoji: "👩‍✈️", name: "Emma", role: "공항 체크인 직원",
    desc: "또박또박한 미국식 발음. 처음 시작하기에 가장 편안한 상대입니다.",
    tags: ["미국식", "느린 속도", "입문"],
    line: "Good morning! May I see your passport and booking confirmation, please?",
    ko: "안녕하세요! 여권과 예약 확인서를 보여주시겠어요?",
    scene: "checkin"
  },
  {
    emoji: "👮", name: "Ryan", role: "입국심사관",
    desc: "짧고 빠르게 묻습니다. 예상 못한 추가 질문을 던지기도 합니다.",
    tags: ["빠른 속도", "돌발 질문", "심화"],
    line: "What's the purpose of your visit? And how long are you staying?",
    ko: "방문 목적이 무엇인가요? 그리고 얼마나 머무르시죠?",
    scene: "immigration"
  },
  {
    emoji: "🧑‍🍳", name: "Marco", role: "레스토랑 웨이터",
    desc: "이탈리아 억양이 섞인 영어. 메뉴 추천과 잡담을 즐깁니다.",
    tags: ["유럽 억양", "친근함", "중급"],
    line: "Welcome! Can I start you off with something to drink?",
    ko: "어서 오세요! 먼저 음료부터 주문하시겠어요?",
    scene: "restaurant"
  },
  {
    emoji: "🧕", name: "Aisha", role: "호텔 프런트 매니저",
    desc: "정중한 영국식 표현. 컴플레인과 요청 상황을 연습하기 좋습니다.",
    tags: ["영국식", "격식체", "중급"],
    line: "I do apologise for the inconvenience. Let me see what I can do for you.",
    ko: "불편을 드려 죄송합니다. 어떻게 도와드릴 수 있을지 확인해 볼게요.",
    scene: "hotel"
  },
  {
    emoji: "🚕", name: "Dave", role: "택시 기사",
    desc: "말이 빠르고 줄임말을 많이 씁니다. 실전 리스닝의 최종 보스.",
    tags: ["구어체", "매우 빠름", "고급"],
    line: "Where ya headed? Downtown? That'll be about twenty minutes, traffic permitting.",
    ko: "어디로 가세요? 시내요? 막히지만 않으면 20분쯤 걸릴 거예요.",
    scene: "taxi"
  },
  {
    emoji: "👩‍⚕️", name: "Nurse Kim", role: "응급실 간호사",
    desc: "아프거나 다쳤을 때 증상을 설명하는 연습을 도와줍니다.",
    tags: ["의료 표현", "또박또박", "중급"],
    line: "Can you tell me where it hurts and when the pain started?",
    ko: "어디가 아프고 언제부터 아팠는지 말씀해 주시겠어요?"
  },
  {
    emoji: "🧑‍🎨", name: "Sofia", role: "현지 친구",
    desc: "시험이 아니라 수다. 자유 주제로 편하게 대화합니다.",
    tags: ["프리토킹", "자유 주제", "전 레벨"],
    line: "So, what did you think of the market? Did you try the street food?",
    ko: "그래서 시장은 어땠어? 길거리 음식은 먹어봤어?"
  },
  {
    emoji: "🧑‍💼", name: "Mr. Han", role: "분실물 센터 직원",
    desc: "가방을 잃어버렸을 때. 침착하게 상황을 설명하는 훈련.",
    tags: ["문제 해결", "긴급 상황", "심화"],
    line: "Let's fill out a report. Could you describe the bag in detail?",
    ko: "신고서를 작성하죠. 가방을 자세히 설명해 주시겠어요?"
  }
];
