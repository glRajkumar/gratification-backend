// 7 categories, one per day of the week (0=Sunday)
export const DAILY_CHALLENGES: Record<
  number,
  { category: string; key: string; prompt: string }[]
> = {
  0: [
    // Sunday — Reflection
    {
      category: "Reflection",
      key: "reflect_week",
      prompt: "What was the defining moment of this week?",
    },
    {
      category: "Reflection",
      key: "reflect_lesson",
      prompt: "What did this week teach you about yourself?",
    },
    {
      category: "Reflection",
      key: "reflect_decision",
      prompt: "Describe a decision you made this week you feel good about.",
    },
  ],
  1: [
    // Monday — Gratitude
    {
      category: "Gratitude",
      key: "gratitude_specific",
      prompt: "Name something specific you're grateful for today — not generic.",
    },
    {
      category: "Gratitude",
      key: "gratitude_person",
      prompt: "Who made a positive difference in your life recently? Why?",
    },
    {
      category: "Gratitude",
      key: "gratitude_small",
      prompt: "What small thing went right today that you almost missed?",
    },
  ],
  2: [
    // Tuesday — Growth
    {
      category: "Growth",
      key: "growth_skill",
      prompt: "What skill are you building right now, and why does it matter?",
    },
    {
      category: "Growth",
      key: "growth_challenge",
      prompt: "Describe a challenge you faced recently and what it revealed about you.",
    },
    {
      category: "Growth",
      key: "growth_feedback",
      prompt: "What feedback have you received lately that was hard but true?",
    },
  ],
  3: [
    // Wednesday — Relationship
    {
      category: "Relationship",
      key: "relationship_connection",
      prompt: "Who did you connect with recently, and what made it meaningful?",
    },
    {
      category: "Relationship",
      key: "relationship_friction",
      prompt: "Is there a relationship with unresolved tension? What's your part in it?",
    },
    {
      category: "Relationship",
      key: "relationship_appreciate",
      prompt: "Who in your life do you appreciate but rarely tell? What would you say?",
    },
  ],
  4: [
    // Thursday — Work
    {
      category: "Work",
      key: "work_win",
      prompt: "What's one thing you did at work or a project this week that you're proud of?",
    },
    {
      category: "Work",
      key: "work_obstacle",
      prompt: "What obstacle is slowing your most important work right now?",
    },
    {
      category: "Work",
      key: "work_energy",
      prompt: "Which tasks drain you vs. energize you? What does that tell you?",
    },
  ],
  5: [
    // Friday — Health
    {
      category: "Health",
      key: "health_body",
      prompt: "How has your body felt this week? What is it asking for?",
    },
    {
      category: "Health",
      key: "health_sleep",
      prompt: "Describe your sleep and energy patterns this week.",
    },
    {
      category: "Health",
      key: "health_habit",
      prompt: "What one health habit, if consistent, would change your life most?",
    },
  ],
  6: [
    // Saturday — Creativity
    {
      category: "Creativity",
      key: "creative_spark",
      prompt: "What sparked your curiosity or imagination recently?",
    },
    {
      category: "Creativity",
      key: "creative_play",
      prompt: "When did you last do something just for the joy of it, with no goal?",
    },
    {
      category: "Creativity",
      key: "creative_dream",
      prompt: "If you could create anything — no limits — what would it be?",
    },
  ],
}

export function getTodayChallenge(dow: number, dayOfMonth: number) {
  const prompts = DAILY_CHALLENGES[dow]
  return prompts[dayOfMonth % prompts.length]
}
