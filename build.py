import pathlib
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = pathlib.Path('src')
css = (src/'styles.css').read_text(encoding='utf-8')
js = '\n'.join((src/f).read_text(encoding='utf-8') for f in ['qrlib.js','data.js','data_more.js','core.js','client.js','staff.js','admin.js','app.js'])
html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Этажом ниже — еда для фитнес-клуба</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{css}
.site-head,.admin-head{{top:var(--dbh,38px)}}
</style>
</head>
<body>
<div class="demobar" id="demobar"></div>
<div id="head"></div>
<main id="main"></main>
<div id="layer"></div>
<div id="toasts"></div>
<script>
{js}
</script>
</body>
</html>
'''
pathlib.Path('index.html').write_text(html, encoding='utf-8')
print('built', len(html)//1024, 'KB')
