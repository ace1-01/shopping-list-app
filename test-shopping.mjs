import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = `file:///${path.join(__dirname, 'index.html').replace(/\\/g, '/')}`;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

async function run() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // localStorage 초기화 (이전 데이터 제거)
  await page.goto(FILE_PATH);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  console.log('\n==============================');
  console.log('  쇼핑 리스트 앱 자동 테스트');
  console.log('==============================\n');

  // ──────────────────────────────
  // 테스트 1: 초기 상태
  // ──────────────────────────────
  console.log('[테스트 1] 초기 상태 확인');
  const emptyVisible = await page.locator('#empty').isVisible();
  assert(emptyVisible, '아이템 없을 때 빈 상태 메시지 표시');

  const listItems = await page.locator('#list li').count();
  assert(listItems === 0, '초기 리스트 아이템 0개');

  // ──────────────────────────────
  // 테스트 2: 아이템 추가 (버튼 클릭)
  // ──────────────────────────────
  console.log('\n[테스트 2] 아이템 추가 - 버튼 클릭');
  await page.locator('#itemInput').fill('사과');
  await page.locator('button:has-text("추가")').click();

  const count1 = await page.locator('#list li').count();
  assert(count1 === 1, '아이템 1개 추가됨');

  const text1 = await page.locator('#list li span').first().textContent();
  assert(text1 === '사과', '추가된 아이템 텍스트 "사과" 확인');

  const inputVal = await page.locator('#itemInput').inputValue();
  assert(inputVal === '', '추가 후 입력창 초기화');

  // ──────────────────────────────
  // 테스트 3: 아이템 추가 (Enter 키)
  // ──────────────────────────────
  console.log('\n[테스트 3] 아이템 추가 - Enter 키');
  await page.locator('#itemInput').fill('바나나');
  await page.locator('#itemInput').press('Enter');

  const count2 = await page.locator('#list li').count();
  assert(count2 === 2, 'Enter로 아이템 추가 후 2개');

  // ──────────────────────────────
  // 테스트 4: 아이템 추가 (세 번째)
  // ──────────────────────────────
  console.log('\n[테스트 4] 아이템 추가 - 세 번째');
  await page.locator('#itemInput').fill('우유');
  await page.locator('#itemInput').press('Enter');

  const count3 = await page.locator('#list li').count();
  assert(count3 === 3, '세 번째 아이템 추가 후 3개');

  // ──────────────────────────────
  // 테스트 5: 빈 입력 무시
  // ──────────────────────────────
  console.log('\n[테스트 5] 빈 입력 추가 무시');
  await page.locator('#itemInput').fill('   ');
  await page.locator('button:has-text("추가")').click();

  const count4 = await page.locator('#list li').count();
  assert(count4 === 3, '공백 입력 시 아이템 추가되지 않음');

  // ──────────────────────────────
  // 테스트 6: 체크 기능
  // ──────────────────────────────
  console.log('\n[테스트 6] 체크 기능');
  const checkbox0 = page.locator('#list li').nth(0).locator('input[type="checkbox"]');
  await checkbox0.check();

  const isChecked = await checkbox0.isChecked();
  assert(isChecked, '첫 번째 아이템 체크됨');

  const hasCheckedClass = await page.locator('#list li').nth(0).evaluate(el => el.classList.contains('checked'));
  assert(hasCheckedClass, '체크 시 .checked 클래스 추가');

  const strikeStyle = await page.locator('#list li').nth(0).locator('span').evaluate(el =>
    getComputedStyle(el).textDecoration
  );
  assert(strikeStyle.includes('line-through'), '체크된 아이템에 취소선 적용');

  // ──────────────────────────────
  // 테스트 7: 체크 해제
  // ──────────────────────────────
  console.log('\n[테스트 7] 체크 해제');
  await checkbox0.uncheck();

  const isUnchecked = await checkbox0.isChecked();
  assert(!isUnchecked, '첫 번째 아이템 체크 해제됨');

  const noCheckedClass = await page.locator('#list li').nth(0).evaluate(el => !el.classList.contains('checked'));
  assert(noCheckedClass, '체크 해제 시 .checked 클래스 제거');

  // ──────────────────────────────
  // 테스트 8: 통계 표시
  // ──────────────────────────────
  console.log('\n[테스트 8] 통계 표시');
  await page.locator('#list li').nth(0).locator('input[type="checkbox"]').check();
  await page.locator('#list li').nth(1).locator('input[type="checkbox"]').check();

  const statsText = await page.locator('#stats').textContent();
  assert(statsText.includes('3'), '통계에 전체 3개 표시');
  assert(statsText.includes('2'), '통계에 완료 2개 표시');

  // ──────────────────────────────
  // 테스트 9: 개별 삭제
  // ──────────────────────────────
  console.log('\n[테스트 9] 개별 아이템 삭제');
  const deleteBtn = page.locator('#list li').nth(2).locator('button.delete');
  await deleteBtn.click();

  const count5 = await page.locator('#list li').count();
  assert(count5 === 2, '개별 삭제 후 2개 남음');

  const remainingTexts = await page.locator('#list li span').allTextContents();
  assert(!remainingTexts.includes('우유'), '삭제된 "우유" 아이템 목록에 없음');

  // ──────────────────────────────
  // 테스트 10: 완료 항목 일괄 삭제
  // ──────────────────────────────
  console.log('\n[테스트 10] 완료 항목 일괄 삭제');
  await page.locator('button:has-text("완료 항목 삭제")').click();

  const count6 = await page.locator('#list li').count();
  assert(count6 === 0, '완료 항목 삭제 후 0개 (체크된 2개 삭제됨)');

  const emptyVisibleAfter = await page.locator('#empty').isVisible();
  assert(emptyVisibleAfter, '모두 삭제 후 빈 상태 메시지 표시');

  // ──────────────────────────────
  // 테스트 11: localStorage 저장
  // ──────────────────────────────
  console.log('\n[테스트 11] localStorage 저장 및 복원');
  await page.locator('#itemInput').fill('딸기');
  await page.locator('button:has-text("추가")').click();
  await page.locator('#itemInput').fill('포도');
  await page.locator('button:has-text("추가")').click();

  await page.reload();

  const countAfterReload = await page.locator('#list li').count();
  assert(countAfterReload === 2, '페이지 새로고침 후 localStorage에서 복원 (2개)');

  const textsAfterReload = await page.locator('#list li span').allTextContents();
  assert(textsAfterReload.includes('딸기') && textsAfterReload.includes('포도'), '새로고침 후 아이템 내용 유지');

  // ──────────────────────────────
  // 결과 요약
  // ──────────────────────────────
  console.log('\n==============================');
  console.log(`  결과: ${passed + failed}개 테스트`);
  console.log(`  ✅ 통과: ${passed}개`);
  console.log(`  ❌ 실패: ${failed}개`);
  console.log('==============================\n');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('테스트 오류:', err);
  process.exit(1);
});