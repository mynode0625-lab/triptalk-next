import type { DemoScenario } from "@/types/landing";

export type DemoKey = "checkin" | "hotel" | "taxi";

/** 데모 시나리오 — 분기 없는 3턴 구성 (선택지마다 다른 피드백) */
export const DEMO: Record<DemoKey, DemoScenario> = {
  checkin: {
    icon: "👩‍✈️", name: "Emma", role: "공항 체크인 직원", label: "✈ 공항 체크인",
    turns: [
      {
        ai: "Good morning! Where are you flying to today?",
        aiKo: "안녕하세요! 오늘 어디로 가시나요?",
        choices: [
          { t: "I'm flying to Vancouver.", good: true,  fb: "완벽합니다. 목적지를 문장으로 말하면 다음 질문이 매끄럽게 이어집니다." },
          { t: "Vancouver.", good: true,  fb: "통합니다. 다만 'I'm going to Vancouver.'라고 하면 훨씬 자연스럽습니다." },
          { t: "I go Vancouver airplane.", good: false, fb: "의미는 전달되지만 어색합니다. → I'm flying to Vancouver." }
        ]
      },
      {
        ai: "Great. How many bags are you checking in?",
        aiKo: "좋습니다. 부칠 짐은 몇 개인가요?",
        choices: [
          { t: "Just one, and this is my carry-on.", good: true,  fb: "훌륭해요. carry-on(기내 반입 가방)까지 함께 말하면 되묻지 않습니다." },
          { t: "One bag please.", good: true,  fb: "괜찮습니다. 'Just one.'이 더 흔히 쓰이는 답입니다." },
          { t: "Two, but one is very heavy.", good: true,  fb: "좋은 접근입니다. 무게 초과 상황으로 대화가 이어집니다." }
        ]
      },
      {
        ai: "Would you prefer a window or an aisle seat?",
        aiKo: "창가 좌석과 통로 좌석 중 어느 쪽이 좋으세요?",
        choices: [
          { t: "An aisle seat, please. Near the front if possible.", good: true, fb: "최고입니다. 요청에 조건을 덧붙이는 건 원어민이 가장 자주 쓰는 방식이에요." },
          { t: "Window, please.", good: true, fb: "간결하고 정확합니다. 실전에서 이 정도면 충분합니다." },
          { t: "I don't care.", good: false, fb: "무례하게 들릴 수 있습니다. → Either is fine, thank you." }
        ]
      }
    ],
    end: "체크인 상황을 통과했습니다 🎉 실제 앱에서는 여기서 발음 리포트와 표현 카드 5장이 저장됩니다."
  },
  hotel: {
    icon: "🧕", name: "Aisha", role: "호텔 프런트 매니저", label: "🏨 호텔 컴플레인",
    turns: [
      {
        ai: "Good evening. How may I help you?",
        aiKo: "안녕하세요. 무엇을 도와드릴까요?",
        choices: [
          { t: "The air conditioning in my room isn't working.", good: true, fb: "명확합니다. 문제 + 위치를 한 문장에 담았습니다." },
          { t: "My room is very hot. Can you help?", good: true, fb: "좋습니다. 증상부터 말해도 충분히 전달됩니다." },
          { t: "Room bad. Very hot.", good: false, fb: "전달은 되지만 문장이 끊깁니다. → My room is too hot." }
        ]
      },
      {
        ai: "I'm so sorry about that. Would you like us to send maintenance, or would you prefer another room?",
        aiKo: "정말 죄송합니다. 정비 직원을 보내드릴까요, 아니면 다른 방으로 옮겨드릴까요?",
        choices: [
          { t: "I'd prefer another room, if that's possible.", good: true, fb: "정중한 요청의 정석입니다. 'if that's possible'이 부드럽게 만들어 줍니다." },
          { t: "Please send someone now.", good: true, fb: "직접적입니다. 'Could you send someone, please?'가 조금 더 부드럽습니다." },
          { t: "Another room. Now.", good: false, fb: "강하게 들립니다. → Could I move to another room, please?" }
        ]
      },
      {
        ai: "Of course. I can move you to room 812. Would you like help with your luggage?",
        aiKo: "알겠습니다. 812호로 옮겨드릴게요. 짐 옮기는 걸 도와드릴까요?",
        choices: [
          { t: "That would be great, thank you.", good: true, fb: "자연스럽습니다. 감사 표현까지 붙인 게 좋습니다." },
          { t: "No, thank you. I can manage.", good: true, fb: "정중한 거절 표현입니다. 'I can manage.'는 원어민이 자주 씁니다." },
          { t: "No need.", good: false, fb: "무뚝뚝합니다. → No, thanks. I'll be fine." }
        ]
      }
    ],
    end: "컴플레인 상황을 통과했습니다 🎉 불만을 말할 때의 완충 표현 4가지가 카드로 저장됩니다."
  },
  taxi: {
    icon: "🚕", name: "Dave", role: "택시 기사", label: "🚕 택시 타기",
    turns: [
      {
        ai: "Hop in! Where ya headed?",
        aiKo: "타세요! 어디로 가세요?",
        choices: [
          { t: "Could you take me to this address, please?", good: true, fb: "완벽합니다. 주소를 보여주며 말하는 게 가장 안전한 방법입니다." },
          { t: "Central Station, please.", good: true, fb: "간결하고 정확합니다. 목적지 + please면 충분합니다." },
          { t: "Here. Go.", good: false, fb: "명령처럼 들립니다. → This address, please." }
        ]
      },
      {
        ai: "Sure thing. Rush hour's kickin' in — might take a bit longer. That alright?",
        aiKo: "알겠습니다. 퇴근 시간이라 좀 더 걸릴 수도 있는데, 괜찮으세요?",
        choices: [
          { t: "Sorry, could you say that again more slowly?", good: true, fb: "가장 중요한 표현입니다. 못 알아들었을 때 이 문장 하나면 해결됩니다." },
          { t: "That's fine. How long will it take?", good: true, fb: "좋습니다. 예상 소요 시간을 확인해두면 마음이 편합니다." },
          { t: "Yes yes okay.", good: false, fb: "이해했는지 불분명합니다. → That's fine, thanks." }
        ]
      },
      {
        ai: "About twenty-five minutes. Cash or card?",
        aiKo: "25분쯤 걸려요. 현금이요, 카드요?",
        choices: [
          { t: "Card, please. Do you take contactless?", good: true, fb: "훌륭합니다. contactless(비접촉 결제)는 현지에서 아주 자주 쓰입니다." },
          { t: "Cash. Do you have change for a fifty?", good: true, fb: "좋아요. 잔돈 확인은 실전에서 꼭 필요한 질문입니다." },
          { t: "Card.", good: true, fb: "통합니다. 'Card, please.'로 한 단어만 더 붙여보세요." }
        ]
      }
    ],
    end: "택시 상황을 통과했습니다 🎉 빠른 구어체를 되묻는 표현 3가지가 카드로 저장됩니다."
  }
};
