export type DifficultyLabel = '쉬움' | '보통' | '어려움';

/**
 * 난이도 숫자(1~10)를 쉬움/보통/어려움 라벨로 변환
 * - 1~3: 쉬움
 * - 4~6: 보통
 * - 7~10: 어려움
 */
export function getDifficultyLabel(difficulty: number): DifficultyLabel {
  if (difficulty <= 3) return '쉬움';
  if (difficulty <= 6) return '보통';
  return '어려움';
}
