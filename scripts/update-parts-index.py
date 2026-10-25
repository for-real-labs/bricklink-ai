import tarfile, urllib.request, json
from pathlib import Path
url='https://codeload.github.com/pybricks/ldraw/tar.gz/c43ed06a128a10ed65675166bf42eb6fd608b9b0'
rows=[]
with urllib.request.urlopen(url, timeout=90) as response:
    with tarfile.open(fileobj=response, mode='r|gz') as archive:
        for entry in archive:
            bits=entry.name.split('/')
            if len(bits)!=3 or bits[1]!='parts' or not bits[2].endswith('.dat'): continue
            source=archive.extractfile(entry)
            line=source.readline(1024).decode('utf-8',errors='replace').strip()
            if not line.startswith('0 '): continue
            name=line[2:].strip()
            if name.startswith(('~','=', '_')): continue
            part_id=bits[2][:-4]
            if not all(c.isalnum() or c in '_-' for c in part_id): continue
            rows.append([part_id,name])
(Path(__file__).resolve().parents[1] / 'src/domain/parts-index.json').write_text(json.dumps(sorted(rows),ensure_ascii=False,separators=(',',':'))+'\n')
print('Indexed',len(rows),'LDraw parts')
