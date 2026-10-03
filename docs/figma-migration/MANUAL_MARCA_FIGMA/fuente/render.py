import asyncio, pathlib
from playwright.async_api import async_playwright
src=pathlib.Path(__file__).parent
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--font-render-hinting=none'])
        pg=await b.new_page(device_scale_factor=2,viewport={'width':1100,'height':900})
        await pg.goto((src/'index.html').as_uri()); await pg.wait_for_load_state('networkidle')
        await pg.evaluate('document.fonts.ready')
        await pg.locator('#canvas').screenshot(path=str(src.parent/'ficha-video.png'))
        await pg.locator('#ficha').screenshot(path=str(src/'ficha-only.png'))
        await b.close()
asyncio.run(main())
