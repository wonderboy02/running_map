import { supabase } from '@/lib/supabase/client';

export interface DuplicateCheck {
  status: 'new' | 'warning' | 'duplicate';
  existingSpots?: Array<{
    id: string;
    name: string;
    categories: string[];
  }>;
}

/**
 * 2단계 중복 체크:
 * 1. 완전 중복: name + address 모두 같음 → 'duplicate'
 * 2. 같은 주소: address만 같음 → 'warning'
 * 3. 새 장소: 둘 다 아님 → 'new'
 */
export async function checkDuplicate(
  name: string,
  roadAddress: string
): Promise<DuplicateCheck> {
  try {
    // 1. 완전 중복 체크 (이름 + 주소)
    const { data: exactMatch, error: exactError } = await supabase
      .from('spots')
      .select('id, name, categories')
      .eq('name', name)
      .eq('address', roadAddress)
      .maybeSingle();

    if (exactError) {
      console.error('[checkDuplicate] Exact match error:', exactError);
    }

    if (exactMatch) {
      return {
        status: 'duplicate',
        existingSpots: [exactMatch]
      };
    }

    // 2. 같은 주소의 다른 장소들
    const { data: sameAddress, error: addressError } = await supabase
      .from('spots')
      .select('id, name, categories')
      .eq('address', roadAddress);

    if (addressError) {
      console.error('[checkDuplicate] Same address error:', addressError);
    }

    if (sameAddress && sameAddress.length > 0) {
      return {
        status: 'warning',
        existingSpots: sameAddress
      };
    }

    return { status: 'new' };
  } catch (error) {
    console.error('[checkDuplicate] Error:', error);
    // 에러 발생 시 안전하게 'new'로 처리
    return { status: 'new' };
  }
}

/**
 * 여러 항목을 한 번에 중복 체크
 */
export async function checkDuplicateBatch(
  items: Array<{ name: string; roadAddress: string }>
): Promise<DuplicateCheck[]> {
  return Promise.all(
    items.map(item => checkDuplicate(item.name, item.roadAddress))
  );
}
