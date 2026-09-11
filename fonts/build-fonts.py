"""Regenerates the subset web fonts in this folder from the upstream originals.

Subset = KS X 1001's 2,350 hangul syllables + ASCII + compatibility jamo +
common punctuation + every character actually present in the game's text
files, so any normal Korean UI string renders without a fallback glyph.

Usage:  python3 fonts/build-fonts.py        (needs: pip install fonttools brotli)
Originals are downloaded once into the OS temp dir.
"""
import os
import tempfile
import unicodedata
import urllib.request

from fontTools import subset

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
SOURCES = {
    'PretendardVariable-subset.woff2':
        'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
    'MaruBuri-SemiBold-subset.woff2':
        'https://cdn.jsdelivr.net/gh/fonts-archive/MaruBuri/MaruBuri-SemiBold.woff2',
    'MaruBuri-Bold-subset.woff2':
        'https://cdn.jsdelivr.net/gh/fonts-archive/MaruBuri/MaruBuri-Bold.woff2',
}
TEXT_SOURCES = ('index.html', 'game.js', 'fish-data.js', 'version.js')
SYMBOLS = ('·…—–‘’“”※→←↑↓×÷°℃㎝㎏㎜㎞○●◎□■△▲▽▼☆★♪♡♥・ㆍ‥「」『』【】〈〉《》〔〕'
           '±≠≤≥∞√∼～ⅠⅡⅢ①②③④⑤⑥⑦⑧⑨⑩ ')


def charset():
    chars = set()
    for name in TEXT_SOURCES:
        with open(os.path.join(GAME, name), encoding='utf-8') as fh:
            chars.update(fh.read())
    # euc_kr encodes exactly the KS X 1001 syllables as one 2-byte code; the
    # other 8,822 come out as 8-byte filler sequences, hence the length test.
    chars |= {chr(cp) for cp in range(0xAC00, 0xD7A4) if len(chr(cp).encode('euc_kr')) == 2}
    chars.update(chr(c) for c in range(0x20, 0x7F))
    chars.update(chr(c) for c in range(0x3131, 0x3164))
    chars.update(SYMBOLS)
    return ''.join(sorted(c for c in chars if not unicodedata.category(c).startswith('C')))


def main():
    cache = os.path.join(tempfile.gettempdir(), 'zanzanhan-font-src')
    os.makedirs(cache, exist_ok=True)
    text_file = os.path.join(cache, 'chars.txt')
    with open(text_file, 'w', encoding='utf-8') as fh:
        fh.write(charset())
    for out_name, url in SOURCES.items():
        src = os.path.join(cache, os.path.basename(url))
        if not os.path.exists(src):
            print('downloading', url)
            urllib.request.urlretrieve(url, src)
        out = os.path.join(HERE, out_name)
        subset.main([
            src, '--text-file=' + text_file, '--flavor=woff2', '--no-hinting',
            '--layout-features=*', '--name-IDs=*', '--name-legacy', '--name-languages=*',
            '--output-file=' + out,
        ])
        print(out_name, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    main()
