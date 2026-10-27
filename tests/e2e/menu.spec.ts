import { expect, test, type Page } from '@playwright/test';

async function waitForMenu(page: Page) {
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await page.waitForTimeout(280);
}
async function fullyVisible(page: Page, selector: string) {
  return page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  });
}
for (const viewport of [{ width: 390, height: 480 }, { width: 740, height: 360 }, {width:390,height:844}]) {
  for (const input of ['wheel', 'touch'] as const) {
    test(`메뉴 실제 ${input} 상하 이동 ${viewport.width}×${viewport.height}`, async ({ page, isMobile, browserName }) => {
      test.skip(input === 'touch' && (!isMobile || browserName !== 'chromium'), 'CDP touch emulation on mobile Chromium');
      await page.setViewportSize(viewport);
      await page.goto('');
      await waitForMenu(page);
      const sidebar=page.locator('.sidebar');
      const cdp=input==='touch' ? await page.context().newCDPSession(page) : null;
      async function scroll(direction: 1 | -1) {
        if(input==='wheel') {
          await page.mouse.move(125, viewport.height/2);
          await page.mouse.wheel(0, direction*460);
        } else {
          const x=120, start=direction===1 ? viewport.height-75 : 80;
          const end=direction===1 ? 80 : viewport.height-75;
          await cdp!.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});
          for(let i=1;i<=12;i++) {
            await cdp!.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*i/12}]});
            await page.waitForTimeout(18);
          }
          await cdp!.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        }
        await page.waitForTimeout(200);
      }
      const before=await sidebar.evaluate(el=>el.scrollTop);
      for(let i=0;i<6 && !(await fullyVisible(page,'.sidebar-bottom .text-button:nth-of-type(2)'));i++) await scroll(1);
      if(viewport.height<600) expect(await sidebar.evaluate(el=>el.scrollTop)).toBeGreaterThan(before);
      expect(await fullyVisible(page,'.sidebar-bottom .text-button:nth-of-type(1)')).toBe(true);
      expect(await fullyVisible(page,'.sidebar-bottom .text-button:nth-of-type(2)')).toBe(true);
      const download=page.waitForEvent('download');
      await page.getByRole('button',{name:'학습 기록 백업',exact:true}).click();
      expect((await download).suggestedFilename()).toBe('skin-study-backup.json');
      await page.getByRole('button',{name:'데이터 초기화',exact:true}).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button',{name:'돌아가기',exact:true}).click();
      for(let i=0;i<8 && !(await fullyVisible(page,'.sidebar nav button:first-child'));i++) await scroll(-1);
      expect(await fullyVisible(page,'.sidebar nav button:first-child')).toBe(true);
      await page.getByRole('navigation').getByRole('button',{name:'학습 대시보드',exact:true}).click();
      await expect(sidebar).not.toHaveClass(/open/);
      await expect(page.getByRole('heading',{name:'미용사(피부) 필기 CBT',exact:true})).toBeVisible();
    });
  }
}
test('글자 확대·뷰포트 변경에서도 메뉴 하단과 상단에 휠 입력으로 접근',async({page})=>{
  await page.setViewportSize({width:390,height:480});
  await page.goto('');
  await page.addStyleTag({content:'.sidebar { font-size:150%; } .sidebar nav button { font-size:18px; min-height:60px; } .sidebar .text-button { font-size:18px; }'});
  await waitForMenu(page);
  await page.mouse.move(130,240);
  await page.mouse.wheel(0,1500);
  await expect.poll(()=>fullyVisible(page,'.sidebar-bottom .text-button:nth-of-type(2)')).toBe(true);
  await page.setViewportSize({width:740,height:360});
  await page.mouse.move(130,180); await page.mouse.wheel(0,1500);
  await expect.poll(()=>fullyVisible(page,'.sidebar-bottom .text-button:nth-of-type(2)')).toBe(true);
  await page.mouse.wheel(0,-2000);
  await expect.poll(()=>fullyVisible(page,'.sidebar nav button:first-child')).toBe(true);
});
