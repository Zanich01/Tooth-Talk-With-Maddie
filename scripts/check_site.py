from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
ROOT = Path(__file__).resolve().parents[1]
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
class Check(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.stack, self.ids, self.active, self.counts = path, [], set(), [], {}
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        self.counts[tag] = self.counts.get(tag, 0) + 1
        if tag not in VOID: self.stack.append(tag)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'duplicate ID {attrs["id"]}'
            self.ids.add(attrs['id'])
        if tag == 'img': assert 'alt' in attrs
        if attrs.get('aria-current') == 'page': self.active.append(attrs.get('href'))
        for key in ('src', 'href'):
            url = urlsplit(attrs.get(key, ''))
            if not url.scheme and not url.netloc:
                target = self.path.parent / unquote(url.path) if url.path else self.path
                assert target.is_file(), url.path
                if url.fragment:
                    import re
                    assert re.search(r'id=[\"\x27]' + re.escape(url.fragment) + r'[\"\x27]', target.read_text(encoding='utf-8')), url.fragment
    def handle_endtag(self, tag):
        assert self.stack and self.stack[-1] == tag, f'{self.path}: unexpected {tag} in {self.stack}'
        self.stack.pop()
for path in sorted(ROOT.glob('*.html')):
    check = Check(path)
    source = path.read_text(encoding='utf-8')
    assert source.lower().startswith('<!doctype html>')
    check.feed(source)
    assert not check.stack
    for tag in ('html', 'head', 'body', 'main', 'h1', 'title'): assert check.counts.get(tag) == 1, tag
    assert check.active == [path.name]
    assert 'main-content' in check.ids
    print(f'PASS {path.name}')
products = json.loads((ROOT / 'data/products.json').read_text())
for product in products:
    assert all(product.get(key) for key in ('name', 'category', 'url', 'image'))
    assert (ROOT / product['image']).is_file()
    assert urlsplit(product['url']).scheme == 'https'
print(f'PASS {len(products)} products and images')
topics = json.loads((ROOT / 'data/topics.json').read_text())
for topic in topics:
    assert all(topic.get(key) for key in ('name', 'url', 'description', 'keywords'))
    assert (ROOT / topic['url']).is_file()
print(f'PASS {len(topics)} searchable guides')
