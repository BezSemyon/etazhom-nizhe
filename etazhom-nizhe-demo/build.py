import pathlib
src = pathlib.Path('src')
css = (src/'styles.css').read_text()
js = '\n'.join((src/f).read_text() for f in ['qrlib.js','data.js','data_more.js','core.js','fiscal.js','loyalty.js','client.js','staff.js','admin.js','app.js'])
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
out = pathlib.Path('dist'); out.mkdir(exist_ok=True)
(out/'index.html').write_text(html)
print('built', len(html)//1024, 'KB')
