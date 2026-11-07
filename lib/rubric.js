export const defaultSelfRubric = [
  { category:'업무수행능력', title:'업무 정확성', help_text:'오류·누락 없이 담당업무를 정확히 처리하는가', max_score:8, sort_order:110 },
  { category:'업무수행능력', title:'직무 전문성', help_text:'담당업무에 필요한 규정·기술·업무지식을 충분히 갖추고 있는가', max_score:8, sort_order:120 },
  { category:'업무수행능력', title:'업무 처리속도·기한준수', help_text:'정해진 기한 내 업무를 처리하고 지연 시 사전 보고하는가', max_score:7, sort_order:130 },
  { category:'업무수행능력', title:'보고·기록관리', help_text:'업무내용, 점검결과, 민원처리 등을 정확히 기록·보고하는가', max_score:7, sort_order:140 },

  { category:'책임감/성실성', title:'책임 있는 업무완수', help_text:'맡은 업무를 끝까지 확인하고 후속조치까지 수행하는가', max_score:8, sort_order:210 },
  { category:'책임감/성실성', title:'근무태도·근태', help_text:'출퇴근, 당직, 근무수칙 등을 성실히 준수하는가', max_score:6, sort_order:220 },
  { category:'책임감/성실성', title:'적극성·주도성', help_text:'지시받은 일에 그치지 않고 필요한 업무를 스스로 찾아 수행하는가', max_score:6, sort_order:230 },

  { category:'입주민 응대', title:'친절·존중', help_text:'입주민에게 친절하고 정중한 태도로 응대하는가', max_score:5, sort_order:310 },
  { category:'입주민 응대', title:'정확한 안내', help_text:'확인되지 않은 내용을 임의로 안내하지 않고 정확한 정보를 제공하는가', max_score:5, sort_order:320 },
  { category:'입주민 응대', title:'민원 처리·후속관리', help_text:'접수된 민원을 방치하지 않고 진행상황과 결과까지 관리하는가', max_score:6, sort_order:330 },
  { category:'입주민 응대', title:'갈등 상황 대응', help_text:'불만·항의 상황에서도 감정적으로 대응하지 않고 적절히 처리하는가', max_score:4, sort_order:340 },

  { category:'협업/조직기여', title:'부서 간 협업', help_text:'다른 직원의 업무 요청에 적극적으로 협조하는가', max_score:5, sort_order:410 },
  { category:'협업/조직기여', title:'정보공유·소통', help_text:'필요한 내용을 동료·상급자와 적시에 공유하는가', max_score:5, sort_order:420 },
  { category:'협업/조직기여', title:'조직기여도', help_text:'공동업무, 행사, 긴급상황 등에서 적극적으로 참여하는가', max_score:5, sort_order:430 },

  { category:'문제해결력', title:'상황판단', help_text:'문제·민원·시설 이상 발생 시 상황을 정확히 파악하는가', max_score:5, sort_order:510 },
  { category:'문제해결력', title:'해결능력', help_text:'적절한 해결방법을 찾고 실제 조치까지 연결하는가', max_score:5, sort_order:520 },
  { category:'문제해결력', title:'재발방지·업무개선', help_text:'단순 조치에 그치지 않고 원인을 분석하고 개선방안을 제시하는가', max_score:5, sort_order:530 },
];

export const defaultSelfTextItems = [
  { title:'올해 본인이 수행한 주요 업무와 성과를 구체적으로 작성해 주세요.', help_text:'가능하면 업무명, 결과, 개선효과 등 구체적인 내용을 포함해 주세요.', sort_order:610 },
  { title:'업무 중 개선하거나 해결한 사례를 작성해 주세요.', help_text:'문제 상황, 본인의 조치, 결과를 중심으로 작성해 주세요.', sort_order:620 },
  { title:'본인의 강점과 계속 발전시키고 싶은 역량을 작성해 주세요.', help_text:'담당 직무와 연결되는 강점을 중심으로 작성해 주세요.', sort_order:630 },
  { title:'개선이 필요하다고 생각하는 부분과 내년도 업무목표를 작성해 주세요.', help_text:'개선계획과 구체적인 목표를 함께 작성해 주세요.', sort_order:640 },
];
