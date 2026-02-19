---
layout: home
---
# Deník experimentu
Vítejte na mém blogu.

---
layout: home
---
### Diagnostika:
Počet postů: {{ site.posts | size }}

Seznam všech souborů v kolekci:
{% for post in site.posts %}
- {{ post.path }} (Datum: {{ post.date }})
{% endfor %}
