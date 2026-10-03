export type QuestionType = "single" | "boolean" | "multi";

export type QuizQuestion = {
  id: number;
  text: string;
  type: QuestionType;
  choices: string[];
  correct: number | boolean | number[];
};

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: "What kind of food do I have every year for my birthday?",
    type: "single",
    choices: ["Mexican", "Italian", "Sushi", "Burgers"],
    correct: 2,
  },
  {
    id: 2,
    text: "What is my cat’s name?",
    type: "single",
    choices: ["Cricket", "Crinkle", "Trinket"],
    correct: 2,
  },
  {
    id: 3,
    text: "When’s my birthday?",
    type: "single",
    choices: ["September 13th", "September 30th", "September 23rd", "October 2nd"],
    correct: 1,
  },
  {
    id: 4,
    text: "I’ve been to 7 states (including California).",
    type: "boolean",
    choices: ["True", "False"],
    correct: false,
  },
  {
    id: 5,
    text: "How many dogs have I had?",
    type: "single",
    choices: ["2", "4", "3", "5"],
    correct: 2,
  },
  {
    id: 6,
    text: "Nouri has been to Tennessee.",
    type: "boolean",
    choices: ["True", "False"],
    correct: true,
  },
  {
    id: 7,
    text: "Does Nouri have braces?",
    type: "boolean",
    choices: ["True", "False"],
    correct: true,
  },
  {
    id: 8,
    text: "What’s Nouri’s favorite fruit?",
    type: "single",
    choices: ["Strawberries", "Mango", "Blueberries", "Pineapple"],
    correct: 0,
  },
  {
    id: 9,
    text: "What’s Nouri’s favorite word for walking?",
    type: "single",
    choices: ["Stroll", "Saunter", "Walk", "Perambulate"],
    correct: 3,
  },
  {
    id: 10,
    text: "What was Nouri’s favorite animal?",
    type: "multi",
    choices: ["Cheetahs", "Velociraptors", "Bats", "Wolves"],
    correct: [0, 1, 2, 3],
  },
  {
    id: 11,
    text: "How many pigs has Nouri raised?",
    type: "single",
    choices: ["3", "2", "1", "0"],
    correct: 2,
  },
  {
    id: 12,
    text: "What is Nouri saving up for?",
    type: "single",
    choices: ["Car", "E-scooter", "iPhone 18 Pro", "Nintendo Switch 2"],
    correct: 3,
  },
  {
    id: 13,
    text: "How many years apart are Elka and Nouri?",
    type: "single",
    choices: ["2.5", "3", "3.5", "4"],
    correct: 2,
  },
];
